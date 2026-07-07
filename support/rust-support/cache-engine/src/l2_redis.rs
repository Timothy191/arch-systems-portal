//! Redis L2 cache backend — optional persistent cache layer.
//!
//! Uses redis-rs with tokio async connections and connection-manager for
//! automatic reconnection. Values are serialized as JSON strings.
//!
//! # Example
//! ```rust,ignore
//! use cache_engine::l2_redis::RedisBackend;
//!
//! let redis = RedisBackend::connect("redis://127.0.0.1/").await?;
//! redis.set("key", b"value".to_vec(), None).await?;
//! let val = redis.get("key").await?;
//! ```

use redis::aio::ConnectionManager;
use redis::AsyncCommands;
use std::time::Duration;
use thiserror::Error;
use tracing::{debug, error, info, instrument, warn};

/// Errors from the Redis L2 cache backend
#[derive(Error, Debug)]
pub enum RedisError {
    #[error("Redis connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Redis operation failed: {0}")]
    OperationFailed(String),

    #[error("Key not found in Redis: {0}")]
    KeyNotFound(String),

    /// Connection pool exhausted
    #[error("Connection pool exhausted")]
    PoolExhausted,
}

/// Async Redis cache backend with connection manager (auto-reconnect)
pub struct RedisBackend {
    /// Redis connection manager — thread-safe, auto-reconnecting
    con: ConnectionManager,
    /// Default TTL for keys (seconds)
    default_ttl_secs: u64,
}

impl RedisBackend {
    /// Connect to a Redis instance
    ///
    /// # Arguments
    /// * `redis_url` - Redis connection URL, e.g. `redis://127.0.0.1:6379/`
    #[instrument]
    pub async fn connect(redis_url: &str) -> Result<Self, RedisError> {
        let client = redis::Client::open(redis_url)
            .map_err(|e| RedisError::ConnectionFailed(e.to_string()))?;

        let con = ConnectionManager::new(client.clone())
            .await
            .map_err(|e| RedisError::ConnectionFailed(e.to_string()))?;

        info!("RedisBackend connected to {}", redis_url);
        Ok(Self {
            con,
            default_ttl_secs: 3600,
        })
    }

    /// Connect with custom default TTL
    #[instrument]
    pub async fn connect_with_ttl(
        redis_url: &str,
        default_ttl_secs: u64,
    ) -> Result<Self, RedisError> {
        let client = redis::Client::open(redis_url)
            .map_err(|e| RedisError::ConnectionFailed(e.to_string()))?;

        let con = ConnectionManager::new(client.clone())
            .await
            .map_err(|e| RedisError::ConnectionFailed(e.to_string()))?;

        info!(
            "RedisBackend connected to {} (default TTL: {}s)",
            redis_url, default_ttl_secs
        );
        Ok(Self {
            con,
            default_ttl_secs,
        })
    }

    /// Get a value from Redis
    #[instrument(skip(self))]
    pub async fn get(&self, key: &str) -> Result<Vec<u8>, RedisError> {
        let mut con = self.con.clone();
        let result: Option<Vec<u8>> = con
            .get(key)
            .await
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;

        match result {
            Some(value) => {
                debug!(key, value_len = value.len(), "Redis L2 hit");
                Ok(value)
            }
            None => Err(RedisError::KeyNotFound(key.to_string())),
        }
    }

    /// Get a deserialized JSON value from Redis
    #[instrument(skip(self))]
    pub async fn get_json<T: serde::de::DeserializeOwned>(
        &self,
        key: &str,
    ) -> Result<T, RedisError> {
        let data = self.get(key).await?;
        let value: T = serde_json::from_slice(&data)
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;
        Ok(value)
    }

    /// Set a value in Redis with optional TTL
    #[instrument(skip(self, value))]
    pub async fn set(
        &self,
        key: &str,
        value: Vec<u8>,
        ttl_secs: Option<u64>,
    ) -> Result<(), RedisError> {
        let mut con = self.con.clone();
        let ttl = ttl_secs.unwrap_or(self.default_ttl_secs);

        let _: () = con
            .set_ex(key, value, ttl as usize)
            .await
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;

        debug!(key, ttl_secs = ttl, "Redis L2 set");
        Ok(())
    }

