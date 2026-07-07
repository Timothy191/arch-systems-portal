import { config } from "../config.js";
import { getLatestHealth } from "../poller/health-poller.js";
import { getLatestSnapshot } from "../poller/metrics-poller.js";
import { getLatestAudit, runAuditCheck } from "../poller/audit-poller.js";
import { opsClient } from "../ops-client.js";
import { Logger } from "../logger.js";
import type { TriggerEvent } from "../subscriber/redis-subscriber.js";

const logger = new Logger("incident-engine");

// ── Types ──────────────────────────────────────────────────

export interface Incident {
  id: string;
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  context: Record<string, unknown>;
  detectedAt: string;
  resolvedAt: string | null;
  autoMitigated: boolean;
}

// ── State ──────────────────────────────────────────────────

const activeIncidents = new Map<string, Incident>();
const completedIncidents: Incident[] = [];

// Rolling window for 5xx counting
const errorTimestamps: number[] = [];

// ── Public API ─────────────────────────────────────────────

export function getActiveIncidents(): Incident[] {
  return [...activeIncidents.values()];
}

export function getCompletedIncidents(): Incident[] {
  return [...completedIncidents];
}

// ── Event handler (called by Redis subscriber) ─────────────

export async function handleTriggerEvent(
  event: TriggerEvent,
): Promise<void> {
  const incident: Incident = {
    id: event.id,
    severity: event.severity as Incident["severity"],
    type: event.triggerType,
    message: `Trigger: ${event.triggerType} (${event.severity})`,
    context: event.context as Record<string, unknown>,
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    autoMitigated: false,
  };

  activeIncidents.set(incident.id, incident);
  logger.warn(
    `Active incident: ${incident.severity}/${incident.type}`,
  );

  // Attempt auto-mitigation for known incident types
  await attemptAutoMitigation(incident);
}

// ── Periodic check (called by main loop) ───────────────────

export async function periodicIncidentCheck(): Promise<void> {
  const health = getLatestHealth();
  const metrics = getLatestSnapshot();

  // 1. Check for backend unreachability
  if (health && health.status === "unreachable") {
    await createOrUpdateIncident({
      severity: "critical",
      type: "BACKEND_UNREACHABLE",
      message: "NestJS backend health check failed",
      context: { lastHealth: health },
    });
  }

  // 2. Check cache health
  if (health && health.status === "healthy") {
    // Backend is reachable again — resolve any unreachability incidents
    resolveIncidentsByType("BACKEND_UNREACHABLE", "Backend is reachable again");
  }

  // 3. Check error rate from Prometheus metrics
  if (metrics) {
    const windowStart = Date.now() - config.incidentWindowMs;
    // Keep only recent errors
    while (
      errorTimestamps.length > 0 &&
      errorTimestamps[0]! < windowStart
    ) {
      errorTimestamps.shift();
    }

    // If we see new errors in metrics, record them
    if (metrics.recent5xx > 0) {
      errorTimestamps.push(...Array(metrics.recent5xx).fill(Date.now()));
    }

    if (errorTimestamps.length >= config.incidentThreshold5xx) {
      await createOrUpdateIncident({
        severity: "warning",
        type: "HIGH_ERROR_RATE",
        message: `${errorTimestamps.length} errors in the last ${config.incidentWindowMs / 1000}s window`,
        context: {
          errorCount: errorTimestamps.length,
          threshold: config.incidentThreshold5xx,
          windowMs: config.incidentWindowMs,
        },
      });
    } else {
      resolveIncidentsByType(
        "HIGH_ERROR_RATE",
        "Error rate returned to normal",
      );
    }
  }

  // 4. Database audit check (every cycle)
  if (health && health.status === "healthy") {
    try {
      const audit = await runAuditCheck();
      if (audit && audit.errorCount > 0) {
        await createOrUpdateIncident({
          severity: "warning",
          type: "DATA_INTEGRITY_ISSUE",
          message: `${audit.errorCount} data integrity error(s) found: ${audit.summary}`,
          context: {
            auditId: audit.id,
            errorCount: audit.errorCount,
            warningCount: audit.warningCount,
            issuesByCategory: audit.issuesByCategory,
          },
        });
      } else {
        resolveIncidentsByType(
          "DATA_INTEGRITY_ISSUE",
          "Data integrity audit passed",
        );
      }
    } catch {
      // Non-fatal — audit will retry next cycle
    }
  }
}

// ── Auto-mitigation ────────────────────────────────────────

async function attemptAutoMitigation(
  incident: Incident,
): Promise<void> {
  // Auto-mitigation rules — safe, reversible actions only
  try {
    switch (incident.type) {
      case "SERVER_CRASH": {
        // Rate limit spike after crash — reduce limit to protect backend
        logger.warn("Auto-mitigation: reducing rate limit after crash");
        await opsClient.updateRateLimit(50);
        incident.autoMitigated = true;
        break;
      }


      case "DATA_INTEGRITY_ISSUE": {
        // Attempt auto-repair on orphaned rows and stale data — per-table
        const audit = getLatestAudit();
        if (audit && audit.tablesByIssue) {
          const repairPriority: string[] = [
            "orphaned_rows",
            "stale_data",
          ];
          for (const category of repairPriority) {
            const tables = audit.tablesByIssue[category];
            if (!tables || tables.length === 0) continue;
            logger.info(
              `Auto-mitigation: repairing ${category} across ${tables.length} table(s)`,
            );
            for (const tableName of tables) {
              try {
                const result = await opsClient.runRepair(tableName, category);
                if (result.affectedRows > 0) {
                  logger.info(
                    `Auto-repair ${category} on ${tableName}: fixed ${result.affectedRows} row(s)`,
                  );
                }
              } catch {
                // Per-table repair is best-effort
              }
            }
          }
        }
        incident.autoMitigated = true;
        break;
      }
      case "HIGH_MEMORY": {
        // Clear cache to free memory
        logger.warn("Auto-mitigation: clearing cache on high memory");
        await opsClient.clearCache("cache:*");
        incident.autoMitigated = true;
        break;
      }

      default:
        // No auto-mitigation for this type — log and wait
        logger.debug(`No auto-mitigation for ${incident.type}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Auto-mitigation failed for ${incident.type}: ${message}`);
  }
}

// ── Helpers ────────────────────────────────────────────────

let incidentCounter = 0;
const knownIncidents = new Map<string, string>(); // type -> id

async function createOrUpdateIncident(
  partial: Omit<Incident, "id" | "detectedAt" | "resolvedAt" | "autoMitigated">,
): Promise<void> {
  const existingId = knownIncidents.get(partial.type);
  if (existingId && activeIncidents.has(existingId)) {
    return; // Already active — no update needed
  }

  incidentCounter++;
  const id = `inc_${Date.now()}_${incidentCounter}`;
  const incident: Incident = {
    ...partial,
    id,
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
    autoMitigated: false,
  };

  activeIncidents.set(id, incident);
  knownIncidents.set(partial.type, id);
  logger.warn(`Incident created: ${incident.severity}/${incident.type}`);

  // Attempt auto-mitigation for newly detected incidents
  await attemptAutoMitigation(incident);
}

function resolveIncidentsByType(type: string, reason: string): void {
  const id = knownIncidents.get(type);
  if (!id) return;

  const incident = activeIncidents.get(id);
  if (!incident) {
    knownIncidents.delete(type);
    return;
  }

  incident.resolvedAt = new Date().toISOString();
  incident.context["resolution"] = reason;
  completedIncidents.push(incident);
  activeIncidents.delete(id);
  knownIncidents.delete(type);

  logger.info(`Incident resolved: ${type} — ${reason}`);
}
