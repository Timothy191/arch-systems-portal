# Repository Guidelines

## Project Overview

Arch-Mk2 is an industrial mining-operations portal (Plantcor) built as a pnpm + Turborepo monorepo. It ships a Next.js 16 portal (`apps/portal`), a NestJS 11 API (`apps/api`), a FastAPI agent microservice (`apps/ai-agents`), and shared TypeScript packages (`packages/*`) for data access, caching, UI, and error handling. External tooling is integrated via MCP servers registered in `.mcp.json`.

## Architecture & Data Flow

```
Browser → Next.js Portal (RSC + Server Actions)
           ├─ proxy.ts enforces auth via @repo/supabase
           ├─ Redis-backed auth/user cache
           ├─ Next.js rewrites → NestJS API URL
           └─ Direct Supabase reads (read-replica)

NestJS API (Fastify)
  ├─ Global filters → Zod validation → Supabase/Redis/services
  ├─ Feature modules: auth, admin, ai, tools, jobs/Inngest, webhooks, security, telemetry
  └─ Responses flow back through global exception filter (Sentry on 5xx)

ai-agents (FastAPI stub)
  └─ POST /api/v1/crew/invoke → CrewAI/LangGraph workflows (placeholder)
```

**Data boundary rule**: Apps MUST import data access from `@repo/supabase`, never `@repo/database` directly. `@repo/database` is migrations-only.

## Key Directories

| Directory                | Purpose                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/portal/`           | Next.js 16 App Router frontend: route groups under `app/`, shared UI under `components/`, hooks under `hooks/`, domain utilities under `lib/`, feature slices under `features/` |
| `apps/api/src/`          | NestJS Fastify backend: `main.ts` bootstrap, modules under `src/<feature>/` (controllers + services), auth guards, global filters                                               |
| `apps/ai-agents/src/`    | Python FastAPI microservice for CrewAI/LangGraph orchestration (currently stub)                                                                                                 |
| `packages/supabase/`     | Supabase clients: server, browser, middleware, read-replica, service-role, Kysely types, OTel tracing                                                                           |
| `packages/redis/`        | L1 memory + L2 Redis cache, invalidation, stats                                                                                                                                 |
| `packages/rate-limiter/` | Pluggable rate limiter (memory/redis stores, fixed/sliding/token-bucket strategies)                                                                                             |
| `packages/errors/`       | Shared error classes (`AppError`, HTTP errors, domain errors, type guards)                                                                                                      |
| `packages/database/`     | SQL migrations only — no runtime src/                                                                                                                                           |
| `packages/ui/`           | Shared React component library (depends on `@repo/theme`)                                                                                                                       |
| `packages/theme/`        | Design tokens: OKLCH-based CSS variables in `src/css/variables.css`                                                                                                             |
| `tools/`                 | Policy compiler, RLS audit, circular-dep detector, MCP server wrappers (n8n, preflight, wiki-viewer). Excluded from ESLint/Prettier. Build-time only.                           |
| `e2e/`                   | Playwright E2E + visual regression specs                                                                                                                                        |

## Development Commands

| Task                             | Command                                                               |
| -------------------------------- | --------------------------------------------------------------------- |
| Full quality gate                | `pnpm quality`                                                        |
| Dev server (portal, no Docker)   | `pnpm dev --quick`                                                    |
| Dev (portal + Supabase + health) | `pnpm dev`                                                            |
| Lint + typecheck + test          | `pnpm lint && pnpm type-check && pnpm test`                           |
| Format / check                   | `pnpm format` / `pnpm format:check`                                   |
| Target one package               | `pnpm --filter <pkg> <script>`                                        |
| Audit RLS on migrations          | `pnpm audit:rls`                                                      |
| Generate policy boundaries       | `pnpm policy:gen`                                                     |
| Start agentic-tools MCP          | `pnpm agentic-tools`                                                  |
| Update Repowise index            | `./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only` |

## Code Conventions & Common Patterns

- **Framework**: NestJS 11 (Fastify adapter) for API; Next.js 16 App Router (React 19) for portal; Python FastAPI for ai-agents.
- **Validation**: Zod schemas on API requests via NestJS `ValidationPipe`. Errors normalized through `GlobalExceptionFilter` (`apps/api/src/common/filters/global-exception.filter.ts`).
- **Auth**: Supabase-backed guard (`apps/api/src/auth/guards/supabase-auth.guard.ts`) + `@CurrentUser()` decorator. Portal auth enforced in `apps/portal/proxy.ts` (Next.js 16 replacement for `middleware.ts`), with Redis-cached employee role/department checks.
- **Caching**: Two-tier (`packages/redis`): L1 Memory + L2 Redis with tag/prefix invalidation. TTLs registered in `CACHE_TTL_REGISTRY`. Portal uses `cachedRSC` / `withCache` and read-replica Supabase clients.
- **Rate limiting**: `@repo/rate-limiter` with pluggable stores (memory, Redis) and strategies (fixed-window, sliding-window, token-bucket with Lua atomic path).
- **Error classes**: `@repo/errors` provides `AppError` base, HTTP mapped errors (`AuthError`, `NotFoundError`, etc.), domain errors, and type guards.
- **Async**: NestJS services are standard async/await. Portal uses RSC streaming + server actions (`app/actions.ts`). No observable cross-cutting retry/circuit-breaker pattern in api-agents currently.
- **Dependency injection**: NestJS DI containers per module. Portal uses Next.js module pattern with server/client split.
- **State management**: Portal — no global state library observed; relies on RSC, server actions, and local component state. Hooks under `apps/portal/hooks/` for client-side concerns.
- **Branch naming**: `type/description` (`feat/add-auth`, `fix/login-redirect`).
- **Commits**: Conventional Commits enforced by `commitlint.config.mjs`.

## Important Files

| File                                                     | Role                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/api/src/main.ts`                                   | NestJS Fastify bootstrap: CORS, ValidationPipe, Swagger, listener                          |
| `apps/api/src/app.module.ts`                             | Root module wiring global infra + all feature modules                                      |
| `apps/api/src/common/filters/global-exception.filter.ts` | Central HTTP error mapping, structured logging, Sentry on 5xx                              |
| `apps/portal/proxy.ts`                                   | Next.js 16 auth proxy: validates Supabase session, caches employee access in Redis         |
| `apps/portal/app/actions.ts`                             | Server actions: logout, revalidateRSC, generateMonthlyReport                               |
| `apps/portal/app/layout.tsx`                             | Root layout: theme, fonts, SplitWindowLayout, AI assistant, CommandBar                     |
| `apps/portal/next.config.mjs`                            | Rewrites to API URL, standalone output, Sentry/PWA plugins gated by env                    |
| `packages/supabase/src/server.ts`                        | `createServerSupabaseClient` + `getUserSafely` with robust refresh handling                |
| `packages/supabase/src/read-replica.ts`                  | Read-replica client fallback                                                               |
| `packages/supabase/src/kysely.ts`                        | Kysely Postgres client with generated `Database` types                                     |
| `packages/redis/src/cache.ts`                            | L1/L2 cache with write-through and coalescing                                              |
| `packages/redis/src/invalidation.ts`                     | Safe tag/prefix invalidation via SCAN + UNLINK                                             |
| `packages/errors/src/http.ts`                            | HTTP mapped error classes                                                                  |
| `packages/theme/src/css/variables.css`                   | Design token source of truth (OKLCH)                                                       |
| `CLAUDE.md`                                              | Authoritative architecture guide: path aliases, data boundaries, RLS, Memex/Sense guidance |
| `tools/policy-compiler.cjs`                              | Generates ESLint boundary rules from dependency maps                                       |
| `.mcp.json`                                              | MCP server registry for Claude Code/editor agents                                          |

