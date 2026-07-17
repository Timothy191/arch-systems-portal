---
name: dev
description: Start the development server with Docker infrastructure and health checks
---

# Start Dev Server

Start the full development environment: Docker infrastructure (Redis + Postgres) + Next.js portal with HMR.

## Steps

1. Check if the dev server is already running:
   ```bash
   curl -fs http://localhost:3000/api/health 2>/dev/null && echo "Already running" || echo "Not running"
   ```

2. If not running, start with the dev script:
   ```bash
   bash scripts/dev.sh
   ```
   This handles:
   - Docker Compose (Redis on :6379, Postgres on :5432)
   - Next.js dev server with Turbopack on :3000
   - 4-phase health check (env, infra, portal, smoke tests)
   - Opens browser to http://localhost:3000/login

3. Alternative modes:
   - Skip Docker (assume infra is up): `bash scripts/dev.sh --no-infra`
   - Portal only (skip Docker entirely): `bash scripts/dev.sh --quick`

4. To stop the dev server:
   ```bash
   bash scripts/shutdown.sh          # Stop portal only
   bash scripts/shutdown.sh --infra  # Stop portal + Docker
   ```

## Notes

- The dev script runs in the foreground with a spinner and health checks.
- Portal PID is tracked in `.portal.pid` at repo root.
- Logs go to `portal.log` at repo root.
- Default port is 3000 (override with `PORT=3001 bash scripts/dev.sh`).
