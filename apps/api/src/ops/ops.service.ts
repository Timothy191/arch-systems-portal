import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REDIS_CLIENT } from "../redis/redis.constants";
import type { RedisClientType } from "redis";
import { AgentTriggerService } from "../ai/agent-trigger.service";
import { AiGatewayService } from "../ai/ai-gateway.service";
import { AiInvocationTelemetry } from "../ai/ai-invocation.telemetry";
import {
  type ClearCacheDto,
  type UpdateRateLimitDto,
  type ReadConfigDto,
  type TriggerAgentDto,
} from "./dto/ops.dto";

const ALLOWED_PUBLIC_CONFIG_KEYS: Record<string, true> = {
  NODE_ENV: true,
  PORT: true,
  REDIS_HOST: true,
  REDIS_PORT: true,
  CORS_ORIGIN: true,
  ENABLE_LOAD_ADAPTIVE_TEST: true,
  DISABLE_RATE_LIMIT: true,
  OTEL_ENDPOINT: true,
};

@Injectable()
export class OpsService {
  private readonly logger = new Logger(OpsService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
    private readonly agentTriggerService: AgentTriggerService,
    private readonly aiGateway: AiGatewayService,
    private readonly aiTelemetry: AiInvocationTelemetry,
  ) {}

  // ── Cache ────────────────────────────────────────────────

  async clearCache(dto: ClearCacheDto): Promise<{ cleared: number }> {
    this.logger.warn(`Clearing cache keys matching: ${dto.pattern}`);
    let cleared = 0;

    try {
      let cursor = 0;
      do {
        const result = await this.redisClient.scan(cursor, {
          MATCH: dto.pattern,
          COUNT: 200,
        });
        cursor = result.cursor;
        const keys = result.keys;
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          cleared += keys.length;
        }
      } while (cursor !== 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Cache clear failed: ${message}`);
      throw error;
    }

    return { cleared };
  }

  // ── Queue ────────────────────────────────────────────────

  async getQueueCounts(queueName: string) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.redisClient.lLen(`bull:${queueName}:wait`).catch(() => 0),
        this.redisClient.lLen(`bull:${queueName}:active`).catch(() => 0),
        this.redisClient.lLen(`bull:${queueName}:completed`).catch(() => 0),
        this.redisClient.lLen(`bull:${queueName}:failed`).catch(() => 0),
        this.redisClient.lLen(`bull:${queueName}:delayed`).catch(() => 0),
      ]);

      return { queue: queueName, waiting, active, completed, failed, delayed };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Queue counts failed: ${message}`);
      throw error;
    }
  }

  // ── Rate Limiting ────────────────────────────────────────

  async updateRateLimit(dto: UpdateRateLimitDto): Promise<{ limit: number }> {
    this.logger.warn(`Updating rate limit to ${dto.limit} req/min`);
    try {
      await this.redisClient.set(
        "ops:rate-limit-override",
        dto.limit.toString(),
      );
      this.logger.log(`Rate limit override set to ${dto.limit}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Rate limit update failed: ${message}`);
      throw error;
    }
    return { limit: dto.limit };
  }

  // ── Config Read ──────────────────────────────────────────

  readConfig(dto: ReadConfigDto): Record<string, string | undefined> {
    const keyList = dto.keys ?? Object.keys(ALLOWED_PUBLIC_CONFIG_KEYS);
    const result: Record<string, string | undefined> = {};
    for (const key of keyList) {
      result[key] = this.configService.get<string>(key);
    }
    return result;
  }

  // ── System Health Summary (aggregated) ───────────────────

  async getSystemSummary() {
    let cacheHitRate: number | null = null;
    try {
      const hits = await this.redisClient.get("ops:cache:hits");
      const misses = await this.redisClient.get("ops:cache:misses");
      if (hits !== null && misses !== null) {
        const total = Number(hits) + Number(misses);
        cacheHitRate = total > 0 ? Number(hits) / total : null;
      }
    } catch {
      // cache stats unavailable — non-fatal
    }

    const queueCounts = await this.getQueueCounts("background-tasks").catch(
      () => null,
    );

    return {
      healthy: true,
      cacheHitRate,
      queue: queueCounts,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  // ── Incident Trigger (bridge to existing AgentTriggerService) ──

  async triggerAgent(
    dto: TriggerAgentDto,
  ): Promise<{ queued: boolean; streamId: string | null }> {
    this.logger.warn(`Agent trigger: ${dto.severity} - ${dto.triggerType}`);
    try {
      const payload = {
        triggerType: dto.triggerType,
        severity: dto.severity,
        context: dto.context,
        source: "ops-module",
        timestamp: new Date().toISOString(),
      };
      await this.agentTriggerService.emitEvent(payload);
      return { queued: true, streamId: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Agent trigger failed: ${message}`);
      return { queued: false, streamId: null };
    }
  }

  // ── AI observability ─────────────────────────────────────

  getAiStatus() {
    return this.aiGateway.getTelemetrySummary();
  }

  getAiInvocations(limit = 20) {
    return this.aiGateway.getTelemetry(limit);
  }
}
