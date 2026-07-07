# Agentic Tools & MCP — Master Index

**Date**: 2026-07-06
**Context**: Complete inventory of all agentic tooling in the Arch-Mk2 monorepo

## Memory Files

| File                               | Contents                                                                                                                                                                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `000-architecture-overview.md`     | Core metrics, layer architecture, sub-systems, boundaries                                                                                                                                    |
| `001-project-structure.md`         | Root config, monorepo apps, packages, tools, documentation                                                                                                                                   |
| `002-tech-stack.md`                | Infrastructure, languages, key libraries                                                                                                                                                     |
| `003-key-functions-entrypoints.md` | App entry points, hotspots, decorators                                                                                                                                                       |
| `004-features-and-routes.md`       | System features, exposed routes                                                                                                                                                              |
| `005-mcp-servers.md`               | **14 MCP servers**: commands, config matrix, usage priority, security warning                                                                                                                |
| `006-dont-repeat.md`               | Systematic error log (empty, awaiting entries)                                                                                                                                               |
| `007-agent-directives.md`          | **6 directive files** (CLAUDE.md, AGENTS.md, GEMINI.md, copilot, cursor, workspace), **17 AGENT_TRACER.md** files, automation scripts                                                        |
| `008-claude-code-config.md`        | Global + project Claude Code: **16 hooks**, **8 plugins**, **3 skills**, **1 agent**, **2 MCP servers**, trace-mcp                                                                           |
| `009-qoder-config.md`              | **5 runner skills**, **11 built-in skills**, **100+ repowiki pages**, settings                                                                                                               |
| `010-editor-configs.md`            | VS Code (settings, extensions, 3 MCP configs), Cursor rules, **4 AI extensions** installed                                                                                                   |
| `011-codebase-intelligence.md`     | Repowise (6,524 files, 30,969 symbols, 44K nodes, 103K edges, 134MB wiki.db, 145 decisions), Sense (32K symbols, 54K edges), Codebase Memory (14 tools), trace-mcp (16 tools), Memex, Secrin |
| `012-mcp-config-locations.md`      | **11 config files** across repo + home, resolution order, consistency issues                                                                                                                 |
| `013-local-mcp-implementations.md` | **6 in-repo MCP servers** + **9 external** servers                                                                                                                                           |
| `014-master-index.md`              | This file — master index of all memory files, summary counts, security/consistency issues                                                                                                    |
| `015-centralization-migration.md`  | Centralization migration record — all data moved to `.agentic-tools-mcp/`, symlink table, updated directive files                                                                            |
| `033-mcp-config-copilot-instructions-fix.md` | Fixes for `.mcp.json`/VS Code MCP settings, `docker-compose.tools.yml`, root scripts, `.env.tools.example`, and refreshed `.github/copilot-instructions.md`                                |
| `recall_daemon.sh`                 | Claude Recall daemon management script                                                                                                                                                     |

## Summary Counts

| Category                      | Count                                                  |
| ----------------------------- | ------------------------------------------------------ |
| MCP servers (canonical)       | 14                                                     |
| MCP config files              | 11                                                     |
| Local MCP implementations     | 6                                                      |
| External MCP packages         | 9                                                      |
| Agent directive files         | 6                                                      |
| AGENT_TRACER.md files         | 17                                                     |
| Claude Code hooks (global)    | 16                                                     |
| Claude Code hooks (project)   | 4                                                      |
| Claude Code plugins           | 8 (7 project + 1 global)                               |
| Claude Code skills (project)  | 3                                                      |
| Claude Code agents (project)  | 1                                                      |
| Qoder skills (runner)         | 5                                                      |
| Qoder built-in skills         | 11+                                                    |
| Qoder repowiki pages          | 100+                                                   |
| Codebase intelligence systems | 5 (Repowise, Sense, Codebase Memory, trace-mcp, Memex) |
| VS Code AI extensions         | 4                                                      |
| Editor MCP configs            | 4 (VS Code native, Cline, Roo, Repowise)               |

## Security Issues Found

1. **GitHub PAT in plain text** in 3 config files (`.mcp.json`, `.vscode/cline_mcp_settings.json`, `.vscode/roo_mcp_settings.json`)
2. **n8n credentials in plain text** in same 3 files
3. **Redis password** accessible in `.env` files

## Consistency Issues Found

1. `.vscode/mcp.json` only defines 3 of 14 servers (repowise, trace-mcp, agentic-tools-mcp) — rewritten by `repowise init` with `"servers"` key format
2. Cline/Roo configs miss 2 servers (`agentic-tools`, `sequential-thinking`)
3. Key naming inconsistency: `codebase-memory` (Roo) vs `codebase-memory-mcp` (others)
4. `.vscode/mcp.json` uses `"servers"` key (VS Code native) while Cline/Roo use `"mcpServers"` key

## Centralization Symlinks

All agentic tooling data lives in `.agentic-tools-mcp/`. Symlinks preserve backward compatibility:

| Symlink                             | Target                                       |
| ----------------------------------- | -------------------------------------------- |
| `.qoder`                            | `.agentic-tools-mcp/qoder`                   |
| `.repowise`                         | `.agentic-tools-mcp/repowise`                |
| `.repowise-workspace`               | `.agentic-tools-mcp/repowise-workspace`      |
| `.repowise-workspace.yaml`          | `.agentic-tools-mcp/repowise-workspace.yaml` |
| `.sense`                            | `.agentic-tools-mcp/sense`                   |
| `.agents`                           | `.agentic-tools-mcp/agents`                  |
| `.cursor`                           | `.agentic-tools-mcp/cursor`                  |
| `.agentic-tools-mcp/qoder/repowiki` | `../repowiki` (relative)                     |
