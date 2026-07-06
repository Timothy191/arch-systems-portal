# Codebase Intelligence Systems — Complete Inventory

**Date**: 2026-07-06
**Context**: Repowise, Sense, Codebase Memory, and other intelligence indexes

## Repowise (`.agentic-tools-mcp/repowise/` + `.agentic-tools-mcp/repowise-workspace/` — symlinked at `.repowise` and `.repowise-workspace`)

### Single-Repo Data (`.agentic-tools-mcp/repowise/`)

| File                     | Purpose / Size                                    |
| ------------------------ | ------------------------------------------------- |
| `config.yaml`            | `distill.commands.enabled: true`                  |
| `mcp.json`               | Repowise MCP server config (1 server: `repowise`) |
| `knowledge-graph.json`   | Codebase knowledge graph (16MB)                   |
| `state.json`             | Index state tracking                              |
| `wiki.db`                | SQLite wiki database (134MB)                      |
| `wiki.db-shm` / `-wal`   | SQLite shared memory + WAL                        |
| `parse_cache.pkl`        | Parse cache (29MB)                                |
| `centrality_cache.pkl`   | Node centrality metrics (4MB)                     |
| `duplication_cache.pkl`  | Duplication detection cache (80MB)                |
| `duplication_pairs.pkl`  | Duplication pairs data (11MB)                     |
| `.augment-session.json`  | Session tracking (127 reads, many edits logged)   |
| `.env`                   | Repowise API key                                  |
| `omissions/omissions.db` | Omissions tracking database (28KB)                |
| `lancedb/`               | LanceDB vector embeddings (empty — fast mode)     |
| `jobs/`                  | Background job state                              |

### Index Stats (init completed 2026-07-06)

- **Files indexed**: 6,524 (6,857 scanned, 333 excluded)
- **Symbols extracted**: 30,969
- **Graph**: 44,360 nodes, 103,151 edges
- **Git history**: 559 files indexed, 4 hotspots
- **Dead code**: 172 unreachable files, 216 unused exports, ~11,049 deletable lines
- **Health findings**: 9,727 (avg 9.31/10, worst 5.15/10)
- **Decisions extracted**: 145 (136 code-comments, 9 ADR)
- **KG skeleton**: 14,172 nodes, 35,307 edges, 289 layers
- **Languages**: Python 27%, JSON 23%, TypeScript 22%, Markdown 12% +18 more
- **Init config**: opencode/big-pickle model via ollama, fast run mode, comprehensive wiki style, test run

### Cross-Repo Data (`.agentic-tools-mcp/repowise-workspace/`)

| File                    | Purpose                     |
| ----------------------- | --------------------------- |
| `cross_repo_edges.json` | Edges between repos         |
| `contracts.json`        | API contracts between repos |
| `system_graph.json`     | System-wide graph           |
| `breaking_changes.json` | Detected breaking changes   |
| `conformance.json`      | Conformance check results   |

### Workspace Config (`.repowise-workspace.yaml`)

- Version: 1
- Two repos indexed:
  1. `arch-mk2` (primary, path `.`) at commit `0a835a1`
  2. `repowise` (path `tools/repowise`) at commit `0a835a1`

### Update Command

```bash
./tools/repowise/.venv/bin/repowise update -w --index-only
```

---

## Sense (`.agentic-tools-mcp/sense/`, symlinked at `.sense/`)

| File           | Purpose                  |
| -------------- | ------------------------ |
| `index.db`     | SQLite index (23.9MB)    |
| `index.db-shm` | Shared memory (SQLite)   |
| `index.db-wal` | Write-ahead log (SQLite) |
| `index.lock`   | Lock file                |
| `summary.md`   | Index summary            |
| `warnings.log` | Indexing warnings        |

### Index Stats (from summary.md)

- **Files**: 3,966
- **Symbols**: 32,378
- **Edges**: 54,334
- **Languages**: Python, Go, TypeScript, TSX, JS, Ruby, Rust, C#, Java, and more

### Sense MCP Tools

| Tool                | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `sense_status`      | Index health check                          |
| `sense_search`      | Semantic/conceptual code search             |
| `sense_graph`       | Symbol relationships, callers, dependencies |
| `sense_blast`       | Blast radius / impact analysis              |
| `sense_conventions` | Project patterns and conventions            |

### Sense Hooks (in Claude Code project settings)

- `sense hook pre-compact` — Before context compaction
- `sense hook pre-tool-use` — Before Grep/Glob/Agent/Bash
- `sense hook session-start` — On session start
- `sense hook subagent-start` — When subagents launch

---

## Codebase Memory MCP (`~/.claude/skills/codebase-memory/`)

Knowledge graph backed by Neo4j. 14 tools:
| Tool | Purpose |
|------|---------|
| `index_repository` | Index the codebase into the graph |
| `search_graph` | Search the knowledge graph |
| `trace_path` | Trace dependency paths between symbols |
| `detect_changes` | Detect what changed since last index |
| `query_graph` | Raw Cypher query interface |

Edge types model: imports, calls, extends, implements, references.

---

## trace-mcp (`~/.trace-mcp/`)

| File            | Purpose                       |
| --------------- | ----------------------------- |
| `bin/trace-mcp` | Binary (agent tracing server) |
| `decisions.db`  | Decision tracking database    |
| `topology.db`   | Code topology database        |
| `daemon/`       | Daemon state                  |
| `sessions/`     | Session traces                |
| `index/`        | Index data                    |

### trace-mcp Tools (16 tools via routing table in `~/.claude/CLAUDE.md`)

`search`, `get_outline`, `get_symbol`, `get_change_impact`, `find_usages`, `get_type_hierarchy`, `self_audit`, `get_dead_code`, `get_dead_exports`, `get_feature_context`, `get_tests_for`, `get_untested_symbols`, `get_request_flow`, `get_model_context`, `get_component_tree`, `get_circular_imports`

---

## Memex (`tools/memex/`)

Temporal developer memory using Neo4j. MCP via `memex serve`.

- Neo4j at `bolt://localhost:7687` (user: `neo4j`, pass: `memex-local`)
- Uses Gemini API for semantic features

---

## Secrin (`tools/secrin/`)

Software wiki / security analysis engine. Python package with Next.js dashboard (`apps/web`).
