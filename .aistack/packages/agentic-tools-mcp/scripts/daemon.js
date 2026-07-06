#!/usr/bin/env node
/**
 * Agentic Tools Memory Daemon
 *
 * Watches .agentic-tools-mcp/memories/ and tasks/tasks.json for changes and
 * prints a short summary to stderr. Designed to run as a long-lived companion
 * process during `pnpm dev` so AI tooling state is actively maintained.
 *
 * Usage:
 *   node tools/agentic-tools-mcp/scripts/daemon.js
 *
 * Environment:
 *   AGENTIC_TOOLS_REPO_ROOT  - repo root (defaults to ../..)
 *   AGENTIC_TOOLS_INTERVAL_MS - poll interval, default 5000
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = process.env.AGENTIC_TOOLS_REPO_ROOT || path.resolve(__dirname, "../..");
const STORE_DIR = path.join(REPO_ROOT, ".agentic-tools-mcp");
const MEMORIES_DIR = path.join(STORE_DIR, "memories");
const TASKS_FILE = path.join(STORE_DIR, "tasks", "tasks.json");
const INTERVAL_MS = parseInt(process.env.AGENTIC_TOOLS_INTERVAL_MS || "5000", 10);

let lastMemoryState = "";
let lastTaskState = "";

async function readMemoriesDigest() {
  try {
    const files = await fs.readdir(MEMORIES_DIR, { withFileTypes: true });
    const mdFiles = files.filter((f) => f.isFile() && f.name.endsWith(".md")).map((f) => f.name);
    const parts = [];
    for (const name of mdFiles.sort()) {
      const stat = await fs.stat(path.join(MEMORIES_DIR, name));
      parts.push(`${name}:${stat.mtimeMs}`);
    }
    return parts.join("|");
  } catch {
    return "";
  }
}

async function readTasksDigest() {
  try {
    const stat = await fs.stat(TASKS_FILE);
    return String(stat.mtimeMs);
  } catch {
    return "";
  }
}

async function summarize() {
  const memDigest = await readMemoriesDigest();
  const taskDigest = await readTasksDigest();

  if (memDigest !== lastMemoryState) {
    const count = memDigest ? memDigest.split("|").length : 0;
    console.error(`[agentic-tools-daemon] ${count} memory file(s) active`);
    lastMemoryState = memDigest;
  }

  if (taskDigest !== lastTaskState) {
    try {
      const raw = await fs.readFile(TASKS_FILE, "utf-8");
      const tasks = JSON.parse(raw);
      const total = (tasks.tasks?.length || 0) + (tasks.subtasks?.length || 0);
      console.error(`[agentic-tools-daemon] task store updated: ${tasks.projects?.length || 0} projects, ${tasks.tasks?.length || 0} tasks, ${tasks.subtasks?.length || 0} subtasks (${total} total work items)`);
    } catch {
      console.error("[agentic-tools-daemon] task store updated (could not parse)");
    }
    lastTaskState = taskDigest;
  }
}

async function main() {
  await fs.mkdir(MEMORIES_DIR, { recursive: true });
  await fs.mkdir(path.dirname(TASKS_FILE), { recursive: true });
  lastMemoryState = await readMemoriesDigest();
  lastTaskState = await readTasksDigest();
  console.error(`[agentic-tools-daemon] watching ${STORE_DIR}`);
  await summarize();
  setInterval(summarize, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[agentic-tools-daemon] fatal:", err);
  process.exit(1);
});
