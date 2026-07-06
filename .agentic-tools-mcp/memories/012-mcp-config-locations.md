# MCP Config File Locations — Master Index

**Date**: 2026-07-06
**Context**: Every file that defines MCP servers, for quick reference

## In-Repo Config Files

| Path                                                                  | Format | Servers | Used By                          |
| --------------------------------------------------------------------- | ------ | ------- | -------------------------------- |
| `.mcp.json`                                                           | JSON   | 14      | Qoder CLI, Claude Code (primary) |
| `.vscode/mcp.json`                                                    | JSON   | 2       | VS Code native MCP               |
| `.vscode/cline_mcp_settings.json`                                     | JSON   | 12      | Cline extension                  |
| `.vscode/roo_mcp_settings.json`                                       | JSON   | 12      | Roo Code extension               |
| `.kilo/kilo.json`                                                     | JSON   | 1       | Kilo Code (project-specific)     |
| `.agentic-tools-mcp/repowise/mcp.json` (`.repowise/mcp.json` symlink) | JSON   | 1       | Repowise internal                |
| `tools/repowise/.repowise/mcp.json`                                   | JSON   | 1       | Repowise sub-repo                |
| `tools/repowise/.vscode/mcp.json`                                     | JSON   | 1       | Repowise sub-repo VS Code        |
| `tools/sense/bench/global/docker/gitnexus/mcp.json`                   | JSON   | 1       | Benchmark (gitnexus)             |
| `tools/sense/bench/global/docker/probe/mcp.json`                      | JSON   | 1       | Benchmark (probe)                |

## Home Directory Config Files

| Path                      | Format | Servers                      | Used By                  |
| ------------------------- | ------ | ---------------------------- | ------------------------ |
| `~/.claude/.mcp.json`     | JSON   | 1 (`codebase-memory-mcp`)    | Claude Code (global)     |
| `~/.claude/settings.json` | JSON   | 1 (`repowise` via venv path) | Claude Code (global MCP) |
| `~/.config/kilo/kilo.json` | JSON   | 4                            | Kilo Code (global)       |
| `~/.config/kilo/kilo.jsonc` | JSONC  | 0 (Permissions config)       | Kilo Code (global permissions) |

## Config Hierarchy (Resolution Order)

For **Qoder CLI**: `.mcp.json` (repo root) is the single source of truth.

For **Claude Code**:

1. `~/.claude/.mcp.json` (global MCP servers)
2. `~/.claude/settings.json` → `mcpServers` (global MCP servers)
3. `.mcp.json` (project MCP servers, if `enableAllProjectMcpServers: true`)
4. `.claude/settings.json` → `enabledMcpjsonServers` (project server filter)

For **VS Code (native)**: `.vscode/mcp.json`

For **Cline**: `.vscode/cline_mcp_settings.json`

For **Roo Code**: `.vscode/roo_mcp_settings.json`

## Consistency Issues Found

1. **`.vscode/mcp.json`** only has 2 of 14 servers — significantly behind the canonical config
2. **Cline/Roo configs** miss `agentic-tools` and `sequential-thinking` (12 of 14)
3. **Key naming inconsistency**: Roo uses `codebase-memory` while others use `codebase-memory-mcp`
4. **Secrets in plain text**: GitHub PAT appears in `.mcp.json`, `.vscode/cline_mcp_settings.json`, `.vscode/roo_mcp_settings.json`
5. **n8n credentials in plain text**: `N8N_EMAIL` and `N8N_PASSWORD` in same three files
