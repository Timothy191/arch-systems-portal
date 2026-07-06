---
name: run-overview
description: Launch and smoke-test the Arch Systems Overview (static architecture visualizer). Use when asked to run, start, or check the overview app.
---

Arch Systems Overview is a static Next.js app that visualizes the monorepo architecture, departments, tech stack, and database schema. Runs on port 3002. No external dependencies required.

## Prerequisites

- Node.js 22+ (Volta pins 24.15.0)
- pnpm 9.15.9

## Run (agent path)

Use the driver script to launch and smoke-test the overview:

```bash
node .qoder/skills/run-overview/driver.mjs
```

The driver starts `pnpm --filter arch-systems-overview dev`, waits for the server, then checks:

- `/` — homepage renders with the app title

It cleans up the dev server on exit.

## Run (human path)

```bash
pnpm --filter arch-systems-overview dev
```

Then open http://localhost:3002. The page loads a 4-tab architecture visualizer.

## Static build

The overview supports static export:

```bash
pnpm --filter arch-systems-overview build
```

Output goes to `apps/overview/dist/`. Deploy to any static host.

## Tabs

| Tab                  | Content                                                         |
| -------------------- | --------------------------------------------------------------- |
| System Architecture  | XYFlow diagram showing Login → Hub → Admin + 7 department nodes |
| Department Breakdown | Card grid of 7 departments with routes and required roles       |
| Tech Stack           | Technology categories + monorepo flow diagram                   |
| Database Schema      | PostgreSQL table cards with columns, PKs/FKs, and RLS summary   |

## Gotchas

- No environment variables needed — all data is hardcoded in `lib/data.ts`.
- Uses `@repo/theme` workspace package for Tailwind tokens.
- Static export is enabled (`output: 'export'` in next.config.mjs) — no API routes or server components at runtime.
- The `deploy.sh` script has stale port 3001 strings in echo messages; actual port is 3002 from package.json.

## Troubleshooting

- **Port 3002 in use**: Kill the process or change the port in `apps/overview/package.json`.
- **Blank page**: Check browser console. The app uses client-side React with lazy-loaded sections.
- **Missing theme styles**: Ensure `pnpm install` ran — `@repo/theme` is a workspace dependency.
