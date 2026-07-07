import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { OpsService } from "./ops.service";
import { DbAuditService } from "./db-audit.service";
import type { AuditReport, RepairResult, SafeQueryResult } from "./db-audit.service";
import { OpsInternalGuard } from "./guards/ops-internal.guard";
import { SkipInternalAuth } from "./decorators/skip-internal-auth.decorator";
import {
  clearCacheSchema,
  queueActionSchema,
  updateRateLimitSchema,
  readConfigSchema,
  triggerAgentSchema,
  repairDataSchema,
  safeQuerySchema,
  type OpsResponse,
} from "./dto/ops.dto";

@ApiTags("ops")
@Controller("ops")
@UseGuards(OpsInternalGuard)
export class OpsController {
  constructor(
    private readonly opsService: OpsService,
    private readonly dbAuditService: DbAuditService,
  ) {}

  @Post("cache/clear")
  @ApiOperation({ summary: "Clear cache by key pattern (SCAN-based, non-blocking)" })
  async clearCache(
    @Body() body: unknown,
  ): Promise<OpsResponse<{ cleared: number }>> {
    const parsed = clearCacheSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const data = await this.opsService.clearCache(parsed.data);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get("queue/counts")
  @ApiOperation({ summary: "Get job counts for background task queues" })
  async queueCounts(): Promise<OpsResponse> {
    const data = await this.opsService.getQueueCounts("background-tasks");
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("queue/action")
  @ApiOperation({ summary: "Pause, resume, or inspect a queue" })
  async queueAction(
    @Body() body: unknown,
  ): Promise<OpsResponse> {
    const parsed = queueActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const { action } = parsed.data;
    // For now, only 'getJobCounts' is implemented directly.
    // Pause/resume requires direct BullMQ queue access.
    if (action === "getJobCounts") {
      const data = await this.opsService.getQueueCounts("background-tasks");
      return { success: true, data, timestamp: new Date().toISOString() };
    }
    return {
      success: false,
      error: `Queue action '${action}' not yet implemented (requires BullMQ Queue instance)`,
      timestamp: new Date().toISOString(),
    };
  }

  @Post("rate-limit")
  @ApiOperation({ summary: "Dynamically adjust the global rate limit" })
  async updateRateLimit(
    @Body() body: unknown,
  ): Promise<OpsResponse<{ limit: number }>> {
    const parsed = updateRateLimitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const data = await this.opsService.updateRateLimit(parsed.data);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("config")
  @ApiOperation({ summary: "Read allowed configuration values" })
  async readConfig(
    @Body() body: unknown,
  ): Promise<OpsResponse<Record<string, string | undefined>>> {
    const parsed = readConfigSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const data = this.opsService.readConfig(parsed.data);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get("summary")
  @SkipInternalAuth()
  @ApiOperation({ summary: "Aggregated system summary (used by Meta-Backend health poller)" })
  async systemSummary(): Promise<OpsResponse> {
    const data = await this.opsService.getSystemSummary();
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("trigger")
  @ApiOperation({ summary: "Manually trigger an agent event (bridge to Redis Stream)" })
  async triggerAgent(
    @Body() body: unknown,
  ): Promise<OpsResponse<{ queued: boolean; streamId: string | null }>> {
    const parsed = triggerAgentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const data = await this.opsService.triggerAgent(parsed.data);
    return {
      success: data.queued,
      data,
      ...(data.queued ? {} : { error: "Agent trigger queue failed" }),
      timestamp: new Date().toISOString(),
    };
  }

  // ── Database audit ──────────────────────────────────────

  @Post("db/audit")
  @ApiOperation({ summary: "Run a full database integrity audit" })
  async runAudit(): Promise<OpsResponse<AuditReport>> {
    const report = await this.dbAuditService.runAudit();
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("db/audit/status")
  @ApiOperation({ summary: "Get the most recent audit report" })
  async auditStatus(): Promise<OpsResponse<AuditReport | null>> {
    const report = this.dbAuditService.getLastReport();
    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Post("db/repair")
  @ApiOperation({ summary: "Run a repair for a specific issue category on a table" })
  async runRepair(
    @Body() body: unknown,
  ): Promise<OpsResponse<RepairResult>> {
    const parsed = repairDataSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const result = await this.dbAuditService.runRepair(
      parsed.data.tableName,
      parsed.data.issueCategory,
    );
    return {
      success: result.success,
      data: result,
      ...(result.success ? {} : { error: result.error }),
      timestamp: new Date().toISOString(),
    };
  }

  @Post("db/query")
  @ApiOperation({ summary: "Run a safe read-only query (SELECT only, max 500 rows)" })
  async runQuery(
    @Body() body: unknown,
  ): Promise<OpsResponse<SafeQueryResult>> {
    const parsed = safeQuerySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const result = await this.dbAuditService.runSafeQuery(parsed.data.sql);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
