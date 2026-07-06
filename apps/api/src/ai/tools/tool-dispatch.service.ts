import { Injectable, Inject, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../../supabase/supabase.constants";
import { OllamaService, type OllamaMessage } from "../ollama/ollama.service";
import { systemPrompts } from "../prompts/prompt-registry.service";
import { ToolCacheService } from "./tool-cache.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

interface ToolDispatchResult {
  tool: string | null;
  args: Record<string, unknown>;
  confidence: number;
  reason: string;
}

interface AiToolDefinition {
  description: string;
  inputSchema: z.ZodObject<any>;
  execute: (args: any) => Promise<unknown>;
}

@Injectable()
export class ToolDispatchService {
  private readonly logger = new Logger(ToolDispatchService.name);
  private readonly tools: Record<string, AiToolDefinition>;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly ollamaService: OllamaService,
    private readonly toolCacheService: ToolCacheService,
  ) {
    this.tools = this.buildToolDefinitions();
  }

  getToolNames(): string[] {
    return Object.keys(this.tools);
  }

  getTool(name: string): AiToolDefinition | undefined {
    return this.tools[name];
  }

  async dispatch(messageText: string): Promise<ToolDispatchResult | null> {
    if (!messageText?.trim()) return null;

    const native = await this.tryNativeDispatch(messageText);
    if (native) return native;

    const fallback = await this.tryJsonFallbackDispatch(messageText);
    if (fallback) return fallback;

    this.logger.warn("Tool dispatch: both native and fallback failed");
    return null;
  }

  async executeTool(
    userId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    // Check cache first
    const cached = this.toolCacheService.get(userId, toolName, args);
    if (cached !== undefined) return cached;

    const tool = this.tools[toolName];
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);

    const result = await tool.execute(args);

    // Cache with tool-specific TTL
    const ttlMap: Record<string, number> = {
      machineStatus: 15_000,
      fleetStatus: 30_000,
      shiftLogs: 60_000,
      delays: 15_000,
    };
    this.toolCacheService.set(
      userId,
      toolName,
      args,
      result,
      ttlMap[toolName] ?? 5_000,
    );

    return result;
  }

  formatToolDescriptions(): string {
    return Object.entries(this.tools)
      .map(([name, tool]) => {
        const params = Object.keys(tool.inputSchema.shape).join(", ");
        return `- ${name}(${params}): ${tool.description}`;
      })
      .join("\n");
  }

  private buildToolDefinitions(): Record<string, AiToolDefinition> {
    return {
      machineStatus: {
        description:
          "Get current status and details of machines in a department",
        inputSchema: z.object({
          departmentName: z
            .string()
            .describe("Department name to query machines for"),
        }),
        execute: async ({ departmentName }: { departmentName: string }) => {
          const { data: dept } = await this.supabase
            .from("departments")
            .select("id")
            .eq("name", departmentName)
            .single();
          if (!dept) return { error: "Department not found" };
          const { data: machines } = await this.supabase
            .from("machines")
            .select("id, name, machine_type, active")
            .eq("department_id", dept.id);
          return { machines: machines ?? [] };
        },
      },
      fleetStatus: {
        description:
          "Get real-time operational status of the vehicle fleet including active breakdowns",
        inputSchema: z.object({
          fleetCode: z
            .string()
            .optional()
            .describe(
              "Specific fleet code to check. If omitted, returns overview of all active fleet.",
            ),
        }),
        execute: async ({ fleetCode }: { fleetCode?: string }) => {
          let query = this.supabase
            .from("fleet")
            .select("id, fleet_code, vehicle_type, status, make, model");
          if (fleetCode) query = query.eq("fleet_code", fleetCode);
          const { data: fleet, error: fleetError } = await query;
          if (fleetError) return { error: fleetError.message };

          const { data: breakdowns } = await this.supabase
            .from("breakdowns")
            .select("fleet_id, reason, date_in, time_in")
            .eq("status", "active")
            .is("deleted_at", null);

          const breakdownMap = new Map(
            (breakdowns ?? []).map((b) => [b.fleet_id, b]),
          );
          const report = (fleet ?? []).map((v) => ({
            ...v,
            is_down: breakdownMap.has(v.fleet_code),
            breakdown_details: breakdownMap.get(v.fleet_code) || null,
          }));

          return {
            timestamp: new Date().toISOString(),
            count: report.length,
            vehicles: report,
          };
        },
      },
      shiftLogs: {
        description: "Get recent shift logs for a department",
        inputSchema: z.object({
          departmentName: z.string().describe("Department name"),
          date: z
            .string()
            .optional()
            .describe("ISO date string, defaults to today"),
        }),
        execute: async ({
          departmentName,
          date,
        }: {
          departmentName: string;
          date?: string;
        }) => {
          const { data: dept } = await this.supabase
            .from("departments")
            .select("id")
            .eq("name", departmentName)
            .single();
          if (!dept) return { error: "Department not found" };
          const targetDate = date ?? new Date().toISOString().split("T")[0];
          const { data: logs } = await this.supabase
            .from("daily_logs")
            .select("id, log_date, shift")
            .eq("department_id", dept.id)
            .eq("log_date", targetDate);
          return { logs: logs ?? [] };
        },
      },
      delays: {
        description: "Get operational delays for a department on a given date",
        inputSchema: z.object({
          departmentName: z.string().describe("Department name"),
          date: z
            .string()
            .optional()
            .describe("ISO date string, defaults to today"),
        }),
        execute: async ({
          departmentName,
          date,
        }: {
          departmentName: string;
          date?: string;
        }) => {
          const { data: dept } = await this.supabase
            .from("departments")
            .select("id")
            .eq("name", departmentName)
            .single();
          if (!dept) return { error: "Department not found" };
          const targetDate = date ?? new Date().toISOString().split("T")[0];
          const { data: delays } = await this.supabase
            .from("operational_delays")
            .select("delay_minutes, status, reason")
            .eq("department_id", dept.id)
            .eq("delay_date", targetDate);
          return { delays: delays ?? [] };
        },
      },
    };
  }

  private async tryNativeDispatch(
    messageText: string,
  ): Promise<ToolDispatchResult | null> {
    const messages: OllamaMessage[] = [
      { role: "system", content: systemPrompts.chat() },
      { role: "user", content: messageText },
    ];

    try {
      const response = await this.ollamaService.chat(messages, {
        temperature: 0.1,
        maxTokens: 512,
      });

      // Try to parse JSON response for tool dispatch
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      const tool = parsed.tool ?? null;
      const confidence =
        typeof parsed.confidence === "number" ? parsed.confidence : 5;
      const reason = typeof parsed.reason === "string" ? parsed.reason : "";
      const args =
        parsed.args && typeof parsed.args === "object" ? parsed.args : {};

      if (tool !== null && !this.tools[tool]) {
        return {
          tool: null,
          args: {},
          confidence: 1,
          reason: `LLM requested unknown tool "${tool}"`,
        };
      }

      return { tool, args, confidence, reason };
    } catch {
      return null;
    }
  }

  private async tryJsonFallbackDispatch(
    messageText: string,
  ): Promise<ToolDispatchResult | null> {
    const messages: OllamaMessage[] = [
      { role: "system", content: systemPrompts.chat() },
      { role: "user", content: messageText },
    ];

    try {
      const response = await this.ollamaService.chat(messages, {
        temperature: 0.1,
        maxTokens: 512,
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      const tool = parsed.tool ?? null;
      const confidence =
        typeof parsed.confidence === "number" ? parsed.confidence : 5;
      const reason = typeof parsed.reason === "string" ? parsed.reason : "";
      const args =
        parsed.args && typeof parsed.args === "object" ? parsed.args : {};

      if (tool !== null && !this.tools[tool]) {
        return {
          tool: null,
          args: {},
          confidence: 1,
          reason: `LLM requested unknown tool "${tool}"`,
        };
      }

      return { tool, args, confidence, reason };
    } catch {
      return null;
    }
  }
}
