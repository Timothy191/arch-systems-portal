# Claude Code Configuration — Complete Inventory

**Date**: 2026-07-06
**Context**: All Claude Code settings, hooks, plugins, skills, and agents

## Global Config (`~/.claude/`)

### settings.json

- **Permissions**: `defaultMode: "auto"`
- **Worktree**: `baseRef: "fresh"`
- **Effort level**: `medium`
- **Editor mode**: `normal` (vim)
- **Theme**: `auto`
- **Env**: `ENABLE_TOOL_SEARCH: "true"`
- **Global plugins**: `gitkraken-hooks@gitkraken`
- **Extra marketplaces**: `gitkraken` (from `/home/timothy/.claude/plugins/marketplaces/gitkraken`)
- **MCP servers**: `repowise` (via direct venv path `/home/timothy/Documents/Arch-Mk2/tools/repowise/.venv/bin/repowise`)

### Global Hooks (10 scripts, 8 lifecycle events)

| Event              | Matcher                                           | Hook                              | Purpose                                 |
| ------------------ | ------------------------------------------------- | --------------------------------- | --------------------------------------- |
| `PreToolUse`       | `Grep\|Glob`                                      | `cbm-code-discovery-gate`         | Codebase memory discovery gate          |
| `PreToolUse`       | `Bash\|PowerShell`                                | `repowise-rewrite`                | Distills command output via Repowise    |
| `PreToolUse`       | `Read\|Grep\|Glob\|Bash\|Agent`                   | `trace-mcp-guard.sh`              | Guards tool calls for trace-mcp         |
| `SessionStart`     | `startup`                                         | `cbm-session-reminder`            | Session context reminder                |
| `SessionStart`     | `resume`                                          | `cbm-session-reminder`            | Resume context                          |
| `SessionStart`     | `clear`                                           | `cbm-session-reminder`            | Clear context                           |
| `SessionStart`     | `compact`                                         | `cbm-session-reminder`            | Compact context                         |
| `SessionStart`     | (any)                                             | `trace-mcp-session-start.sh`      | Trace session start                     |
| `PostToolUse`      | `Bash\|PowerShell\|Grep\|Glob\|Read\|Edit\|Write` | `repowise-augment`                | Augments file ops with codebase context |
| `PostToolUse`      | `Edit\|Write\|MultiEdit`                          | `trace-mcp-reindex.sh`            | Reindexes after edits                   |
| `PreCompact`       | (any)                                             | `trace-mcp-precompact.sh`         | Pre-compact trace                       |
| `WorktreeCreate`   | (any)                                             | `trace-mcp-worktree.sh`           | Trace worktree creation                 |
| `WorktreeRemove`   | (any)                                             | `trace-mcp-worktree.sh`           | Trace worktree removal                  |
| `UserPromptSubmit` | (any)                                             | `trace-mcp-user-prompt-submit.sh` | Trace user prompts                      |
| `Stop`             | (any)                                             | `trace-mcp-stop.sh`               | Trace stop events                       |
| `SessionEnd`       | (any)                                             | `trace-mcp-session-end.sh`        | Trace session end                       |

### Global MCP (`~/.claude/.mcp.json`)

- `codebase-memory-mcp`: `/home/timothy/.local/bin/codebase-memory-mcp`

### Global Skills (`~/.claude/skills/`)

- `codebase-memory/SKILL.md` — Documents 14 MCP tools for knowledge graph (index_repository, search_graph, trace_path, detect_changes, query_graph with Cypher, etc.)

### Global Plugins (`~/.claude/plugins/data/`)

- `context7-claude-plugins-official`
- `gitkraken-hooks-gitkraken`
- `playwright-claude-plugins-official`
- `security-guidance-claude-plugins-official`
- `typescript-lsp-claude-plugins-official`

### Plugin Marketplaces (`~/.claude/plugins/marketplaces/`)

- `claude-plugins-official`
- `gitkraken`
- `nx-claude-plugins`

---

## Project Config (`.claude/` in repo root)

### settings.json

- **Hooks** (4 lifecycle events, all Sense-based):
  - `PreCompact`: `sense hook pre-compact`
  - `PreToolUse` (matcher: `Grep|Glob|Agent|Bash`): `sense hook pre-tool-use`
  - `SessionStart`: `sense hook session-start`
  - `SubagentStart`: `sense hook subagent-start`
- **Permissions**: `allow: ["mcp__sense__*"]`
- **Enabled MCP servers**: `["repowise"]`
- **`enableAllProjectMcpServers`**: `true`
- **Enabled plugins** (7):
  1. `nx@nx-claude-plugins`
  2. `typescript-lsp@claude-plugins-official`
  3. `security-guidance@claude-plugins-official`
  4. `mcp-server-dev@claude-plugins-official`
  5. `commit-commands@claude-plugins-official`
  6. `playwright@claude-plugins-official`
  7. `context7@claude-plugins-official`

### settings.local.json

- **PostToolUse hook**: Runs Prettier on `.ts`, `.tsx`, `.md` files after Write/Edit
- **Extensive Bash permissions**: 70+ allowed Bash patterns from prior sessions

### Project Skills (`.claude/skills/`)

| Skill                  | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `sense-explore.md`     | Explore codebase with Sense (status, search, graph) |
| `sense-impact.md`      | Blast radius analysis before changes                |
| `sense-conventions.md` | Check project patterns before writing code          |

### Project Agents (`.claude/agents/`)

| Agent             | Purpose                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| `deep-explore.md` | Deep codebase exploration subagent using Sense tools. Model: inherit. Tools: Read, Bash |

---

## trace-mcp Installation

- **Binary**: `/home/timothy/.trace-mcp/bin/trace-mcp`
- **Data**: `~/.trace-mcp/` contains `decisions.db`, `topology.db`, daemon state, sessions, index
- **Purpose**: Agent tracing, debugging, and decision tracking across sessions
