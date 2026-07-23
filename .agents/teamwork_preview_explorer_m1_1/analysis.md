# Arch Systems Portal — Comprehensive Architecture & Monorepo Analysis

**Author:** Explorer 1 (Milestone 1)  
**Target Path:** `/home/timothy/Projects/.agents/teamwork_preview_explorer_m1_1/analysis.md`  
**Date:** 2026-07-23  

---

## 1. Executive Summary

The **Arch Systems Portal** is an enterprise AI-orchestrated monorepo combining a high-performance Next.js 16 App Router web portal (`apps/portal`), a Model Context Protocol (MCP) control plane gateway (`apps/ops-gateway`), an API gateway service (`apps/api-gateway`), and a rich ecosystem of 14 framework-agnostic shared packages under `@repo/*`.

The repository enforces a strict boundary between:
1. **Product Monorepo Runtime**: `apps/`, `packages/`, development/deployment scripts (`scripts/`), and Turborepo task pipelines.
2. **Agentic AI Surface**: `.agents/`, `.claude/`, `.cursor/`, and AI health/check tooling (`pnpm ai`).

---

## 2. Workspace Configuration & Monorepo Architecture

### Workspace Specifications
- **Package Manager**: `pnpm@9.15.9` (strict mode, pinned via Volta in `package.json` line 6 & 11).
- **Runtime Environment**: Node.js `>=22` (Volta pinned: `24.15.0`).
- **Build Orchestrator**: Turborepo `2.10.2` (`turbo.json`).
- **Path Prefix Convention**: The conceptual path prefix `Server/apps/` and `Server/packages/` used in prompt specifications refers to the monorepo root directories `apps/` and `packages/`.

### Core Monorepo Configurations

