This leaf module is a collection of thin `main()` entry scripts registered as Poetry console scripts in `pyproject.toml` (`[tool.poetry.scripts]`). Each script delegates to the real implementation inside sibling packages:

- `server.py` → `apps.api.main:app` via uvicorn, with host/port/log-reload pulled from `packages.config.settings.Settings`.
- `arc42gen_api.py` → `packages.arc42gen.api:app` on port 8001 (hardcoded).
- `arc42gen_worker.py` → RQ `SimpleWorker` against Redis (`settings.REDIS_URL`) using `SimpleWorker` instead of `Worker` to avoid macOS ObjC fork crashes.
- `setup.py` → interactive `.env` wizard that calls `packages.config.utils.validate_required_settings`, writes back grouped settings, and optionally tests a Neo4j connection via `packages.database.graph.graph.Neo4jClient`.
  The dependency direction is one-way: these scripts import from `packages.*` and `apps.*`; nothing in those packages imports back into `scripts/`. The scripts themselves are intentionally stateless bootstrappers — they configure logging, load `Settings`, then hand control to the package's ASGI app or worker loop.
