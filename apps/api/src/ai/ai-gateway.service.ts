import { Injectable, Logger } from "@nestjs/common";
import { AiFeaturesService, type AiFeatureKey } from "./ai-features.service";
import { AiInvocationTelemetry, type AiInvocationRecord } from "./ai-invocation.telemetry";

export interface AiGatewayInvokeOptions {
  task: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AiGatewayFallback {
  status: string;
  result: string;
  error?: string;
  task: string;
}

export interface AiGatewayResult<T = unknown> {
  status: "success" | "fallback" | "disabled" | "circuit_open";
  result: T | AiGatewayFallback;
  telemetry: AiInvocationRecord;
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    private readonly features: AiFeaturesService,
    private readonly telemetry: AiInvocationTelemetry,
  ) {}
  async invoke<T = unknown>(
    fetcher: (signal: AbortSignal) => Promise<T>,
    options: AiGatewayInvokeOptions,
  ): Promise<AiGatewayResult<T>> {
    const start = performance.now();
    const id = this.generateId();
    const config = this.features.getConfig();

    if (!this.features.isEnabled("ai_gateway_enabled")) {
      const record: AiInvocationRecord = {
        id,
        task: options.task,
        status: "disabled",
        durationMs: this.ms(start),
        attempt: 0,
        metadata: options.metadata,
      };
      this.telemetry.record(record);
      this.logger.warn(`AI gateway disabled for task=${options.task}`);
      return {
        status: "disabled",
        result: this.fallbackPayload(options.task),
        telemetry: record,
      };
    }

    if (
      this.features.isEnabled("ai_circuit_breaker_enabled") &&
      this.isCircuitOpen(config)
    ) {
      const record: AiInvocationRecord = {
        id,
        task: options.task,
        status: "circuit_open",
        durationMs: this.ms(start),
        attempt: 0,
        metadata: options.metadata,
      };
      this.telemetry.record(record);
      this.logger.warn(`AI circuit open for task=${options.task}`);
      return {
        status: "circuit_open",
        result: this.fallbackPayload(options.task),
        telemetry: record,
      };
    }

    const maxAttempts = this.features.isEnabled("ai_retry_enabled")
      ? Math.max(1, config.retryAttempts)
      : 1;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptStart = performance.now();
      const controller = new AbortController();
      const timeoutMs = Math.max(1, config.requestTimeoutMs);
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const result = await fetcher(controller.signal);
        clearTimeout(timeoutId);

        const record: AiInvocationRecord = {
          id,
          task: options.task,
          status: "success",
          durationMs: this.ms(attemptStart),
          attempt,
          metadata: options.metadata,
        };
        this.telemetry.record(record);
        this.resetCircuitBreaker(config);

        return {
          status: "success",
          result,
          telemetry: record,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        const durationMs = this.ms(attemptStart);
        const message = error instanceof Error ? error.message : "Unknown error";
        lastError = error instanceof Error ? error : new Error(message);
        this.recordFailure(id, options.task, durationMs, attempt, lastError, options.metadata, config);

        if (attempt < maxAttempts) {
          const delay = this.backoffMs(attempt, config);
          this.logger.warn(
            `AI invoke retry scheduled task=${options.task} attempt=${attempt}/${maxAttempts} delayMs=${delay} error=${message}`,
          );
          await this.sleep(delay);
        }
      }
    }

    const record: AiInvocationRecord = {
      id,
      task: options.task,
      status: "failure",
      durationMs: this.ms(start),
      attempt: maxAttempts,
      error: lastError?.message,
      metadata: options.metadata,
    };
    this.telemetry.record(record);

    if (this.features.isEnabled("ai_fallback_enabled")) {
      this.logger.error(
        `AI invoke failed after ${maxAttempts} attempts task=${options.task} error=${lastError?.message}`
      );
      return {
        status: "fallback",
        result: this.fallbackPayload(options.task, lastError?.message),
        telemetry: record,
      };
    }

    throw lastError ?? new Error("AI invoke failed");
  }

  getTelemetry(limit = 20) {
    return this.telemetry.getRecent(limit);
  }

  getTelemetrySummary() {
    return this.telemetry.summarize();
  }

  private fallbackPayload(task: string, error?: string): AiGatewayFallback {
    return {
      status: "fallback",
      result: "The AI subsystem is currently unreachable. Operational systems remain active.",
      error,
      task,
    };
  }

  private featureFlag(config: ReturnType<AiFeaturesService["getConfig"]>, key: AiFeatureKey): boolean {
    return config.flags[key];
  }

  private backoffMs(attempt: number, config: ReturnType<AiFeaturesService["getConfig"]>): number {
    const base = Math.max(0, config.retryBaseDelayMs);
    const delay = base * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * base);
    return delay + jitter;
  }

  private ms(start: number) {
    return Math.max(0, Math.round(performance.now() - start));
  }

  private generateId(): string {
    return `ai:invoke:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isCircuitOpen(config: ReturnType<AiFeaturesService["getConfig"]>): boolean {
    const stateKey = "ai:circuit:breaker:open";
    const ttlMs = config.circuitBreakerRecoveryMs;
    const raw = process.env[stateKey];
    if (!raw) return false;

    const openedAt = Number(raw);
    if (!Number.isFinite(openedAt) || openedAt <= 0) return false;
    const now = Date.now();
    const elapsed = now - openedAt;

    if (elapsed >= ttlMs) {
      this.resetCircuitBreaker(config);
      return false;
    }

    return true;
  }

  private recordFailure(
    id: string,
    task: string,
    durationMs: number,
    attempt: number,
    error: Error,
    metadata: Record<string, unknown> | undefined,
    config: ReturnType<AiFeaturesService["getConfig"]>,
  ): void {
    const record: AiInvocationRecord = {
      id,
      task,
      status: "failure",
      durationMs,
      attempt,
      error: error.message,
      metadata,
    };
    this.telemetry.record(record);
    this.logger.warn(`AI invoke failure task=${task} attempt=${attempt} error=${error.message}`);

    if (this.featureFlag(config, "ai_circuit_breaker_enabled")) {
      const threshold = Math.max(1, config.circuitBreakerFailureThreshold);
      const recentFailures = this.telemetry
        .getRecent(threshold)
        .filter((r) => r.status === "failure" && r.task === task).length;

      if (recentFailures >= threshold) {
        const stateKey = "ai:circuit:breaker:open";
        process.env[stateKey] = String(Date.now());
        this.logger.error(`AI circuit breaker opened for task=${task}`);
      }
    }
  }

  private resetCircuitBreaker(config: ReturnType<AiFeaturesService["getConfig"]>): void {
    if (!this.featureFlag(config, "ai_circuit_breaker_enabled")) return;
    const stateKey = "ai:circuit:breaker:open";
    if (process.env[stateKey]) {
      delete process.env[stateKey];
      this.logger.log("AI circuit breaker reset");
    }
  }
}
