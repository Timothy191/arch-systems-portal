/**
 * L1 in-memory embedding cache.
 *
 * Size-capped at 512 entries, user-isolated, and uses a simple LRU eviction
 * policy by re-inserting accessed keys. This lives at module scope so it
 * persists across requests in a single Node process.
 */

const EMBEDDING_CACHE_MAX = 512;
const embeddingCache = new Map<string, number[]>();

function getCacheKey(hash: string, userId: string): string {
  return `${userId}:${hash}`;
}

export function getCachedEmbedding(
  hash: string,
  userId: string,
): number[] | undefined {
  const key = getCacheKey(hash, userId);
  const entry = embeddingCache.get(key);
  if (entry === undefined) return undefined;

  // LRU: Move to end (most recently used) by re-inserting
  embeddingCache.delete(key);
  embeddingCache.set(key, entry);
  return entry;
}

export function setCachedEmbedding(
  hash: string,
  userId: string,
  vector: number[],
): void {
  const key = getCacheKey(hash, userId);
  if (embeddingCache.has(key)) {
    // Move to end (most recently used) by re-inserting
    embeddingCache.delete(key);
  } else if (embeddingCache.size >= EMBEDDING_CACHE_MAX) {
    // Evict oldest entry if at capacity
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey !== undefined) embeddingCache.delete(firstKey);
  }
  embeddingCache.set(key, vector);
}

export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}
