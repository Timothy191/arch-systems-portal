/**
 * Server-side utility for Rust native bindings.
 *
 * Provides typed access to the high-performance Rust cache engine, rule engine,
 * and rate limiter for use in server components, server actions, and API routes.
 *
 * Falls back to JavaScript when the native module is not available (dev builds).
 */
import {
  RustCacheEngine,
  RustTokenBucket,
  evaluateRulesSync,
  isNativeAvailable,
  type Rule,
  type RuleContext,
  type RuleResult,
} from "@arch/rust-bindings";

// ── Cache Instance (server-wide singleton) ────────────────

let _cache: RustCacheEngine | null = null;

function getCache(): RustCacheEngine {
  if (!_cache) {
    _cache = new RustCacheEngine(5000, 300, 120); // 5K entries, 5min TTL, 2min TTI
  }
  return _cache;
}

// ── Rate Limiter Registry ─────────────────────────────────

const _buckets = new Map<string, RustTokenBucket>();

function getBucket(name: string, capacity: number, refillRate: number): RustTokenBucket {
  let bucket = _buckets.get(name);
  if (!bucket) {
    bucket = new RustTokenBucket(capacity, refillRate);
    _buckets.set(name, bucket);
  }
  return bucket;
}

// ── Cache Utilities ───────────────────────────────────────

/**
 * Cache a value with Redis-backed persistence (when native module is loaded).
 *
 * Uses the Rust cache engine for L1 (moka) + L2 (Redis) caching.
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  const cache = getCache();

  try {
    const cached = await cache.get(cacheKey);
    return JSON.parse(cached.toString("utf-8")) as T;
  } catch {
    // Cache miss — fetch and store
    const value = await fetcher();
    const buf = Buffer.from(JSON.stringify(value));
    await cache.set(cacheKey, buf, ttlMs);
    return value;
  }
}

/**
 * Invalidate cache entries by key or tag pattern.
 */
export async function invalidateCache(key?: string, tag?: string): Promise<void> {
  const cache = getCache();
  if (key) {
    await cache.invalidate(key);
  }
  if (tag) {
    await cache.invalidateByTag(tag);
  }
}

// ── Rule Engine Utilities ─────────────────────────────────

export interface SafetyCheckInput {
  temperature: number;
  pressure: number;
  rpm?: number;
}

export interface SafetyCheckResult {
  safe: boolean;
  alerts: RuleResult[];
  timestamp: number;
}

/**
 * Run mining safety checks using the Rust rule engine.
 *
 * Evaluates high-temperature shutdown rules and pressure warning rules.
 */
export function evaluateSafetyRules(input: SafetyCheckInput): SafetyCheckResult {
  const rules: Rule[] = [
    {
      id: "high_temp_shutdown",
      description: "Shut down if temperature exceeds 80°C",
      conditions: [
        { field: "temperature", operator: "GreaterThan", value: 80 },
      ],
      action: {
        actionType: "Shutdown",
        message: "Temperature exceeded 80°C safety threshold",
        severity: "Critical",
      },
      enabled: true,
      priority: 1,
    },
    {
      id: "pressure_warning",
      description: "Warn if pressure approaches critical levels",
      conditions: [
        { field: "pressure", operator: "GreaterThan", value: 80 },
      ],
      action: {
        actionType: "Alert",
        message: "Pressure approaching critical threshold (100 kPa)",
        severity: "Warning",
      },
      enabled: true,
      priority: 5,
    },
    {
      id: "temperature_warning",
      description: "Warn if temperature is elevated",
      conditions: [
        { field: "temperature", operator: "GreaterThanOrEqual", value: 65 },
      ],
      action: {
        actionType: "Alert",
        message: "Temperature entering elevated range",
        severity: "Info",
      },
      enabled: true,
      priority: 10,
    },
  ];

  const context: RuleContext = {
    values: {
      temperature: input.temperature,
      pressure: input.pressure,
      rpm: input.rpm ?? 0,
    },
    metadata: {
      source: "portal-safety-check",
      timestamp: String(Date.now()),
    },
  };

  const results = evaluateRulesSync(rules, context);

  const alerts = results.filter((r) => r.matched);
  const hasShutdown = alerts.some(
    (a) => a.actions[0]?.actionType === "Shutdown",
  );

  return {
    safe: !hasShutdown,
    alerts,
    timestamp: Date.now(),
  };
}

// ── Rate Limiting Utilities ───────────────────────────────

/**
 * Rate-limit an operation by name.
 * Returns `true` if the operation is allowed, `false` if rate-limited.
 */
export async function checkRateLimit(
  name: string,
  cost: number = 1,
): Promise<boolean> {
  // API: 100 requests/min, Data export: 10 requests/min, Actions: 30 requests/min
  const limits: Record<string, [number, number]> = {
    api: [100, 60],
    export: [10, 60],
    action: [30, 60],
  };
  const [capacity, refillRate] = limits[name] ?? [60, 60];
  const bucket = getBucket(name, capacity, refillRate);
  return bucket.tryConsume(cost);
}

// ── Diagnostics ───────────────────────────────────────────

/**
 * Get the status of all native bindings.
 */
export function getNativeStatus(): {
  available: boolean;
  cacheStats: string;
} {
  return {
    available: isNativeAvailable(),
    cacheStats: getCache().stats(),
  };
}
