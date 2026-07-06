# Memory: 008-aistack-root-cleanup

## Context & Goal

The workspace root contained both `ai_relation` and `.aistack`. To maintain a clean and standardized root directory layout, we merged the contents of `ai_relation` into `.aistack` and updated all dependencies, hook scripts, documentation files, and IDE configs.

## Implementation Steps

1. **File Move**: Copied all folders (`apps`, `packages`, `tools`, `ltm`) and `docker-compose.ai.yml` from `ai_relation/` to `.aistack/` preserving links and permissions.
2. **Path Refactoring**:
   - Updated root rules and guides: `AGENTS.md` and `CLAUDE.md`.
   - Updated tool excludes: `package.json` (`lint:root` script) and `.prettierignore`.
   - Updated IDE configurations: `.mcp.json` (repowise-mcp, sense-mcp, memex-mcp, agentic-tools-mcp).
   - Updated Git hooks: `.husky/post-checkout`, `post-commit`, and `post-merge`.
   - Updated local MCP instructions: `.agentic-tools-mcp/agents/AGENTS.md` and `.agentic-tools-mcp/qoder/settings.local.json`.
3. **Interpreter Fixes**:
   - Re-synced python projects (`.aistack/tools/repowise` and `.aistack/tools/memex`) using `uv sync` to recreate venvs and correct the shebang paths.
4. **Cleanup**: Removed the original `ai_relation/` directory completely.

## Verification

- Ran `./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only` and verified it executed successfully.
- Ran portal verification tests (`pnpm --filter portal lint && pnpm --filter portal type-check && pnpm --filter portal test`), confirming everything continues to compile and pass.
