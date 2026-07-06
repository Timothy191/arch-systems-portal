# Arch-Systems (Plantcor) Cursor Rules

These rules apply when using Cursor in this repository.

## Project Context

Industrial mining-operations portal. pnpm + Nx/Turborepo with Node `>=22` (Volta pins `24.15.0`) and pnpm `9.15.9`.

| App / Package                | Role                              | Port   |
| ---------------------------- | --------------------------------- | ------ |
| `apps/portal`                | Next.js 16 dashboard              | `3000` |
| `apps/api`                   | NestJS 11 backend on Fastify 5    | `3004` |
| `apps/cms`                   | Payload CMS v3                    | `3001` |
| `apps/overview`              | Architecture/flow viewer          | `3002` |
| `packages/supabase`          | Data access layer                 |
| `packages/database`          | SQL migrations ONLY               |
| `packages/theme`             | OKLCH design tokens               |
| `packages/ui`                | Presentational primitives         |
| `packages/redis`             | Redis client + cache              |
| `packages/agentic-tools-mcp` | Local MCP server for memory/tasks |

## Commands

- `pnpm dev` — full stack (Supabase + Redis + API + Portal)
- `pnpm dev --quick` — portal only, no Docker
- `pnpm dev --all` — include CMS + Overview
- `pnpm build`, `pnpm type-check`, `pnpm lint`, `pnpm test`
- `pnpm --filter <package> <script>` — target one package
- `pnpm quality` — full quality gate
- `pnpm audit:rls` — verify RLS after migration changes
- `pnpm policy:gen` — regenerate boundary rules
- `pnpm agentic-tools` — start project memory MCP server
- `pnpm agentic-tools:daemon` — run the memory daemon

## Non-Negotiable Rules

1. **Data access boundary** — apps import `@repo/supabase`, never `@repo/database`.
2. **RLS mandatory** — every table in `packages/database/migrations/` must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`. Run `pnpm audit:rls` after schema changes.
3. **Next.js 16 middleware rename** — the portal middleware file is `apps/portal/proxy.ts`, not `middleware.ts`.
4. **Agent tracing** — when modifying an app/package, append to its `AGENT_TRACER.md`. Leave `// AGENT-TRACE: ...` comments for non-obvious logic.
5. **Conventional Commits** — `feat:`, `fix:`, `refactor:`, `docs:`, etc.
6. **Module boundaries** — respect generated rules in `tools/policy/eslint-boundaries.generated.cjs` (regenerate with `pnpm policy:gen` if changed).
7. **Documentation sync** — update `.agentic-tools-mcp/repowiki/en/content/` (symlinked at `.qoder/repowiki`) and relevant `.qoder/skills/` when changing DB schemas, APIs, packages, deployment, or dev scripts. All codebase intelligence is centralized under `.agentic-tools-mcp/`.
8. **MCP secrets** — `.mcp.json` and `.vscode/*_mcp_settings` reference env vars. Copy `.env.example` → `.env` and fill in real values. Never commit `.env`.

## Architecture Notes

- The portal proxies backend calls through `/api/backend/*` to the NestJS API at `API_BASE_URL`.
- Department routes live under `app/(departments)/[department]/`. Valid slugs: `drilling`, `production`, `access-control`, `engineering`, `control-room`, `safety`, `training`, `satellite-monitoring`.
- `@repo/supabase` exports: `.`, `./server`, `./client`, `./middleware`, `./kysely`, `./service-role`, `./read-replica`.
- Design-token source of truth: `packages/theme/src/css/variables.css`.

## References

- `CLAUDE.md` — full Claude Code guidance, Repowise/Sense MCP usage, and workspace overview.
- `.agents/AGENTS.md` — workspace-wide rules for monorepo orchestration, MCP servers, and editor configs.
- `README.md` — project summary and common commands.
