# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arch-Systems (Plantcor) — industrial mining-operations portal. pnpm + Turborepo monorepo of four apps (three Next.js 16 / React 19, one NestJS 11) and shared packages.

| App / Package             | Port / Role                                            |
| ------------------------- | ------------------------------------------------------ |
| `apps/portal`               | `:3000` — main operations dashboard (Next.js App Router) |
| `apps/api`                | configurable (`PORT`, default `:3004` in dev) — NestJS 11 backend API (Fastify) |
| `apps/cms`                | `:3001` when started via `pnpm dev --cms` — Payload CMS v3 (Postgres) |
| `apps/overview`           | `:3002` — architecture/flow viewer (`@xyflow/react`)     |

`apps/api` is **started automatically by `pnpm dev`** on port `3004` so it no longer collides with the CMS dev port (`3001`) or the tools containers. Run `pnpm dev --no-api` to skip it, or set `API_PORT` to change the port.

| Package                   | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `@repo/supabase`          | runtime data-access layer (server/client, Kysely, typed DB) |
| `@repo/database`          | SQL migrations source of truth (`migrations/*.sql`)    |
| `@repo/theme`             | OKLCH design tokens + Tailwind preset                  |
| `@repo/ui`                | shadcn-style primitives (presentational only)          |
| `@repo/redis`             | caching                                                |
| `@repo/rate-limiter`      | rate limiting                                          |
| `@repo/eval`              | Python LLM eval suite                                  |
| `@repo/errors`, `@repo/utils`, `@repo/eslint-config`, `@repo/typescript-config` | shared support |

## Toolchain

- **Package manager:** pnpm 9.15.9 (Volta pins Node `24.15.0`). Always use `pnpm`.
- **Orchestration:** Turborepo (`turbo.json`). Use `pnpm --filter <pkg> <script>` or `pnpm exec turbo run <target> --filter=<pkg>` to scope work.
- **Repo rules:** Conventional Commits (`commitlint`), Husky + lint-staged, ESLint boundary rules generated from `tools/policy-compiler.cjs`.

## Common commands

Run from repo root unless noted.

| Task | Command |
| ---- | ------- |
| Full quality gate | `pnpm quality` |
| Build everything | `pnpm build` |
| Dev (Supabase + Portal + API + health checks + browser) | `pnpm dev` |
| Dev, portal only, no Docker/Supabase/API | `pnpm dev --quick` |
| Dev with extra apps | `pnpm dev --cms`, `--overview`, or `--all` |
| Dev with optional tool containers | `pnpm dev --tools` |
| Dev without the NestJS API | `pnpm dev --no-api` |
| Lint all | `pnpm lint` |
| Lint root config/tooling only | `pnpm lint:root` |
| Type-check all | `pnpm type-check` |
| Unit tests all | `pnpm test` |
| E2E (requires `pnpm dev` running) | `pnpm test:e2e` |
| Format | `pnpm format` / `pnpm format:check` |
| Markdown lint | `pnpm md:lint` / `pnpm md:fix` |
| Dependency alignment | `pnpm deps:lint` / `pnpm deps:fix` |
| Dead-code check | `pnpm knip` / `pnpm knip:fix` |
| RLS audit | `pnpm audit:rls` |
| Policy boundary check | `pnpm policy:check` / `pnpm policy:gen` |
| Local deploy | `pnpm deploy:local` |
| Clean local deploy | `pnpm fresh-start` |
| UI package storybook | `pnpm ui` |

## Running one project / one test

- Target one workspace project: `pnpm --filter <pkg> <script>` (e.g. `pnpm --filter portal test`).
- Portal unit tests use Jest: `pnpm --filter portal test -- <pattern>` (e.g. `-- shift-closeout`).
- One Jest file: `pnpm --filter portal exec jest lib/shift-closeout.test.ts`.
- Bypass Turborepo cache on a target: `pnpm exec turbo run portal:test --force`.
- E2E single file: `pnpm exec playwright test e2e/login.spec.ts`.

### API app commands

