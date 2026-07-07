// ── Eve agent types ─────────────────────────────────────────
// Eve = TUI agent (opencode/kilo/agy) dispatched for investigation & repair

export type EveId = "opencode" | "kilo" | "agy";

export interface EveConfig {
  id: EveId;
  cliPath: string;
  enabled: boolean;
  autoApprove: boolean;
  timeoutMs: number;
}

export type DispatchStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "timed_out";

export type DispatchTrigger =
  | "incident"
  | "trigger"
  | "mcp"
  | "manual";

export interface EveDispatch {
  id: string;
  eve: EveId;
  task: string;
  prompt: string;
  status: DispatchStatus;
  context?: Record<string, unknown>;
  triggeredBy: DispatchTrigger;
  triggerRef?: string;
  createdAt: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

export interface DispatchTask {
  prompt: string;
  eve?: EveId;
  context?: Record<string, unknown>;
  triggeredBy: DispatchTrigger;
  triggerRef?: string;
  task: string;
}

// ── Default configs ─────────────────────────────────────────

export const DEFAULT_EVE_CONFIGS: EveConfig[] = [
  {
    id: "opencode",
    cliPath: "opencode",
    enabled: true,
    autoApprove: false,
    timeoutMs: 120_000,
  },
  {
    id: "kilo",
    cliPath: "kilo",
    enabled: true,
    autoApprove: false,
    timeoutMs: 120_000,
  },
  {
    id: "agy",
    cliPath: "agy",
    enabled: true,
    autoApprove: false,
    timeoutMs: 120_000,
  },
];
