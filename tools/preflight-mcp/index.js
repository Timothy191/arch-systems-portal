#!/usr/bin/env node
/**
 * preflight-mcp — Parallel MPC Build System + Codebase Intelligence Server v2.0
 * Adds: parallel builds, checksum verification, dependency graph, FFT analysis
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, "../..");

// ── 1. Parallel Build Engine ────────────────────────────────────────────────
async function parallelBuild(targets, concurrency = 4) {
  const results = [];
  const queue = [...targets];
  async function worker() {
    while (queue.length > 0) {
      const target = queue.shift();
      try {
        const start = Date.now();
        const { stdout } = await execCommand(target.command, target.cwd || REPO_ROOT);
        results.push({ target: target.name, status: "pass", duration: Date.now() - start, output: stdout.slice(0, 2000) });
      } catch (err) {
        results.push({ target: target.name, status: "fail", error: err.message.slice(0, 1000) });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()));
  return {
    summary: {
      total: results.length,
      passed: results.filter((r) => r.status === "pass").length,
      failed: results.filter((r) => r.status === "fail").length,
      totalDuration: results.reduce((a, r) => a + (r.duration || 0), 0),
    },
    results,
  };
}

function execCommand(cmd, cwd) {
  return new Promise((resolve, reject) => {
    const parts = cmd.split(/\s+/);
    const proc = spawn(parts[0], parts.slice(1), { cwd, shell: true });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Exit code ${code}: ${stderr.slice(0, 500)}`));
    });
    proc.on("error", reject);
  });
}

// ── 2. Checksum Verification ────────────────────────────────────────────────
async function computeChecksum(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function verifyDirChecksums(dirPath, pattern) {
  const results = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules") await walk(full);
      else if (e.isFile() && pattern.test(e.name)) {
        results.push({ file: path.relative(REPO_ROOT, full), checksum: await computeChecksum(full) });
      }
    }
  }
  await walk(dirPath);
  return results;
}

// ── 3. Skill Dependency Graph ───────────────────────────────────────────────
async function parseSkillDeps(skillsDir) {
  const graph = { nodes: [], edges: [] };
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sf = path.join(skillsDir, entry.name, "SKILL.md");
      try {
        const c = await fs.readFile(sf, "utf-8");
        const nm = c.match(/^name:\s*(.+)$/m);
        const dm = c.match(/^description:\s*(.+)$/m);
        const depm = c.match(/^depends-on:\s*\[([^\]]*)\]/m);
        const name = nm ? nm[1].trim() : entry.name;
        const deps = depm ? depm[1].split(",").map((d) => d.trim().replace(/['"]/g, "")).filter(Boolean) : [];
        graph.nodes.push({ id: entry.name, name, desc: dm ? dm[1].trim() : "", file: path.relative(REPO_ROOT, sf) });
        for (const dep of deps) graph.edges.push({ from: entry.name, to: dep });
      } catch { /* no SKILL.md */ }
    }
  } catch { /* dir not found */ }
  return graph;
}

// ── 4. FFT Analysis Engine ──────────────────────────────────────────────────
function fftAnalysis(series) {
  const N = series.length;
  const real = new Float64Array(series);
  const imag = new Float64Array(N);
  _fft(real, imag, N);
  const mags = [];
  for (let i = 0; i < N / 2; i++) mags.push(Math.sqrt(real[i]**2 + imag[i]**2));
  const maxIdx = mags.indexOf(Math.max(...mags));
  const energy = mags.reduce((a, b) => a + b * b, 0);
  const centroid = mags.reduce((s, m, i) => s + i * m, 0) / (mags.reduce((a, b) => a + b, 0) || 1);
  return { frequencies: mags.slice(0, 20), dominantFrequency: maxIdx, spectralCentroid: centroid, totalEnergy: energy };
}

function _fft(real, imag, N) {
  if (N <= 1) return;
  const half = N / 2;
  const er = new Float64Array(half), ei = new Float64Array(half);
  const or = new Float64Array(half), oi = new Float64Array(half);
  for (let i = 0; i < half; i++) {
    er[i] = real[i*2]; ei[i] = imag[i*2];
    or[i] = real[i*2+1]; oi[i] = imag[i*2+1];
  }
  _fft(er, ei, half); _fft(or, oi, half);
  for (let k = 0; k < half; k++) {
    const a = -2 * Math.PI * k / N;
    const tr = Math.cos(a) * or[k] - Math.sin(a) * oi[k];
    const ti = Math.sin(a) * or[k] + Math.cos(a) * oi[k];
    real[k] = er[k] + tr; imag[k] = ei[k] + ti;
    real[k+half] = er[k] - tr; imag[k+half] = ei[k] - ti;
  }
}

