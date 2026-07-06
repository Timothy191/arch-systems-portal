import { Injectable, Inject, Logger } from "@nestjs/common";
import { REDIS_CLIENT } from "../redis/redis.constants";
import type { RedisClientType } from "redis";

interface MetricEntry {
  count: number;
  errors: number;
  totalDurationMs: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly jobMetrics = new Map<string, MetricEntry>();
  private readonly dbMetrics = new Map<string, MetricEntry>();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClientType) {}

  recordJobExecution(
    jobId: string,
    durationMs: number,
    success: boolean,
  ): void {
    const entry = this.jobMetrics.get(jobId) || {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
    };
    entry.count++;
    if (!success) entry.errors++;
    entry.totalDurationMs += durationMs;
    this.jobMetrics.set(jobId, entry);

    // Redis sync (fire-and-forget)
    if (this.redis?.isOpen) {
      const key = `metrics:job:${jobId}`;
      this.redis.hIncrBy(key, "count", 1).catch(() => {});
      if (!success) {
        this.redis.hIncrBy(key, "errors", 1).catch(() => {});
      }
      this.redis
        .hIncrByFloat(key, "totalDurationMs", durationMs)
        .catch(() => {});
    }
  }

  recordDbQuery(
    tableName: string,
    operation: string,
    durationMs: number,
    success: boolean,
  ): void {
    const key = `${tableName}:${operation}`;
    const entry = this.dbMetrics.get(key) || {
      count: 0,
      errors: 0,
      totalDurationMs: 0,
    };
    entry.count++;
    if (!success) entry.errors++;
    entry.totalDurationMs += durationMs;
    this.dbMetrics.set(key, entry);

    // Redis sync (fire-and-forget)
    if (this.redis?.isOpen) {
      const redisKey = `metrics:db:${tableName}:${operation}`;
      this.redis.hIncrBy(redisKey, "count", 1).catch(() => {});
      if (!success) {
        this.redis.hIncrBy(redisKey, "errors", 1).catch(() => {});
      }
      this.redis
        .hIncrByFloat(redisKey, "totalDurationMs", durationMs)
        .catch(() => {});
    }
  }

  async getMetrics(): Promise<{
    jobMetrics: Map<string, MetricEntry>;
    dbMetrics: Map<string, MetricEntry>;
  }> {
    const mergedJobs = new Map<string, MetricEntry>(this.jobMetrics);
    const mergedDb = new Map<string, MetricEntry>(this.dbMetrics);

    try {
      if (this.redis?.isOpen) {
        // Fetch job keys from Redis
        const jobKeys: string[] = [];
        for await (const key of this.redis.scanIterator({
          MATCH: "metrics:job:*",
          COUNT: 100,
        })) {
          jobKeys.push(key);
        }
        for (const key of jobKeys) {
          const jobId = key.substring("metrics:job:".length);
          const data = await this.redis.hGetAll(key);
          if (data && data.count) {
            mergedJobs.set(jobId, {
              count: parseInt(data.count || "0", 10),
              errors: parseInt(data.errors || "0", 10),
              totalDurationMs: parseFloat(data.totalDurationMs || "0"),
            });
          }
        }

        // Fetch db keys from Redis
        const dbKeys: string[] = [];
        for await (const key of this.redis.scanIterator({
          MATCH: "metrics:db:*",
          COUNT: 100,
        })) {
          dbKeys.push(key);
        }
        for (const key of dbKeys) {
          const keyWithoutPrefix = key.substring("metrics:db:".length);
          const data = await this.redis.hGetAll(key);
          if (data && data.count) {
            mergedDb.set(keyWithoutPrefix, {
              count: parseInt(data.count || "0", 10),
              errors: parseInt(data.errors || "0", 10),
              totalDurationMs: parseFloat(data.totalDurationMs || "0"),
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn("Failed to fetch metrics from Redis", error);
    }

    return { jobMetrics: mergedJobs, dbMetrics: mergedDb };
  }
}
