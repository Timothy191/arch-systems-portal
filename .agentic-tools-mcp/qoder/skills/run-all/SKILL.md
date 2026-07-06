---
name: run-all
description: Launch and smoke-test all Arch-Mk2 apps (portal, API, CMS, overview) with one command. Use when asked to run, start, check, or smoke-test the monorepo or any combination of apps.
---

Unified driver for the 4-app monorepo. Launches servers, waits for readiness, runs endpoint checks, and keeps servers alive for manual testing.

## Quick reference

```bash
# All 4 apps (auto-detects Docker, starts Supabase if needed)
node .qoder/skills/run-all/driver.mjs

# Specific apps
node .qoder/skills/run-all/driver.mjs --api --portal

# Lightweight (no Docker needed)
node .qoder/skills/run-all/driver.mjs --overview --portal

# Probe already-running servers without starting anything
node .qoder/skills/run-all/driver.mjs --check

# Skip Docker auto-start
node .qoder/skills/run-all/driver.mjs --no-docker --api
```

## App map

| App      | Port | Docker? | Key endpoints                                     |
| -------- | ---- | ------- | ------------------------------------------------- |
| Portal   | 3000 | No      | `/` (307→login), `/login` (200), `/api/health`    |
| API      | 3001 | Yes     | `/api/health/live`, `/api/docs`, `/api/health`    |
| Overview | 3002 | No      | `/` (200, static architecture visualizer)         |
| CMS      | 3003 | Yes     | `/` (404 ok), `/admin` (500 expected w/ Supabase) |

## Prerequisites

- Node.js 22+ (Volta pins 24.15.0)
- pnpm 9.15.9
- Docker (for API + CMS; portal + overview work without it)

## How the driver works

1. Parses flags to determine which apps to run.
2. Checks Docker is running if any selected app needs it.
3. Auto-starts Supabase if not already running.
4. Creates `apps/cms/.env` if missing (CMS needs `PAYLOAD_SECRET`).
5. Checks if ports are already occupied — reuses running servers.
6. Launches each app, waits for health endpoint.
7. Runs smoke checks per app.
8. Prints summary and keeps servers alive (Ctrl+C to stop).

## Individual app drivers

The original per-app drivers still exist and work independently:

```bash
node .qoder/skills/run-portal/driver.mjs
node .qoder/skills/run-api/driver.mjs
node .qoder/skills/run-cms/driver.mjs
node .qoder/skills/run-overview/driver.mjs
```

These are self-contained (launch, check, exit) — use them when you want a quick pass/fail without keeping servers alive.

## Gotchas

- **CMS `/admin` returns 500**: Expected with Supabase Postgres. PayloadCMS v3 uses parameterized queries (`$1`) that Supabase's PostgREST proxy doesn't support. The server IS running.
- **API `/api/health` returns 503**: Expected when SurrealDB or Ollama aren't running. Liveness (`/api/health/live`) always returns 200.
- **API startup hangs**: If Redis URL has bad credentials, the API never binds. Use `redis://localhost:6379` without auth for local dev. SurrealDB has a 5-second connect timeout.
- **Port conflicts**: The driver detects occupied ports and probes them. If a known app is already running, it reuses it. Unknown processes on the port cause that app to be skipped.
- **`--quick` mode**: Portal uses `pnpm dev --quick` which skips Docker. Use `pnpm dev` for full stack.

## Troubleshooting

- **Docker not running**: Start Docker, or use `--no-docker` to skip API/CMS.
- **Supabase won't start**: `cd packages/database && pnpx supabase start` manually.
- **Port in use**: `lsof -i :3001` to find the process, or the driver will skip that app.
- **CMS missing PAYLOAD_SECRET**: Driver auto-creates `.env`. If it exists but is broken, delete and re-run.