| Task | Command |
| ---- | ------- |
| Dev (NestJS watch) | `pnpm --filter api dev` |
| Build | `pnpm --filter api build` |
| Production start | `pnpm --filter api start:prod` |
| Run tests | `pnpm --filter api test` |
| Run one test file | `pnpm --filter api exec jest src/health/health.controller.spec.ts` |
| Type-check | `pnpm --filter api type-check` |

The API listens on `PORT` (default `3004` in dev to avoid CMS/tools collisions; `3001` in `docker-compose.portal.yml` production setup) and mounts under `/api` (e.g. `http://localhost:3004/api/health`). Swagger docs are served at `/api/docs` in non-production builds. The portal also proxies `/api/backend/*` to the API so browser clients can use a single origin.

## Architecture

### Apps

`apps/portal` is the primary Next.js 16 App Router app. Its routes are grouped under:

- `(auth)/` — login & password management.
- `(departments)/[department]/` — dynamic per-department dashboards.
- `(hub)/` — central landing + executive view.
- `api/` — AI, export, sync, tools, webhooks, Inngest, metrics.

Domain logic lives in `apps/portal/features/*` (access-control, admin, analytics, departments, hub, webhooks) and `apps/portal/lib/*` (AI, audit, cache, departments, employee, env, observability, sync, etc.).

`apps/cms` is Payload CMS v3 on Postgres. `apps/overview` renders architecture diagrams with `@xyflow/react`.

### API app (`apps/api`)

`apps/api` is a NestJS 11 application running on the Fastify adapter. It is a separate backend from the Next.js `api/` routes inside `apps/portal`.

- **Entry:** `src/main.ts` bootstraps the Fastify server, sets global prefix `/api`, enables CORS from `CORS_ORIGIN`, registers a global `ValidationPipe`, and mounts Swagger at `/api/docs` when not in production.
- **Root module:** `src/app.module.ts` wires infrastructure (`SupabaseModule`, `RedisModule`) and feature modules.
- **Feature modules:** `access-control`, `admin`, `ai`, `auth`, `control-room`, `exports`, `health`, `jobs` (Inngest), `observability`, `security`, `supabase`, `telemetry`, `tools`, `weather`, `webhooks`.
- **Auth:** `SupabaseAuthGuard` is registered globally via `AuthModule` and reads `Authorization: Bearer <token>` or an `sb-access-token` cookie, validating against the injected Supabase client. Use the `@Public()` decorator to skip auth on a route.
- **Cross-cutting concerns:** `GlobalExceptionFilter` handles all unhandled exceptions, logs structured output, and reports 5xx errors to Sentry when `SENTRY_DSN` is set. `@nestjs/throttler` provides default rate limiting (100 req / 60s).
- **Test setup:** Jest uses `@swc/jest` with decorator metadata enabled; module name mapping matches the API’s `tsconfig.json` paths (`@/*`, `@repo/*`).

### Data layer

`@repo/database` owns the migrations in `packages/database/migrations/*.sql` (numbered `NNN_name.sql`). It is the **schema source of truth**. `scripts/dev.sh` copies these migrations into `packages/supabase/supabase/migrations/` before booting local Supabase; do not hand-edit the copied files.

`@repo/supabase` is the **runtime data-access layer**. Apps and other packages talk to the DB through this package only. Key exports include `getUserSafely()` (server session helper that swallows stale-refresh-token errors), typed Supabase clients, Kysely builder, read-replica, service-role, and middleware clients.

### Auth & authorization

- Server Components read the session with `getUserSafely()` from `@repo/supabase/server`.
- `apps/portal/proxy.ts` (the Next.js 16 rename of `middleware.ts`) refreshes sessions and enforces role-based route restrictions.
- The `employees` table is the source of truth for roles and department access; authorization decisions must route through it.
- Row Level Security is mandatory: every table created in `packages/database/migrations/` must get an `ALTER TABLE … ENABLE ROW LEVEL SECURITY` somewhere in the migration chain. `pnpm audit:rls` statically enforces this and writes `.audit/rls-report.md`.

### AI orchestration

