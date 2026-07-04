# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

## Critical Rules

**Data access**: Apps must import from `@repo/supabase`, never `@repo/database` directly. Enforced by policy boundaries.

**Next.js 16 convention**: The portal uses `proxy.ts` instead of `middleware.ts`. This is the Next.js 16 rename.

**AGENT_TRACER.md**: When modifying a package or app, append to its `AGENT_TRACER.md` (timestamp, purpose, changes, next-agent context). Add inline `// AGENT-TRACE: ...` comments for non-obvious logic.

**Row Level Security**: Every table in `packages/database/migrations/` must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Run `pnpm audit:rls` after schema changes.

## Commands

| Task                                | Command                                     |
| ----------------------------------- | ------------------------------------------- |
| Full quality gate                   | `pnpm quality`                              |
| Dev server (portal only, no Docker) | `pnpm dev --quick`                          |
| Dev with Supabase + health checks   | `pnpm dev`                                  |
| Lint + typecheck + test             | `pnpm lint && pnpm type-check && pnpm test` |
| Format                              | `pnpm format`                               |
| Target one package                  | `pnpm --filter <pkg> <script>`              |

## Conventions

- **Branch naming**: `type/description` (e.g., `feat/add-auth`, `fix/login-redirect`)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, etc.)
- **Design tokens**: Source of truth is `packages/theme/src/css/variables.css`. Run `scripts/generate-tokens.mjs` to compile. OKLCH-based.
- **tools/ directory**: Excluded from ESLint and Prettier. Build-time only, must not be imported by runtime apps.

## Working Principles

- **Data is sacred**: Before any DB migration or auth change, explain the data impact and get confirmation.
- **Tests passing ≠ works**: Frontend changes require live verification in the browser.
- **Never invent values**: Confirm paths, env vars, and IDs before using them.

## Additional Guidance

See `CLAUDE.md` for architecture details, path aliases, and working conventions. See `.agents/AGENTS.md` for workspace rules on monorepo orchestration, codebase intelligence (Repowise MCP), and editor configs.
