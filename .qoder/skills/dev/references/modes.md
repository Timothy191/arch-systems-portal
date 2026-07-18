# Dev Server Modes

## Start

```bash
# Full stack (default)
bash scripts/dev.sh

# Skip Docker bring-up (infra already running)
bash scripts/dev.sh --no-infra

# Portal only — no Docker
bash scripts/dev.sh --quick
```

Portal-only alternative (keepalive rule):

```bash
cd apps/portal && PORT=3000 pnpm exec next dev --turbopack --hostname 0.0.0.0
```

## Shutdown

```bash
bash scripts/shutdown.sh          # Portal only
bash scripts/shutdown.sh --infra  # Portal + Docker
```

## Runtime files

- PID: `.portal.pid` at repo root
- Logs: `portal.log` at repo root
- Default port: `3000` (`PORT=3001 bash scripts/dev.sh` to override)
