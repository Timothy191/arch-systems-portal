# Enterprise Pattern Verification Analysis Report

**Repository:** Arch Systems Portal Monorepo  
**Author:** Explorer 2 (`teamwork_preview_explorer_m1_2`)  
**Milestone:** Milestone 1 - Verification & Mapping (Enterprise Patterns)  
**Date:** 2026-07-23  

---

## 1. Executive Summary

This report delivers a read-only architectural investigation into the core enterprise patterns of the **Arch Systems Portal** monorepo. Five critical dimensions were systematically analyzed, backed by verbatim code evidence, line numbers, and file paths:

1. **High-Throughput Caching Mesh**: Next.js 16 native `"use cache"` directive, `cacheTag()` index, custom `@repo/redis` CacheHandler, L1/L2 two-tier cache, strict Auth-Decoupling pattern, and Inngest 4 background event queueing.
2. **Typed Error Handling**: `@repo/errors` package with `AppError` base class, HTTP status mapping, `toJSON()` serialization, portal `error-classes.ts` domain errors, and runtime module diagnostics in `error-handler.ts`.
3. **Database Row Level Security (RLS)**: Mandatory RLS across all tables in `packages/database/migrations/`, `public.is_admin()` and `public.has_department_access()` security functions, Migration `041` index optimizations to prevent sequential table scans, and Migration `043` Admin Data Lockdown for UPDATE/DELETE operations.
4. **Multi-Layer Rate Limiting**: `@repo/rate-limiter` Redis-backed store, Next.js `withRateLimit()` middleware, Token Bucket strategy for AI routes vs Sliding Window for general APIs, path-based rate limit rules, Load-Adaptive Throttling (>85% CPU load triggers 50% limit reduction), and `x-internal-secret` bypass.
5. **Operational Health Probes & Smoke Tests**: Kubernetes-style `/api/health/live` (process liveness) and `/api/health/ready` (dependency graph check), synthetic pgvector HNSW health check in `/api/health`, and 27-point 6-phase automated smoke test suite in `scripts/smoke-test.sh`.

---

## 2. High-Throughput Caching Architecture

### 2.1 Next.js 16 CacheHandler & L1/L2 Redis Mesh
Next.js 16's native caching infrastructure is integrated with `@repo/redis` via a custom cache handler.

- **Cache Handler Implementation:** `apps/portal/src/lib/next-cache-handler.ts`
  - **L1 Cache:** Per-request `Map<string, CacheHandlerValue>` cleared on every incoming request (Line 32, 99–101).
  - **L2 Cache:** Redis-backed storage via `@repo/redis/cache` using `cacheGet` and `cacheSetWithTags` (Lines 45, 75).
  - **Tag Invalidation:** SSCAN + UNLINK non-blocking tag invalidation via `cacheInvalidateTags` (Line 89).
  - **Configuration Binding:** Bound in `apps/portal/next.config.mjs` via `experimental.cacheHandlers.default`.

- **Redis Cache Mechanics:** `packages/redis/src/cache.ts`
  - **L1 In-Memory LRU:** 1000-entry capacity (`L1_MAX_ENTRIES = 1000`, Line 12) with <0.1ms retrieval latency (Line 83).
  - **Write-Through Caching:** `cacheSet` writes to L1 memory (capped at 30s TTL, Line 158) and L2 Redis (Line 165).
  - **Request Coalescing (Single-Flight):** `cacheWrap` maintains an `activeFetches` Map (`Map<string, Promise<any>>`, Line 191) to prevent cache stampedes under high concurrency.
  - **Tag Indexing:** `packages/redis/src/invalidation.ts` indexes cache keys under Redis Sets (`arch:__tags__:<tag>`, Line 24) and uses `sscanStream` with batch size 100 and `unlink` (Lines 48–63) for non-blocking deletion.

### 2.2 Auth Decoupling from Caching Scope
Next.js 16 `"use cache"` functions must never read request context (`cookies()` or `headers()`). The codebase strictly enforces a two-layer separation:

- **Evidence:** `apps/portal/src/app/(departments)/access-control/actions.ts`
  - **Outer Function (Auth Check):** `getAccessControlMetrics(deptId: string)` (Lines 123–126) calls `assertAccessControlRole()` which evaluates user cookies (`createServerSupabaseClient()`, `supabase.auth.getUser()`).
  - **Inner Function (Cached Query):** `_getCachedMetrics(deptId: string)` (Lines 83–121) contains `'use cache'`, declares tags (`cacheTag('dept:' + deptId, ...)`), and creates a service-role client via `createAdminClient()` to bypass cookie reading inside the cached scope.

