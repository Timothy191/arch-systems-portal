# Agent Tracer Log

This file maintains a record of AI agent interventions, context hand-offs, and architectural breadcrumbs for this specific package/app.

## [2026-07-04] Unified local dev wiring for the monorepo

- **Agent**: Claude Code
- **Purpose**: Wire the NestJS backend (`apps/api`) into the unified `pnpm dev` orchestration so it starts automatically alongside Supabase, Redis, and the portal.
- **Changes Made**:
  - `apps/api/.env.example`: changed default `PORT` from `3001` to `3004` to avoid clashing with the CMS dev server and the tools containers (Flowise on 3001, Langfuse on 3003).
  - `apps/portal/.env.example`, `apps/portal/.env`: added `API_BASE_URL` and `NEXT_PUBLIC_API_URL` pointing at `http://localhost:3004/api`.
  - `apps/portal/lib/env.ts`: added optional `API_BASE_URL` and `NEXT_PUBLIC_API_URL` to the Zod schema.
  - `apps/portal/app/api/backend/[[...slug]]/route.ts`: added a same-origin catch-all proxy that forwards `/api/backend/*` to the NestJS API, preserving method, headers, query string, and streaming request bodies.
  - `scripts/generate-api-env.mjs` (new): idempotently generates `apps/api/.env` from the portal env, filling in Supabase/Redis/Ollama keys and forcing `PORT`/`CORS_ORIGIN` to the orchestration defaults.
  - `scripts/dev.sh`: now starts Redis (if not already running), generates the API env, starts the NestJS API on `API_PORT` (default 3004), health-checks `/api/health/live`, and shuts the API down on exit.
- **Context**: Previously `apps/api` was not started by `pnpm dev` and its default port collided with the CMS. The new setup assigns the API a dedicated non-clashing port, seeds its environment from the local Supabase demo keys, and exposes it both directly and through the portal's `/api/backend/*` proxy.
- **Next Agent Notes**:
  - The API env is auto-generated; if you need a custom API port, set `API_PORT` before running `pnpm dev` rather than hand-editing `apps/api/.env`.
  - The portal proxy at `/api/backend/*` forwards cookies and `Authorization` headers, so API auth (via Supabase token/cookie) continues to work for browser clients.
  - If you add new required environment variables to the API, update `scripts/generate-api-env.mjs` so local dev stays one-command.