`apps/portal/lib/ai/` holds the agent system: `agent-graph.ts` / `agent-state.ts` (state machine), plus modules for chunking, embeddings, memory, tool dispatch, cost tracking, prompts, providers (including Ollama), and rate limiting.

### Design system

`@repo/theme` owns the design tokens. `src/css/variables.css` is the source of truth; `scripts/generate-tokens.mjs` compiles it to `src/tokens/generated.ts`; `scripts/validate-tokens.mjs` is the `lint:tokens` check. Tokens are OKLCH-based. The Tailwind preset (`src/tailwind/preset.ts`) is consumed by apps and `@repo/ui`. `@repo/ui` must stay presentational and must not import any data-layer packages.

### Path aliases (portal)

`~/*` and `@/*` → `apps/portal/*`. Mapped sub-paths: `@/app/*`, `@/features/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`.

### Dependency & security boundaries

`tools/policy-compiler.cjs` defines the single-source-of-truth for boundaries and intent→capability mapping. `pnpm policy:gen` compiles it into `tools/policy/*.json` and generated ESLint boundary rules; `pnpm policy:check` fails if the generated artifacts have drifted.

Key rules:

- Apps must not import `@repo/database` internals; use `@repo/supabase` instead.
- `@repo/ui` must stay presentational (no data layer).
- `@repo/theme` must not depend on `@repo/ui`.
- `tools/*` are build-time only and must not import runtime app code.
- Packages must not depend on apps.

## Environment & local infra

- Portal env is `apps/portal/.env` (copied from `apps/portal/.env.example` by `scripts/dev.sh` if missing). It needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.
- Local Supabase stack (DB `:54322`, API `:54321`, Studio `:54323`) boots via `pnpm dev` (Docker).
- Optional tooling containers (Redis, n8n, Flowise, Langfuse, Qdrant) via `pnpm dev --tools` and `docker-compose.tools.yml`.
- Playwright E2E is pinned to `/usr/bin/google-chrome` and `http://localhost:3000` — keep the portal running on the default port.
- Portal Jest coverage thresholds: 40% lines, 30% branches.
- API env is `apps/api/.env` (copied from `apps/api/.env.example` if needed). It requires `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`, `REDIS_URL`, optional `OLLAMA_URL`, `CORS_ORIGIN`, and observability keys (`SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`).

## Working conventions

These are project rules, not generic advice:

- **Data is sacred.** Before any DB schema migration, data-mutation logic (Server Actions / API routes), or RLS/auth change, halt, explain the data impact, and get explicit confirmation before proceeding.
- **Tests passing ≠ the program works.** Frontend changes require live verification: start `pnpm dev`, navigate to the page, and interact. Do not claim “it works” without evidence.
- **Production readiness.** Changes must pass `pnpm quality` and live verification. If a change breaks build/tests/critical functionality, revert it and rethink.
- **Never invent values.** Authoritatively confirm paths, env vars, and IDs before using them. Remove orphaned imports/vars/functions after changes.
- **Agent tracing.** When modifying a package/app, append to its `AGENT_TRACER.md` (timestamp, purpose, changes, what the next agent should know). For non-obvious architectural logic, leave inline `// AGENT-TRACE: …` comments.
- **Commits** are conventional (`feat:`, `fix:`, `refactor:`, `docs:`, etc.). Husky + lint-staged run on commit.

## Codebase intelligence

This repository is indexed by Repowise. The Repowise MCP usage guide (when to call `get_answer`, `get_context`, `get_why`, `get_health`, etc.) lives in `.claude/CLAUDE.md`. Always verify indexed answers against the live source before making changes.

## Where to look further

- `README.md` — one-page project overview.
- `.agents/AGENTS.md` — workspace rules for all AI agents (RLS, commits, monorepo execution, editor configs).
- `apps/portal/GEMINI.md` — portal-specific conventions (route groups, auth, AI, testing, agent tracing).
- `packages/theme/README.md` — token pipeline and `GlassCard` API.
- `packages/supabase/README.md` — local Supabase setup.
- `docs/` — VitePress wiki (run from `/wiki`); runbooks in `docs/runbooks/`.
- `LIQUID_GLASS_CHECKLIST.md` — UI/visual checklist.
