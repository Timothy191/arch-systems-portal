---
name: run-cms
description: Launch and smoke-test the Arch CMS (PayloadCMS v3 admin panel). Use when asked to run, start, or check the CMS app.
---

Arch CMS is a PayloadCMS v3 instance on Next.js 16. It provides content management for departments, documents, and users. Runs on port 3003.

## Prerequisites

- Node.js 22+ (Volta pins 24.15.0)
- pnpm 9.15.9
- PostgreSQL (via Supabase Docker stack or external)
- `apps/cms/.env` with `PAYLOAD_SECRET` and `DATABASE_URL`

## Setup

Create `apps/cms/.env` if it doesn't exist:

```env
PAYLOAD_SECRET=<random-32-char-string>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
PORT=3003
```

Start Supabase for local Postgres: `pnpm supabase start` (from `packages/database/` or root `pnpm dev`).

Seed the admin user (optional): `cd apps/cms && npx tsx scripts/setup.ts`

- Creates admin: `admin@plantcor.com` / `Admin@123#`
- Seeds departments: drilling, production, control-room

## Run (agent path)

Use the driver script to launch and smoke-test the CMS:

```bash
node .qoder/skills/run-cms/driver.mjs
```

The driver starts `pnpm --filter cms dev` with `PORT=3003`, waits for the server, then checks:

- `/` — root responds (404 expected — no route at root)
- `/admin` — Payload admin panel (500 expected with Supabase Postgres due to parameterized query incompatibility)

It cleans up the dev server on exit. PayloadCMS can be slow on first boot (120s timeout).

## Run (human path)

```bash
PORT=3003 pnpm --filter cms dev
```

Then open http://localhost:3003/admin for the admin panel.

## Collections

| Collection    | Fields                                                                                  | Notes        |
| ------------- | --------------------------------------------------------------------------------------- | ------------ |
| `users`       | email, password                                                                         | Auth-enabled |
| `departments` | name (unique), displayName, description                                                 |              |
| `documents`   | title, department (rel), content (Lexical rich text), status (draft/published/archived) |              |

## REST API

Payload auto-generates REST endpoints at `/api/<collection>`:

- `GET /api/departments` — list departments
- `GET /api/documents` — list documents
- `POST /api/users` — create user (requires admin auth)

## Gotchas

- PayloadCMS first boot is slow — it generates types and syncs the DB schema.
- No `.env.example` exists in `apps/cms/` — you must create `.env` manually.
- The `withPayload()` wrapper in `next.config.mjs` is required — don't remove it.
- Port 3003 is the default for CMS to avoid collision with the API (port 3001). The driver overrides PORT automatically.
- `scripts/dev.sh` handles port assignment automatically.

## Troubleshooting

- **PAYLOAD_SECRET is required**: Set it in `.env`. Any random 32+ char string works.
- **Database connection refused**: Ensure Postgres is running. Default local URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- **"there is no parameter $1" errors**: PayloadCMS v3's postgres adapter has a known incompatibility with Supabase's Postgres pooler. Use a direct Postgres connection (port 54322) or a standalone Postgres instance.
- **Admin panel blank**: Check browser console for JS errors. Payload may need type generation: `cd apps/cms && pnpm payload generate:types`.
- **Port 3003 in use**: Another service is on it. Change PORT in `.env` or kill the other process.
