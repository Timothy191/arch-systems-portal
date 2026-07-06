# Centralization Migration — 2026-07-06

**Context**: All codebase intelligence data moved to `.agentic-tools-mcp/` as single source of truth

## What Moved

| Original Location          | New Canonical Location                       | Symlink                                                                   |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| `.qoder/`                  | `.agentic-tools-mcp/qoder/`                  | `.qoder` → `.agentic-tools-mcp/qoder`                                     |
| `.repowise/`               | `.agentic-tools-mcp/repowise/`               | `.repowise` → `.agentic-tools-mcp/repowise`                               |
| `.repowise-workspace/`     | `.agentic-tools-mcp/repowise-workspace/`     | `.repowise-workspace` → `.agentic-tools-mcp/repowise-workspace`           |
| `.repowise-workspace.yaml` | `.agentic-tools-mcp/repowise-workspace.yaml` | `.repowise-workspace.yaml` → `.agentic-tools-mcp/repowise-workspace.yaml` |
| `.qoder/repowiki/`         | `.agentic-tools-mcp/repowiki/`               | `.agentic-tools-mcp/qoder/repowiki` → `../repowiki`                       |
| `.sense/`                  | `.agentic-tools-mcp/sense/`                  | `.sense` → `.agentic-tools-mcp/sense`                                     |
| `.agents/`                 | `.agentic-tools-mcp/agents/`                 | `.agents` → `.agentic-tools-mcp/agents`                                   |
| `.cursor/`                 | `.agentic-tools-mcp/cursor/`                 | `.cursor` → `.agentic-tools-mcp/cursor`                                   |

**Note**: `.qoder` is itself a symlink to `.agentic-tools-mcp/qoder`. Nested symlinks inside `.qoder/` must use relative paths from the _target_ directory (`.agentic-tools-mcp/qoder/`), not from the symlink location. The `repowiki` symlink uses `../repowiki` (not `../.agentic-tools-mcp/repowiki`) for this reason.

## Pre-existing in `.agentic-tools-mcp/`

| Directory   | Contents                                           |
| ----------- | -------------------------------------------------- |
| `ltm/`      | Long-term memory system (Python, vector search)    |
| `memories/` | Shared agent memories (000-014 + recall_daemon.sh) |
| `tasks/`    | Task tracker (tasks.json)                          |

## Why

- Single directory for all agentic tooling data
- Easier backups, syncing, and access control
- Clear ownership: `.agentic-tools-mcp/` is the canonical location
- Symlinks preserve backward compatibility for tools that hardcode old paths

## Updated Directive Files

All references updated to use canonical `.agentic-tools-mcp/` paths:

- `AGENTS.md` (root)
- `CLAUDE.md` (root)
- `GEMINI.md` (root)
- `apps/portal/GEMINI.md`
- `.github/copilot-instructions.md`
- `.agentic-tools-mcp/agents/AGENTS.md` (workspace rules)
- `.agentic-tools-mcp/cursor/rules/arch-systems.md`
- Memory files (009, 011, 014)

## Backward Compatibility

All symlinks ensure existing tool configs continue to work:

- Repowise MCP still reads from `.repowise/` (symlink resolves)
- Sense MCP still reads from `.sense/` (symlink resolves)
- Qoder still reads from `.qoder/repowiki/` (symlink resolves)
- Claude Code still reads from `.agents/AGENTS.md` (symlink resolves)
- Cursor still reads from `.cursor/rules/` (symlink resolves)
