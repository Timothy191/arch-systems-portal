# MCP config fixes and copilot-instructions update

Date: 2026-07-08
Agent: GitHub Copilot CLI

## What changed

- `.mcp.json`, `.vscode/mcp.json`, `.vscode/roo_mcp_settings.json`, `.vscode/cline_mcp_settings.json`
  - Replaced hardcoded `/home/timothy/.trace-mcp/bin/trace-mcp` with portable `npx -y trace-mcp@latest`.
  - Corrected `repowise-mcp`, `sense-mcp`, and `memex-mcp` paths from `tools/...` to `.aistack/tools/...`.
- `docker-compose.tools.yml`
  - Replaced host bind mount `/home/timothy/.n8n` with named Docker volume `n8n_data`.
- `.env.tools.example` (new)
  - Template for n8n/Langfuse/ClickHouse secrets consumed by `docker-compose.tools.yml`.
- `.env.example`
  - Added pointer to `.env.tools.example`.
- `.gitignore`
  - Added `.env.tools`.
- `package.json`
  - Fixed `agentic-tools`, `agentic-tools:daemon`, and `agentic-tools:setup` scripts to point to `.aistack/packages/agentic-tools-mcp/...` (not the non-existent `@repo/agentic-tools-mcp` filter).
- `.vscode/README.md`
  - Updated paths and commands to match `.aistack/tools/...` and `.aistack/packages/...`.
- `.github/copilot-instructions.md`
  - Refreshed app/package inventory, commands, and critical rules to match the real workspace.

## What still needs external/user action

- `n8n-mcp` requires `N8N_EMAIL`/`N8N_PASSWORD` in `.env` and a running n8n container.
- `github-official` requires `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env`.
- `vscode-mcp-server` requires the VS Code MCP extension installed and running.
- `bash`/`glob`/`grep` remain denied by repo `preToolUse` settings.

## Related files

- `.github/copilot-instructions.md`
- `.mcp.json`
- `.vscode/mcp.json`
- `.vscode/roo_mcp_settings.json`
- `.vscode/cline_mcp_settings.json`
- `.vscode/README.md`
- `docker-compose.tools.yml`
- `package.json`
- `.env.tools.example`
- `docs/AGENT_TRACER.md`
