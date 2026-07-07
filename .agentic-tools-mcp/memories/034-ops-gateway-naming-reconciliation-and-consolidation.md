# Memory 034: Ops Gateway Naming Reconciliation and Workspace Consolidation

## Context & Objectives
1. **Reconcile Naming**: Rectified TypeScript type-checking errors in `apps/ops-gateway/src/mcp/tools.ts` where older `agent` references were used instead of the unified `eve` (TUI agent) terminology that exists in `eve-dispatcher.ts` and `types.ts`.
2. **Consolidate Workspace**: Addressed root directory clutter by moving custom AI scripts/daemons from `.ai` into `.agentic-tools-mcp/scripts/` while preserving IDE symlinks (`.agents`, `.cursor`, etc.) for editor compatibility.

## Implementation Details
1. **MCP Tools Naming Reconciliation**:
   - Modified `apps/ops-gateway/src/mcp/tools.ts` to import `EveConfig`, `EveDispatch` instead of `AgentConfig`, `AgentDispatch` from `../dispatcher/types.js`.
   - Updated dispatcher function imports to use `getConfiguredEves` instead of `getConfiguredAgents` from `../dispatcher/eve-dispatcher.js`.
   - Renamed MCP tools: `agent-dispatch` -> `eve-dispatch` and `agent-list` -> `eve-list` to keep definitions fully aligned.
   - Fixed types on list filtering functions (`d: EveDispatch`) to eliminate implicit `any` parameter type errors.

2. **Workspace Folder Consolidation**:
   - Consolidated custom AI scripts in `.ai/` into `.agentic-tools-mcp/scripts/` to clean up root workspace clutter:
     - Moves `llm_council.py` -> `.agentic-tools-mcp/scripts/templates/llm-council/llm_council.py`
     - Moves `hermes_overwatch.py`, `agency_trigger_daemon.py`, and `agency_trigger_daemon.cjs` -> `.agentic-tools-mcp/scripts/daemons/`
     - Moves `install_claude_adapter.sh` -> `.agentic-tools-mcp/scripts/scratch/install_claude_adapter.sh`
     - Moved trace logs and profiles to `.agentic-tools-mcp/scripts/logs/`.
     - Deleted the empty `.ai` folder.
   - Refined `.gitignore` to recursively ignore Cargo target directories (`target/` instead of `/target`) to prevent large Rust build artifacts from polluting the Git index.
   - Preserved symlinks (`.agents`, `.cursor`, `.qoder`, `.repowise`, `.repowise-workspace`, `.sense`) as they are required by the editor/tools and already cleanly point into `.agentic-tools-mcp/`.

## Verification Outcomes
- **Type Checking**: Run `pnpm type-check` successfully passes across all 13 packages in the monorepo.
- **Unit Tests**: Run `pnpm test` successfully passes (all 417 unit tests green).
- **Index Health**: Ran `repowise update -w --index-only` successfully to refresh graph intelligence without issues.
