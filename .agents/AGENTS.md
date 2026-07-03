# Workspace Rules for AI Agents (AGENTS.md)

This file defines style guidelines, behavioral constraints, and workspace
conventions for AI coding agents (Antigravity, Cline, Roo Code, Claude Code).
Always follow these constraints.

---

## 1. Database & Security (`.audit`)

- **Row Level Security (RLS) is mandatory**: Every database table created or
  modified in `packages/database/migrations/` must have an explicit
  `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` statement.
- **RLS Audit**: Always run `pnpm audit:rls` after database schema or migration
  changes.
- **Verify Report**: Inspect the generated audit report at
  [.audit/rls-report.md](file:///home/timothy/Documents/Arch-Mk2/.audit/rls-report.md).
  Fix any `CRITICAL` warnings before staging or pushing code.

---

## 2. Git & Commits (`.husky`)

- **Conventional Commits**: Commit messages must adhere to the Conventional
  Commits specification (e.g. `feat: ...`, `fix: ...`, `docs: ...`,
  `refactor: ...`).
- **Husky Hook Checks**: Husky and lint-staged are active. Ensure code is
  formatted (`pnpm format:check`) and linted (`pnpm lint`) before making
  commits to avoid hook failures.

---

## 3. Monorepo Orchestration (`.nx`)

- **Nx Target Execution**: Utilize Nx caching by running commands via
  `nx run-many -t <target>` (e.g., `pnpm quality`, `pnpm build`, `pnpm lint`,
  `pnpm test`).
- **Target Filtering**: Use `--filter <package>` or
  `pnpm exec nx run <project>:<target>` to isolate specific scopes instead of
  executing on the entire monorepo if only one package is changed.
- **Cache Compliance**: Avoid bypassing the Nx cache (e.g., with
  `--skip-nx-cache`) unless verifying clean environment builds.

---

## 4. Codebase Intelligence (`.repowise` and `.repowise-workspace`)

- **Repowise Integration**: This codebase is indexed by Repowise.
- **Use Repowise MCP Tools**: Eagerly use Repowise MCP tools (such as
  `get_answer`, `get_context`, `search_codebase`, `get_why`, `get_health`,
  `get_dead_code`) for:
  - Codebase search and symbol discovery.
  - Tracking down architectural decision records (ADRs) and why code is
    structured a certain way.
  - Querying codebase health and identifying dead code.
- **Trust protocol**: If an MCP response returns `verified: true`, trust the
  returned bytes and do not execute a redundant file read on the same lines.
- **Verification**: Always cross-reference indexed symbols or health markers
  with the live workspace if you suspect the index is stale (see
  `_meta.stale_warning`).

---

## 5. Editor and Client Configs (`.vscode` and `.claude`)

- **Pre-configured MCP Servers**: Refrain from manually spawning background
  databases/servers when workspace configurations already define their hooks.
  Check [.vscode/README.md](file:///home/timothy/Documents/Arch-Mk2/.vscode/README.md)
  and [.vscode/cline_mcp_settings.json](file:///home/timothy/Documents/Arch-Mk2/.vscode/cline_mcp_settings.json)
  or [.claude/settings.local.json](file:///home/timothy/Documents/Arch-Mk2/.claude/settings.local.json)
  for the configuration of:
  - `preflight-mcp` (Diagnostic utility)
  - `n8n-mcp` (Workflow integration)
  - `codebase-memory` (Knowledge Graph)
  - `repowise-mcp` (Deep structural graph & health)
  - `sense-mcp` (Go codebase navigation)
  - `memex-mcp` (Temporal developer memory using Neo4j)
  - `deepgraph-mcp` (Next.js/React/TS code graphs)
  - `github-official` & `redis`
- **Settings & Formatting**: Respect VS Code settings
  (`.vscode/settings.json`), ensuring formatting is automatically triggered
  via Prettier and ESLint boundaries are not violated.