### 2.3 Background Event Queueing (Inngest)
- **Client Definition:** `packages/utils/src/inngest.ts` initializes `Inngest({ id: 'portal' })`.
- **API Handler:** `apps/portal/src/app/api/inngest/route.ts` registers 8 background job handlers:
  1. `syncPlaybackFn`
  2. `generateReportFn`
  3. `generateEmbeddingFn`
  4. `memoryPersistFn`
  5. `shiftCompletenessCheckFn`
  6. `orphanedRecordDetectionFn`
  7. `shiftIntegrityReportFn`
  8. `automatedAuditFn`

---

## 3. Typed Error Handling Architecture

### 3.1 `@repo/errors` Package
- **Location:** `packages/errors/src/index.ts`
- **Base Class:** `AppError` extends standard JS `Error` with prototype chain preservation (Line 35).
- **Properties:** `code: ErrorCode`, `status: number`, `meta?: Record<string, unknown>`, `cause?: unknown`.
- **Serialization:** `toJSON()` returns standardized structure `{ error: { code, message, meta } }` (Lines 52–60).
- **Subclasses & Status Codes:**
  - `NotFoundError`: `NOT_FOUND` (404)
  - `UnauthorizedError`: `UNAUTHORIZED` (401)
  - `ForbiddenError`: `FORBIDDEN` (403)
  - `ValidationError`: `VALIDATION_ERROR` (422)
  - `RateLimitError`: `RATE_LIMITED` (429)
  - `WebFetchError`: `SERVICE_UNAVAILABLE` (502)
  - `InternalError`: `INTERNAL_ERROR` (500)
- **Type Guard:** `isAppError(err: unknown): err is AppError` (Line 113).

### 3.2 Portal Domain Errors & Diagnostics
- **Domain Classes:** `apps/portal/src/lib/errors/error-classes.ts` defines `APIError`, `ValidationError` (400), `AuthError` (401), `DatabaseError` (500), `NotFoundError` (404), `ConflictError` (409), `ForbiddenError` (403), `AIProviderError` (502), and `ExternalServiceError` (502).
- **Build Diagnostics:** `apps/portal/src/lib/errors/error-handler.ts` provides runtime detection for Turbopack compilation issues:
  - `isModuleResolutionError()` checks pattern matches like `Can't resolve` or `Module not found`.
  - `suggestModuleResolutionFix()` identifies stray `.js` extensions in imports.
  - `clearCompilationCaches()` purges `.next/cache` and `.turbo/cache`.

---

## 4. Database Row Level Security (RLS) & Security Guardrails

### 4.1 RLS Architecture & SQL Security Functions
All PostgreSQL tables have Row Level Security explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) across 48+ migration files in `packages/database/migrations/`.

- **Core Security Helper Functions:**
  - `public.is_admin()`: Verifies if current `auth.uid()` possesses `role = 'admin'` in `employees`.
  - `public.has_department_access(dept_id)`: Validates user department association.
  - `public.is_active(record_deleted_at)`: Standard soft-delete policy check (`012_rls_refinement.sql`, Line 6).

### 4.2 Critical RLS Performance Indexing
- **Migration:** `packages/database/migrations/041_rls_performance_indexes.sql`
- **Problem Resolved:** `public.has_department_access()` executes `SELECT 1 FROM employees WHERE auth_id = auth.uid()` on every row evaluated by RLS. Without indexing, queries caused sequential table scans.
- **Indexes Created:**
  - `CREATE INDEX IF NOT EXISTS idx_employees_auth_id ON employees(auth_id);` (Line 17)
  - `CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);` (Line 22)
  - `CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);` (Line 27)

### 4.3 Admin Data Lockdown Initiative
- **Migration:** `packages/database/migrations/043_admin_data_lockdown.sql`
- **Policy Enforcement:** Restricts `UPDATE` and `DELETE` privileges across operational tables exclusively to administrators (`USING (public.is_admin())`).
- **Controlled Operational Exceptions:**
  - `hourly_loads` & `excavator_activity`: Operators retain `UPDATE` permissions for real-time shift data entry (Lines 84, 119).
  - `safety_incidents`: Reporters retain `UPDATE` access for their own reported incidents (`reported_by = (SELECT id FROM employees WHERE auth_id = auth.uid())`, Line 161).
  - `documents`: Document creators retain `UPDATE` access for their own documents (Line 187).

