# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Arch-Systems (Plantcor) — an industrial mining-operations portal. pnpm + Nx monorepo of three Next.js 16 / React 19 apps and shared packages.

`GEMINI.md` (root and per-app) carries the team's working conventions; this file is the technical companion. Where they overlap, the conventions below are the operative ones.

## Toolchain

- **Package manager:** pnpm 9.15.9 (pinned via Volta; Node >=22, Volta pins Node 24.15.0). Always use `pnpm`, never npm/yarn.
- **Orchestration:** Nx 22.7.5 (`nx run-many -t <target>` across the workspace). `nx.json` `defaultBase` is `master`.
- **Dependency versions:** shared versions live in the `catalog:` block of `pnpm-workspace.yaml` (e.g. `eslint: "catalog:"`, React via the `react19` catalog). Use `catalog:` references, not inline version pins. `syncpack lint` enforces alignment.

## Common commands

All run from repo root unless noted.

| Task                                               | Command                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Full quality gate                                  | `pnpm quality` (lint + type-check + test + token/css lint + format check + syncpack + knip) |
| Build everything                                   | `pnpm build`                                                                                |
| Dev (Supabase + Portal + smoke checks + browser)   | `pnpm dev`                                                                                  |
| Dev, portal only, no Docker                        | `pnpm dev --quick`                                                                          |
| Dev with extra apps                                | `pnpm dev --cms`, `--overview`, or `--all`                                                  |
| Lint all                                           | `pnpm lint` (per-project via Nx); root files: `pnpm lint:root`                              |
| Type-check all                                     | `pnpm type-check`                                                                           |
| Test all (unit)                                    | `pnpm test`                                                                                 |
| E2E (Playwright — **requires `pnpm dev` running**) | `pnpm test:e2e`                                                                             |
| Format                                             | `pnpm format` / `pnpm format:check`                                                         |
| Markdown lint                                      | `pnpm md:lint` / `pnpm md:fix`                                                              |
| Detect dead code                                   | `pnpm knip` / `pnpm knip:fix`                                                               |
| Dependency alignment                               | `pnpm deps:lint` / `pnpm deps:fix`                                                          |
| Local deploy                                       | `pnpm deploy:local` (`pnpm fresh-start` for clean)                                          |

### Running a single project / single test

- Target one workspace project: `pnpm --filter <pkg> <script>` or `pnpm exec nx run <project>:<target>`. Project names match `project.json` `name` (e.g. `portal`, `@repo/ui`).
- Portal unit tests use Jest: `pnpm --filter portal test -- <pattern>` (e.g. `-- shift-closeout`).
- One Jest file: `pnpm --filter portal exec jest lib/shift-closeout.test.ts`.
- One Nx target with cache bypass: `pnpm exec nx run portal:test --skip-nx-cache`.
- E2E single file: `pnpm exec playwright test e2e/login.spec.ts`.

### Python eval suite (`packages/eval`)

Poetry-managed (deepeval + pytest). Markers: `ai_service` (calls running portal), `code_gen`. Run from `packages/eval` with Poetry; `pnpm dev` must be up for `ai_service` tests.

## Architecture

### Apps (`apps/*`)

- **`portal`** (main app, `:3000`) — operations dashboard. Next.js App Router with route groups: `(auth)/` login & password mgmt, `(departments)/[department]/` per-dept dashboards, `(hub)/` central + executive view, `api/` (ai, export, sync, tools, webhooks, inngest, metrics…), `admin/`. Domain logic lives in `apps/portal/features/*` (access-control, admin, analytics, departments, hub, webhooks) and `apps/portal/lib/*` (ai, audit, cache, departments, employee, env, observability, sync…).
- **`cms`** (`:3001`) — Payload CMS v3 (Postgres adapter) for content.
- **`overview`** (`:3002`) — architecture/flow viewer using `@xyflow/react`.

### Packages (`packages/*`)

- **`@repo/supabase`** — the data-access layer. Server/client creation, typed DB types, Kysely, read-replica, service-role, tracing. **Apps and other packages talk to the DB through this package, never through `@repo/database` directly** (enforced by the policy compiler).
- **`@repo/database`** — SQL migrations source of truth (`migrations/*.sql`, numbered `NNN_name.sql`). The static RLS audit (`tools/audit-rls.cjs`) walks this directory. Note: `scripts/dev.sh` copies these migrations into `packages/supabase/supabase/migrations/` before booting local Supabase — the copy is generated, don't hand-edit it.
- **`@repo/theme`** — design tokens. `src/css/variables.css` is the source of truth; `scripts/generate-tokens.mjs` compiles it to `src/tokens/generated.ts`; `scripts/validate-tokens.mjs` is the `lint:tokens` check. Tokens are OKLCH-based. The Tailwind preset (`src/tailwind/preset.ts`) is consumed by apps and `@repo/ui`.
- **`@repo/ui`** — shadcn-style primitives + flow nodes/edges + motion primitives. Presentational only — must not import data-layer packages.
- **`@repo/redis`**, **`@repo/rate-limiter`** — caching + rate limiting.
- **`@repo/eval`** — Python LLM eval suite (see above).
- **`@repo/errors`**, **`@repo/utils`**, **`@repo/eslint-config`**, **`@repo/typescript-config`** — shared support.

### Auth & authorization

