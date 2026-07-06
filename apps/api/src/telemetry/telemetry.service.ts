import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REDIS_CLIENT } from "../redis/redis.constants";
import { telemetryPushSchema } from "../common/schemas";
import type { RedisClientType } from "redis";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

function scopedKey(tenantId: string | undefined, key: string): string {
  return tenantId ? `${tenantId}:${key}` : key;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly localLastValues = new Map<string, number>();
  private readonly fuxaUrl: string;
  private readonly fuxaApiKey: string | undefined;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    private readonly configService: ConfigService,
  ) {
    this.fuxaUrl =
      this.configService.get("NEXT_PUBLIC_FUXA_URL") || "http://localhost:1881";
    this.fuxaApiKey = this.configService.get("FUXA_API_KEY");
  }

  private async getRedisLastValue(key: string): Promise<number | null> {
    try {
      const val = await this.redis.get(`telemetry:last:${key}`);
      return val !== null ? parseFloat(val) : null;
    } catch {
      return null;
    }
  }

  private async setRedisLastValue(key: string, value: number): Promise<void> {
    try {
      await this.redis.set(`telemetry:last:${key}`, String(value), {
        EX: 86400,
      });
    } catch {
      // ignore
    }
  }

  async processWebhookPayload(body: any) {
    // Supabase Database Webhook payload
    if (body.table === "machine_telemetry" && body.record) {
      const {
        machine_id,
        department_id: deptId,
        engine_rpm,
        engine_temp,
        hydraulic_pressure,
        vibration_level,
        fuel_level,
        bit_depth,
      } = body.record;

      const metrics = {
        engine_rpm,
        engine_temp,
        hydraulic_pressure,
        vibration_level,
        fuel_level,
        bit_depth,
      };
      const results = [];
      const endpoint = `${this.fuxaUrl}/api/tag`;

      for (const [key, value] of Object.entries(metrics)) {
        if (value !== null && value !== undefined) {
          const tagName = `machine_${machine_id}_${key}`;
          const numValue = Number(value);
          const cacheKey = scopedKey(deptId, tagName);

          // L1 Check
          if (
            this.localLastValues.has(cacheKey) &&
            this.localLastValues.get(cacheKey) === numValue
          ) {
            results.push({ tag: tagName, success: true, cached: true });
            continue;
          }

          // L2 Check (Redis)
          const lastVal = await this.getRedisLastValue(tagName);
          if (lastVal !== null && lastVal === numValue) {
            this.localLastValues.set(cacheKey, numValue);
            results.push({ tag: tagName, success: true, cached: true });
            continue;
          }

          // Send to FUXA
          try {
            const fuxaRes = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(this.fuxaApiKey
                  ? { Authorization: `Bearer ${this.fuxaApiKey}` }
                  : {}),
              },
              body: JSON.stringify({ name: tagName, value: numValue }),
            });

            const ok = fuxaRes.ok;
            results.push({ tag: tagName, success: ok });
            if (ok) {
              this.localLastValues.set(cacheKey, numValue);
              await this.setRedisLastValue(tagName, numValue);
            }
          } catch {
            results.push({
              tag: tagName,
              success: false,
              error: "Connection failed",
            });
          }
        }
      }

      return { webhook: true, processed: results.length, results };
    }

    return null;
  }

  async processDirectTelemetry(body: any) {
    const parsed = telemetryPushSchema.safeParse(body);
    if (!parsed.success) {
      return { error: parsed.error.flatten(), status: 400 };
    }

    const { name, value, department_id: deptId } = parsed.data;
    const numValue = Number(value);
    const cacheKey = scopedKey(deptId, name);
    const endpoint = `${this.fuxaUrl}/api/tag`;

    // L1 Check
    if (
      this.localLastValues.has(cacheKey) &&
      this.localLastValues.get(cacheKey) === numValue
    ) {
      return { success: true, synced: true, cached: true };
    }

    // L2 Check (Redis)
    const lastVal = await this.getRedisLastValue(name);
    if (lastVal !== null && lastVal === numValue) {
      this.localLastValues.set(cacheKey, numValue);
      return { success: true, synced: true, cached: true };
    }

    try {
      const fuxaRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.fuxaApiKey
            ? { Authorization: `Bearer ${this.fuxaApiKey}` }
            : {}),
        },
        body: JSON.stringify({ name, value: numValue }),
      });

      if (!fuxaRes.ok) {
        return {
          warning: `FUXA SCADA server returned status ${fuxaRes.status}`,
          synced: false,
        };
      }

      this.localLastValues.set(cacheKey, numValue);
      await this.setRedisLastValue(name, numValue);
      return { success: true, synced: true };
    } catch {
      return { warning: "FUXA SCADA server is unreachable", synced: false };
    }
  }

  async computeRustTelemetry(hours: number, temp: number, rpm: number) {
    const h = hours ?? 150.0;
    const t = temp ?? 55.0;
    const r = rpm ?? 1000.0;

    const binaryPath = path.join(
      process.cwd(),
      "plugins",
      "rust-telemetry-engine",
      "target",
      "release",
      "rust-telemetry-engine",
    );

    if (fs.existsSync(binaryPath)) {
      try {
        const { stdout } = await execFileAsync(binaryPath, [
          "--hours",
          String(h),
          "--temp",
          String(t),
          "--rpm",
          String(r),
        ]);
        const rustResult = JSON.parse(stdout.trim());
        return { ...rustResult, isNative: true };
      } catch (err) {
        this.logger.warn(
          "Rust telemetry binary failed, using JS fallback",
          err,
        );
      }
    }

    // JS fallback
    const base = h * 0.18;
    const thermal = t > 65.0 ? (t - 65.0) * 2.4 : 0.0;
    const kinetic = (r / 1200.0) * 7.5;
    const wear = base + thermal + kinetic;
    const z = (wear - 45.0) / 10.0;
    const prob = (1.0 / (1.0 + Math.exp(-z))) * 100.0;

    return {
      wearIndex: parseFloat(wear.toFixed(2)),
      probability: parseFloat(prob.toFixed(1)),
      rulHours: parseFloat(Math.max(0.0, 1200.0 - h).toFixed(1)),
      status: prob > 75.0 ? "critical" : prob > 35.0 ? "warning" : "optimal",
      isNative: false,
    };
  }
}
