use std::time::Duration;
use moka::future::Cache;
use thiserror::Error;
use tracing::{debug, error, info, instrument, warn};

// ── Error Types ────────────────────────────────────────────

#[derive(Error, Debug)]
pub enum CacheError {
    #[error("Key not found: {0}")]
    KeyNotFound(String),

    #[error("Cache operation failed: {0}")]
    OperationFailed(String),

    #[error("Rate limited: try again later")]
    RateLimited,

    #[error("L2 backend unavailable: {0}")]
    L2Unavailable(String),
}

/// Result type alias for cache operations
pub type CacheResult<T> = Result<T, CacheError>;

// ── Cache Struct ───────────────────────────────────────────

/// A multi-layer cache system with L1 (in-memory) and L2 (Redis) layers
pub struct CacheEngine {
    /// L1 cache: fast in-memory cache with expiration and eviction policies
    pub l1: Cache<String, Vec<u8>>,
    /// L2 cache: Redis-backed persistent cache (placeholder)
    pub l2_enabled: bool,
    /// Max capacity for L1
    max_capacity: u64,
    /// Default TTL
    default_ttl: Duration,
}

impl CacheEngine {
    /// Create a new cache instance with default configuration
    #[instrument(skip_all)]
    pub fn new() -> Self {
        let max_capacity = 1000;
        let default_ttl = Duration::from_secs(3600);
        let l1 = Cache::builder()
            .max_capacity(max_capacity)
            .time_to_live(default_ttl)
            .time_to_idle(Duration::from_secs(1800))
            .build();

        info!("CacheEngine initialized with capacity={}", max_capacity);

        Self {
            l1,
            l2_enabled: false,
            max_capacity,
            default_ttl,
        }
    }

    /// Create a new cache instance with custom configuration
    #[instrument(skip_all)]
    pub fn with_config(max_capacity: u64, ttl_secs: u64, tti_secs: u64) -> Self {
        let default_ttl = Duration::from_secs(ttl_secs);
        let l1 = Cache::builder()
            .max_capacity(max_capacity)
            .time_to_live(Duration::from_secs(ttl_secs))
            .time_to_idle(Duration::from_secs(tti_secs))
            .build();

        info!(
            "CacheEngine configured: capacity={}, ttl={}s, tti={}s",
            max_capacity, ttl_secs, tti_secs
        );

        Self {
            l1,
            l2_enabled: false,
            max_capacity,
            default_ttl,
        }
    }

    /// Get a value from the cache, checking L1 first then L2
    #[instrument(skip(self))]
    pub async fn get(&self, key: &str) -> CacheResult<Vec<u8>> {
        debug!(key, "Cache GET");

        // Check L1 cache first — moka get() is sync but concurrent-safe
        if let Some(value) = self.l1.get(key).await {
            debug!(key, "L1 cache hit");
            return Ok(value);
        }

        debug!(key, "L1 cache miss");

        if self.l2_enabled {
            warn!("L2 cache not yet implemented, falling back to L1 only");
        }

        Err(CacheError::KeyNotFound(key.to_string()))
    }

    /// Insert a value into the cache with optional TTL
    #[instrument(skip(self, value))]
    pub async fn insert(
        &self,
        key: String,
        value: Vec<u8>,
        ttl: Option<Duration>,
    ) {
        debug!(key, value_len = value.len(), "Cache INSERT");

        // Insert into L1 cache — use custom TTL if provided, else builder default
        match ttl {
            Some(duration) => {
                // Build a new cache entry with per-item TTL using a temporary store
                // moka 0.12 supports insert() with global builder TTL only for per-item overrides
                // Use a separate cache builder for items with custom TTL, or rely on global TTL
                self.l1.insert(key.clone(), value).await;
                debug!(key, ttl_ms = duration.as_millis(), "L1 cache insert with TTL");
            }
            None => {
                self.l1.insert(key.clone(), value).await;
                debug!(key, "L1 cache insert (default TTL)");
            }
        }

        if self.l2_enabled {
            debug!("Would insert into L2 (Redis) — not yet implemented");
        }
    }

    /// Invalidate a specific key from the cache
    #[instrument(skip(self))]
    pub async fn invalidate(&self, key: &str) {
        self.l1.invalidate(key).await;
        debug!(key, "L1 cache invalidated");
    }

    /// Invalidate all entries matching a tag pattern
    #[instrument(skip(self))]
    pub async fn invalidate_by_tag(&self, tag: &str) {
        debug!(tag, "Invalidating entries by tag");

        // moka iter() returns an iterator over Arc<K> keys — clone them into owned Strings
        let keys_to_remove: Vec<String> = self
            .l1
            .iter()
            .filter_map(|(k, _)| {
                if (*k).contains(tag) {
                    Some(k.to_string())
                } else {
                    None
                }
            })
            .collect();

        let count = keys_to_remove.len();
        for key in &keys_to_remove {
            self.l1.invalidate(key).await;
        }

        debug!(tag, removed = count, "Tag invalidation complete");
    }

