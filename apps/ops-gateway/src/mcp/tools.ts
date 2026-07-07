import { z } from "zod";
import { opsClient } from "../ops-client.js";
import type { SystemSummary } from "../ops-client.js";

// ── Schema definitions ─────────────────────────────────────

const clearCacheSchema = {
  pattern: z.string().min(1).describe("Redis key pattern, e.g. 'session:*'"),
};

const rateLimitSchema = {
  limit: z
    .number()
    .int()
    .positive()
    .max(1000)
    .describe("Requests per 60-second window"),
};

const triggerAgentSchema = {
  triggerType: z.string().min(1).describe("Type of event, e.g. 'INCIDENT_DETECTED'"),
  severity: z.enum(["info", "warning", "critical"]).describe("Severity level"),
};

const readConfigSchema = {
  keys: z
    .array(z.string().min(1))
    .max(20)
    .optional()
    .describe("Specific config keys to read (omit for defaults)"),
};

const metricsFilterSchema = {
  filter: z
    .string()
    .optional()
    .describe("Optional line filter (substring match on Prometheus text)"),
};

// ── Tool handler type ──────────────────────────────────────

export type ToolHandler = (
  args: Record<string, unknown>,
) => Promise<unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: ToolHandler;
}

// ── Tool definitions ───────────────────────────────────────

