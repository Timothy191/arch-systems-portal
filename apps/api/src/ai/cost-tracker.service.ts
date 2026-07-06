import { Injectable, Inject, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";

interface TokenUsage {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
  totalTokens: number | undefined;
}

const PROVIDER_MODELS: Record<string, string> = {
  primary: "gemma4:latest",
  secondary: "nomic-embed-text:latest",
};

@Injectable()
export class CostTrackerService {
  private readonly logger = new Logger(CostTrackerService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async trackUsage(
    sessionId: string,
    userId: string,
    provider: string,
    usage: TokenUsage,
    meta: { role?: string; node?: string } = {},
  ): Promise<void> {
    try {
      await this.supabase.from("ai_usage_logs").insert({
        session_id: sessionId,
        user_id: userId,
        provider,
        model: PROVIDER_MODELS[provider] ?? "local",
        prompt_tokens: usage.inputTokens,
        completion_tokens: usage.outputTokens,
        total_tokens: usage.totalTokens,
        estimated_cost_usd:
          ((usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)) * 0.000001,
        ...meta,
      });
    } catch (err) {
      this.logger.warn("Usage tracking failed (non-critical)", err);
    }
  }

  async getUsageSummary(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCostUsd: number;
    totalTokens: number;
    requestCount: number;
  }> {
    const { data, error } = await this.supabase
      .from("ai_usage_logs")
      .select("estimated_cost_usd, total_tokens")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());

    if (error) {
      throw new Error(`Usage summary query failed: ${error.message}`);
    }

    const rows = data ?? [];
    return {
      totalCostUsd: rows.reduce(
        (sum, r) => sum + (r.estimated_cost_usd ?? 0),
        0,
      ),
      totalTokens: rows.reduce((sum, r) => sum + (r.total_tokens ?? 0), 0),
      requestCount: rows.length,
    };
  }

  async getSessionUsage(sessionId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("ai_usage_logs")
        .select("*")
        .eq("session_id", sessionId)
        .limit(100);

      if (error || !data) return [];

      return data.map((row) => ({
        id: row.id,
        sessionId: row.session_id,
        userId: row.user_id,
        model: row.model,
        inputTokens: row.prompt_tokens,
        outputTokens: row.completion_tokens,
        totalTokens: row.total_tokens,
        estimatedCostUsd: row.estimated_cost_usd,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  }
}