---

## 5. Multi-Layer Rate Limiting System

### 5.1 Base Rate Limiter Package
- **Location:** `packages/rate-limiter/src/index.ts`
- **Components:**
  - `RedisStore`: Implements atomic `INCR` + `EXPIRE` over `ratelimit:<key>:<window_bucket>` (Line 43).
  - `FixedWindowStrategy`: Evaluates request counts against wall-clock windows (Line 59).
  - `RateLimiter`: Evaluates requests and returns `RateLimitResult` (`allowed`, `remaining`, `total`, `retryAfter`). Fails open (`allowed: true`) if Redis is disconnected (Line 106).

### 5.2 Portal Rate Limit Middleware & Adaptive Controls
- **Location:** `apps/portal/src/lib/api/rate-limit-middleware.ts`
- **API Guard Wrapper:** `withRateLimit(request, handler, options)` wraps Next.js API handlers.
- **Dual Strategy Dispatch:**
  - `/api/ai/*`: Uses `TokenBucketStrategy` to handle bursty LLM requests (Line 179).
  - All other routes: Uses `SlidingWindowStrategy` (Line 179).
- **Route-Based Limits:** Defined in `apps/portal/src/lib/api/rate-limit-config.ts`:
  - `ai`: 30 req / 60s
  - `auth`: 10 req / 15m
  - `export`: 20 req / 60s
  - `admin`: 100 req / 60s
  - `webhooks`: 200 req / 60s
  - `general`: 1000 req / 60s
  - `hardware` (`/api/c66`): 10,000 req / 60s
- **Advanced Features:**
  - **IP Whitelisting:** `WHITELISTED_IPS` set (`127.0.0.1`, `::1`) bypasses limits (Line 225).
  - **Load-Adaptive Throttling:** `isSystemUnderHighLoad()` checks 1-minute system CPU load average. If load > 85% capacity, request limits are automatically scaled down by 50% (`Math.floor(maxRequests * 0.5)`, Line 236).
  - **Internal Secret Bypass:** `skipForInternal(request)` verifies `x-internal-secret` using constant-time comparison `timingSafeEqual()` (Line 283).
  - **HTTP Response Headers:** Sets `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on 429 responses.

### 5.3 Gateway Dynamic Controls
- **Location:** `apps/ops-gateway/src/ops-client.ts` (Line 140) & `apps/ops-gateway/src/mcp/tools.ts`
- Exposes `updateRateLimit(limit)` endpoint to dynamically adjust portal limits via MCP tools during system overload or incident remediation.

---

## 6. Operational Health Probes & Smoke Test Infrastructure

### 6.1 Kubernetes-Style Health Probe Endpoints
The portal exposes specialized health probes under `apps/portal/src/app/api/health/`:

1. **Liveness Probe:** `apps/portal/src/app/api/health/live/route.ts`
   - Confirms Node.js process is active and event loop is responsive.
   - Returns `{ status: 'healthy', latencyMs, timestamp }` (HTTP 200).

2. **Readiness Probe:** `apps/portal/src/app/api/health/ready/route.ts`
   - Verifies the full dependency graph before serving traffic:
     - Supabase / PostgreSQL query (`employees.select('role').limit(1)`).
     - Redis status / PING check (`redis.ping() === 'PONG'`).
   - Returns `{ status: 'ready' | 'not_ready', dependencies: { database, redis } }` (HTTP 200 or HTTP 503).

3. **Comprehensive System Probe & Synthetic HNSW Check:** `apps/portal/src/app/api/health/route.ts`
   - Performs DB connectivity check.
   - **Synthetic Vector Search Check:** Generates a synthetic embedding (`generateLocalFallbackEmbedding('synthetic health check ping')`) and invokes Supabase RPC `match_memories` to test pgvector HNSW index health (Lines 25–37).
   - Redis status validation.

4. **Dedicated Subsystem Probes:**
   - `/api/health/cache` (Redis L2 cache status)
   - `/api/health/redis` (Redis PING latency)
   - `/api/health/supabase-realtime` (Realtime socket connection)
   - `/api/health/warmup` (JIT/cache pre-warming)
   - `/api/health/fuxa` (SCADA/Industrial integration health)

### 6.2 Operational Smoke Test Suite
- **Script Location:** `scripts/smoke-test.sh` (393 lines bash)
- **Coverage:** Exercises 27 automated checks across 6 execution phases:
  - **Phase 0: Pre-flight**: Checks portal reachability, PID file (`.portal.pid`), and PORT variables.
  - **Phase 1: Environment**: Validates `.env.local` existence, Supabase URL/keys, service-role key, and `REDIS_URL`.
  - **Phase 2: Redis**: Verifies `/api/health/cache` endpoint and executes container `redis-cli ping`.
  - **Phase 3: Supabase**: Tests Supabase Auth (`http://127.0.0.1:54321/auth/v1/health`) and Realtime `/api/health/supabase-realtime`.
  - **Phase 4: Portal Routes**: Validates startup time (<60s), checks `portal.log` for critical errors (`FATAL`, `Failed to compile`), tests public GET `/login` (200 OK), and verifies redirect behavior (302/307) for protected routes (`/hub`, `/engineering`, `/drilling`, `/safety`).
  - **Phase 5: Stack Smoke**: Queries `/api/health`, verifies Supabase DB status, Redis status, RLS active verification, checks `/api/health/live` and `/api/health/ready`, validates login page HTML structure (`<!doctype`), checks static assets (`/favicon.ico`), and verifies response latency (<2000ms).
  - **Watchdog Phase**: Confirms presence of `scripts/portal-watchdog.sh`.

