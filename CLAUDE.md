# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Arch-Systems (Plantcor) is an industrial mining-operations portal. It is a **pnpm + Nx/Turborepo monorepo** using Node `>=22` (Volta pins `24.15.0`) and pnpm `9.15.9`.

| App / Package                                                                   | Role                                                 | Port / Notes                            |
| ------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| `apps/portal`                                                                   | Next.js 16 operations dashboard (main app)           | `3000`, Turbopack dev                   |
| `apps/api`                                                                      | NestJS 11 backend on Fastify 5                       | `3004` by default, global prefix `/api` |
| `apps/ai-agents`                                                                | FastAPI CrewAI/LangGraph orchestration (stub)        | Python 3.11+, no fixed port             |
| `packages/supabase`                                                             | Data access layer: `@supabase/ssr`, Kysely, typed DB | consumed by apps                        |
| `packages/database`                                                             | SQL migrations source of truth ONLY                  | not imported directly by apps           |
| `packages/theme`                                                                | OKLCH design tokens + Tailwind preset                | source: `src/css/variables.css`         |
| `packages/ui`                                                                   | shadcn-style presentational primitives               | no data-layer imports                   |
| `packages/redis`                                                                | Redis client + caching helpers                       | used by portal proxy and API            |
| `packages/rate-limiter`                                                         | Shared rate-limiting utilities                       |                                         |
| `packages/agentic-tools-mcp`                                                    | Local MCP server for project memory/tasks            | stdio, no port                          |
| `@repo/errors`, `@repo/utils`, `@repo/eslint-config`, `@repo/typescript-config` | Shared support                                       |                                         |

## Common Commands

Run everything from the repository root unless noted.

| Task                                             | Command                                                    |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Install dependencies                             | `pnpm install`                                             |
| Full dev stack (Supabase + Redis + API + Portal) | `pnpm dev`                                                 |
| Portal only, no Docker/Supabase                  | `pnpm dev --quick`                                         |
| Dev without the NestJS API                       | `pnpm dev --no-api`                                        |
| Build all apps/packages                          | `pnpm build`                                               |
| Type-check all                                   | `pnpm type-check`                                          |
| Lint all                                         | `pnpm lint`                                                |
| Lint root workspace files only                   | `pnpm lint:root`                                           |
| Unit tests all                                   | `pnpm test`                                                |
| Run a single portal test                         | `pnpm --filter portal test -- path/to/file.test.tsx`       |
| Run a single API test                            | `pnpm --filter api test -- path/to/file.spec.ts`           |
| E2E tests (Playwright)                           | `pnpm test:e2e`                                            |
| Full quality gate                                | `pnpm quality`                                             |
| Format all files                                 | `pnpm format`                                              |
| Check formatting                                 | `pnpm format:check`                                        |
| Run a script in one package                      | `pnpm --filter <package-name> <script>`                    |
| Regenerate policy/boundary rules                 | `pnpm policy:gen`                                          |
| Audit RLS after migration changes                | `pnpm audit:rls`                                           |
| Start agentic-tools MCP server                   | `pnpm agentic-tools`                                       |
| Start agentic-tools daemon                       | `pnpm agentic-tools:daemon`                                |
| Bootstrap env template                           | `pnpm agentic-tools:setup`                                 |
| Dead-code / unused-export detection              | `pnpm knip` (or `pnpm knip:fix` to autofix)                |
| Portal bundle analysis build                     | `pnpm analyze`                                             |
| Generate DB docs                                 | `pnpm db:docs`                                             |
| Monitoring HUD                                   | `pnpm monitor`                                             |
| Grafana/Prometheus stack                         | `pnpm monitor:grafana` / `pnpm monitor:grafana-stop`       |
| Deploy (dev / staging / production)              | `pnpm deploy:dev` / `deploy:staging` / `deploy:production` |
| Rollback a production deploy                     | `pnpm deploy:rollback`                                     |

