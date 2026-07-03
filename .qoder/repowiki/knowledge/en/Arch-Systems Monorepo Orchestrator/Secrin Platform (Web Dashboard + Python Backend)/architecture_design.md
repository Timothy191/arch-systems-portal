The repo is split into three cooperating layers bound by the top-level `pyproject.toml`:
- `apps/web/` — Next.js frontend that authenticates via GitHub through NextAuth and calls the backend REST API (`/api/*`) for project management, chat, and docgen status.
- `packages/` — installable Python packages (`cli`, `arc42gen`, `config`, `ingest`, `database`) registered as entry points (`secrin`, `arc42gen`, `migrate`, `server`, etc.) so the CLI and server share one dependency graph.
- `scripts/` — thin bootstraps: `server.py` loads `packages.config.settings.Settings` and starts uvicorn on `apps.api.main:app`; `arc42gen_api.py` / `arc42gen_worker.py` run the arc42 generation API and its RQ worker; `setup.py` drives interactive `.env` creation.

Cross-child wiring points:
- The web app talks to the backend exclusively over HTTP (Axios client in `apps/web/lib/api-client.ts`), never importing Python code.
- Both the FastAPI server and the arc42gen processes consume the same `packages.config.settings.Settings` model, so environment variables (`DATABASE_URL`, `GITHUB_*`, `NEO4J_*`, `ANTHROPIC_API_KEY`, etc.) are the single source of truth across all children.
- `scripts/server.py` is the only place uvicorn is started; it delegates to `apps.api.main:app`, keeping the FastAPI app object inside the `apps/` tree while the launcher lives under `scripts/`.
- `pyproject.toml`'s `[tool.poetry.scripts]` section is the canonical registry that exposes every child's entry point (`secrin`, `arc42gen`, `server`, `migrate`, `ingest`, `arc42gen-api`, `arc42gen-worker`) as a single installed command set.