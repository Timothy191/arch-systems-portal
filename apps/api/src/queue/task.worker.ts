import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger, Inject } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";

@Processor("background-tasks")
export class TaskWorker extends WorkerHost {
  private readonly logger = new Logger(TaskWorker.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.name} (ID: ${job.id})`);
    const start = performance.now();

    try {
      switch (job.name) {
        case "telemetry-sync":
          await this.processTelemetrySync(job.data);
          break;
        case "generate-report":
          await this.processGenerateReport(job.data);
          break;
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }
      return { success: true };
    } catch (err) {
      this.logger.error(
        `Error processing job ${job.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    } finally {
      this.logger.debug(`Job ${job.name} took ${performance.now() - start}ms`);
    }
  }

  private async processTelemetrySync(payload: any) {
    const {
      idempotencyKey,
      actionType,
      departmentId,
      payload: dataPayload,
    } = payload;

    if (actionType === "ADD_BREAKDOWN") {
      const { data: existing } = await this.supabase
        .from("breakdowns")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) return;

      const { error } = await this.supabase.from("breakdowns").insert({
        department_id: departmentId,
        fleet_id: dataPayload.fleetId,
        machine_type: dataPayload.machineType,
        date_in: dataPayload.dateIn,
        time_in: dataPayload.timeIn || "00:00",
        reason: dataPayload.reason,
        status: "active",
        idempotency_key: idempotencyKey,
        sync_status: "synced",
      });
      if (error) throw error;
    } else if (actionType === "RESOLVE_BREAKDOWN") {
      const { error } = await this.supabase
        .from("breakdowns")
        .update({
          status: "completed",
          date_out: new Date().toISOString().split("T")[0],
          time_out: new Date().toLocaleTimeString("en-US", { hour12: false }),
          sync_status: "synced",
        })
        .eq("id", dataPayload.id);
      if (error) throw error;
    }
  }

  private async processGenerateReport(payload: any) {
    const { departmentId, dateFrom, dateTo } = payload;

    const { data: productionLogs, error: logError } = await this.supabase
      .from("production_logs")
      .select("*")
      .eq("department_id", departmentId)
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (logError) throw logError;

    const totalCoal = (productionLogs ?? []).reduce(
      (sum, log) => sum + (log.coal_tonnes ?? 0),
      0,
    );
    const totalWaste = (productionLogs ?? []).reduce(
      (sum, log) => sum + (log.waste_tonnes ?? 0),
      0,
    );

    const reportData = {
      department_id: departmentId,
      date_from: dateFrom,
      date_to: dateTo,
      total_coal_tonnes: totalCoal,
      total_waste_tonnes: totalWaste,
      generated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from("generated_reports")
      .insert(reportData);
    if (error) throw error;
  }
}
