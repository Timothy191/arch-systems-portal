# GitHub Copilot Instructions for Arch-Systems

## Project Context

Industrial mining-operations portal (Plantcor). pnpm + Nx/Turborepo monorepo using Node `>=22` (Volta pins `24.15.0`) and pnpm `9.15.9`.

| App / Package                | Role                                          |
| ---------------------------- | --------------------------------------------- |
| `apps/portal`                | Next.js 16 (App Router) operations dashboard  |
| `apps/api`                   | NestJS 11 backend on Fastify 5                |
| `apps/ai-agents`             | Python 3.11+ FastAPI agent microservice       |
| `apps/ops-gateway`           | Meta-backend / control plane (MCP, incidents) |
| `packages/supabase`          | App-facing data access layer                  |
| `packages/database`          | SQL migrations source of truth ONLY           |
| `packages/redis`             | L1/L2 cache helpers                           |
| `packages/rate-limiter`      | Shared rate-limiting utilities                |
| `packages/errors`            | Shared error classes                          |
| `packages/ui`                | shadcn-style presentational primitives        |
| `packages/theme`             | OKLCH design tokens + Tailwind preset         |
| `packages/utils`             | Shared utilities                              |
| `packages/eslint-config`     | Shared ESLint config                          |
| `packages/typescript-config` | Shared TypeScript config                      |

> Note: `agentic-tools-mcp` lives in `.aistack/packages/agentic-tools-mcp/` and is invoked via the root `pnpm agentic-tools` script.

## Common Commands

- `pnpm dev` — full dev stack (Supabase + Redis + API + Portal + health)
- `pnpm dev --quick` — portal only, no Docker/Supabase
- `pnpm dev --no-api` — portal without the NestJS API
- `pnpm build` — build everything
- `pnpm type-check` — type-check all
- `pnpm lint` — lint all
- `pnpm test` — unit tests all
- `pnpm test:e2e` — Playwright E2E (requires `pnpm dev` running)
- `pnpm quality` — full quality gate
- `pnpm --filter <package> <script>` — target one package
- `pnpm audit:rls` — verify RLS after migration changes
- `pnpm policy:gen` — regenerate dependency boundary rules
- `pnpm agentic-tools` — start project memory MCP server
- `pnpm agentic-tools:daemon` — run memory daemon
- `pnpm agentic-tools:setup` — copy `.env.example` → `.env` and `.env.tools.example` → `.env.tools`

## Critical Rules

1. Apps must import data access from `@repo/supabase`, never from `@repo/database`.
2. Every table in `packages/database/migrations/` must enable RLS with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`. Run `pnpm audit:rls` after schema changes.
3. The portal request filter is `apps/portal/proxy.ts` (Next.js 16 replaces `middleware.ts`).
4. Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
5. When modifying an app or package, append to its `AGENT_TRACER.md` and add `// AGENT-TRACE:` comments for non-obvious logic.
6. Regenerate boundary rules with `pnpm policy:gen` if you change module dependency intent or Nx tags.
7. After changes to DB schemas, APIs, packages, deployment, or dev scripts, update `.agentic-tools-mcp/repowiki/` (symlinked at `.qoder/repowiki`) and keep `.agentic-tools-mcp/repowise/` synced via `./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only`.
8. `.mcp.json` and `.vscode/*_mcp_settings` reference env vars for secrets. Copy `.env.example` → `.env` and `.env.tools.example` → `.env.tools` and fill in real values. Never commit `.env` or `.env.tools`.
9. All project memory/task files live under `.agentic-tools-mcp/`. Log completed work as a memory file there.

## Architecture Notes

- The portal proxies backend calls through `/api/backend/*` to `API_BASE_URL` (default `http://localhost:3004/api`).
- Department routes are under `app/(departments)/[department]/` with slugs: `drilling`, `production`, `access-control`, `engineering`, `control-room`, `safety`, `training`, `satellite-monitoring`.
- Portal route groups: `(auth)/`, `(departments)/[department]/`, `(hub)/`, `api/`.
- `@repo/supabase` exports: `.`, `./server`, `./client`, `./middleware`, `./kysely`, `./service-role`, `./read-replica`.
- Design tokens are generated from `packages/theme/src/css/variables.css`.
- Caching is two-tier (L1 memory + L2 Redis) via `@repo/redis`.
- Rate limiting uses `@repo/rate-limiter` (memory or Redis stores).

## References

- `CLAUDE.md` — canonical guidance for Claude Code, including Repowise/Sense MCP usage.
- `GEMINI.md` — conventions for the portal and workspace.
- `.agents/AGENTS.md` — workspace-wide rules for all AI agents.
- `README.md` — project summary and commands.
- `.vscode/README.md` — MCP server setup and editor-specific notes.