- Server Components read the session with `getUserSafely()` from `@repo/supabase/server` — it swallows stale-refresh-token errors instead of crashing the render.
- `apps/portal/proxy.ts` (the Next.js 16 rename of `middleware.ts`) refreshes sessions and enforces role-based route restrictions.
- The `employees` table is the source of truth for roles and department access; authorization decisions must route through it.
- Row Level Security is mandatory: every table created in `packages/database/migrations/` must get an `ALTER TABLE … ENABLE ROW LEVEL SECURITY` somewhere in the migration chain. `pnpm audit:rls` statically enforces this (fails CI on CRITICAL findings) and writes `.audit/rls-report.md`.

### Path aliases (portal)

`~/*` and `@/*` → `apps/portal/*`. Mapped sub-paths: `@/app/*`, `@/features/*`, `@/components/*`, `@/lib/*`, `@/hooks/*`.

### AI orchestration

`apps/portal/lib/ai/` holds the agent system: `agent-graph.ts`/`agent-state.ts` (state machine), plus modules for chunking, embeddings, memory, tool dispatch, cost tracking, prompts, providers (incl. Ollama), and rate limiting.

### Policy SSoT (architecture enforcement)

`tools/policy-definitions.ts` is the documented single-source-of-truth for dependency boundaries, required checks per project type, and intent→capability mapping. `pnpm policy:gen` compiles it into `tools/policy/*.json` and generated ESLint boundary rules; `pnpm policy:check` fails if the generated artifacts have drifted from the definition. Key rules: apps must not import `@repo/database` internals; `@repo/ui` must stay presentational (no data layer); `@repo/theme` must not depend on `@repo/ui`; `tools/*` are build-time only (no runtime app imports); packages must not depend on apps.

## Conventions that matter

From `GEMINI.md` — these are project rules, not generic advice:

- **Data is sacred.** Before any DB schema migration, data-mutation logic (Server Actions / API routes), or RLS/auth change, halt, explain the data impact, and get explicit confirmation before proceeding.
- **Tests passing ≠ the program works.** Frontend changes require live verification: start `pnpm dev`, navigate to the page, interact. Don't claim "it works" without evidence (test output or browser check).
- **Production readiness.** Changes must pass `pnpm quality` and live verification. If a change breaks build/tests/critical functionality, revert it and rethink.
- **Never invent values.** Authoritatively confirm paths, env vars, and IDs before using them. Remove imports/vars/functions your changes orphaned.
- **Agent tracing.** When modifying a package/app, append to its `AGENT_TRACER.md` (timestamp, purpose, changes, what the next agent should know). For non-obvious architectural logic, leave inline `// AGENT-TRACE: …` comments.
- **Commits** are conventional (`commitlint`, `@commitlint/config-conventional`); Husky + lint-staged run on commit.

## Environment & local infra

- Portal env: `apps/portal/.env` (copied from `apps/portal/.env.example` by `dev.sh` if missing). Requires `SUPABASE_URL` / `SUPABASE_ANON_KEY` etc.
- Local Supabase stack (DB `:54322`, API `:54321`, Studio `:54323`) boots via `pnpm dev` (Docker). Optional tooling containers (Redis, n8n, Flowise, Langfuse, Qdrant) via `pnpm dev --tools` and `docker-compose.tools.yml`.
- Playwright E2E is pinned to `/usr/bin/google-chrome` and `http://localhost:3000` — keep the portal running on the default port.
- Portal Jest coverage thresholds: 40% lines, 30% branches.

## Codebase Intelligence & Workspace Integration

- **Security & RLS Audits (`.audit`):** DB schema migrations are validated via
  static Row Level Security analysis (`pnpm audit:rls`). The generated report
  resides at `.audit/rls-report.md`.
- **Git Hooks (`.husky`):** Pre-commit and commit-msg hooks are configured via
  Husky. Ensure commits conform to Conventional Commits styling.
- **Monorepo Execution (`.nx`):** The Nx workspace caching engine stores
  previous build, test, and lint runs in `.nx`. Running tasks through Nx is
  highly encouraged to optimize build times.
- **Repowise Codebase Intelligence (`.repowise`, `.repowise-workspace`):** The
  repository and its workspace boundaries are indexed. Eagerly use Repowise MCP
  tools (like `get_answer`, `get_context`, `get_why`) for orientation and
  decision archaeology.
- **VS Code Configuration (`.vscode`):** Pre-configured settings, recommended
  extensions, and workspace-level MCP configs (such as
  `.vscode/cline_mcp_settings.json` and `.vscode/roo_mcp_settings.json`) are
  provided. See `.vscode/README.md` for developer/agent onboarding.
- **Claude Code Settings (`.claude`):** Claude-specific plugins and custom
  workspace instructions are located in `.claude/`.

## Where to look further

- `GEMINI.md` (root + per-app/package) — working conventions and agent-tracing rules.
- `.agents/AGENTS.md` — workspace-level rules and behavioral constraints for
  AI coding agents.
- `packages/theme/README.md`, `packages/supabase/README.md` — local Supabase + token-pipeline setup.
- `tools/policy-definitions.ts` — the authoritative dependency/intent boundary definitions.
- `docs/` — VitePress wiki (run from `/wiki`); runbooks in `docs/runbooks/`.
- `LIQUID_GLASS_CHECKLIST.md` — UI/visual checklist.
