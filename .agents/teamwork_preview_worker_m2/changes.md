# Recorded Changes

## 1. Rate Limiter Hardening

### `packages/rate-limiter/src/index.ts`
- **Store & Client Interfaces**: Extended `SimpleRedisClient` with optional `incr` and `expire` methods. Extended `Store` interface to support `get` and `set` state methods alongside `increment`.
- **`MemoryStore`**: Implemented dual-map structure (`counters` for fixed window increments, `storage` for key-value TTL-based state objects).
- **`RedisStore`**: Updated `increment` to perform atomic `incr` + `expire` on first initialization. Added `get` and `set` methods with TTL calculation.
- **`TokenBucketStrategy`**: Refactored to implement genuine Token Bucket algorithm:
  - Tracks `tokens`, `capacity`, `refillRate` (tokens/ms), and `lastRefill` timestamp.
  - Dynamically calculates elapsed time and refilled tokens upon each check.
  - Consumes 1 token when available (`allowed = true`, `remaining = Math.floor(tokens)`).
  - Computes exact `retryAfter` delay when tokens are depleted (`allowed = false`).
  - Persists state to store with TTL safety multiplier.
- **`SlidingWindowStrategy`**: Refactored to implement genuine Sliding Window algorithm:
  - Maintains timestamp log array for request history within `windowMs`.
  - Filters out timestamps older than `now - windowMs`.
  - Grants access if `timestamps.length < limit`, updating remaining count and reset timestamp.
  - Denies access if `timestamps.length >= limit`, calculating exact `retryAfter` based on the oldest timestamp sliding out of the window.
- **`RateLimiter` Class**: Delegates check operations to strategy `.check(...)` implementations while maintaining full fallback compatibility.

### `packages/rate-limiter/src/__tests__/rate-limiter.test.ts`
- Added comprehensive unit test suite for `@repo/rate-limiter` covering `MemoryStore`, `RedisStore`, `TokenBucketStrategy`, `SlidingWindowStrategy`, and `RateLimiter` class (8/8 tests passing).

### `apps/portal/src/lib/api/rate-limit-middleware.ts`
- Updated `MemoryStore` and `RedisStore` in portal API middleware to support `get` and `set` state methods for distributed rate limiting strategies.
- Refactored `TokenBucketStrategy` to track real token bucket parameters (`tokens`, `capacity`, `refillRate`, `lastRefill`).
- Refactored `SlidingWindowStrategy` to track real sliding window timestamp logs.
- Verified portal rate limiting tests pass cleanly (9/9 tests passing).

## 2. Errors Test Suite Remediation

### `packages/errors/src/index.ts`
- Added and exported error classes to align `@repo/errors` with monorepo import expectations:
  - `TooManyRequestsError` (subclass of `RateLimitError`, code `'RATE_LIMITED'`, HTTP 429)
  - `InternalServerError` (subclass of `InternalError`, code `'INTERNAL_ERROR'`, HTTP 500)
  - `ServiceUnavailableError` (subclass of `AppError`, code `'SERVICE_UNAVAILABLE'`, HTTP 503)
  - `ConflictError` (subclass of `AppError`, code `'CONFLICT'`, HTTP 409)

### `packages/errors/src/__tests__/errors.test.ts`
- Replaced outdated tests with updated suite importing valid exported classes (`AppError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `TooManyRequestsError`, `InternalServerError`, `ServiceUnavailableError`, `ConflictError`, `RateLimitError`, `InternalError`, `WebFetchError`, `isAppError`).
- Aligned tests with exact constructor signatures (`{ code, message, status, cause, meta }` for `AppError`, parameter defaults for subclasses).
- Verified `@repo/errors` test suite passes cleanly (12/12 tests passing).
