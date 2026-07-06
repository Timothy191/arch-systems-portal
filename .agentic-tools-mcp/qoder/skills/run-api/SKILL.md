---
name: run-api
description: Launch and smoke-test the Arch API (NestJS + Fastify backend). Use when asked to run, start, or check the API server.
---

Arch API is the NestJS backend running on Fastify. It serves the portal, CMS, and hardware scanners. Default port 3001.

## Prerequisites

- Node.js 22+ (Volta pins 24.15.0)
- pnpm 9.15.9
- **Docker running** (Supabase + Redis required — the API crashes on boot without Redis)
- `apps/api/.env` with valid `REDIS_URL` and `SUPABASE_URL`

The driver auto-starts Supabase if not running, but Redis must be accessible at the URL in `.env`.

**Redis URL**: Use `redis://localhost:6379` if your local Redis doesn't require auth. If it does, URL-encode special characters in the password (`@` → `%40`, `#` → `%23`).

## Run (agent path)

Use the driver script to launch and smoke-test the API:

```bash
node .qoder/skills/run-api/driver.mjs
```

The driver starts `pnpm --filter api dev` with `PORT=3001`, waits for the server, then checks:

- `/api/health/live` — liveness probe returns `{ status: "ok" }`
- `/api/docs` — Swagger UI serves in dev mode
- `/api/health` — full health check (200 when all deps healthy, 503 without SurrealDB/Ollama)

It cleans up the dev server on exit.

## Run (human path)

```bash
pnpm --filter api dev
```

Then open http://localhost:3001/api/docs for Swagger UI.

For full stack with Supabase + Redis: `pnpm dev` (requires Docker).

## Endpoints

| Method | Path                  | Auth   | Notes                                     |
| ------ | --------------------- | ------ | ----------------------------------------- |
| GET    | `/api/health/live`    | Public | Liveness probe, always `{ status: "ok" }` |
| GET    | `/api/health`         | Public | Full check: Supabase + Redis + Ollama     |
| GET    | `/api/health/cache`   | Public | Redis-only health                         |
| GET    | `/api/docs`           | Public | Swagger UI (dev only)                     |
| POST   | `/api/auth/login`     | Public | Email/password login                      |
| POST   | `/api/csp-violations` | Public | CSP reports (204)                         |

All other routes require `Authorization: Bearer <jwt>` from Supabase auth.

## Gotchas

- Port defaults to 3001 but `scripts/dev.sh` overrides to 3004 to avoid collision with CMS.
- Global prefix `/api` — all routes are under it.
- `ValidationPipe` uses `forbidNonWhitelisted: true` — unknown fields in request bodies get rejected.
- Rate limit: 100 req / 60s per IP via `@nestjs/throttler`.
- CORS allows `x-internal-secret` header for internal service calls.
- Without Redis, the API crashes on boot. Without Supabase, auth endpoints fail but the server boots.
- **Redis credentials must be valid**: If the `REDIS_URL` in `.env` has wrong credentials, the API hangs during startup (stuck in retry loop, never binds to port). Test with `redis-cli` or a simple Node.js script. If Redis doesn't require auth, use `redis://localhost:6379` without credentials.
- **Startup can hang**: If the API compiles but never logs "Listening on port...", check that Redis and Supabase are both accessible. The NestJS bootstrap waits for all module initializers — a hung connection blocks the entire server. SurrealDB has a 5-second connect timeout so it fails fast when not running.
- **`/api/health` returns 503**: This is expected when SurrealDB or Ollama aren't running. The liveness probe (`/api/health/live`) always returns 200. Use `/api/health/cache` for Redis-only checks.

## Troubleshooting

- **Port 3001 in use**: Kill the process or set `PORT=3004`.
- **Module init errors**: Check `.env` has valid `SUPABASE_URL` and `REDIS_URL`. Copy from `.env.example`.
- **Swagger not loading**: Ensure `NODE_ENV` is not set to `production`.
