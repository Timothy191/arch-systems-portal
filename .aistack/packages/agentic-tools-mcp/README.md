# Agentic Tools MCP

Local Model Context Protocol server that exposes the project's `.agentic-tools-mcp/` memory and task store as MCP tools.

## Usage

```bash
# Run the MCP server on stdio
pnpm --filter @repo/agentic-tools-mcp start

# Run the companion daemon (watches store for changes)
pnpm --filter @repo/agentic-tools-mcp daemon
```

## Tools exposed

- `agentic_list_memories`
- `agentic_read_memory`
- `agentic_search_memories`
- `agentic_create_memory`
- `agentic_update_memory`
- `agentic_list_tasks`
- `agentic_create_task`
- `agentic_update_task`
- `agentic_delete_task`

## Store layout

The server reads from and writes to the repo-root `.agentic-tools-mcp/` directory:

```
.agentic-tools-mcp/
  memories/*.md
  tasks/tasks.json
```

## Environment variables

- `AGENTIC_TOOLS_REPO_ROOT` — override repo root (default: parent of this package)
- `AGENTIC_TOOLS_INTERVAL_MS` — daemon poll interval (default: 5000)