Supabase helpers live in `packages/database/package.json` and `packages/supabase/package.json` (e.g. `pnpm --filter @repo/database supabase:start`, `supabase:reset`, `supabase:push`).

### Test runners per app

- **Both `apps/api` and `apps/portal` use Jest 30** (with `@swc/jest`). Distinguish them by file extension, not runner: `apps/api` specs are `*.spec.ts`, `apps/portal` tests are `*.test.ts(x)`.
- **E2E**: Playwright against `http://localhost:3000` (`pnpm test:e2e`, requires `pnpm dev` running); visual snapshots under `e2e/visual/__snapshots__`, `maxDiffPixelRatio: 0.02`.

## High-Level Architecture

### Frontend: Portal (`apps/portal`)

- Next.js 16 App Router, React 19, Turbopack dev (`next dev --turbopack`).
- **Next.js 16 convention:** the middleware file is named `proxy.ts`, not `middleware.ts`. `proxy.ts` runs on every request and handles auth/session refresh, department-based access control, and redirects.
- Department routes live under `app/(departments)/[department]/`. Valid departments: `drilling`, `production`, `access-control`, `engineering`, `control-room`, `safety`, `training`, `satellite-monitoring`.
- Server Actions are in `app/actions.ts` and per-route `actions.ts` files.
- The portal proxies backend calls through `/api/backend/*` to `API_BASE_URL` (default `http://localhost:3004/api`). See `app/api/backend/[[...slug]]/route.ts`.

### Backend: API (`apps/api`)

- NestJS 11 on Fastify 5 with global prefix `/api`.
- Swagger docs at `/api/docs` in non-production environments.
- Health checks at `/api/health/live`.
- Feature modules: `auth`, `admin`, `ai`, `ai-bridge`, `queue`, `tools`, `jobs`, `webhooks`, `control-room`, `access-control`, `exports`, `health`, `observability`, `security`, `telemetry`, `weather`.
- Uses `@repo/supabase/service-role` for DB access and `@repo/redis` for caching/rate-limiting.

### Data Layer

- **Apps must import from `@repo/supabase`, never from `@repo/database`.** `@repo/database` is only migrations and SQL scripts.
- `@repo/supabase` exports: `.` (client), `./server`, `./client`, `./middleware`, `./kysely`, `./service-role`, `./read-replica`.
- Row Level Security is **mandatory**. Every table created or modified in `packages/database/migrations/` must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- `employees` links Supabase auth users to role, `department_id`, and `accessible_departments`. Roles include `operator`, `supervisor`, `manager`, `admin`, `control_room_operator`, `access_control`.

### Design Tokens

- Source of truth is `packages/theme/src/css/variables.css`. Generated tokens live in `packages/theme/src/tokens/generated.ts`.
- Run `pnpm --filter @repo/theme codegen` to regenerate tokens; `pnpm --filter @repo/theme lint:tokens` to validate.

### Module Boundaries

- Boundary rules are generated from `tools/policy/dependency.rules.json` and `tools/policy/intent-map.json` into `tools/policy/eslint-boundaries.generated.cjs`.
- Run `pnpm policy:gen` after changing dependency intent or Nx tags.
- Key enforced boundaries:
  - Apps cannot import `packages/database` directly.
  - `packages/ui` cannot import `packages/supabase` or `packages/database`.
  - `packages/theme` cannot import `packages/ui`.
  - `packages/*` cannot import `apps/*`.
  - `tools/*` cannot import runtime apps or `packages/supabase`.

## Agentic Tools & MCP Environment

- `packages/agentic-tools-mcp` is the local MCP server that exposes the project's `.agentic-tools-mcp/` memory and task store. It replaces the external `@pimzino/agentic-tools-mcp` package.
- Available tools: `agentic_list_memories`, `agentic_read_memory`, `agentic_search_memories`, `agentic_create_memory`, `agentic_update_memory`, `agentic_list_tasks`, `agentic_create_task`, `agentic_update_task`, `agentic_delete_task`.
- Start it with `pnpm agentic-tools`. The companion daemon (`pnpm agentic-tools:daemon`) watches the store and logs active memory/task counts.
- **Secrets are no longer stored in `.mcp.json` or `.vscode/*_mcp_settings`.** Those files now reference environment variables. Copy `.env.example` → `.env` at the repo root and fill in real values (`N8N_EMAIL`, `N8N_PASSWORD`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `GEMINI_API_KEY`). Never commit `.env`.

