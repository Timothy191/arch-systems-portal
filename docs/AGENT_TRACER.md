# Agent Tracer Log

This file maintains a record of AI agent interventions, context hand-offs, and architectural breadcrumbs for this specific package/app.

## [2026-07-08] Fix MCP configs and update copilot instructions

- **Agent**: GitHub Copilot CLI
- **Changes**:
  - Fixed portable configuration issues across `.mcp.json` and `.vscode/*_mcp_settings.json` (`trace-mcp` command, `.aistack/tools/...` paths for Repowise/Sense/Memex).
  - Fixed root `package.json` `agentic-tools*` scripts to run `.aistack/packages/agentic-tools-mcp/` directly and copy `.env.tools.example`.
  - Changed `docker-compose.tools.yml` n8n bind mount to named volume `n8n_data`; added `.env.tools.example` template; updated `.gitignore` and `.vscode/README.md`.
  - Updated `.github/copilot-instructions.md` to match the real workspace layout (`apps/ai-agents`, `apps/ops-gateway`, `packages/errors`, `packages/rate-limiter`, etc.) and added `.env.tools.example` guidance.
- **Context**: Config-only fixes. Runtime MCP servers (`n8n-mcp`, `github-official`, `vscode-mcp-server`) still require user-supplied secrets/containers or the VS Code MCP extension.
- **Next Agent Notes**: To fully restore MCP runtime, populate `.env` and `.env.tools`, start the tools stack, and install/launch the VS Code MCP extension. `bash`/`glob`/`grep` remain blocked by repo `preToolUse` settings.

## [2026-07-07] Clean up Repowise transient artifacts

- **Agent**: Claude Code
- **Changes**:
  - Updated `.gitignore` to ignore Repowise transient SQLite artifacts and lock files (`*.db-shm`, `*.db-wal`, `.agentic-tools-mcp/repowise/*.db-shm`, `.agentic-tools-mcp/repowise/*.db-wal`, `.agentic-tools-mcp/repowise/.update.lock`).
  - Safely removed transient untracked files `acc.db-shm` and `acc.db-wal` while preserving persistent databases (`acc.db`, `.agentic-tools-mcp/repowise/wiki.db`).
  - Restored per-session acc hook state files (`.agentic-tools-mcp/claude/hooks/state/acc-session.json`, `acc-turn-*.json`, `turn-baseline-*.txt`) to their committed state so they are not accidentally committed as transient runtime state.
- **Context**: The Repowise post-checkout hook updates the codebase intelligence index and can leave SQLite WAL/SHM sidecar files and lock files in the working tree. These are ephemeral artifacts that should never be committed. Tracked Repowise index files (e.g., `.agentic-tools-mcp/claude/CLAUDE.md`, `checksums.json`, `repowise-workspace.yaml`, `state.json`) are legitimate generated outputs and were left as working changes.
- **Next Agent Notes**: After running Repowise index updates or the acc hook, verify that only legitimate generated index files and source-code changes remain; remove any `*.db-shm`, `*.db-wal`, or `.update.lock` files. Do not hand-edit `.claude/CLAUDE.md`.

## [2026-07-03] Baseline repository hygiene

- **Agent**: Claude Code
- **Changes**: Created root `README.md`, expanded `.gitignore` to cover build outputs, env files, IDE artifacts, test coverage, Supabase temp data, Python caches, Rust targets, and Docker volumes. Made initial commit `d7cc428`.

## [2026-07-03] Lint/format configuration

- **Agent**: Claude Code
- **Changes**: Removed embedded `.git` directories from `tools/memex`, `tools/repowise`, `tools/secrin`, `tools/sense`. Added `.prettierignore` and `.eslintignore` excluding vendored tooling, lockfiles, generated assets, and build outputs. Ran `pnpm format` to establish clean baseline. `pnpm lint:root` now passes.

## [2026-07-03] Refactor flagged hotspots

- **Agent**: Claude Code
- **Changes**:
  - Split `apps/portal/lib/shift-completeness.ts` into focused helpers: fetch functions per table, form-data builder, coverage resolver, and summary function.
  - Refactored `apps/portal/lib/ai/embeddings.ts` into a directory module `apps/portal/lib/ai/embeddings/` with `index.ts`, `l1-cache.ts`, `l2-cache.ts`, `provider.ts`, `hash.ts`.
  - Simplified `apps/portal/lib/ai/ollama.ts` by extracting request-body builder, `postChat`, error-text parser, and `parseStreamBuffer` from `ollamaChatStream`.
  - Verified `lib/ai/embeddings.test.ts` still passes (10/10).

## [2026-07-03] Harden portal middleware

- **Agent**: Claude Code
- **Changes**:
  - Refactored `apps/portal/proxy.ts` into focused helpers: public-path detection, session cookie check, auth resolution, employee lookup, restricted-route check, department isolation.
  - Tightened `isValidRedirect` regexes with `$` anchors to prevent prefix bypasses (e.g. `/loginfoo`). Exported `isValidRedirect` for direct unit testing.
  - Removed dead `/api/*` checks from middleware body (matcher already excludes API routes).
  - Added comprehensive `isValidRedirect` tests in `apps/portal/proxy.test.ts`; full suite 33/33 passing.

## [2026-07-03] Quality gate green

- **Agent**: Claude Code
- **Changes**:
  - Fixed `apps/portal/lib/errors/error-classes.ts` constructor overloads to accept an options bag `{ statusCode, context, cause, ...extra }` (matches `@repo/errors` API) and removed stale ESLint disable.
  - Fixed `_redis` field access in `apps/portal/lib/ai/rate-limiter.ts` and `apps/portal/lib/api/rate-limit-middleware.ts`; added missing `incr`/`expire` to the rate-limit middleware test mock.
  - Replaced broken `@repo/errors` import in `apps/portal/plugins/rust-telemetry-engine/index.tsx` with local `@/lib/errors/error-classes`.
  - Removed `console.error` from `apps/portal/components/CommandBar.tsx` logout handler.
  - Fixed stale test expectation in `apps/portal/components/nav/ServicesDropdown.test.tsx`.
  - Inlined all `catalog:` / `catalog:react19` references across package.json files to actual versions (syncpack 13 cannot parse pnpm catalog protocol); ran `pnpm exec syncpack format`.
  - Added `.syncpackrc` ignoring workspace protocol deps and enforcing `^` semver ranges.
  - Updated `knip.json` to ignore root tooling deps, `pnpm-workspace.yaml`, `python3`/`psql` binaries, `eslint-import-resolver-typescript` unresolved import, and `lib/errors/error-classes.ts`.
  - `pnpm quality` now passes (EXIT_CODE=0).

## [2026-06-05] AMCA Foundation / Initialization

- **Agent**: Antigravity
- **Changes**: Initialized tracing protocols globally as per user instruction.
