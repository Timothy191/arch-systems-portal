use std::time::Duration;
use moka::future::Cache;

/// A multi-layer cache system with L1 (in-memory) and L2 (Redis) layers
pub struct Cache {
    /// L1 cache: fast in-memory cache with expiration and eviction policies
    pub l1: Cache<String, Vec<u8>>,
    /// L2 cache: Redis-backed persistent cache (placeholder - would use redis-rs in production)
    pub l2_enabled: bool,
}

impl Cache {
    /// Create a new cache instance with default configuration
    pub fn new() -> Self {
        // Configure L1 cache with 1000 capacity and 1 hour TTL
        let l1 = Cache::builder()
            .max_capacity(1000)
            .time_to_live(Duration::from_hours(1))
            .time_to_idle(Duration::from_minutes(30))
            .build();

        Self {
            l1,
            l2_enabled: false, // Would be configured based on Redis availability
        }
    }

    /// Get a value from the cache, checking L1 first then L2
    pub async fn get(&self, key: &str) -> Option<Vec<u8>> {
        // Check L1 cache first
        if let Some(value) = self.l1.get(key) {
            return Some(value);
        }

        // In a real implementation, we would check L2 (Redis) here
        // For now, we return None if not in L1
        None
    }

    /// Insert a value into the cache with optional TTL
    pub async fn insert(&self, key: String, value: Vec<u8>, ttl: Option<Duration>) {
        // Insert into L1 cache
        if let Some(duration) = ttl {
            self.l1.insert_with_expires(key, value, duration).await;
        } else {
            self.l1.insert(key, value).await;
        }

        // In a real implementation, we would also insert into L2 (Redis) here
    }

    /// Invalidate a specific key from the cache
    pub async fn invalidate(&self, key: &str) {
        self.l1.invalidate(key);
        // Would also invalidate from L2 in real implementation
    }

    /// Invalidate all entries matching a tag pattern
    pub async fn invalidate_by_tag(&self, tag: &str) {
        // Simple implementation: iterate and remove matching keys
        // In production, would use a more efficient tag-based invalidation system
        let keys_to_remove: Vec<String> = self.l1
            .iter()
            .filter_map(|(k, _)| if k.contains(tag) { Some(k.clone()) } else { None })
            .collect();

        for key in keys_to_remove {
            self.l1.invalidate(&key);
        }
    }

    /// Get cache statistics
    pub fn stats(&self) -> String {
        format!(
            "L1 cache: {} entries, capacity: {}",
            self.l1.entry_count(),
            self.l1.capacity()
        )
    }
}

/// Token bucket rate limiter implementation
pub struct TokenBucket {
    capacity: u64,
    tokens: std::sync::atomic::AtomicU64,
    refill_rate: u64, // tokens per second
    last_refill: std::sync::atomic::AtomicU64,
}

impl TokenBucket {
    /// Create a new token bucket
    pub fn new(capacity: u64, refill_rate_per_sec: u64) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            capacity,
            tokens: std::sync::atomic::AtomicU64::new(capacity),
            refill_rate: refill_rate_per_sec,
            last_refill: std::sync::atomic::AtomicU64::new(now),
        }
    }

    /// Attempt to consume a token, returning true if successful
    pub fn try_consume(&self, tokens: u64) -> bool {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        // Refill tokens based on time passed
        let last_refill = self.last_refill.load(std::sync::atomic::Ordering::Relaxed);
        let elapsed = now.saturating_sub(last_refill);
        let to_add = elapsed * self.refill_rate;

        if to_add > 0 {
            let new_tokens = self
                .tokens
                .fetch_update(
                    std::sync::atomic::Ordering::AcqRel,
                    std::sync::atomic::Ordering::Relaxed,
                    |current| {
                        let mut new = current.saturating_add(to_add);
                        if new > self.capacity {
                            new = self.capacity;
                        }
                        Some(new)
                    },
                )
                .unwrap_or(self.capacity);

            self.last_refill.store(now, std::sync::atomic::Ordering::Relaxed);
        }

        // Try to consume tokens
        let current = self.tokens.load(std::sync::atomic::Ordering::Acquire);
        if current >= tokens {
            self.tokens
                .fetch_sub(tokens, std::sync::atomic::Ordering::AcqRel);
            true
        } else {
            false
        }
    }
}
