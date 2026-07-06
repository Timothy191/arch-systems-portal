# GitHub Copilot Instructions for Arch-Systems

## Project Context

Industrial mining-operations portal. pnpm + Nx/Turborepo monorepo using Node `>=22` (Volta pins `24.15.0`) and pnpm `9.15.9`.

| App / Package                | Role                                   |
| ---------------------------- | -------------------------------------- |
| `apps/portal`                | Next.js 16 operations dashboard        |
| `apps/api`                   | NestJS 11 backend on Fastify 5         |
| `apps/cms`                   | Payload CMS v3                         |
| `apps/overview`              | Architecture/flow viewer               |
| `packages/supabase`          | App-facing data access layer           |
| `packages/database`          | SQL migrations source of truth         |
| `packages/theme`             | OKLCH design tokens                    |
| `packages/ui`                | shadcn-style presentational primitives |
| `packages/redis`             | Redis client and cache helpers         |
| `packages/agentic-tools-mcp` | Local MCP server for memory/tasks      |

## Common Commands

- `pnpm dev` — start full dev stack
- `pnpm dev --quick` — portal only
- `pnpm build`, `pnpm type-check`, `pnpm lint`, `pnpm test`
- `pnpm quality` — full quality gate
- `pnpm --filter <package> <script>` — target one package
- `pnpm audit:rls` — verify RLS after migration changes
- `pnpm policy:gen` — regenerate boundary rules
- `pnpm agentic-tools` — start project memory MCP server
- `pnpm agentic-tools:daemon` — run the memory daemon

## Critical Rules

1. Apps must import from `@repo/supabase`, never from `@repo/database`.
2. Every table in `packages/database/migrations/` must enable RLS with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`. Run `pnpm audit:rls` after schema changes.
3. The portal middleware file is `apps/portal/proxy.ts`, not `middleware.ts`.
4. Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
5. When modifying an app or package, append to its `AGENT_TRACER.md` and add `// AGENT-TRACE:` comments for non-obvious logic.
6. Regenerate boundary rules with `pnpm policy:gen` if you change module dependency intent or Nx tags.
7. Keep `.agentic-tools-mcp/repowiki/` (symlinked at `.qoder/repowiki`) and `.qoder/skills/` updated when changing DB schemas, APIs, packages, deployment, or dev scripts. All codebase intelligence data is centralized under `.agentic-tools-mcp/`.
8. `.mcp.json` and `.vscode/*_mcp_settings` reference env vars for secrets. Copy `.env.example` → `.env` and fill in real values. Never commit `.env`.

## Architecture Notes

- The portal proxies backend calls through `/api/backend/*` to `API_BASE_URL` (default `http://localhost:3004/api`).
- Department routes are under `app/(departments)/[department]/` with slugs: `drilling`, `production`, `access-control`, `engineering`, `control-room`, `safety`, `training`, `satellite-monitoring`.
- `@repo/supabase` exports: `.`, `./server`, `./client`, `./middleware`, `./kysely`, `./service-role`, `./read-replica`.
- Design tokens are generated from `packages/theme/src/css/variables.css`.

## References

- `CLAUDE.md` — canonical guidance for Claude Code, including Repowise/Sense MCP usage.
- `.agents/AGENTS.md` — workspace-wide rules for AI agents.
- `README.md` — project summary and commands.