1. **`package.json`** (`/home/timothy/Projects/package.json`):
   - Global scripts: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm quality` (runs `turbo run lint type-check test --concurrency=4 && pnpm format:check`), `pnpm ai`, `pnpm ai:check`.
   - Workspace devDependencies: `@repo/eslint-config`, `@repo/typescript-config`, `turbo`, `typescript@5.7.0`, `zod@4.4.3`.

2. **`pnpm-workspace.yaml`** (`/home/timothy/Projects/pnpm-workspace.yaml`):
   - Package inclusions: `apps/*`, `packages/*`, `packages/departments/*`.
   - Package exclusion: `!apps/api` (standalone legacy/observability microservice excluded from pnpm workspace).
   - Security & release policy: `blockExoticSubdeps: true`, `minimumReleaseAge: 2880` (48 hours stability window).

3. **`turbo.json`** (`/home/timothy/Projects/turbo.json`):
   - Global environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `REDIS_URL`, `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_HEADERS`.
   - Task pipeline DAG:
     - `build`: Depends on `^build`, outputs `.next/**`, `dist/**`.
     - `quality`: Depends on `lint`, `type-check`, `test`.
     - `test`, `lint`, `type-check`: Concurrency-managed cached tasks.

---

## 3. Applications Deep Dive (`apps/`)

### 1. `apps/portal` (`/home/timothy/Projects/apps/portal`)
- **Type**: Next.js 16 App Router Web Portal.
- **Dependencies**: Next.js `16.2.6`, React `19.0.0`, `@ai-sdk/react`, `inngest^4.4.0`, `@sentry/nextjs^9.8.0`, `recharts^2.15.0`, `@repo/*` packages.
- **Build & Dev**: `next dev --turbopack --hostname 0.0.0.0`, `next build` (with OpenAPI spec auto-generation via `scripts/generate-openapi-spec.js`).
- **Route Topology**:
  - `(auth)`: Login, password reset, update authentication flows.
  - `(departments)`: 10 department feature routes:
    - `access-control`, `control-room`, `drilling`, `engineering`, `production`, `safety`, `satellite-monitoring`, `training`, `access-card-actions`, and `[department]` (dynamic fallback).
  - `hub`: Central dashboard page with cached metrics, alert ticker, production trends.
  - `admin`: Data management console (`/admin/data/[table]`).
  - `docs`: Swagger UI OpenAPI specification viewer (`/api/doc`).
- **API Route Handlers**: 51 active `route.ts` handlers under `src/app/api/`.

### 2. `apps/ops-gateway` (`/home/timothy/Projects/apps/ops-gateway`)
- **Type**: Meta-Backend / Control Plane Gateway & MCP Server.
- **Dependencies**: `@modelcontextprotocol/sdk^1.29.0`, `redis^4.7.0`, `zod^4.4.3`.
- **Primary Modules** (`src/`):
  - `mcp/server.ts`: Model Context Protocol server exposing operational tools to AI subagents over stdio.
  - `poller/`: Health poller (`health-poller.ts`), metrics poller (`metrics-poller.ts`), audit poller (`audit-poller.ts`).
  - `subscriber/redis-subscriber.ts`: Pub/Sub Redis subscriber for real-time operational trigger events.
  - `incident/engine.ts`: Incident detection and automated escalation engine.
  - `dispatcher/eve-dispatcher.ts`: TUI agent dispatcher.

### 3. `apps/api-gateway` (`/home/timothy/Projects/apps/api-gateway`)
- **Type**: GraphQL Mesh & OpenAPI API Gateway.
- **Dependencies**: `@graphql-mesh/cli`, `@graphql-mesh/openapi`, `@graphql-mesh/postgraphile`, `graphql`.

### 4. `apps/api` (`/home/timothy/Projects/apps/api`)
- **Status**: Excluded from active workspace (`!apps/api` in `pnpm-workspace.yaml`). Contains standalone observability code.

---

## 4. Shared Package Ecosystem (`packages/` / `@repo/*`)

| Package Name | Physical Location | Exports / Main | Core Responsibilities & Evidence |
| :--- | :--- | :--- | :--- |
| **`@repo/contract`** | `packages/contract` | `./index.ts`, `./validation` | Zod schemas (`updateWebhookSchema`, etc.) for strictly typed payload validation across apps. |
| **`@repo/database`** | `packages/database` | `./src/index.ts`, `./types`, `./query-builder` | Kysely SQL query builder, pg client pool, migration runner. Houses **76 SQL migration files** (`001_initial.sql` to `999_native_rls_conversion.sql`). |
| **`@repo/errors`** | `packages/errors` | `./src/index.ts` | Typed `AppError` base class (with `toJSON()`, `code`, `status`, `meta`) and subclasses: `NotFoundError` (404), `UnauthorizedError` (401), `ForbiddenError` (403), `ValidationError` (422), `RateLimitError` (429), `WebFetchError` (502), `InternalError` (500), and `isAppError` guard. |
| **`@repo/redis`** | `packages/redis` | `./src/index.ts`, `./cache`, `./client`, `./stats`, `./invalidation` | Hybrid L1/L2 caching engine. L1: In-memory Map with 1000-item LRU capacity and 15s-30s TTL. L2: Redis via `ioredis` with tag indexing (`indexCacheKeyByTags`) and SCAN-based tag invalidation (`cacheInvalidateTags`). Includes single-flight request coalescing (`activeFetches`). |
| **`@repo/supabase`** | `packages/supabase` | `./src/index.ts`, `./server`, `./client`, `./middleware`, `./read-replica`, `./service-role` | `@supabase/ssr` & `@supabase/supabase-js` bindings. Exports `createServerSupabaseClient()` (session-bound), `createAdminClient()` (service-role), `createReadReplicaClient()`, and `createMiddlewareClient()`. |
| **`@repo/rate-limiter`**| `packages/rate-limiter` | `./src/index.ts` | In-memory token bucket and sliding window rate limiting primitives. |
| **`@repo/logger`** | `packages/logger` | `./index.ts`, `./next` | Structured JSON logger for server (`serverLogger`) and browser (`clientLogger`) environments. |
| **`@repo/theme`** | `packages/theme` | `./src/index.ts`, `./css`, `./tokens`, `./react`, `./tailwind`, `./motion` | System design tokens, Tailwind preset, framer-motion animations, macOS white translucent palette (`rgba(255,255,255,0.72)`). |
| **`@repo/ui`** | `packages/ui` | `./src/index.ts`, `./GlassCard`, `./Button`, `./KPI`, `./Toaster`, etc. | Reusable UI primitives (`GlassCard`, `Button`, `Input`, `Toaster`, `Pagination`, `MacTitleBar`, `MacMenuBar`, `CookieConsent`). |
| **`@repo/utils`** | `packages/utils` | `./src/index.ts`, `./client`, `./inngest` | Common utility functions, ExcelJS report generation, and shared `inngest` client instance. |
| **`@repo/llm-config`** | `packages/llm-config` | `litellm_config.yaml` | LiteLLM routing configuration for LLM providers. |
| **`@repo/departments/ui`**| `packages/departments/ui` | `./index.ts` | Department-specific reusable components. |
| **`@repo/eslint-config`** | `packages/eslint-config` | `./next`, `./react-internal`, `./library.js` | Shared ESLint configurations enforcing Next.js and TypeScript standards. |
| **`@repo/typescript-config`**| `packages/typescript-config` | `./base.json`, `./nextjs.json`, `./react-library.json`, `./nestjs.json` | Shared TypeScript tsconfig bases enforcing strict mode. |

---

## 5. API Route Topology & Handlers (51 Routes)

All API routes reside under `apps/portal/src/app/api/`:

1. **Health & Observability Probes**:
   - `/api/health` — Full stack health aggregator (`route.ts`).
   - `/api/health/live` — Liveness probe (process responsive).
   - `/api/health/ready` — Readiness probe (PostgreSQL DB + Redis connectivity checks).
   - `/api/health/cache` — Redis cache health probe.
   - `/api/health/fuxa` — SCADA/FUXA system integration health.
   - `/api/health/redis` — Redis node check.
   - `/api/health/supabase-realtime` — Supabase realtime channel health.
   - `/api/health/warmup` — Route warmup probe.
   - `/api/v2/health` — Version 2 consolidated health check.
   - `/api/metrics` & `/api/metrics/prometheus` — Operational and Prometheus metric endpoints.

2. **Authentication & Session**:
   - `/api/auth/login` — Session creation.
   - `/api/auth/logout` — Session destruction & cookie cleanup.
   - `/api/auth/pin/hash` & `/api/auth/pin/verify` — PIN verification handlers.

3. **Operational & Admin Controls**:
   - `/api/admin/data/[table]` — Generic table data CRUD endpoint with role checks.
   - `/api/ops/cache/clear` — L1/L2 cache purge.
   - `/api/ops/config` — System configuration.
   - `/api/ops/db/audit` & `/api/ops/db/audit/status` — Database schema audit trigger & status.
   - `/api/ops/db/query` & `/api/ops/db/repair` — Operational SQL execution & repair routines.
   - `/api/ops/gateway/[[...path]]` — Gateway proxy.
   - `/api/ops/queue/action` & `/api/ops/queue/counts` — Background job queue controls.
   - `/api/ops/rate-limit` — Rate limit status inspection.
   - `/api/ops/summary` & `/api/ops/trigger` — Operational summary & event trigger endpoint.

4. **Background Processing & Data Export**:
   - `/api/inngest` — Inngest job handler (`GET`, `POST`, `PUT`).
   - `/api/export/fuel-logs`, `/api/export/machines`, `/api/export/monthly-report`, `/api/export/production`, `/api/export/safety-incidents` — Excel export routes.

5. **Telemetry, Webhooks & Printers**:
   - `/api/telemetry/push` & `/api/plugins/rust-telemetry` — Machine telemetry ingestion.
   - `/api/webhooks`, `/api/webhooks/[id]`, `/api/webhooks/[id]/logs` — Webhook manager.
   - `/api/printers`, `/api/printers/[id]`, `/api/printers/scan` — Hardware printer management.
   - `/api/c66`, `/api/control-room/shift-completeness`, `/api/csp-violations`, `/api/doc`, `/api/feedback`, `/api/log`, `/api/sync/playback`, `/api/tools/status`, `/api/weather`.

---

## 6. Dataflow Pipelines & Caching Architecture

### Background Data Pipelines (Inngest)
Defined in `apps/portal/src/app/api/inngest/route.ts` (lines 12-24):
1. `syncPlaybackFn` (`src/lib/jobs/sync-playback`): Telemetry playback synchronization.
2. `generateReportFn` (`src/lib/jobs/report-generation`): Automated Excel report generation.
3. `generateEmbeddingFn` (`src/lib/jobs/embedding-generation`): pgvector vector embedding generation.
4. `memoryPersistFn` (`src/lib/jobs/memory-persist`): System memory persistence.
5. `shiftCompletenessCheckFn` (`src/lib/jobs/shift-completeness-check`): Shift log validation.
6. `orphanedRecordDetectionFn` (`src/lib/jobs/orphaned-record-detection`): Data integrity checks.
7. `shiftIntegrityReportFn` (`src/lib/reports/shift-integrity`): Daily shift report generation.
8. `automatedAuditFn` (`src/lib/jobs/automated-audit`): Scheduled database audit runner.

### Next.js 16 Native Caching & Custom Redis Cache Handler
1. **`"use cache"` & Tag Revalidation**:
   - Used in helper functions across pages (e.g., `apps/portal/src/app/hub/page.tsx` lines 38-40).
   - Uses `cacheLife('minutes')` and `cacheTag(...)` for tag-indexed cache invalidation.
2. **`NextCacheHandler`** (`apps/portal/src/lib/next-cache-handler.ts` lines 30-103):
   - Implements Next.js CacheHandler interface, linking `"use cache"` and `cacheTag()` directly to `@repo/redis`.
   - Wired in `next.config.mjs` via `experimental.cacheHandlers.default`.
3. **Decoupled Auth Caching Rule**:
   - Auth functions (`cookies()`, `headers()`) MUST NOT be called inside `"use cache"` scope.
   - Outer un-cached function verifies authorization, then passes cookies/parameters into an inner cached function using `createAdminClient()` or `createReadReplicaClient()`.

---

## 7. Client-Server Boundaries & Security Guardrails

1. **Middleware & Authentication Boundary**:
   - `packages/supabase/src/middleware.ts` (`createMiddlewareClient` lines 29-69) binds request cookies and handles session refresh via `@supabase/ssr`.
   - `apps/portal/src/lib/api/rate-limit-middleware.ts` handles API rate-limiting guardrails.
2. **Server-Only Enforcement**:
   - `apps/portal/package.json` includes `server-only^0.0.1`.
   - Heavy server modules (`@react-pdf/renderer`, `inngest`, `@repo/database`) are isolated from Client Components (`'use client'`).
3. **Bundle Size Budget Guardrails**:
   - `apps/portal/.size-limit.json` sets strict thresholds:
     - Application page chunks: **350 KB** limit.
     - Main entry chunks: **250 KB** limit.

---

## 8. Status of `Codebase-maps/` & `.kiro/specs/`

1. **`Codebase-maps/`**: Already exists under `/home/timothy/Projects/Codebase-maps/` with 5 structured markdown documents:
   - `README.md`: Index and architecture overview diagram.
   - `monorepo-structure-map.md`: Directory tree breakdown and boundary rules.
   - `data-flow-and-api-map.md`: Request flow diagram, key API routes table, caching rules.
   - `packages-and-dependencies-map.md`: Package ecosystem graph and exports table.
   - `architectural-graph-matrix-and-tooling.md`: 4-layer graph matrix and tooling matrix.

2. **`.kiro/specs/`**: Contains 20 feature specifications (e.g., `portal-migration`, `product-ai-layer-split`, `server-actions-audit-and-route-handler-migration`).
   - The spec directory for verification (`.kiro/specs/arch-systems-portal-verification/spec.md`) is scheduled to be populated as part of Milestone 1 spec-first compliance.

---
