---
name: run-portal
description: Launch and smoke-test the Arch Portal (Next.js frontend). Use when asked to run, start, or check the portal app.
---

Arch Portal is the main Next.js 16 operations dashboard. It runs on port 3000 and requires no Docker for basic dev.

## Prerequisites

- Node.js 22+ (Volta pins 24.15.0)
- pnpm 9.15.9

## Run (agent path)

Use the driver script to launch and smoke-test the portal:

```bash
node .qoder/skills/run-portal/driver.mjs
```

The driver starts `pnpm dev --quick`, waits for the server, then checks:

- `/` — homepage renders (200 + HTML)
- `/auth/login` — login page renders with form elements
- `/api/health` — API health endpoint returns 200

It cleans up the dev server on exit.

## Run (human path)

```bash
pnpm dev --quick
```

Then open http://localhost:3000. The homepage redirects to `/auth/login`.

For full stack with Supabase: `pnpm dev` (requires Docker).

## Gotchas

- `pnpm dev --quick` skips Docker — no Supabase, so data features won't work. Use `pnpm dev` for full functionality.
- The portal uses `proxy.ts` (Next.js 16 rename of `middleware.ts`), not `middleware.ts`.
- Playwright E2E tests are pinned to `/usr/bin/google-chrome` and `http://localhost:3000`.

## Troubleshooting

- **Port 3000 in use**: Kill the existing process or change the port in `apps/portal/package.json`.
- **Server won't start**: Check `apps/portal/.env` exists (copy from `.env.example` if missing).
