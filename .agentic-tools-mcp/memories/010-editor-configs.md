# Editor Configurations — Complete Inventory

**Date**: 2026-07-06
**Context**: All VS Code, Cursor, Cline, and Roo Code configurations

## VS Code (`.vscode/`)

### settings.json

- TypeScript SDK path configured
- Format-on-save with Prettier
- ESLint auto-fix enabled
- File nesting rules
- Repowise CLI path configured

### extensions.json (Recommended)

- `dbaeumer.vscode-eslint` — ESLint
- `esbenp.prettier-vscode` — Prettier
- `saoudrizwan.claude-dev` — Cline
- `roocode.roo-cline` — Roo Code
- `repowise` — Repowise

### mcp.json (VS Code Native MCP)

2 servers:

- `repowise` — Full codebase intelligence (stdio transport)
- `trace-mcp` — Agent tracing (stdio transport)

### cline_mcp_settings.json

12 servers (mirrors `.mcp.json` minus `agentic-tools` and `sequential-thinking`).
Full set: preflight-mcp, n8n-mcp, codebase-memory-mcp, repowise-mcp, sense-mcp, memex-mcp, deepgraph-nextjs, deepgraph-react, deepgraph-typescript, github-official, redis, trace-mcp.

### roo_mcp_settings.json

12 servers (same as Cline). Note: uses key `codebase-memory` instead of `codebase-memory-mcp`.

## Cursor (`.cursor/`)

### rules/arch-systems.md

Project-specific rules for Cursor AI:

- Project context and commands
- Non-negotiable rules (data boundaries, RLS, conventional commits)
- Architecture notes

## Installed VS Code Extensions (AI-related)

From `~/.vscode/extensions/`:
| Extension | Publisher |
|-----------|-----------|
| `anthropic.claude-code-2.1.199` | Anthropic |
| `ms-azuretools.vscode-azure-github-copilot` | Microsoft |
| `ms-azuretools.vscode-azure-mcp-server` | Microsoft |
| `ms-windows-ai-studio` | Microsoft |

## Config Sync Status

| Config                            | Servers | Synced with `.mcp.json`?                    |
| --------------------------------- | ------- | ------------------------------------------- |
| `.vscode/mcp.json`                | 2/14    | Partial (repowise + trace-mcp only)         |
| `.vscode/cline_mcp_settings.json` | 12/14   | Missing: agentic-tools, sequential-thinking |
| `.vscode/roo_mcp_settings.json`   | 12/14   | Missing: agentic-tools, sequential-thinking |
| `.mcp.json`                       | 14/14   | Canonical                                   |

## Key Observation

The VS Code native MCP config (`.vscode/mcp.json`) only defines 2 of 14 servers. The Cline and Roo configs are more complete but still miss 2 servers. Only `.mcp.json` (used by Qoder CLI and Claude Code) has the full set.
