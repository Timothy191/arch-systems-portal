# Agentic Tools MCP — Local Project Memory Server

**Date**: 2026-07-06
**Context**: Replaced external `@pimzino/agentic-tools-mcp` with a local, project-owned MCP server.

## Location

- **Server**: `packages/agentic-tools-mcp/src/server.js`
- **Daemon**: `packages/agentic-tools-mcp/scripts/daemon.js`
- **Store**: `.agentic-tools-mcp/memories/` and `.agentic-tools-mcp/tasks/tasks.json`

## Commands

| Task                      | Command                     |
| ------------------------- | --------------------------- |
| Start MCP server          | `pnpm agentic-tools`        |
| Run companion daemon      | `pnpm agentic-tools:daemon` |
| Bootstrap `.env` template | `pnpm agentic-tools:setup`  |

## Exposed Tools

- `agentic_list_memories`
- `agentic_read_memory`
- `agentic_search_memories`
- `agentic_create_memory`
- `agentic_update_memory`
- `agentic_list_tasks`
- `agentic_create_task`
- `agentic_update_task`
- `agentic_delete_task`

## Integration

- Added to `.mcp.json`, `.vscode/cline_mcp_settings.json`, `.vscode/roo_mcp_settings.json`.
- Documented in `CLAUDE.md`, `.agents/AGENTS.md`, `AGENTS.md`, `GEMINI.md`, `.cursor/rules/arch-systems.md`, `.github/copilot-instructions.md`, and `.vscode/README.md`.
- The server is configured to read from the repo root (default: parent of `packages/agentic-tools-mcp`).

## Next Agent Notes

- Use `agentic_search_memories` to recall prior context before starting complex tasks.
- Use `agentic_create_memory` to persist decisions, fixes, and outcomes at the end of a task.
- Use `agentic_create_task` to track open work items.