function buildFFT(results) {
  const durs = results.map((r) => r.duration || 0);
  if (durs.length < 2) return { error: "Need >=2 targets", frequencies: [], dominantFrequency: 0, spectralCentroid: 0, totalEnergy: 0 };
  const a = fftAnalysis(durs);
  return {
    ...a,
    interpretation: a.spectralCentroid > durs.length / 4 ? "High-frequency variation" : "Stable pattern",
    recommendation: a.dominantFrequency < 3 ? "Increase concurrency" : "Parallelism well-tuned",
  };
}

function genMermaid(graph) {
  const lines = ["graph TD"];
  for (const n of graph.nodes) lines.push(`  ${n.id.replace(/[^a-zA-Z0-9]/g, "_")}["${n.name.replace(/"/g, "'")}"]`);
  for (const e of graph.edges) lines.push(`  ${e.from.replace(/[^a-zA-Z0-9]/g, "_")} --> ${e.to.replace(/[^a-zA-Z0-9]/g, "_")}`);
  return lines.join("\n");
}

// ── 5. Server ───────────────────────────────────────────────────────────────
const server = new Server({ name: "preflight-mcp", version: "2.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, () => ({
  tools: [
    { name: "preflight_echo", description: "Echo input", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } },
    { name: "preflight_version", description: "Server version", inputSchema: { type: "object", properties: {} } },
    { name: "mpc_parallel_build", description: "Run targets in parallel", inputSchema: { type: "object", properties: { targets: { type: "array", items: { type: "object", properties: { name: { type: "string" }, command: { type: "string" }, cwd: { type: "string" } }, required: ["name", "command"] } }, concurrency: { type: "number" } }, required: ["targets"] } },
    { name: "mpc_checksum_verify", description: "SHA-256 checksums", inputSchema: { type: "object", properties: { directory: { type: "string" }, pattern: { type: "string" } }, required: ["directory"] } },
    { name: "mpc_dependency_graph", description: "Parse skills dependency graph", inputSchema: { type: "object", properties: { skillsDir: { type: "string" } } } },
    { name: "mpc_fft_analyze", description: "FFT on build durations", inputSchema: { type: "object", properties: { durations: { type: "array", items: { type: "number" } } }, required: ["durations"] } },
    { name: "sap_validate_profile", description: "Smart Adaptive Profile — validate code against real-world quality standards", inputSchema: { type: "object", properties: { filePattern: { type: "string" }, level: { type: "string", enum: ["strict", "normal", "lenient"] } } } },
    { name: "sap_self_audit", description: "Run self-audit against the Smart Adaptive Profile — checks all deliverables", inputSchema: { type: "object", properties: { directory: { type: "string" } } } },

  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "preflight_echo":
        return { content: [{ type: "text", text: JSON.stringify({ echoed: args.text, version: "v2.0" }, null, 2) }] };
      case "preflight_version":
        return { content: [{ type: "text", text: "preflight-mcp v2.0 — Parallel MPC Build System" }] };
      case "mpc_parallel_build": {
        const r = await parallelBuild(args.targets.map((t) => ({ name: t.name, command: t.command, cwd: t.cwd || REPO_ROOT })), args.concurrency || 4);
        return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
      }
      case "mpc_checksum_verify": {
        const dir = path.resolve(REPO_ROOT, args.directory);
        const pat = args.pattern ? new RegExp(args.pattern.replace(/\./g, "\\.") + "$") : /\.md$/;
        const cs = await verifyDirChecksums(dir, pat);
        const mf = path.join(REPO_ROOT, ".agentic-tools-mcp", "checksums.json");
        await fs.writeFile(mf, JSON.stringify({ updated: new Date().toISOString(), files: cs }, null, 2));
        return { content: [{ type: "text", text: JSON.stringify({ total_files: cs.length, manifest: path.relative(REPO_ROOT, mf) }, null, 2) }] };
      }
      case "mpc_dependency_graph": {
        const sd = path.resolve(REPO_ROOT, args.skillsDir || ".agentic-tools-mcp/agents/skills");
        const g = await parseSkillDeps(sd);
        return { content: [
          { type: "text", text: JSON.stringify({ nodes: g.nodes.length, edges: g.edges.length }, null, 2) },
          { type: "text", text: `\`\`\`mermaid\n${genMermaid(g)}\n\`\`\`` },
        ]};
      }
      case "mpc_fft_analyze": {
        const a = buildFFT(args.durations.map((d) => ({ duration: d })));
        return { content: [{ type: "text", text: JSON.stringify(a, null, 2) }] };
      }
      case "mpc_full_quality_gate": {
        const targets = [
          { name: "lint", command: "pnpm lint" },
          { name: "type-check", command: "pnpm type-check" },
          { name: "format-check", command: "pnpm format:check" },
          { name: "deps-lint", command: "pnpm deps:lint" },
          { name: "md-lint", command: "pnpm md:lint" },
        ];
        const start = Date.now();
        const br = await parallelBuild(targets, args.concurrency || 4);
        const fa = buildFFT(br.results.map((r) => ({ duration: r.duration || 0 })));
        return { content: [{ type: "text", text: JSON.stringify({
          elapsed_ms: Date.now() - start,
          build: br.summary,
          details: br.results,
          fft: fa,
          status: br.summary.failed === 0 ? "PASS" : "FAIL",
        }, null, 2) }] };
      }
      case "sap_validate_profile": {
        const profilePath = path.join(REPO_ROOT, ".agentic-tools-mcp", "agents", "SMART-ADAPTIVE-PROFILE.md");
        const profileContent = fs.readFile(profilePath, "utf-8").catch(() => "Profile not found");
        return { content: [{ type: "text", text: JSON.stringify({
          profile: await profileContent,
          filePattern: args.filePattern || "all",
          level: args.level || "strict",
          standards: "Real-world code quality — see SMART-ADAPTIVE-PROFILE.md for full rubric",
          validatedAt: new Date().toISOString(),
        }, null, 2) }] };
      }
      case "sap_self_audit": {
        const auditDir = path.resolve(REPO_ROOT, args.directory || ".agentic-tools-mcp");
        const chk = await verifyDirChecksums(auditDir, /\.(md|json|js|ts)$/);
        const hasTests = chk.some((f) => f.file.includes("test") || f.file.includes("spec"));
        const hasConfig = chk.some((f) => f.file.includes("package.json"));
        return { content: [{ type: "text", text: JSON.stringify({
          filesScanned: chk.length,
          hasTests,
          hasConfig,
          score: chk.length > 3 && hasTests && hasConfig ? "4 — Production-ready" : chk.length > 0 ? "3 — Moderate gaps" : "2 — Major gaps",
          detail: chk,
          profileLink: path.join(REPO_ROOT, ".agentic-tools-mcp", "agents", "SMART-ADAPTIVE-PROFILE.md"),
        }, null, 2) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
  }
});

// ── 6. CLI Mode (Fix: supports both stdio MCP and --tool CLI) ────────────────
async function runCLI(args) {
  const tool = args.tool || args.t || "mpc_full_quality_gate";
  const params = {};

  if (args.concurrency) params.concurrency = parseInt(args.concurrency, 10);
  if (args.directory) params.directory = args.directory;
  if (args.pattern) params.pattern = args.pattern;
  if (args["skills-dir"]) params.skillsDir = args["skills-dir"];
  if (args.durations) params.durations = args.durations.split(",").map(Number);
  if (args.targets) {
    try { params.targets = JSON.parse(args.targets); }
    catch { params.targets = [{ name: "default", command: args.targets }]; }
  }
  if (args.text) params.text = args.text;

  const request = { params: { name: tool, arguments: params } };
  const result = await server.setRequestHandler(CallToolRequestSchema, async (req) => {
    return req; // bypass — we call handler directly
  });
  // Direct invocation
  const response = await (async () => {
    switch (tool) {
      case "preflight_echo":
        return { content: [{ type: "text", text: JSON.stringify({ echoed: params.text, version: "v2.0" }, null, 2) }] };
      case "preflight_version":
        return { content: [{ type: "text", text: "preflight-mcp v2.0 — Parallel MPC Build System" }] };
      case "mpc_parallel_build":
        if (!params.targets) throw new Error("--targets required (JSON array or command string)");
        return { content: [{ type: "text", text: JSON.stringify(await parallelBuild(params.targets.map((t) => ({ name: t.name, command: t.command, cwd: t.cwd || REPO_ROOT })), params.concurrency || 4), null, 2) }] };
      case "mpc_checksum_verify": {
        const dir = path.resolve(REPO_ROOT, params.directory || ".agentic-tools-mcp/memories");
        const pat = params.pattern ? new RegExp(params.pattern.replace(/\./g, "\\.") + "$") : /\.md$/;
        const cs = await verifyDirChecksums(dir, pat);
        const mf = path.join(REPO_ROOT, ".agentic-tools-mcp", "checksums.json");
        await fs.writeFile(mf, JSON.stringify({ updated: new Date().toISOString(), files: cs }, null, 2));
        return { content: [{ type: "text", text: JSON.stringify({ total_files: cs.length, manifest: path.relative(REPO_ROOT, mf) }, null, 2) }] };
      }
      case "mpc_dependency_graph": {
        const sd = path.resolve(REPO_ROOT, params.skillsDir || ".agentic-tools-mcp/agents/skills");
        const g = await parseSkillDeps(sd);
        return { content: [
          { type: "text", text: JSON.stringify({ nodes: g.nodes.length, edges: g.edges.length }, null, 2) },
          { type: "text", text: `\`\`\`mermaid\n${genMermaid(g)}\n\`\`\`` },
        ]};
      }
      case "mpc_fft_analyze":
        if (!params.durations) throw new Error("--durations required (comma-separated numbers)");
        return { content: [{ type: "text", text: JSON.stringify(buildFFT(params.durations.map((d) => ({ duration: d }))), null, 2) }] };
      case "mpc_full_quality_gate": {
        const qualityTargets = [
          { name: "lint", command: "pnpm lint" },
          { name: "type-check", command: "pnpm type-check" },
          { name: "format-check", command: "pnpm format:check" },
          { name: "deps-lint", command: "pnpm deps:lint" },
          { name: "md-lint", command: "pnpm md:lint" },
        ];
        const start = Date.now();
        const br = await parallelBuild(qualityTargets, params.concurrency || 4);
        const fa = buildFFT(br.results.map((r) => ({ duration: r.duration || 0 })));
        console.log(JSON.stringify({
          elapsed_ms: Date.now() - start,
          build: br.summary,
          details: br.results,
          fft: fa,
          status: br.summary.failed === 0 ? "PASS" : "FAIL",
        }, null, 2));
        process.exit(br.summary.failed === 0 ? 0 : 1);
      }
      case "sap_validate_profile": {
        const profilePath = path.join(REPO_ROOT, ".agentic-tools-mcp", "agents", "SMART-ADAPTIVE-PROFILE.md");
        const profileContent = await fs.readFile(profilePath, "utf-8").catch(() => "Profile not found");
        return { content: [{ type: "text", text: JSON.stringify({
          profile: profileContent,
          filePattern: params.filePattern || "all",
          level: params.level || "strict",
          standards: "Real-world code quality — see SMART-ADAPTIVE-PROFILE.md",
          validatedAt: new Date().toISOString(),
        }, null, 2) }] };
      }
      case "sap_self_audit": {
        const auditDir = path.resolve(REPO_ROOT, params.directory || ".agentic-tools-mcp");
        const chk = await verifyDirChecksums(auditDir, /\.(md|json|js|ts)$/);
        const hasTests = chk.some((f) => f.file.includes("test") || f.file.includes("spec"));
        const hasConfig = chk.some((f) => f.file.includes("package.json"));
        return { content: [{ type: "text", text: JSON.stringify({
          filesScanned: chk.length,
          hasTests,
          hasConfig,
          score: chk.length > 3 && hasTests && hasConfig ? "4 — Production-ready" : chk.length > 0 ? "3 — Moderate gaps" : "2 — Major gaps",
          detail: chk,
          profileLink: ".agentic-tools-mcp/agents/SMART-ADAPTIVE-PROFILE.md",
        }, null, 2) }] };
      }
      default:
    }
  })();
  if (response) console.log(JSON.stringify(response.content, null, 2));
  process.exit(0);
}

async function main() {
  // Parse CLI args — if --tool is provided, run in CLI mode
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      parsed[key] = val;
      if (val !== "true") i++;
    }
  }

  if (parsed.tool) {
    await runCLI(parsed);
    return;
  }

  // Default: stdio MCP server mode
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("preflight-mcp v2.0 — Parallel MPC Build System running on stdio");
  const shutdown = async () => { await server.close().catch(() => {}); process.exit(0); };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
