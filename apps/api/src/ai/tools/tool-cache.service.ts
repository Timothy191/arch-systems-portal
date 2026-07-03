import { Injectable } from "@nestjs/common";

interface CacheEntry {
  result: unknown;
  expiry: number;
}

const DEFAULT_TTL_MS = 5_000;
const MAX_ENTRIES = 100;

@Injectable()
export class ToolCacheService {
  private readonly cache = new Map<string, CacheEntry>();

  get(userId: string, toolName: string, args: Record<string, unknown>): unknown | undefined {
    const key = this.buildKey(userId, toolName, args);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU: move to end by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.result;
  }

  set(
    userId: string,
    toolName: string,
    args: Record<string, unknown>,
    result: unknown,
    ttlMs = DEFAULT_TTL_MS,
  ): void {
    const key = this.buildKey(userId, toolName, args);

    if (this.cache.size >= MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { result, expiry: Date.now() + ttlMs });
  }

  invalidate(userId: string, toolName: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:${toolName}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private buildKey(userId: string, toolName: string, args: Record<string, unknown>): string {
    return `${userId}:${toolName}:${JSON.stringify(args)}`;
  }
}
