import { Injectable, Inject } from "@nestjs/common";
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from "@nestjs/terminus";
import { SUPABASE_CLIENT } from "../../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      const { error } = await this.supabase
        .from("departments")
        .select("id")
        .limit(1);

      if (error && error.message?.includes("relation")) {
        throw new Error(error.message);
      }

      return this.getStatus("database", true);
    } catch (err) {
      throw new HealthCheckError(
        "Database check failed",
        this.getStatus("database", false, { message: (err as Error).message }),
      );
    }
  }
}
