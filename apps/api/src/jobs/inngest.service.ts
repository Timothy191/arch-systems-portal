import { Injectable, Inject, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import {
  inngest,
  syncPlaybackEvent,
  generateReportEvent,
  aiGenerateEmbeddingEvent,
  aiMemoryPersistEvent,
} from "@repo/utils/inngest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InngestFunction } from "inngest";

@Injectable()
export class InngestService {
  private readonly logger = new Logger(InngestService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  getClient() {
    return inngest;
  }

  getFunctions(): InngestFunction.Any[] {
    return [
      this.createSyncPlaybackFunction(),
      this.createGenerateReportFunction(),
      this.createGenerateEmbeddingFunction(),
      this.createMemoryPersistFunction(),
    ];
  }

  private createSyncPlaybackFunction(): InngestFunction.Any {
    return inngest.createFunction(
      { id: "sync-playback", triggers: [{ event: syncPlaybackEvent }] },
      async ({ event }) => {
        const { idempotencyKey, actionType, payload, departmentId } = event.data as {
          idempotencyKey: string;
          actionType: string;
          payload: Record<string, any>;
          departmentId: string;
        };
        const start = performance.now();
        let success = true;

        try {
          if (actionType === "ADD_BREAKDOWN") {
            const { data: existing } = await this.supabase
              .from("breakdowns")
              .select("id")
              .eq("idempotency_key", idempotencyKey)
              .maybeSingle();

            if (existing) return { success: true, bypassed: true };

            const { error } = await this.supabase.from("breakdowns").insert({
              department_id: departmentId,
              fleet_id: payload.fleetId,
              machine_type: payload.machineType,
              date_in: payload.dateIn,
              time_in: payload.timeIn || "00:00",
              reason: payload.reason,
              status: "active",
              idempotency_key: idempotencyKey,
              sync_status: "synced",
            });

            if (error) throw error;
            return { success: true };
          }

          if (actionType === "RESOLVE_BREAKDOWN") {
            const { error } = await this.supabase
              .from("breakdowns")
              .update({
                status: "completed",
                date_out: new Date().toISOString().split("T")[0],
                time_out: new Date().toLocaleTimeString("en-US", { hour12: false }),
                sync_status: "synced",
              })
              .eq("id", payload.id);

            if (error) throw error;
            return { success: true };
          }

          if (actionType === "ADD_SAFETY_INCIDENT") {
            const { data: existing } = await this.supabase
              .from("safety_incidents")
              .select("id")
              .eq("idempotency_key", idempotencyKey)
              .maybeSingle();

            if (existing) return { success: true, bypassed: true };

            const { error } = await this.supabase.from("safety_incidents").insert({
              department_id: departmentId,
              incident_date: payload.incidentDate,
              shift_type: payload.shiftType,
              incident_type: payload.incidentType,
              description: payload.description,
              location: payload.location,
              status: "open",
              idempotency_key: idempotencyKey,
              sync_status: "synced",
            });

            if (error) throw error;
            return { success: true };
          }

          if (actionType === "ADD_DAILY_LOG") {
            const { data: existing } = await this.supabase
              .from("daily_logs")
              .select("id")
              .eq("idempotency_key", idempotencyKey)
              .maybeSingle();

            if (existing) return { success: true, bypassed: true };

            const { error } = await this.supabase.from("daily_logs").insert({
              department_id: departmentId,
              log_date: payload.logDate,
              shift: payload.shift,
              notes: payload.notes,
              idempotency_key: idempotencyKey,
              sync_status: "synced",
            });

            if (error) throw error;
            return { success: true };
          }

          return { error: `Unknown action type: ${actionType}` };
        } catch (err) {
          success = false;
          this.logger.error("sync_playback_job", err instanceof Error ? err.stack : String(err));
          throw err;
        } finally {
          this.logger.debug(`sync-playback job took ${performance.now() - start}ms`, { success });
        }
      },
    );
  }

  private createGenerateReportFunction(): InngestFunction.Any {
    return inngest.createFunction(
      { id: "generate-shift-report", triggers: [{ event: generateReportEvent }] },
      async ({ event }) => {
        const { departmentId, dateFrom, dateTo } = event.data as {
          departmentId: string;
          dateFrom: string;
          dateTo: string;
        };
        const start = performance.now();
        let success = true;

        try {
          const { data: productionLogs } = await this.supabase
            .from("production_logs")
            .select("*")
            .eq("department_id", departmentId)
            .gte("date", dateFrom)
            .lte("date", dateTo);

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

          const { error } = await this.supabase.from("generated_reports").insert(reportData);
          if (error) throw error;

          return { success: true, report: reportData };
        } catch (err) {
          success = false;
          this.logger.error("generate_report_job", err instanceof Error ? err.stack : String(err));
          throw err;
        } finally {
          this.logger.debug(`generate-shift-report job took ${performance.now() - start}ms`, { success });
        }
      },
    );
  }

  private createGenerateEmbeddingFunction(): InngestFunction.Any {
    return inngest.createFunction(
      { id: "generate-embedding", triggers: [{ event: aiGenerateEmbeddingEvent }] },
      async ({ event }) => {
        const start = performance.now();
        let success = true;

        try {
          // Embedding generation depends on the Ollama provider pipeline.
          // For the API migration, this job remains a no-op logger until the
          // embedding pipeline is shared across portal and API.
          this.logger.warn("generate_embedding_job invoked without embedding pipeline");
          return { success: true };
        } catch (err) {
          success = false;
          this.logger.error("generate_embedding_job", err instanceof Error ? err.stack : String(err));
          throw err;
        } finally {
          this.logger.debug(`generate-embedding job took ${performance.now() - start}ms`, { success });
        }
      },
    );
  }

  private createMemoryPersistFunction(): InngestFunction.Any {
    return inngest.createFunction(
      {
        id: "memory-persist",
        triggers: [{ event: aiMemoryPersistEvent }],
        concurrency: { limit: 5 },
      },
      async ({ event }) => {
        const { sessionId, userId, assistantResponseStored } = event.data as {
          sessionId: string;
          userId: string;
          assistantResponseStored: boolean;
        };
        const start = performance.now();
        let success = true;

        try {
          if (assistantResponseStored) {
            return { success: true, skipped: "already_stored" };
          }

          const { data: recentMemories, error: queryError } = await this.supabase
            .from("memory_embeddings")
            .select("id, content, memory_type, created_at")
            .eq("session_id", sessionId)
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5);

          if (queryError) {
            throw new Error(`Failed to query session memories: ${queryError.message}`);
          }

          const assistantMemories = (recentMemories ?? []).filter(
            (m) => m.memory_type === "episodic" && m.content.startsWith("Assistant:"),
          );

          if (assistantMemories.length === 0) {
            this.logger.warn("Assistant response not persisted — stream may have been terminated early", {
              sessionId,
              userId,
            });
            return { success: true, recovered: false };
          }

          return {
            success: true,
            recovered: true,
            count: assistantMemories.length,
          };
        } catch (err) {
          success = false;
          this.logger.error("memory_persist_job", err instanceof Error ? err.stack : String(err));
          throw err;
        } finally {
          this.logger.debug(`memory-persist job took ${performance.now() - start}ms`, { success });
        }
      },
    );
  }
}
