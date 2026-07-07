import { spawn } from "node:child_process";

import { Logger } from "../logger.js";
import { config } from "../config.js";
import {
  type EveConfig,
  type EveDispatch,
  type EveId,
  type DispatchStatus,
  type DispatchTask,
  DEFAULT_EVE_CONFIGS,
} from "./types.js";

const logger = new Logger("eve-dispatcher");

// ── State ──────────────────────────────────────────────────

const eveConfigs: EveConfig[] = resolveEveConfigs();
const pendingDispatches = new Map<string, EveDispatch>();
let dispatchCounter = 0;

// ── Public API ─────────────────────────────────────────────

export function getConfiguredEves(): EveConfig[] {
  return eveConfigs.filter((e) => e.enabled).map((e) => ({ ...e }));
}

export function getDispatches(): EveDispatch[] {
  return [...pendingDispatches.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getDispatch(id: string): EveDispatch | undefined {
  return pendingDispatches.get(id);
}

export function resolveLatestDispatches(limit = 5): EveDispatch[] {
  return [...pendingDispatches.values()]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

export async function dispatchTask(task: DispatchTask): Promise<EveDispatch> {
  const eve = pickEve(task.eve);
  if (!eve) {
    throw new Error("No enabled Eve agent available");
  }

  const dispatch: EveDispatch = {
    id: generateId(),
    eve: eve.id,
    task: task.task,
    prompt: task.prompt,
    status: "pending",
    triggeredBy: task.triggeredBy,
    triggerRef: task.triggerRef,
    createdAt: new Date().toISOString(),
  };

  pendingDispatches.set(dispatch.id, dispatch);
  logger.info(
    `Dispatch ${dispatch.id} assigned to ${eve.id} (triggeredBy: ${task.triggeredBy})`,
  );

  // Fire-and-forget spawn
  spawnEveProcess(eve, dispatch).catch((err) => {
    logger.error(`Dispatch ${dispatch.id} failed: ${err.message}`);
  });

  return dispatch;
}

// ── Eve selection ──────────────────────────────────────────

function pickEve(preferred?: EveId): EveConfig | null {
  if (preferred) {
    const eve = eveConfigs.find((e) => e.id === preferred && e.enabled);
    if (eve) return eve;
    logger.warn(`Preferred eve ${preferred} not available, falling back`);
  }
  return eveConfigs.find((e) => e.enabled) ?? null;
}

// ── Process spawning ───────────────────────────────────────

async function spawnEveProcess(
  eve: EveConfig,
  dispatch: EveDispatch,
): Promise<void> {
  updateStatus(dispatch, "running");

  const cwd = config.projectRoot ?? process.cwd();
  const args = buildEveArgs(eve, dispatch.prompt, cwd);

  logger.info(
    `Spawning ${eve.id} for dispatch ${dispatch.id}: ${eve.cliPath} ${args.join(" ")}`,
  );

  const child = spawn(eve.cliPath, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: eve.timeoutMs,
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

  try {
    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Exit code ${code}`));
        }
      });
      child.on("error", reject);
    });

    const output = Buffer.concat(stdoutChunks).toString("utf-8");
    completeDispatch(dispatch, output);
  } catch (err) {
    const stderr = Buffer.concat(stderrChunks).toString("utf-8");
    failDispatch(
      dispatch,
      `${err instanceof Error ? err.message : String(err)}\n${stderr}`.trim(),
    );
  }
}

function buildEveArgs(eve: EveConfig, prompt: string, cwd: string): string[] {
  switch (eve.id) {
    case "opencode":
      return buildOpencodeArgs(prompt, cwd, eve.autoApprove);
    case "kilo":
      return buildKiloArgs(prompt, cwd, eve.autoApprove);
    case "agy":
      return buildAgyArgs(prompt, cwd, eve.autoApprove);
  }
}

function buildOpencodeArgs(
  prompt: string,
  cwd: string,
  autoApprove: boolean,
): string[] {
  const args = ["run", prompt, "--dir", cwd];
  if (autoApprove) args.push("--auto");
  return args;
}

function buildKiloArgs(
  prompt: string,
  cwd: string,
  autoApprove: boolean,
): string[] {
  const args = ["run", prompt, "--dir", cwd];
  if (autoApprove) args.push("--auto");
  return args;
}

function buildAgyArgs(
  prompt: string,
  cwd: string,
  autoApprove: boolean,
): string[] {
  const args = ["--print", prompt, "--add-dir", cwd];
  if (autoApprove) args.push("--dangerously-skip-permissions");
  return args;
}

// ── Status helpers ─────────────────────────────────────────

function updateStatus(dispatch: EveDispatch, status: DispatchStatus): void {
  dispatch.status = status;
}

function completeDispatch(dispatch: EveDispatch, output: string): void {
  dispatch.status = "completed";
  dispatch.completedAt = new Date().toISOString();
  dispatch.output = output;
  logger.info(`Dispatch ${dispatch.id} completed (${output.length} bytes)`);
}

function failDispatch(dispatch: EveDispatch, error: string): void {
  dispatch.status = "failed";
  dispatch.completedAt = new Date().toISOString();
  dispatch.error = error;
  logger.error(`Dispatch ${dispatch.id} failed: ${error}`);
}

// ── Config resolution ─────────────────────────────────────

function resolveEveConfigs(): EveConfig[] {
  return DEFAULT_EVE_CONFIGS.map((defaultConfig) => {
    const prefix = `EVE_${defaultConfig.id.toUpperCase()}`;
    return {
      ...defaultConfig,
      enabled: defaultEnabled(prefix),
      autoApprove: defaultAutoApprove(prefix),
      timeoutMs: Number(
        process.env[`${prefix}_TIMEOUT_MS`] ?? defaultConfig.timeoutMs,
      ),
    };
  });
}

function defaultEnabled(prefix: string): boolean {
  const raw = process.env[`${prefix}_ENABLED`];
  if (raw === undefined) return true;
  return raw === "1" || raw === "true";
}

function defaultAutoApprove(prefix: string): boolean {
  const raw = process.env[`${prefix}_AUTO_APPROVE`];
  if (raw === undefined) return false;
  return raw === "1" || raw === "true";
}

// ── ID generation ──────────────────────────────────────────

function generateId(): string {
  dispatchCounter++;
  const stamp = Date.now().toString(36);
  const seq = dispatchCounter.toString(36).padStart(4, "0");
  return `eve-${stamp}-${seq}`;
}
