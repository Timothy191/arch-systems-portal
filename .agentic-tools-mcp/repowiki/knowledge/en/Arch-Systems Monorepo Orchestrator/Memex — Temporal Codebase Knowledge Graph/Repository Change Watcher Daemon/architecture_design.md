The module is an asyncio-based event-driven pipeline orchestrated by `daemon.run_daemon`, which owns a shared `asyncio.Queue` and composes four producer/consumer components:

- Producers: `FSObserver` (watchdog-backed file watcher per repo) emits `FileChangeEvent`s; `CommitPoller` polls `.memex/pending_commit.json` written by git hooks (`git_hook.install_hooks` + `emit_commit_event`) and emits `CommitEvent`s.
- Router: `EventRouter` reads the queue, debounces `FileChangeEvent`s by path using per-path `asyncio.Task`s with a configurable window, and dispatches to registered async handlers.
- Handlers: `handlers.handle_file_change` runs symbol-diff extraction and writes CALLS/DECISION nodes via `memex.graph.writer`; `handle_lockfile_change` re-extracts dependency/import edges on lockfile mutations; `handle_commit` synthesizes decisions from commit diffs and corroborates existing ones against embeddings.
- Startup helpers: `registry.get_active_repositories` drives multi-repo mode; `initial_lockfile_index` seeds IMPORTS/Dependency edges once at boot so quiescent repos are queryable.

External boundaries: depends on `memex.config`, `memex.graph.*` (client, writer, decay), `memex.extractor.*` (treesitter, lockfile), and `memex.synthesizer.commit`; notifies the local server via HTTP POST to `/notify`. Health counters are recorded through `health.record` for status/doctor reporting. PID-file coalescing in `_write_pid` prevents duplicate daemons per repo or global registry dir.
