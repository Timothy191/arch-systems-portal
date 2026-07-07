import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type AiFeatureKey =
  | "ai_gateway_enabled"
  | "ai_telemetry_enabled"
  | "ai_fallback_enabled"
  | "ai_retry_enabled"
  | "ai_circuit_breaker_enabled"
  | "ai_streaming_enabled";

export interface AiFeatureFlags {
  ai_gateway_enabled: boolean;
  ai_telemetry_enabled: boolean;
  ai_fallback_enabled: boolean;
  ai_retry_enabled: boolean;
  ai_circuit_breaker_enabled: boolean;
  ai_streaming_enabled: boolean;
}

export interface AiFeatureConfig {
  flags: AiFeatureFlags;
  retryAttempts: number;
  retryBaseDelayMs: number;
  requestTimeoutMs: number;
  circuitBreakerFailureThreshold: number;
  circuitBreakerRecoveryMs: number;
}

const DEFAULT_FLAGS: AiFeatureFlags = {
  ai_gateway_enabled: true,
  ai_telemetry_enabled: true,
  ai_fallback_enabled: true,
  ai_retry_enabled: true,
  ai_circuit_breaker_enabled: false,
  ai_streaming_enabled: false,
};

const DEFAULT_CONFIG: AiFeatureConfig = {
  flags: DEFAULT_FLAGS,
  retryAttempts: 2,
  retryBaseDelayMs: 500,
  requestTimeoutMs: 10_000,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerRecoveryMs: 30_000,
};

const TRUTHY = new Set(["1", "true", "yes", "y", "on"]);

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUTHY.has(normalized)) return true;
    if (["0", "false", "no", "n", "off", ""].includes(normalized)) return false;
  }
  return fallback;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

@Injectable()
export class AiFeaturesService {
  private readonly logger = new Logger(AiFeaturesService.name);

  constructor(private readonly configService: ConfigService) {}

  getConfig(): AiFeatureConfig {
    const flags: AiFeatureFlags = {
      ai_gateway_enabled: toBoolean(
        this.configService.get("AI_GATEWAY_ENABLED"),
        DEFAULT_FLAGS.ai_gateway_enabled,
      ),
      ai_telemetry_enabled: toBoolean(
        this.configService.get("AI_TELEMETRY_ENABLED"),
        DEFAULT_FLAGS.ai_telemetry_enabled,
      ),
      ai_fallback_enabled: toBoolean(
        this.configService.get("AI_FALLBACK_ENABLED"),
        DEFAULT_FLAGS.ai_fallback_enabled,
      ),
      ai_retry_enabled: toBoolean(
        this.configService.get("AI_RETRY_ENABLED"),
        DEFAULT_FLAGS.ai_retry_enabled,
      ),
      ai_circuit_breaker_enabled: toBoolean(
        this.configService.get("AI_CIRCUIT_BREAKER_ENABLED"),
        DEFAULT_FLAGS.ai_circuit_breaker_enabled,
      ),
      ai_streaming_enabled: toBoolean(
        this.configService.get("AI_STREAMING_ENABLED"),
        DEFAULT_FLAGS.ai_streaming_enabled,
      ),
    };

    return {
      flags,
      retryAttempts: toNumber(
        this.configService.get("AI_RETRY_ATTEMPTS"),
        DEFAULT_CONFIG.retryAttempts,
      ),
      retryBaseDelayMs: toNumber(
        this.configService.get("AI_RETRY_BASE_DELAY_MS"),
        DEFAULT_CONFIG.retryBaseDelayMs,
      ),
      requestTimeoutMs: toNumber(
        this.configService.get("AI_REQUEST_TIMEOUT_MS"),
        DEFAULT_CONFIG.requestTimeoutMs,
      ),
      circuitBreakerFailureThreshold: toNumber(
        this.configService.get("AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD"),
        DEFAULT_CONFIG.circuitBreakerFailureThreshold,
      ),
      circuitBreakerRecoveryMs: toNumber(
        this.configService.get("AI_CIRCUIT_BREAKER_RECOVERY_MS"),
        DEFAULT_CONFIG.circuitBreakerRecoveryMs,
      ),
    };
  }

  isEnabled(key: AiFeatureKey): boolean {
    return this.getConfig().flags[key];
  }

  getFlag(key: AiFeatureKey): boolean {
    return this.isEnabled(key);
  }

  setFlag(key: AiFeatureKey, value: boolean): void {
    this.logger.warn(`Feature flag change requested: ${key}=${value}`);
    this.logger.warn(
      "Runtime flag mutation is not persisted. Use process env or config store.",
    );
  }

  getAllFlags(): AiFeatureFlags {
    return this.getConfig().flags;
  }
}
