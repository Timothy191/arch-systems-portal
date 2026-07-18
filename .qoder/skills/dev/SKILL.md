---
name: dev
description: >-
  Start the development server with Docker infrastructure and health checks.
  Use when portal is down or full stack dev is needed. Anti-trigger: do not use
  for deploy; do not replace portal keepalive curl check for quick UI verify.
---

# Start Dev Server

Docker infra (Redis + Postgres) + Next.js portal with HMR on `:3000`.

## Workflow

1. Check health: `scripts/check-health.sh`
2. If not running, start: `scripts/start.sh [flags]`
3. Stop when done: `scripts/shutdown.sh` (see [`references/modes.md`](references/modes.md))

## Scripts

| Script                    | Purpose                             |
| ------------------------- | ----------------------------------- |
| `scripts/check-health.sh` | Probe `:3000` health endpoint       |
| `scripts/start.sh`        | Run `scripts/dev.sh` from repo root |
| `scripts/shutdown.sh`     | Stop portal or portal + Docker      |

## References

- [`references/modes.md`](references/modes.md) — `--quick`, `--no-infra`, shutdown flags