    /// Set a JSON-serializable value in Redis
    #[instrument(skip(self, value))]
    pub async fn set_json<T: serde::Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl_secs: Option<u64>,
    ) -> Result<(), RedisError> {
        let data = serde_json::to_vec(value)
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;
        self.set(key, data, ttl_secs).await
    }

    /// Delete a key from Redis
    #[instrument(skip(self))]
    pub async fn delete(&self, key: &str) -> Result<(), RedisError> {
        let mut con = self.con.clone();
        let _: i32 = con
            .del(key)
            .await
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;
        debug!(key, "Redis L2 delete");
        Ok(())
    }

    /// Check if a key exists
    #[instrument(skip(self))]
    pub async fn exists(&self, key: &str) -> Result<bool, RedisError> {
        let mut con = self.con.clone();
        let exists: bool = con
            .exists(key)
            .await
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;
        Ok(exists)
    }

    /// Set a TTL on an existing key
    #[instrument(skip(self))]
    pub async fn expire(
        &self,
        key: &str,
        ttl_secs: u64,
    ) -> Result<(), RedisError> {
        let mut con = self.con.clone();
        let _: i32 = con
            .expire(key, ttl_secs as usize)
            .await
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;
        Ok(())
    }

    /// Ping the Redis server to check connectivity
    #[instrument(skip(self))]
    pub async fn ping(&self) -> Result<String, RedisError> {
        let mut con = self.con.clone();
        let result: String = redis::cmd("PING")
            .query_async(&mut con)
            .await
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;
        Ok(result)
    }

    /// Get Redis server info
    #[instrument(skip(self))]
    pub async fn info(&self) -> Result<String, RedisError> {
        let mut con = self.con.clone();
        let result: String = redis::cmd("INFO")
            .query_async(&mut con)
            .await
            .map_err(|e| RedisError::OperationFailed(e.to_string()))?;
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// These tests require a running Redis instance.
    /// Skip by default; run with `cargo test --features l2-redis -- --ignored`
    #[ignore]
    #[tokio::test]
    async fn test_redis_connect() {
        let redis = RedisBackend::connect("redis://127.0.0.1:6379/")
            .await
            .expect("Redis should be connectable");
        let pong = redis.ping().await.unwrap();
        assert_eq!(pong, "PONG");
    }

    #[ignore]
    #[tokio::test]
    async fn test_redis_set_get() {
        let redis = RedisBackend::connect("redis://127.0.0.1:6379/")
            .await
            .unwrap();
        redis
            .set("test_key", b"test_value".to_vec(), Some(60))
            .await
            .unwrap();
        let val = redis.get("test_key").await.unwrap();
        assert_eq!(val, b"test_value".to_vec());
        redis.delete("test_key").await.unwrap();
    }

    #[ignore]
    #[tokio::test]
    async fn test_redis_exists() {
        let redis = RedisBackend::connect("redis://127.0.0.1:6379/")
            .await
            .unwrap();
        redis
            .set("test_exists", b"1".to_vec(), Some(60))
            .await
            .unwrap();
        assert!(redis.exists("test_exists").await.unwrap());
        redis.delete("test_exists").await.unwrap();
        assert!(!redis.exists("test_exists").await.unwrap());
    }

    #[ignore]
    #[tokio::test]
    async fn test_redis_json() {
        #[derive(serde::Serialize, serde::Deserialize, Debug, PartialEq)]
        struct TestData {
            name: String,
            value: i32,
        }

        let redis = RedisBackend::connect("redis://127.0.0.1:6379/")
            .await
            .unwrap();
        let data = TestData {
            name: "test".into(),
            value: 42,
        };
        redis.set_json("test_json", &data, Some(60)).await.unwrap();
        let retrieved: TestData = redis.get_json("test_json").await.unwrap();
        assert_eq!(retrieved, data);
        redis.delete("test_json").await.unwrap();
    }
}
