# 018 — Unified Run/Smoke Driver Consolidation

**Date:** 2026-07-06
**Context:** Consolidated 4 individual run/smoke drivers into one adaptive unified command.

## What was done

Created `.qoder/skills/run-all/` with:

- `driver.mjs` — single entry point that launches any combination of the 4 monorepo apps
- `SKILL.md` — agent-facing documentation with quick reference and app map

## Architecture

The driver uses an **app registry pattern**: each app is a config object with port, command, env, timeout, Docker requirement, and check definitions. Adding a new app = adding one object to the `APPS` registry.

### Key features

- **CLI flags**: `--all`, `--portal`, `--api`, `--cms`, `--overview`, `--check`, `--no-docker`, `--serial`, `--timeout`
- **Adaptive environment detection**: Docker availability, Supabase status, port conflict resolution
- **Auto-setup**: Supabase stack start, CMS `.env` generation with random `PAYLOAD_SECRET`
- **Port reuse**: Detects occupied ports and reuses running servers instead of failing
- **Check mode**: `--check` probes already-running servers without launching anything
- **Server lifecycle**: Spawn with detached process groups, cleanup on exit/SIGINT/SIGTERM

## App map

| App      | Port | Docker? | Key endpoints                                     |
| -------- | ---- | ------- | ------------------------------------------------- |
| Portal   | 3000 | No      | `/` (307→login), `/login` (200), `/api/health`    |
| API      | 3001 | Yes     | `/api/health/live`, `/api/docs`, `/api/health`    |
| Overview | 3002 | No      | `/` (200, static architecture visualizer)         |
| CMS      | 3003 | Yes     | `/` (404 ok), `/admin` (500 expected w/ Supabase) |

## Verification results

All test modes passed:

- `--help` → correct output
- `--check` → correctly probes running servers (detects nothing running)
- `--overview` → launches and passes (1/1 PASS)
- `--portal --overview` → launches both, passes (4/4 PASS)
- `--cms` → launches and passes (2/2 PASS — root 404, admin 500 both expected)
- `--all` → all 4 servers launch, Portal 3/3, API 3/3, CMS 2/2, Overview 1/1

## Known issues

- **CMS `/admin` returns 500**: PayloadCMS v3 uses parameterized queries (`$1`) that Supabase's PostgREST proxy doesn't support. Server IS running.
- **API `/api/health` returns 503**: Expected when SurrealDB or Ollama aren't running. Liveness (`/api/health/live`) always returns 200.
- **CMS stderr spam**: The `$1` parameterized query errors repeat many times. Driver filters stderr for lines containing "Error" or "error".

## Individual drivers still exist

The original per-app drivers remain functional:

```
.qoder/skills/run-portal/driver.mjs
.qoder/skills/run-api/driver.mjs
.qoder/skills/run-cms/driver.mjs
.qoder/skills/run-overview/driver.mjs
```

These are self-contained (launch, check, exit) — useful for quick pass/fail without keeping servers alive.