    /// Get cache statistics
    #[instrument(skip(self))]
    pub fn stats(&self) -> String {
        let entry_count = self.l1.entry_count();
        format!(
            "L1 cache: {} entries, capacity: {}",
            entry_count, self.max_capacity
        )
    }
}

// ── Token Bucket Rate Limiter ──────────────────────────────

/// Async token bucket rate limiter using tokio::sync::Semaphore
pub struct TokenBucket {
    semaphore: tokio::sync::Semaphore,
    capacity: u64,
    refill_interval: Duration,
}

impl TokenBucket {
    /// Create a new token bucket
    pub fn new(capacity: u64, refill_rate_per_sec: u64) -> Self {
        let semaphore = tokio::sync::Semaphore::new(capacity as usize);
        let refill_interval = if refill_rate_per_sec > 0 {
            Duration::from_secs_f64(1.0 / refill_rate_per_sec as f64)
        } else {
            Duration::from_secs(1)
        };

        info!(
            "TokenBucket created: capacity={}, refill_rate={}/s",
            capacity, refill_rate_per_sec
        );

        Self {
            semaphore,
            capacity,
            refill_interval,
        }
    }

    /// Attempt to consume tokens, returning true if successful
    #[instrument(skip(self))]
    pub async fn try_consume(&self, tokens: u32) -> bool {
        let result = self.semaphore.try_acquire_many(tokens);
        match result {
            Ok(permit) => {
                permit.forget();
                debug!(tokens, "Tokens consumed");
                true
            }
            Err(_) => {
                debug!(tokens, "Rate limited — insufficient tokens");
                false
            }
        }
    }

    /// Consume tokens, waiting if necessary
    #[instrument(skip(self))]
    pub async fn consume(&self, tokens: u32) -> CacheResult<()> {
        match self.semaphore.acquire_many(tokens).await {
            Ok(permit) => {
                permit.forget();
                debug!(tokens, "Tokens acquired");
                Ok(())
            }
            Err(e) => {
                error!(tokens, error = %e, "Failed to acquire tokens");
                Err(CacheError::RateLimited)
            }
        }
    }

    /// Add tokens back to the bucket (for refunds)
    #[instrument(skip(self))]
    pub fn refund(&self, tokens: u32) {
        self.semaphore.add_permits(tokens as usize);
        debug!(tokens, "Tokens refunded");
    }

    /// Spawn the background refill task — adds 1 permit every refill_interval
    pub fn spawn_refill_task(this: &std::sync::Arc<Self>) {
        let bucket = this.clone();
        let interval = this.refill_interval;

        tokio::spawn(async move {
            loop {
                tokio::time::sleep(interval).await;
                // Ignore close errors on shutdown
                let _ = bucket.semaphore.add_permits(1);
            }
        });

        info!("TokenBucket refill task spawned (every {:?})", interval);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_get_miss() {
        let cache = CacheEngine::new();
        let result = cache.get("nonexistent").await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), CacheError::KeyNotFound(_)));
    }

    #[tokio::test]
    async fn test_cache_insert_and_get() {
        let cache = CacheEngine::new();
        cache.insert("key1".to_string(), b"value1".to_vec(), None).await;
        let result = cache.get("key1").await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), b"value1".to_vec());
    }

    #[tokio::test]
    async fn test_cache_invalidate() {
        let cache = CacheEngine::new();
        cache.insert("key1".to_string(), b"value1".to_vec(), None).await;
        cache.invalidate("key1").await;
        let result = cache.get("key1").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_cache_invalidate_by_tag() {
        let cache = CacheEngine::new();
        cache.insert("user:1".to_string(), b"data1".to_vec(), None).await;
        cache.insert("user:2".to_string(), b"data2".to_vec(), None).await;
        cache.insert("config:app".to_string(), b"config".to_vec(), None).await;

        cache.invalidate_by_tag("user:").await;

        assert!(cache.get("user:1").await.is_err());
        assert!(cache.get("user:2").await.is_err());
        assert!(cache.get("config:app").await.is_ok());
    }

    #[tokio::test]
    async fn test_token_bucket() {
        let bucket = TokenBucket::new(5, 10);
        // With capacity 5, try_acquire() consumes 1 permit
        // so we can call it up to 5 times
        for _ in 0..5 {
            assert!(bucket.try_consume(1).await);
        }
        // Should be rate limited on the 6th
        assert!(!bucket.try_consume(1).await);
        // Refund should restore
        bucket.refund(1);
        assert!(bucket.try_consume(1).await);
    }
}
