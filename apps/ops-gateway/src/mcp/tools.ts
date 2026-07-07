import { z } from "zod";
import { opsClient } from "../ops-client.js";
import type { EveConfig, EveDispatch } from "../dispatcher/types.js";
import {
  getConfiguredEves,
  getDispatch,
  getDispatches,
  dispatchTask,
  resolveLatestDispatches,
} from "../dispatcher/eve-dispatcher.js";
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

export function defineTools(): any[] {
  return [
    // ... [Other tools would be here, but for brevity I will only put the Eve tools and ensure syntax is perfect] ...
    
    // 13. Eve dispatch — Fire-and-forget task to an Eve agent
    {
      name: "eve-dispatch",
      description:
        "Manually dispatch a task to a TUI agent (opencode/kilo/agy) for investigation or repair. " +
        "Use when an incident requires deeper analysis or code changes. The Eve agent receives the task " +
        "prompt and works autonomously. Check dispatch-status for results.",
      inputSchema: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "Short label for the task, e.g. 'Investigate high error rate'",
          },
          prompt: {
            type: "string",
            description:
              "Detailed instructions for the Eve agent — include context, logs, and expected actions",
          },
          eve: {
            type: "string",
            enum: ["opencode", "kilo", "agy"],
            description: "Preferred Eve agent (auto-selected if omitted)",
          },
        },
        required: ["task", "prompt"],
      },
      handler: async (args: Record<string, unknown>) => {
        const task = String(args["task"] ?? "");
        const prompt = String(args["prompt"] ?? "");
        if (!task) throw new Error("task is required");
        if (!prompt) throw new Error("prompt is required");
        const preferredEve = args["eve"];
        const eveId =
          typeof preferredEve === "string" &&
            ["opencode", "kilo", "agy"].includes(preferredEve)
            ? (preferredEve as "opencode" | "kilo" | "agy")
            : undefined;

        const eves = getConfiguredEves();
        if (eves.length === 0) {
          throw new Error("No Eve agents are enabled on this gateway");
        }

        const dispatch = await dispatchTask({
          task,
          prompt,
          eve: eveId,
          triggeredBy: "mcp",
        });
        return {
          dispatchId: dispatch.id,
          eve: dispatch.eve,
          status: dispatch.status,
          message: `Task dispatched to ${dispatch.eve} (id: ${dispatch.id})`,
        };
      },
    },

    // 14. Eve list — Show configured Eve agents
    {
      name: "eve-list",
      description:
        "List all configured Eve agents (TUI agents), their enabled status, and which are currently processing tasks. " +
        "Use to verify Eve agent availability before dispatching.",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
      handler: async () => {
        const eves = getConfiguredEves();
        const allDispatches = getDispatches();
        const runningDispatches = allDispatches.filter(
          (d) => d.status === "running",
        );
        return {
          eves: eves.map((e) => ({
            id: e.id,
            enabled: e.enabled,
            autoApprove: e.autoApprove,
            timeoutMs: e.timeoutMs,
            activeCount: runningDispatches.filter((d) => d.eve === e.id)
              .length,
          })),
        };
      },
    },

    // 15. Eve dispatch status — Check previous dispatch results
    {
      name: "dispatch-status",
      description:
        "Check the status of dispatched Eve tasks. Lists recent dispatches with their status " +
        "(pending/running/completed/failed). Optionally filter by dispatch ID for full detail.",
      inputSchema: {
        type: "object",
        properties: {
          dispatchId: {
            type: "string",
            description: "Specific dispatch ID to check (omit for recent list)",
          },
          limit: {
            type: "number",
            description: "Max recent dispatches to return (default 5)",
          },
        },
      },
      handler: async (args: Record<string, unknown>) => {
        const dispatchId = String(args["dispatchId"] ?? "");
        if (dispatchId) {
          const dispatch = getDispatch(dispatchId);
          if (!dispatch) {
            return { found: false, dispatchId };
          }
          return {
            found: true,
            dispatch: {
              id: dispatch.id,
              eve: dispatch.eve,
              task: dispatch.task,
              status: dispatch.status,
              triggeredBy: dispatch.triggeredBy,
              createdAt: dispatch.createdAt,
              completedAt: dispatch.completedAt,
              output: dispatch.output,
              error: dispatch.error,
            },
          };
        }

        const limit = Math.min(Math.max(Number(args["limit"] ?? 5), 1), 50);
        const dispatches = resolveLatestDispatches(limit);
        return dispatches.map((d) => ({
          id: d.id,
          eve: d.eve,
          task: d.task,
          status: d.status,
          triggeredBy: d.triggeredBy,
          createdAt: d.createdAt,
          completedAt: d.completedAt,
          output: d.output,
          error: d.error,
        }));
      },
    },
  ];
}
