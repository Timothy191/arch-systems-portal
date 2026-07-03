Single Go module (`github.com/luuuc/sense`) built from `cmd/sense/main.go`, which dispatches subcommands into layered internal packages:
- `internal/cli` — human-facing CLI runners (`RunScan`, `RunGraph`, `RunBlast`, …) sharing the same JSON contract as the MCP server via `internal/mcpio`.
- `internal/mcpserver` + `internal/mcpio` — stdio-based MCP server (protocol `mark3labs/mcp-go`) exposing four tools (`sense_graph`, `sense_search`, `sense_blast`, `sense_conventions`); `mcpio` holds the shared request/response types so CLI and server are byte-for-byte compatible.
- `internal/scan` — tree-sitter parsing pipeline per language under `internal/extract/{go,python,ruby,rust,tsjs,cpp,...}` plus framework-specific edge inference (Rails associations, Django models, React JSX calls).
- `internal/sqlite` — single-writer SQLite index at `.sense/index.db` with FTS5 full-text and an embedded ONNX bi-encoder for vector search; schema lives in `schema.sql` / `schema_fts.sql`.
- `internal/search` — hybrid retrieval: vector (ONNX) → fusion/ranking → text fallback (ripgrep via `modernc.org/sqlite`).
- `internal/blast` — dependency-graph traversal over the SQLite edges producing affected-code/test sets and risk scores.
- `internal/conventions` — pattern detectors per language/framework that power the conventions tool.
- `internal/dead` — dead-code analysis using language-specific executors (cargo, staticcheck, pytest) gated behind `eval/`.
- `internal/freshen` + `internal/watch` — debounced fs watcher (`fsnotify`) that re-indexes changed files off the request path; single-process lock prevents double-indexing.
- `internal/hook` — Claude Code lifecycle hooks (pre-tool-use, pre-compact, session-start) invoked by `sense hook`.
- `internal/embed` — bundled quantized ONNX model + tokenizer, CGO-compiled per-OS via build tags (`ortlib_darwin_amd64.go`, etc.).
- `internal/setup` — auto-detects Claude Code / Cursor / Codex / OpenCode and writes their MCP configs and CLAUDE.md routing docs.

Dependency direction is strictly inward: `cmd` → `cli` → `mcpserver`/`scan`/`dead`/`conventions` → `sqlite`/`search`/`embed`; no package imports its sibling's test helpers. The `bench/` directory is a separate benchmark harness (Python + shell) that runs Sense against real repos and publishes results under `bench/results/`.