---

## 7. Verification & Summary Table

| Enterprise Pattern | Primary File Path | Key Mechanism / Implementation | Status |
|---|---|---|---|
| **CacheHandler (L2 Redis)** | `apps/portal/src/lib/next-cache-handler.ts` | Custom CacheHandler wired to `@repo/redis` | VERIFIED |
| **L1/L2 Cache Mesh** | `packages/redis/src/cache.ts` | 1000-entry L1 LRU memory + L2 Redis + request coalescing | VERIFIED |
| **Non-blocking Invalidation** | `packages/redis/src/invalidation.ts` | Tag indexing under `arch:__tags__:<tag>` with `SSCAN` + `UNLINK` | VERIFIED |
| **Auth Decoupled Caching** | `apps/portal/src/app/(departments)/access-control/actions.ts` | Outer `assertAccessControlRole()` + inner cached `_getCachedMetrics()` | VERIFIED |
| **Background Job Processing** | `apps/portal/src/app/api/inngest/route.ts` | Inngest 4 handler registering 8 background functions | VERIFIED |
| **Typed Error Hierarchy** | `packages/errors/src/index.ts` | `AppError` base class with `ErrorCode`, status map, `toJSON()` | VERIFIED |
| **Domain Errors & Diagnostics** | `apps/portal/src/lib/errors/` | `error-classes.ts` + `error-handler.ts` Turbopack cache fixes | VERIFIED |
| **Database RLS Policies** | `packages/database/migrations/` | Mandatory RLS on all tables with `is_admin()` and `has_department_access()` | VERIFIED |
| **RLS Index Optimization** | `packages/database/migrations/041_rls_performance_indexes.sql` | `idx_employees_auth_id` to eliminate full table scans | VERIFIED |
| **Admin Data Lockdown** | `packages/database/migrations/043_admin_data_lockdown.sql` | `is_admin()` required for UPDATE/DELETE with minimal workflow exceptions | VERIFIED |
| **Rate Limiter Core** | `packages/rate-limiter/src/index.ts` | Redis `INCR` + `EXPIRE` fixed-window store | VERIFIED |
| **Rate Limit Middleware** | `apps/portal/src/lib/api/rate-limit-middleware.ts` | Token Bucket (AI) vs Sliding Window (general) + Load-Adaptive Throttling | VERIFIED |
| **Liveness Probe** | `apps/portal/src/app/api/health/live/route.ts` | Returns HTTP 200 process status | VERIFIED |
| **Readiness Probe** | `apps/portal/src/app/api/health/ready/route.ts` | Validates DB and Redis readiness (200 vs 503) | VERIFIED |
| **Synthetic Vector Health Check** | `apps/portal/src/app/api/health/route.ts` | Generates fallback vector & tests pgvector `match_memories` | VERIFIED |
| **Operational Smoke Test** | `scripts/smoke-test.sh` | 393-line script executing 27 checks across 6 phases | VERIFIED |