## Runtime/Tooling Preferences

- **Runtime**: Node.js >= 22 for backend/frontend; Python 3.11+ for ai-agents.
- **Package manager**: pnpm 9.15.9+ with workspaces. Use `pnpm` exclusively — never npm/yarn.
- **Bundler/Runner**: Turborepo for task orchestration. Next.js uses Turbopack in dev.
- **Monorepo tooling**: `pnpm-workspace.yaml` globs `apps/*` and `packages/*`. TypeScript config centralized in `packages/typescript-config` (strict, NodeNext, ES2022).
- **Docker**: `docker-compose.portal.yml` (portal + api + nginx), `docker-compose.tools.yml` (n8n, redis, qdrant, langfuse, etc.), `docker-compose.monitoring.yml` (prometheus + grafana), `docker-compose.security.yml` (ZAP scans).
- **MCP**: Agent integrations defined in `.mcp.json` using env-var references. Local servers in `tools/preflight-mcp/`, `tools/n8n-mcp/`, `tools/wiki-viewer/`.

## Testing & QA

- **Unit / Integration**: Jest in `apps/api/*.spec.ts` and `packages/*/__tests__/**/*.test.ts`. Vitest-style tests in portal (`apps/portal/*.test.ts`).
- **E2E**: Playwright (`playwright.config.ts`) running Chromium against `http://localhost:3000`. Screenshots on failure, visual snapshots under `e2e/visual/__snapshots__`, `maxDiffPixelRatio: 0.02`.
- **Visual / Performance**: Lighthouse CI (`lighthouserc.json`) against 6 portal URLs: performance >=0.8, accessibility >=0.9, best-practices/SEO >=0.9. FCP/LCP/CLS/TBT/interactive thresholds enforced.
- **Security**: ZAP baseline/full profiles via `docker-compose.security.yml`.
- **Dead code / unused exports**: Knip 5 (`knip.json`).
- **Policy enforcement**: ESLint module boundaries generated from `tools/policy/` and enforced at lint time.
- **Commit quality**: Commitlint enforces Conventional Commits.

## Critical Rules

- **Data access boundary**: Apps MUST use `@repo/supabase`. `@repo/database` is migrations-only.
- **RLS mandatory**: Every table migration must `ENABLE ROW LEVEL SECURITY`. Run `pnpm audit:rls` after schema changes.
- **Next.js 16 proxy**: Portal uses `proxy.ts`, not `middleware.ts`.
- **Secrets**: Never commit `.env`. `.mcp.json` references env vars — never hardcode credentials.
- **Repowise / Sense sync**: Git hooks auto-sync Repowise on commit. After significant changes, run `repowise update -w --index-only` and log memory to `.agentic-tools-mcp/memories/`.
- **Policy boundaries**: ESLint boundary rules are generated. Run `pnpm policy:gen` after dependency changes.
- **Tools directory**: Excluded from ESLint/Prettier. Build-time only. Never import from `tools/` in runtime apps.
