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

## 4. Codebase Intelligence & Documentation Sync (`.agentic-tools-mcp/`)

- **Centralized Intelligence**: All codebase intelligence data lives under `.agentic-tools-mcp/`:
  - **Repowise**: `.agentic-tools-mcp/repowise/` (symlinked at `.repowise`)
  - **Repowise Workspace**: `.agentic-tools-mcp/repowise-workspace/` (symlinked at `.repowise-workspace`)
  - **RepoWiki**: `.agentic-tools-mcp/repowiki/` (symlinked at `.qoder/repowiki`)
  - **Sense Index**: `.agentic-tools-mcp/sense/` (symlinked at `.sense`)
  - **Shared Memories**: `.agentic-tools-mcp/memories/`
  - **Agent Rules**: `.agentic-tools-mcp/agents/` (symlinked at `.agents`)
  - **Cursor Rules**: `.agentic-tools-mcp/cursor/` (symlinked at `.cursor`)
- **Update Command**: After making changes to the codebase (such as database migrations, API/route updates, library additions, or tooling changes), always run the update command:
  `./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only`
  to keep the graphs and codebase intelligence synced without documentation drift.
- **Reference & Search**: Always refer to the RepoWiki (`.agentic-tools-mcp/repowiki/`) and Repowise MCP tools as your primary codebase references.
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
  - `agentic-tools-mcp` (Project memory/task store via `packages/agentic-tools-mcp`)
- **Environment Variables for MCP Servers**: `.mcp.json` and `.vscode/*_mcp_settings` reference environment variables for secrets. Copy `.env.example` → `.env` at the repo root and fill in `N8N_EMAIL`, `N8N_PASSWORD`, `GITHUB_PERSONAL_ACCESS_TOKEN`, `GEMINI_API_KEY`, etc. Never commit `.env`.
- **Settings & Formatting**: Respect VS Code settings
  (`.vscode/settings.json`), ensuring formatting is automatically triggered
  via Prettier and ESLint boundaries are not violated.

---

## 6. Qoder Integration & RepoWiki (`.agentic-tools-mcp/repowiki`, `.qoder/skills`)

- **Maintain RepoWiki (`.agentic-tools-mcp/repowiki/`)**: The RepoWiki folder (symlinked at `.qoder/repowiki`) contains comprehensive documentation about the architecture, database, portal, API, and troubleshooting. If any code changes alter these concepts, update the corresponding markdown file(s) in `.agentic-tools-mcp/repowiki/en/content/` to prevent documentation rot.
- **Maintain Skills (`.qoder/skills/`)**: Custom runner/verification workflows for the developer tools are stored under `.qoder/skills/` (e.g., `run-portal`, `verify`). Update these skill configurations if the underlying startup or verification scripts/commands are changed.
- **Allowed Local Settings (`.qoder/settings.local.json`)**: If new terminal tools or commands are added that require CLI execution privileges for `qodercli`, ensure they are added to the `allow` block.

---

## 7. Memory Protocol (`.agentic-tools-mcp/memories`)

- **Shared Memories**: All models must utilize the `.agentic-tools-mcp/memories/` directory for long-term memory and context retrieval.
- **Task Completion**: Upon completing all tasks for a given goal, you must create a new memory markdown file documenting the state, decisions, and outcomes in the `.agentic-tools-mcp/memories/` directory.
- **Do Not Repeat**: All mistakes, errors, or failed attempts that are fixed during a session MUST be logged in `.agentic-tools-mcp/memories/006-dont-repeat.md`. This acts as a systematic rule book of "do not do" items to continuously improve agent results.

---

## 8. Systematic Improvement Protocol

- **Self-Programming**: Whenever you successfully solve a complex workflow, deployment issue, or debugging scenario, you MUST use `.agents/scripts/generate_skill.sh` to synthesize a reusable skill.
- **Rule Generation**: Whenever you identify a repository-wide anti-pattern or establish a new convention, you MUST use `.agents/scripts/add_rule.sh` to safely inject it into the global rules.

## Repowise & Memory Auto-Sync Rules

- **Git Hooks Automation**: Git hooks (`post-commit`, `post-merge`, `post-checkout`) are configured via Husky to automatically keep the Repowise index synced. Never bypass or disable these hooks. Ensure they remain executable (`chmod +x .husky/*`).
- **Explicit Verification**: Always run `./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only` before concluding any workspace changes or committing code to guarantee the graph/wiki index is fully updated.
- **Memory Logging & Indexing**: Upon completing any task, you must document implementation steps, decisions, and outcomes in a markdown memory file inside `.agentic-tools-mcp/memories/` (e.g. `007-nx-cleanup.md`), and immediately run the repowise update script afterwards so the memory file is searchable.
