/**
 * @arch/rust-bindings — TypeScript wrapper for Rust N-API native addon.
 *
 * Provides access to the high-performance cache engine, rule engine, and
 * rate limiter implemented in Rust. Falls back gracefully to JavaScript
 * shims when the native module is not available (e.g. during development).
 */

// ── Type Definitions ───────────────────────────────────────

export interface Condition {
  field: string;
  operator:
    | "GreaterThan"
    | "LessThan"
    | "GreaterThanOrEqual"
    | "LessThanOrEqual"
    | "Equal"
    | "NotEqual";
  value: number;
}

export interface Action {
  actionType: string;
  message: string;
  severity: string;
}

export interface Rule {
  id: string;
  description: string;
  conditions: Condition[];
  action: Action;
  enabled: boolean;
  priority: number;
}

export interface RuleContext {
  values: Record<string, number>;
  metadata: Record<string, string>;
}

export interface RuleResult {
  matched: boolean;
  ruleId: string;
  actions: Action[];
  timestamp: number;
}

export interface CacheStats {
  entries: number;
  capacity: number;
}

// ── Native Module Loading ──────────────────────────────────

interface NativeModule {
  JsCacheEngine: new (
    maxCapacity?: number,
    ttlSecs?: number,
    ttiSecs?: number,
  ) => JsCacheEngine;
  JsTokenBucket: new (
    capacity: number,
    refillRatePerSec: number,
  ) => JsTokenBucket;
  evaluateSingleRule: (rule: Rule, context: RuleContext) => RuleResult;
  evaluateRulesSync: (rules: Rule[], context: RuleContext) => RuleResult[];
}

interface JsCacheEngine {
  get(key: string): Promise<Buffer>;
  set(
    key: string,
    value: Buffer,
    ttlMs?: number,
  ): Promise<void>;
  invalidate(key: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
  stats(): string;
}

interface JsTokenBucket {
  tryConsume(tokens: number): Promise<boolean>;
  consume(tokens: number): Promise<void>;
  refund(tokens: number): void;
}

let nativeModule: NativeModule | null = null;

try {
  // Dynamic require — the .node file is built by napi-rs
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  nativeModule = require("@arch/rust-bindings-native") as NativeModule;
} catch {
  // Native module not available — use JS fallbacks
  console.warn(
    "[@arch/rust-bindings] Native module not found, using JS fallbacks",
  );
}

// ── Cache Engine ───────────────────────────────────────────

export class RustCacheEngine {
  private inner: JsCacheEngine | null = null;
  private fallback = new Map<string, Buffer>();

  constructor(
    maxCapacity?: number,
    ttlSecs?: number,
    ttiSecs?: number,
  ) {
    if (nativeModule) {
      this.inner = new nativeModule.JsCacheEngine(
        maxCapacity,
        ttlSecs,
        ttiSecs,
      );
    }
  }

  async get(key: string): Promise<Buffer> {
    if (this.inner) {
      return this.inner.get(key);
    }
    const val = this.fallback.get(key);
    if (!val) throw new Error(`Key not found: ${key}`);
    return val;
  }

  async set(
    key: string,
    value: Buffer,
    ttlMs?: number,
  ): Promise<void> {
    if (this.inner) {
      return this.inner.set(key, value, ttlMs);
    }
    this.fallback.set(key, value);
  }

  async invalidate(key: string): Promise<void> {
    if (this.inner) {
      return this.inner.invalidate(key);
    }
    this.fallback.delete(key);
  }

  async invalidateByTag(tag: string): Promise<void> {
    if (this.inner) {
      return this.inner.invalidateByTag(tag);
    }
    for (const key of this.fallback.keys()) {
      if (key.includes(tag)) {
        this.fallback.delete(key);
      }
    }
  }

  stats(): string {
    if (this.inner) {
      return this.inner.stats();
    }
    return `JS fallback cache: ${this.fallback.size} entries`;
  }
}

// ── Token Bucket ───────────────────────────────────────────

export class RustTokenBucket {
  private inner: JsTokenBucket | null = null;
  private tokens: number;
  private capacity: number;

  constructor(capacity: number, refillRatePerSec: number) {
    this.tokens = capacity;
    this.capacity = capacity;
    if (nativeModule) {
      this.inner = new nativeModule.JsTokenBucket(
        capacity,
        refillRatePerSec,
      );
    }
  }

  async tryConsume(tokens: number): Promise<boolean> {
    if (this.inner) {
      return this.inner.tryConsume(tokens);
    }
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  async consume(tokens: number): Promise<void> {
    if (this.inner) {
      return this.inner.consume(tokens);
    }
    if (this.tokens < tokens) {
      throw new Error("Rate limited");
    }
    this.tokens -= tokens;
  }

  refund(tokens: number): void {
    if (this.inner) {
      return this.inner.refund(tokens);
    }
    this.tokens = Math.min(this.capacity, this.tokens + tokens);
  }
}

// ── Rule Engine ────────────────────────────────────────────

export function evaluateSingleRule(
  rule: Rule,
  context: RuleContext,
): RuleResult {
  if (nativeModule) {
    return nativeModule.evaluateSingleRule(rule, context);
  }
  // JS fallback: simple condition evaluation
  const matched = rule.conditions.every((c) => {
    const value = context.values[c.field];
    if (value === undefined) return false;
    switch (c.operator) {
      case "GreaterThan":
        return value > c.value;
      case "LessThan":
        return value < c.value;
      case "GreaterThanOrEqual":
        return value >= c.value;
      case "LessThanOrEqual":
        return value <= c.value;
      case "Equal":
        return Math.abs(value - c.value) < Number.EPSILON;
      case "NotEqual":
        return Math.abs(value - c.value) >= Number.EPSILON;
      default:
        return false;
    }
  });

  return {
    matched,
    ruleId: rule.id,
    actions: matched ? [rule.action] : [],
    timestamp: Date.now() / 1000,
  };
}

export function evaluateRulesSync(
  rules: Rule[],
  context: RuleContext,
): RuleResult[] {
  if (nativeModule) {
    return nativeModule.evaluateRulesSync(rules, context);
  }
  return rules
    .sort((a, b) => a.priority - b.priority)
    .map((rule) => evaluateSingleRule(rule, context));
}

export const ruleEngine = {
  evaluateSingleRule,
  evaluateRulesSync,
};

// ── Health Check ───────────────────────────────────────────

/** Check if the native Rust module is loaded */
export function isNativeAvailable(): boolean {
  return nativeModule !== null;
}

/** Get version information */
export function getVersion(): string {
  return "0.1.0";
}
