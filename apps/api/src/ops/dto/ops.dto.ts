import { z } from "zod";

// ── Cache operations ──────────────────────────────────────
export const clearCacheSchema = z.object({
  pattern: z.string().min(1).describe("Redis key pattern to clear, e.g. 'session:*'"),
});

export type ClearCacheDto = z.infer<typeof clearCacheSchema>;

// ── Queue operations ──────────────────────────────────────
export const queueActionSchema = z.object({
  queue: z.enum(["background-tasks"]).describe("Queue name"),
  action: z.enum(["pause", "resume", "getJobCounts"]).describe("Action to take"),
});

export type QueueActionDto = z.infer<typeof queueActionSchema>;

// ── Rate limit operations ─────────────────────────────────
export const updateRateLimitSchema = z.object({
  limit: z.number().int().positive().max(1000).describe("Requests per 60s window"),
});

export type UpdateRateLimitDto = z.infer<typeof updateRateLimitSchema>;

// ── Config read operation ─────────────────────────────────
export const readConfigSchema = z.object({
  keys: z
    .array(z.string().min(1))
    .max(20)
    .optional()
    .describe("Specific env keys to read (omit for allowed-public list)"),
});

export type ReadConfigDto = z.infer<typeof readConfigSchema>;

// ── Trigger agent operation ────────────────────────────────
export const triggerAgentSchema = z.object({
  triggerType: z.string().min(1).describe("Type of trigger, e.g. 'INCIDENT_DETECTED'"),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  context: z.record(z.string(), z.unknown()).default({}).describe("Arbitrary context payload"),
});

export type TriggerAgentDto = z.infer<typeof triggerAgentSchema>;

// ── Responses ──────────────────────────────────────────────
export interface OpsResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
// ── Database audit operations ─────────────────────────────
export const runAuditSchema = z.object({
  tables: z
    .array(z.string().min(1))
    .max(30)
    .optional()
    .describe("Specific tables to audit (omit for all)"),
});

export type RunAuditDto = z.infer<typeof runAuditSchema>;

export const repairDataSchema = z.object({
  tableName: z.string().min(1).describe("Table to repair"),
  issueCategory: z
    .enum([
      "orphaned_rows",
      "missing_required",
      "duplicates",
      "stale_data",
      "rls_disabled",
      "no_audit_trigger",
      "constraint_violation",
      "suspicious_null",
      "data_anomaly",
    ])
    .describe("Type of issue to repair"),
});

export type RepairDataDto = z.infer<typeof repairDataSchema>;

export const safeQuerySchema = z.object({
  sql: z.string().min(4).max(2000).describe("SELECT query to run"),
});

export type SafeQueryDto = z.infer<typeof safeQuerySchema>;
