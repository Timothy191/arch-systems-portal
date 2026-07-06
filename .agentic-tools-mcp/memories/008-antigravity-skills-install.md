# 008 - Antigravity Awesome Skills Install & Trim

**Date**: 2026-07-06
**Agent**: opencode (big-pickle)

## Summary
Installed the `antigravity-awesome-skills` library (v13.11.0) to `~/.agents/skills/`, then trimmed to only `development,backend` categories with `safe,none` risk levels. Also installed the `shadcn-ui-mcp-server` MCP server.

## Steps Performed

1. **Full install**: `npx antigravity-awesome-skills --path /home/timothy/.agents/skills` — installed 1,917 skills
2. **MCP server lookup**: `npx mdskills install Jpisnice/shadcn-ui-mcp-server` — showed install instructions (docs-only)
3. **MCP config**: Added `shadcn-ui-mcp-server` entry to `.mcp.json` with `command: "npx", args: ["-y", "shadcn-ui-mcp-server"]`
4. **Trim**: Re-ran with filters `--category development,backend --risk safe,none` — trimmed to 40 skills

## Outcome
- `~/.agents/skills/` now has 38 directories / 40 SKILL.md files (filtered set)
- `.mcp.json` has the shadcn-ui-mcp-server entry
- Skills are scoped to development and backend categories only

## 2026-07-06 — Added 5 MCP Servers
- **world-intel-mcp**: Real-time global intelligence (109 tools)
- **mcp-graphql-forge**: Configuration-driven GraphQL MCP
- **memory-mcp**: Memory management & context window caching
- **rn-debug-mcp**: React Native debug for agents
- **vscode-mcp-server**: VS Code editor interaction via MCP
- Added to `.mcp.json`, `.vscode/cline_mcp_settings.json`, `.vscode/roo_mcp_settings.json`

## Lessons
- Always use absolute paths with `antigravity-awesome-skills --path` (relative paths double-up)
- `npx mdskills install` is documentation-only — must manually add MCP entries
