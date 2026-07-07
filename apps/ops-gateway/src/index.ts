import { startMcpServer } from "./mcp/server.js";
import { startHealthPoller } from "./poller/health-poller.js";
import { startMetricsPoller } from "./poller/metrics-poller.js";
import { runAuditCheck } from "./poller/audit-poller.js";
import {
  startRedisSubscriber,
  setEventHandler,
} from "./subscriber/redis-subscriber.js";
import {
  handleTriggerEvent,
  periodicIncidentCheck,
} from "./incident/engine.js";
import { Logger } from "./logger.js";
import { getConfiguredEves } from "./dispatcher/eve-dispatcher.js";

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
      logger.warn(
        "Initial audit returned no result (backend may be unavailable)",
      );
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

  const availableEves = getConfiguredEves().map(
    (e: any) => `${e.id}${e.autoApprove ? " (auto)" : ""}`,
  );
      logger.error(
        `Incident check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }, incidentCheckIntervalMs);

  // 3b. Log available TUI agents
  const availableAgents = getConfiguredAgents().map(
    (a) => `${a.id}${a.autoApprove ? " (auto)" : ""}`,
  );
  if (availableAgents.length > 0) {
    logger.info(`TUI agents available: ${availableAgents.join(", ")}`);
  } else {
    logger.warn("No TUI agents configured — agent dispatch disabled");
  }

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
