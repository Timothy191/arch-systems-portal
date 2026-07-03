Single-adapter module that subclasses `anthropic.lib.tools._beta_builtin_memory_tool.BetaAsyncAbstractMemoryTool` to plug memex into Claude's built-in memory tool. Internal layering:

- `server.py` — core `MemexAsyncMemoryTool` implementing the six file CRUD ops (`view`, `create`, `str_replace`, `insert`, `delete`, `rename`). A `_route` helper classifies every path into one of three zones: `graph` (read-only `/memories/repos/<slug>/graph/**`), `scratch` (read-write `/memories/scratch/<session-id>/**`), or `root` (protected navigational roots). Graph-zone writes return a structured redirect string pointing at `record_decision`; scratch mutations delegate to `ScratchStore`.
- `projection.py` — `GraphProjection` wraps the live Neo4j graph as a virtual filesystem; it lazily pins a per-session snapshot on first `view` so all reads in a session are consistent.
- `scratch.py` — `ScratchStore` provides SQLite-backed per-session file I/O with line-numbered view formatting.
- `safety.py` — shared path-traversal validator mirroring the Anthropic reference impl (`..`, URL-encoded variants, backslashes rejected; raw paths must start with `/memories`).
- `http.py` — thin FastAPI shim exposing each method as a POST endpoint under `/memory/{op}` with Bearer-token auth persisted at `.memex/memory_tool.key`; used by non-Python SDK clients.
- `__init__.py` re-exports only `MemexAsyncMemoryTool` and `run_memory_tool_serve`.

Dependency direction is strictly inward: `http` → `server` → (`projection`, `scratch`, `safety`). The CLI entrypoint `run_memory_tool_serve` dispatches between stdio (idle readiness banner) and HTTP transports.