## Critical Rules

1. **Data access boundary:** Apps import `@repo/supabase`, not `@repo/database`.
2. **RLS:** Every migration table must enable RLS. Run `pnpm audit:rls` after schema changes and inspect `.audit/rls-report.md`.
3. **Next.js 16 proxy:** Use `apps/portal/proxy.ts`, not `middleware.ts`.
4. **Agent tracing:** When modifying an app or package, append an entry to its `AGENT_TRACER.md` (timestamp, purpose, changes, next-agent context). Add inline `// AGENT-TRACE: ...` comments for non-obvious logic.
5. **Conventional Commits:** use `feat:`, `fix:`, `refactor:`, `docs:`, etc.
6. **Documentation sync:** When changing DB schemas, APIs, packages, deployment, or dev scripts, update the corresponding `.agentic-tools-mcp/repowiki/en/content/` docs (symlinked at `.qoder/repowiki`) and `.qoder/skills/` runners if applicable.
7. **RepoWiki / Skills / Repowise / Sense:** Keep `.repowise` and `.repowise-workspace` synced with `./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only` after significant changes. Maintain `AGENT_TRACER.md` files and the `.agentic-tools-mcp/` memory store.

For workspace-wide agent rules (MCP servers, editor configs, monorepo orchestration), see `.agents/AGENTS.md`. For MCP server setup instructions, see `.vscode/README.md`.

> **Note on `.claude/CLAUDE.md`:** that file is **auto-generated by Repowise** on every index (last-indexed date, entry points, hotspots, the Repowise/Sense MCP tool guide). Do not hand-edit it — it refreshes on `repowise update`. This `CLAUDE.md` is the hand-maintained source of truth.

<!-- Add your custom instructions below. Repowise will never modify anything outside the REPOWISE markers. -->

<!-- REPOWISE:START — Do not edit below this line. Auto-generated by Repowise. -->

## Workspace: Arch-Mk2 (2 repos)

