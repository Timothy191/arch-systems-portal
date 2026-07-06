export { getRedisClient, closeRedis } from "./client.js";
export {
  cacheGet,
  cacheGetWithStats,
  cacheSet,
  cacheSetWithTags,
  cacheWrap,
  cacheDelete,
  cacheDeletePattern,
  cacheInvalidateTags,
  cacheInvalidatePrefixes,
  cacheEvictL1ByPrefix,
  clearMemoryCache,
} from "./cache.js";
export {
  CacheCategory,
  CACHE_TTL_REGISTRY,
  buildCacheKey,
  type CacheTtlConfig,
} from "./registry.js";
export {
  recordCacheHit,
  recordCacheMiss,
  recordRedisError,
  getCacheStats,
  resetCacheStats,
} from "./stats.js";
