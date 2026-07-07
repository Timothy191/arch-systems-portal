import { startMcpServer } from "./mcp/server.js";
import { startHealthPoller } from "./poller/health-poller.js";
import { startMetricsPoller } from "./poller/metrics-poller.js";
import { runAuditCheck } from "./poller/audit-poller.js";
import { startRedisSubscriber, setEventHandler } from "./subscriber/redis-subscriber.js";
import {
  handleTriggerEvent,
  periodicIncidentCheck,
} from "./incident/engine.js";
import { Logger } from "./logger.js";

const logger = new Logger("main");

async function main(): Promise<void> {
  logger.info("Starting Ops Gateway (Meta-Backend)...");

  // 1. Start system pollers
  startHealthPoller();
  startMetricsPoller();

  // 1b. Run initial database audit (seeds latestAudit for incident engine)
  runAuditCheck().then((result) => {
    if (result) {
      logger.info(
        `Initial audit complete: ${result.totalIssues} issue(s) across ${result.tablesScanned}/${result.totalTables} tables`,
      );
    } else {
      logger.warn("Initial audit returned no result (backend may be unavailable)");
    }
  });

  // 2. Connect to Redis and subscribe to trigger stream
  setEventHandler(handleTriggerEvent);
  await startRedisSubscriber().catch((error) => {
    logger.error(
      `Redis subscriber failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    logger.warn("Continuing without Redis subscription — manual triggers only");
  });

  // 3. Periodic incident check (every health poll cycle)
  const incidentCheckIntervalMs = 30_000;
  setInterval(() => {
    periodicIncidentCheck().catch((error) => {
      logger.error(
        `Incident check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }, incidentCheckIntervalMs);

  // 4. Start MCP server (stdio — TUI agents connect via pipe)
  await startMcpServer().catch((error) => {
    logger.error(
      `MCP server failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}

main().catch((error) => {
  logger.error(
    `Fatal: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