> Indexed by [Repowise](https://repowise.dev). Use `repo="all"` for workspace-wide queries, or `repo="alias"` for a specific repo.

### Repositories

| Repo       | Files | Symbols | Hotspots | Role    |
| ---------- | ----- | ------- | -------- | ------- |
| `arch-mk2` | 6924  | 37310   | 0        | default |
| `repowise` | 2628  | 21815   | 0        |         |

### Cross-Repo API Contracts

**By type:** http: 336, grpc: 6, topic: 16
| Provider | Consumer | Type | Contract |
|----------|----------|------|----------|
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/chat.py` | `arch-mk2:tools/repowise/packages/api-client/src/chat.ts` | http | `http::GET::/api/repos/{param}/chat/conversations/{param}` |
| `repowise:packages/server/src/repowise/server/routers/chat.py` | `arch-mk2:tools/repowise/packages/api-client/src/chat.ts` | http | `http::GET::/api/repos/{param}/chat/conversations/{param}` |
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/git.py` | `arch-mk2:tools/repowise/packages/api-client/src/git.ts` | http | `http::GET::/api/repos/{param}/co-changes` |
| `repowise:packages/server/src/repowise/server/routers/git.py` | `arch-mk2:tools/repowise/packages/api-client/src/git.ts` | http | `http::GET::/api/repos/{param}/co-changes` |
| `repowise:packages/core/src/repowise/core/workspace/extractors/grpc/python.py` | `arch-mk2:tools/repowise/packages/core/src/repowise/core/workspace/extractors/grpc/python.py` | grpc | `grpc::AuthService/*` |
| `repowise:packages/core/src/repowise/core/workspace/extractors/topic_extractor.py` | `arch-mk2:tools/repowise/packages/core/src/repowise/core/workspace/extractors/topic_extractor.py` | topic | `topic::orders` |
| `repowise:packages/core/src/repowise/core/workspace/extractors/topic_extractor.py` | `arch-mk2:tools/repowise/packages/core/src/repowise/core/workspace/extractors/topic_extractor.py` | topic | `topic::queue` |
| `repowise:packages/core/src/repowise/core/workspace/extractors/topic_extractor.py` | `arch-mk2:tools/repowise/packages/core/src/repowise/core/workspace/extractors/topic_extractor.py` | topic | `topic::events` |
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/chat.py` | `repowise:packages/api-client/src/chat.ts` | http | `http::GET::/api/repos/{param}/chat/conversations/{param}` |
| `repowise:packages/server/src/repowise/server/routers/chat.py` | `repowise:packages/api-client/src/chat.ts` | http | `http::GET::/api/repos/{param}/chat/conversations/{param}` |
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/git.py` | `repowise:packages/api-client/src/git.ts` | http | `http::GET::/api/repos/{param}/co-changes` |
| `repowise:packages/server/src/repowise/server/routers/git.py` | `repowise:packages/api-client/src/git.ts` | http | `http::GET::/api/repos/{param}/co-changes` |
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/c4.py` | `arch-mk2:tools/repowise/packages/api-client/src/c4.ts` | http | `http::GET::/api/graph/{param}/c4/mermaid` |
| `repowise:packages/server/src/repowise/server/routers/c4.py` | `arch-mk2:tools/repowise/packages/api-client/src/c4.ts` | http | `http::GET::/api/graph/{param}/c4/mermaid` |
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/repos.py` | `arch-mk2:tools/repowise/packages/web/src/components/architecture/c4-view.tsx` | http | `http::GET::/api/repos/{param}/file-content` |
| `repowise:packages/server/src/repowise/server/routers/repos.py` | `arch-mk2:tools/repowise/packages/web/src/components/architecture/c4-view.tsx` | http | `http::GET::/api/repos/{param}/file-content` |
| `arch-mk2:tools/secrin/packages/arc42gen/api.py` | `arch-mk2:tools/secrin/apps/web/app/api/projects/[id]/regenerate/route.ts` | http | `http::POST::/jobs` |
| `arch-mk2:tools/secrin/packages/arc42gen/api.py` | `arch-mk2:tools/secrin/apps/web/app/api/projects/[id]/regenerate/status/route.ts` | http | `http::GET::/jobs/{param}` |
| `repowise:packages/server/src/repowise/server/routers/c4.py` | `repowise:packages/api-client/src/c4.ts` | http | `http::GET::/api/graph/{param}/c4/mermaid` |
| `arch-mk2:tools/memex/memex/mcp_server/http.py` | `arch-mk2:apps/portal/components/system/SystemTray.tsx` | http | `http::GET::/api/health` |
| `arch-mk2:tools/memex/memex/memory_tool/http.py` | `arch-mk2:apps/portal/components/system/SystemTray.tsx` | http | `http::GET::/api/health` |
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/health.py` | `arch-mk2:apps/portal/components/system/SystemTray.tsx` | http | `http::GET::/api/health` |
| `arch-mk2:tools/secrin/packages/arc42gen/api.py` | `arch-mk2:apps/portal/components/system/SystemTray.tsx` | http | `http::GET::/api/health` |
| `repowise:packages/server/src/repowise/server/routers/health.py` | `arch-mk2:apps/portal/components/system/SystemTray.tsx` | http | `http::GET::/api/health` |
| `arch-mk2:tools/memex/memex/mcp_server/http.py` | `arch-mk2:tools/repowise/packages/web/src/components/settings/provider-section.tsx` | http | `http::GET::/api/health` |
| `arch-mk2:tools/memex/memex/memory_tool/http.py` | `arch-mk2:tools/repowise/packages/web/src/components/settings/provider-section.tsx` | http | `http::GET::/api/health` |
| `arch-mk2:tools/repowise/packages/server/src/repowise/server/routers/health.py` | `arch-mk2:tools/repowise/packages/web/src/components/settings/provider-section.tsx` | http | `http::GET::/api/health` |
| `arch-mk2:tools/secrin/packages/arc42gen/api.py` | `arch-mk2:tools/repowise/packages/web/src/components/settings/provider-section.tsx` | http | `http::GET::/api/health` |
| `repowise:packages/server/src/repowise/server/routers/health.py` | `arch-mk2:tools/repowise/packages/web/src/components/settings/provider-section.tsx` | http | `http::GET::/api/health` |

### Cross-Repo Co-Changes

Files that frequently change together across repos — consider reviewing both when editing either.

| Source                                            | Target                                            | Co-changes |
| ------------------------------------------------- | ------------------------------------------------- | ---------- |
| `arch-mk2:apps/portal/lib/ai/ollama.ts`           | `repowise:apps/portal/lib/ai/ollama.ts`           | 9          |
| `arch-mk2:apps/portal/lib/ai/ollama.ts`           | `repowise:docs/AGENT_TRACER.md`                   | 9          |
| `arch-mk2:docs/AGENT_TRACER.md`                   | `repowise:apps/portal/lib/ai/ollama.ts`           | 9          |
| `arch-mk2:docs/AGENT_TRACER.md`                   | `repowise:docs/AGENT_TRACER.md`                   | 9          |
| `arch-mk2:apps/portal/lib/ai/ollama.ts`           | `repowise:apps/portal/lib/ai/embeddings/index.ts` | 9          |
| `arch-mk2:docs/AGENT_TRACER.md`                   | `repowise:apps/portal/lib/ai/embeddings/index.ts` | 9          |
| `arch-mk2:apps/portal/lib/ai/embeddings/index.ts` | `repowise:apps/portal/lib/ai/ollama.ts`           | 9          |
| `arch-mk2:apps/portal/lib/ai/embeddings/index.ts` | `repowise:docs/AGENT_TRACER.md`                   | 9          |
| `arch-mk2:apps/portal/lib/ai/embeddings/index.ts` | `repowise:apps/portal/lib/ai/embeddings/index.ts` | 9          |
| `arch-mk2:apps/portal/lib/ai/ollama.ts`           | `repowise:apps/portal/proxy.test.ts`              | 6          |

### Package Dependencies

- `arch-mk2` → `repowise` (dotnet_nuget_internal)
- `repowise` → `arch-mk2` (dotnet_project_ref)

### Per-Repo Entry Points

#### `arch-mk2` (default)

_No entry points indexed._

#### `repowise`

_No entry points indexed._

### Repowise MCP Tools

These tools work across all repos in this workspace. Pass `repo="alias"` to scope, `repo="all"` for cross-repo queries, or omit for the default repo. Every response carries `_meta` with `index_age_days`, `indexed_commit`, and a `stale_warning` only when the index has diverged from HEAD.

| Tool                                                 | What only this tool answers                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_answer(question)`                               | Synthesised answer with verified citations and a calibrated `retrieval_quality`. First call for "how does X work" / "why is Y like this". On low confidence returns `best_guesses` with one-line justifications.                                                                                                                                                                                                                                      |
| `get_context(targets=[...])`                         | Triage card for files/modules/symbols — title, summary, signatures, `hotspot` bit, `decision_records` titles, and `symbol_id`s to pipe into `get_symbol`. Use `include=[...]` to widen. NOT for source bytes.                                                                                                                                                                                                                                         |
| `get_symbol("path/to/file.py::Name")`                | Raw source bytes for one indexed symbol with exact line bounds. Cheaper than `Read` + offset math.                                                                                                                                                                                                                                                                                                                                                    |
| `search_codebase(query, mode?, kind?, symbol_kind?)` | Hybrid code search. `mode="auto"` routes by query shape: identifier → indexed symbol hits (pipe `symbol_id` into `get_symbol`), path → file pages (`get_context`), prose → semantic search. Force with `mode=symbol\|path\|concept\|hybrid`. Concept hits tag `search_method` (`embedding` vs `bm25`).                                                                                                                                                |
| `get_why(query, targets?)`                           | Architectural decision archaeology — _why_ the code is shaped this way. Call before refactors. Falls back to git archaeology when no ADRs exist.                                                                                                                                                                                                                                                                                                      |
| `get_risk(targets, changed_files?)`                  | What history says about touching these files. Pass `changed_files` for PR mode → returns a `directive` (`will_break`, `missing_cochanges`, `missing_tests`) plus cross-repo blast radius.                                                                                                                                                                                                                                                             |
| `get_health(targets?, include?)`                     | Code-health scores + biomarker findings (defect / maintainability / performance). Self-check before a PR. Lean by default; opt in via `include`: `["accuracy"]` (precision@K + `lift`), `["signals"]` (per-file prior-defects / churn / owners / degree), `["churn_complexity"]` (danger-zone files), `["biomarkers"]` (all findings), or a dimension name `["performance"]` / `["defect"]` / `["maintainability"]` to filter findings to one pillar. |
| `get_dead_code(...)`                                 | Tiered unreachable / unused-export / zombie-package findings; cross-repo consumer detection lowers confidence on shared exports.                                                                                                                                                                                                                                                                                                                      |
| `get_overview(repo?)`                                | Architecture map. `repo="all"` returns cross-repo topology (co-changes, package deps, API contracts).                                                                                                                                                                                                                                                                                                                                                 |

**Composition tips:**

- `get_answer` → on `confidence: medium/low`, follow `best_guesses[0].file` into `get_context`, then `get_symbol` for bytes.
- `get_context` returns `hotspot: true` → call `get_risk` before editing.
- PR review across repos → `get_risk(changed_files=[...])` picks up cross-repo consumers automatically.

**Verify when:** `_meta.stale_warning` is present, `retrieval_quality` is `partial`/`weak`, or `search_method` is `bm25`. Otherwise trust the response.

<!-- REPOWISE:END -->

<!-- sense:start -->

## Use the Sense index for codebase understanding

Sense gives you structural understanding of the codebase (symbols, relationships, patterns) without reading dozens of files. Prefer it over grep, glob, and file-walking for any structural or semantic question.

| Question                                | Tool              |
| --------------------------------------- | ----------------- |
| Who calls X? What does X call?          | sense_graph       |
| Find code related to a concept          | sense_search      |
| What breaks if I change X?              | sense_blast       |
| What patterns does this project follow? | sense_conventions |
| Index health, what's indexed            | sense_status      |

**You MUST NOT** use grep/glob for symbol lookup, or skip Sense because its tools load on demand. **About to grep, rg, or find (including through Bash) to locate code?** Searching for a _name_ (a function, method, type, or constant; who calls it; what it touches) is a Sense call first: sense*graph, sense_search, or sense_blast. Searching for a \_literal* (an error string, log line, config key, TODO), grep is right, go ahead. One line: **grepping a name → Sense; grepping a string → grep.** For list outputs (dead code, blast radius, callers), spot-check a sample with grep before relying on them.

**Cite from what Sense returns; don't re-open a file to recover a line it already gave you.** Sense results already carry exact locations: every symbol has a _ref_ (file:line) and graph/blast call sites include their own line. Those are authoritative, citable file:line — use them directly. After a sense*blast/sense_graph you already hold the dependent list \_with* locations; cite it, don't re-derive the same list by reading every file. Open a file only when you need its **content** (a method body to describe behaviour), never just to re-confirm a location Sense already pinned. Let Sense **replace** the exploration, not sit on top of it.

**When NOT to use Sense** (use grep instead): exact text/string search, reading file contents, editing code (Sense is read-only).

<!-- sense:end -->
