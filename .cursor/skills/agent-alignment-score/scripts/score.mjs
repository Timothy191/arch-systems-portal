#!/usr/bin/env node
/**
 * Alignment score helper for Arch Systems agents.
 * Rubric mirrors .cursor/rules/02-agent-scoring.mdc
 *
 * Usage:
 *   node score.mjs --spec 20 --stack 15 --boundaries 15 --security 20 --quality 15 --verify 15
 *   node score.mjs --interactive
 *   node score.mjs --json ...
 */

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const MAX = {
  spec: 20,
  stack: 15,
  boundaries: 15,
  security: 20,
  quality: 15,
  verify: 15,
};

const PASS = 80;

function parseArgs(argv) {
  const out = {
    interactive: false,
    json: false,
    hardFail: false,
    hardFailReasons: [],
    scores: { ...Object.fromEntries(Object.keys(MAX).map((k) => [k, null])) },
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--interactive" || a === "-i") out.interactive = true;
    else if (a === "--json") out.json = true;
    else if (a === "--hard-fail") {
      const v = argv[++i];
      out.hardFail = v === "true" || v === "1";
    } else if (a === "--hard-fail-reason") {
      out.hardFailReasons.push(argv[++i] ?? "");
    } else if (a.startsWith("--") && a.slice(2) in MAX) {
      const key = a.slice(2);
      const n = Number(argv[++i]);
      if (Number.isNaN(n)) throw new Error(`Invalid number for ${a}`);
      out.scores[key] = clamp(n, 0, MAX[key]);
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return out;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function printHelp() {
  console.log(`Alignment score (pass >= ${PASS})

Dimensions (max):
  --spec ${MAX.spec}  --stack ${MAX.stack}  --boundaries ${MAX.boundaries}
  --security ${MAX.security}  --quality ${MAX.quality}  --verify ${MAX.verify}

Flags:
  --interactive / -i
  --hard-fail true|false
  --hard-fail-reason "..."
  --json
`);
}

async function promptScores(scores) {
  const rl = readline.createInterface({ input, output });
  try {
    console.log("Score each dimension (or press Enter for max). Hard-fail? answers last.\n");
    for (const [key, max] of Object.entries(MAX)) {
      const ans = await rl.question(`${key} (0-${max}) [${max}]: `);
      if (ans.trim() === "") scores[key] = max;
      else scores[key] = clamp(Number(ans), 0, max);
    }
    const hf = await rl.question("Any AGENTS.md §18 never-do violation? (y/N): ");
    return hf.trim().toLowerCase().startsWith("y");
  } finally {
    rl.close();
  }
}

function compute(scores, hardFail) {
  if (hardFail) {
    return { total: 0, pass: false, hardFail: true, scores };
  }
  const total = Object.values(scores).reduce((a, b) => a + (b ?? 0), 0);
  return { total, pass: total >= PASS, hardFail: false, scores };
}

function formatReport(result, reasons) {
  const label = result.pass ? "PASS" : "FAIL";
  const lines = [
    `Alignment: ${result.total}/100 [${label}]`,
    `- Spec: ${result.scores.spec}/${MAX.spec}`,
    `- Stack: ${result.scores.stack}/${MAX.stack}`,
    `- Boundaries: ${result.scores.boundaries}/${MAX.boundaries}`,
    `- Security: ${result.scores.security}/${MAX.security}`,
    `- Quality: ${result.scores.quality}/${MAX.quality}`,
    `- Verify: ${result.scores.verify}/${MAX.verify}`,
    `Hard fails: ${result.hardFail ? reasons.join("; ") || "§18 violation" : "none"}`,
  ];
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let hardFail = args.hardFail;

  if (args.interactive) {
    hardFail = await promptScores(args.scores);
  } else {
    for (const key of Object.keys(MAX)) {
      if (args.scores[key] === null) {
        console.error(`Missing --${key}. Use --interactive or pass all dimensions.`);
        process.exit(2);
      }
    }
  }

  const result = compute(args.scores, hardFail);
  const report = formatReport(result, args.hardFailReasons);

  if (args.json) {
    console.log(JSON.stringify({ ...result, report, passThreshold: PASS }, null, 2));
  } else {
    console.log(report);
  }

  process.exit(result.pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(2);
});
