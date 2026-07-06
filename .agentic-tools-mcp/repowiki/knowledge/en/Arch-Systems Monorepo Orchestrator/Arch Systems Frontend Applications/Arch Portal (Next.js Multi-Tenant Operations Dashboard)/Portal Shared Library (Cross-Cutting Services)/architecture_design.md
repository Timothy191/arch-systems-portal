All children in this scope are server-only modules consumed by the Next.js pages/routes; they share four cross-cutting contracts defined at the top level:

- `env.ts` — single Zod-validated, lazily-parsed `process.env` singleton (`@/lib/env`) that every child imports instead of reading `process.env` directly.
- `errors/` — `AppError` hierarchy + Sentry-backed structured logger used uniformly by API routes, jobs, and domain services.
- `server-cache.ts` / `cache-utils.ts` — Redis-backed cache wrappers with Next.js RSC awareness, reused by dashboard-service, shift-closeout, and monitoring-api.
- `audit.ts` — server-side audit logger invoked from department, employee, and job handlers.

Cross-child wiring points: `tools.ts` is the only place that enumerates external tool URLs (N8N, Flowise) and reuses `PRODUCTIVITY_TOOLS` from `departments`; `ai/` depends on `jobs/` to persist memory events, while `jobs/` depends on `api_clients/` for weather/satellite data and on `domain_services/` for DB writes; `plugins/` orchestrates runtime hooks/widgets but does not call into `ai/` or `jobs/`, keeping the plugin surface orthogonal to the AI pipeline.
