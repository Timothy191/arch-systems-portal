# GEMINI.md

This file provides guidance to Gemini / Antigravity IDE when working with code in this repository.

## Project Context

Arch-Systems (Plantcor) is an industrial mining-operations portal. It is a **pnpm + Nx/Turborepo monorepo** using Node `>=22` (Volta pins `24.15.0`) and pnpm `9.15.9`.

| App / Package                | Role                                        | Port   |
| ---------------------------- | ------------------------------------------- | ------ |
| `apps/portal`                | Next.js 16 operations dashboard             | `3000` |
| `apps/api`                   | NestJS 11 backend on Fastify 5              | `3004` |
| `apps/cms`                   | Payload CMS v3                              | `3001` |
| `apps/overview`              | Architecture/flow viewer                    | `3002` |
| `packages/supabase`          | Data access layer (`@supabase/ssr`, Kysely) |
| `packages/database`          | SQL migrations source of truth ONLY         |
| `packages/theme`             | OKLCH design tokens                         |
| `packages/ui`                | Presentational shadcn primitives            |
| `packages/redis`             | Redis client + cache helpers                |
| `packages/agentic-tools-mcp` | Local MCP server for memory/tasks           |

## Common Commands

| Task                   | Command                                 |
| ---------------------- | --------------------------------------- |
| Install dependencies   | `pnpm install`                          |
| Full dev stack         | `pnpm dev`                              |
| Portal only, no Docker | `pnpm dev --quick`                      |
| Dev + CMS + Overview   | `pnpm dev --all`                        |
| Build all              | `pnpm build`                            |
| Type-check all         | `pnpm type-check`                       |
| Lint all               | `pnpm lint`                             |
| Unit tests all         | `pnpm test`                             |
| E2E tests              | `pnpm test:e2e`                         |
| Quality gate           | `pnpm quality`                          |
| Verify RLS             | `pnpm audit:rls`                        |
| Regenerate boundaries  | `pnpm policy:gen`                       |
| Target one package     | `pnpm --filter <package-name> <script>` |
| Agentic tools server   | `pnpm agentic-tools`                    |
| Agentic tools daemon   | `pnpm agentic-tools:daemon`             |
| Bootstrap env template | `pnpm agentic-tools:setup`              |

## High-Level Architecture

- **Portal**: Next.js 16 App Router, React 19, Turbopack dev. Middleware is `apps/portal/proxy.ts` (Next.js 16 rename). It handles auth refresh, department-based access control, and redirects. Backend calls are proxied through `/api/backend/*`.
- **API**: NestJS 11 on Fastify 5, global prefix `/api`, Swagger at `/api/docs` in dev, health at `/api/health/live`.
- **Data layer**: Apps import `@repo/supabase` only. `@repo/database` contains migrations and must not be imported by apps. `@repo/supabase` exports `.`, `./server`, `./client`, `./middleware`, `./kysely`, `./service-role`, `./read-replica`.
- **Departments**: `drilling`, `production`, `access-control`, `engineering`, `control-room`, `safety`, `training`, `satellite-monitoring`. Authorization is based on the `employees` table (`role`, `department_id`, `accessible_departments`).
- **Design tokens**: source of truth is `packages/theme/src/css/variables.css`.

## Critical Rules

1. **Data access boundary**: apps import `@repo/supabase`, never `@repo/database`.
2. **RLS is mandatory**: every table in `packages/database/migrations/` must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`. Run `pnpm audit:rls` after schema changes.
3. **Next.js 16 middleware**: use `apps/portal/proxy.ts`, not `middleware.ts`.
4. **Agent tracing**: when modifying an app/package, append to its `AGENT_TRACER.md` and add `// AGENT-TRACE:` comments for non-obvious logic.
5. **Conventional Commits**: use `feat:`, `fix:`, `refactor:`, `docs:`, etc.
6. **Module boundaries**: respect generated rules in `tools/policy/eslint-boundaries.generated.cjs`. Regenerate with `pnpm policy:gen` after changing dependency intent or Nx tags.
7. **Documentation sync**: update `.agentic-tools-mcp/repowiki/en/content/` (symlinked at `.qoder/repowiki`) and relevant `.qoder/skills/` when changing DB schemas, APIs, packages, deployment, or dev scripts. Keep `.agentic-tools-mcp/repowise/` and `.agentic-tools-mcp/repowise-workspace/` synced (symlinked at `.repowise` and `.repowise-workspace`) with `./tools/repowise/.venv/bin/repowise update -w --index-only`. The Sense index lives at `.agentic-tools-mcp/sense/` (symlinked at `.sense`).
8. **MCP secrets**: `.mcp.json` and `.vscode/*_mcp_settings` reference env vars for secrets. Copy `.env.example` → `.env` and fill in real values. Never commit `.env`.

## References

- `CLAUDE.md` — canonical Claude Code guidance, including Repowise/Sense MCP usage and cross-repo workspace details.
- `.agents/AGENTS.md` — workspace-wide rules for all AI agents (monorepo orchestration, MCP servers, editor configs).
- `README.md` — project summary and common commands.
- `apps/portal/GEMINI.md` — portal-specific conventions.