export function defineTools(): ToolDefinition[] {
  return [
    // 1. System Summary
    {
      name: "ops-system-summary",
      description:
        "Get aggregate health of the NestJS backend — cache hit rate, queue depth, uptime, and memory pressure.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => {
        const summary = await opsClient.getSystemSummary();
        return formatSummary(summary);
      },
    },

    // 2. Clear Cache
    {
      name: "ops-clear-cache",
      description:
        "Clear Redis cache entries matching a key pattern. Uses non-blocking SCAN. Use during incident recovery or data staleness.",
      inputSchema: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description: clearCacheSchema.pattern.description,
          },
        },
        required: ["pattern"],
      },
      handler: async (args: Record<string, unknown>) => {
        const pattern = String(args["pattern"] ?? "");
        if (!pattern) throw new Error("pattern is required");
        return opsClient.clearCache(pattern);
      },
    },

    // 3. Queue Status
    {
      name: "ops-queue-status",
      description:
        "Get BullMQ background task queue counts — waiting, active, completed, failed, delayed.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => opsClient.getQueueCounts(),
    },

    // 4. Rate Limit Adjust
    {
      name: "ops-rate-limit-adjust",
      description:
        "Dynamically adjust the global API rate limit. Use during traffic spikes or incident mitigation to protect the backend.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: rateLimitSchema.limit.description,
          },
        },
        required: ["limit"],
      },
      handler: async (args: Record<string, unknown>) => {
        const parsed = rateLimitSchema.limit.safeParse(args["limit"]);
        if (!parsed.success) {
          throw new Error(
            `Invalid limit: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
          );
        }
        return opsClient.updateRateLimit(parsed.data);
      },
    },

    // 5. Read Config
    {
      name: "ops-read-config",
      description:
        "Read non-sensitive configuration values from the NestJS backend (allowed public keys only).",
      inputSchema: {
        type: "object",
        properties: {
          keys: {
            type: "array",
            items: { type: "string" },
            description: readConfigSchema.keys.description,
          },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        const keys = args["keys"];
        const keyList: string[] | undefined =
          Array.isArray(keys) ? keys.map(String) : undefined;
        return opsClient.readConfig(keyList);
      },
    },

    // 6. Trigger Agent
    {
      name: "ops-trigger-agent",
      description:
        "Manually push an event into the Redis trigger stream, which the incident engine picks up. Use to alert the agent about observed issues.",
      inputSchema: {
        type: "object",
        properties: {
          triggerType: {
            type: "string",
            description: triggerAgentSchema.triggerType.description,
          },
          severity: {
            type: "string",
            enum: ["info", "warning", "critical"],
            description: triggerAgentSchema.severity.description,
          },
        },
        required: ["triggerType", "severity"],
      },
      handler: async (args: Record<string, unknown>) => {
        const triggerType = String(args["triggerType"] ?? "");
        const severity = String(args["severity"] ?? "") as
          | "info"
          | "warning"
          | "critical";
        return opsClient.triggerAgent(triggerType, severity, args);
      },
    },

    // 7. Prometheus Metrics
    {
      name: "ops-get-metrics",
      description:
        "Fetch raw Prometheus metrics from the NestJS backend. Optionally filter by substring (e.g. 'cache', 'db_query').",
      inputSchema: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: metricsFilterSchema.filter.description,
          },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        // Metrics are fetched directly from the NestJS metrics endpoint
        const metricsUrl = process.env.METRICS_URL ??
          "http://host.docker.internal:3001/api/metrics";
        const response = await fetch(metricsUrl);
        if (!response.ok) {
          throw new Error(`Metrics endpoint returned ${response.status}`);
        }
        const text = await response.text();
        const filter = args["filter"];
        if (typeof filter === "string" && filter.length > 0) {
          return text
            .split("\n")
            .filter(
              (line) =>
                line.startsWith("#") || line.includes(filter),
            )
            .join("\n");
        }
        return text;
      },
    },

    // 8. Health Check
    {
      name: "ops-health-check",
      description:
        "Run a full health check against the NestJS backend — Supabase DB, Redis, and liveness probe.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => {
        const healthUrl = process.env.HEALTH_URL ??
          "http://host.docker.internal:3001/api/health";
        const [healthRes, liveRes] = await Promise.all([
          fetch(healthUrl).catch((): { ok: false; statusText: string } => ({
            ok: false,
            statusText: "fetch failed",
          })),
          fetch(`${healthUrl}/live`).catch(
            (): { ok: false; statusText: string } => ({
              ok: false,
              statusText: "fetch failed",
            }),
          ),
        ]);
        let healthBody: Record<string, unknown> | null = null;
        if (healthRes.ok && typeof (healthRes as Response).json === "function") {
          healthBody = await (healthRes as Response)
            .json()
            .catch((): null => null) as Record<string, unknown> | null;
        }
        return {
          liveness: liveRes.ok ? "ok" : "unreachable",
          health: healthBody,
          timestamp: new Date().toISOString(),
        };
      },
    },

    // 9. Database Audit — Run Full Audit
    {
      name: "db-audit-run",
      description:
        "Run a full database integrity audit across all operational tables. Checks RLS, audit triggers, orphaned rows, missing required fields, duplicates, stale data.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => opsClient.runAudit(),
    },

    // 10. Database Audit — Get Last Report
    {
      name: "db-audit-report",
      description:
        "Get the most recent database audit report. Returns null if no audit has been run this session.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => opsClient.getAuditStatus(),
    },

    // 11. Database Audit — Repair (approval-gated)
    {
      name: "db-repair",
      description:
        "Run an auto-repair for a specific issue category on a table. Safe, targeted operations: delete orphaned rows, remove stale records, etc. " +
        "⚠️ Requires confirm=true to execute. Without confirm, returns a preview of what the repair would do.",
      inputSchema: {
        type: "object",
        properties: {
          tableName: {
            type: "string",
            description: "Table to repair, e.g. 'audit_logs'",
          },
          issueCategory: {
            type: "string",
            enum: [
              "orphaned_rows",
              "missing_required",
              "duplicates",
              "stale_data",
              "rls_disabled",
              "no_audit_trigger",
              "constraint_violation",
              "suspicious_null",
              "data_anomaly",
            ],
            description: "Type of issue to fix",
          },
          confirm: {
            type: "boolean",
            description:
              "Must be true to execute the repair. If absent or false, returns a preview instead.",
          },
        },
        required: ["tableName", "issueCategory"],
      },
      handler: async (args: Record<string, unknown>) => {
        const tableName = String(args["tableName"] ?? "");
        const issueCategory = String(args["issueCategory"] ?? "");
        const confirm = args["confirm"] === true;
        if (!tableName) throw new Error("tableName is required");
        if (!issueCategory) throw new Error("issueCategory is required");
        if (!confirm) {
          return {
            preview: true,
            message: `Repair preview: would fix "${issueCategory}" on "${tableName}". Pass confirm=true to execute.`,
            tableName,
            issueCategory,
            action: `Apply auto-repair for ${issueCategory.replace(/_/g, " ")}`,
            consequence:
              "This operation may DELETE or UPDATE rows to fix data integrity issues.",
          };
        }
        return opsClient.runRepair(tableName, issueCategory);
      },
    },

    // 12. Database Audit — Safe Query (validated)
    {
      name: "db-query",
      description:
        "Run a safe read-only SELECT query against the database. Max 500 rows, 10s timeout. Only SELECT statements allowed. Input validated in MCP handler.",
      inputSchema: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description:
              "SELECT query to run (max 2000 chars). Must start with SELECT (case-insensitive).",
          },
        },
        required: ["sql"],
      },
      handler: async (args: Record<string, unknown>) => {
        const sql = String(args["sql"] ?? "").trim();
        if (!sql) throw new Error("sql is required");
        // Defense-in-depth: verify SELECT-only at MCP handler level
        const upper = sql.toUpperCase();
        if (!upper.startsWith("SELECT")) {
          throw new Error(
            "Only SELECT queries are allowed. Query must start with SELECT.",
          );
        }
        if (sql.length > 2000) {
          throw new Error("SQL must be at most 2000 characters");
        }
        if (sql.length < 4) {
          throw new Error("SQL must be at least 4 characters");
        }
        return opsClient.runSafeQuery(sql);
      },
    },
  ];
}

// ── Utils ──────────────────────────────────────────────────

function formatSummary(summary: SystemSummary): Record<string, unknown> {
  return {
    healthy: summary.healthy,
    cacheHitRate:
      summary.cacheHitRate !== null
        ? `${(summary.cacheHitRate * 100).toFixed(1)}%`
        : "unknown",
    queue: summary.queue ?? "unavailable",
    uptime: `${Math.floor(summary.uptime / 60)}m ${Math.floor(summary.uptime % 60)}s`,
    memory: summary.memory
      ? {
          rssMb: +(summary.memory.rss / 1024 / 1024).toFixed(1),
          heapUsedMb: +(summary.memory.heapUsed / 1024 / 1024).toFixed(1),
          heapTotalMb: +(summary.memory.heapTotal / 1024 / 1024).toFixed(1),
        }
      : "unavailable",
  };
}
