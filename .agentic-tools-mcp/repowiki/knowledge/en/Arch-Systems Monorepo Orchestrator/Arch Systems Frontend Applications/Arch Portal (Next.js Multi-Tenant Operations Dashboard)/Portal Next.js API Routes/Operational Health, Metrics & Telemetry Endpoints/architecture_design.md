Three sibling Next.js Route Handlers under `app/api/` each own one concern:

- `health/route.ts` performs a composite readiness check (DB via Supabase client, pooler presence, Redis connectivity, Ollama `/api/tags` with a 2s timeout) and returns a JSON status of `healthy` / `degraded` / `error` with HTTP 200 or 503.
- `health/live/route.ts` is a minimal liveness probe returning `{status:"ok"}`.
- `health/cache/route.ts` exposes cache hit-rate and Redis connectivity via `@repo/redis`.
- `metrics/route.ts` renders an OpenMetrics text response (`text/plain; version=0.0.4`) aggregating cache counters/gauges from `getCacheStats()` plus Inngest job and DB query counters from `getObservabilityMetrics()`.
- `telemetry/push/route.ts` is a POST webhook accepting either a Supabase Database Webhook payload for `machine_telemetry` rows or a direct `{name,value,department_id}` body; it deduplicates identical values using an in-memory L1 `Map` plus a Redis-backed L2 store keyed by `telemetry:last:<tag>` (24h TTL), then forwards changes to the FUXA SCADA server at `$NEXT_PUBLIC_FUXA_URL/api/tag` with optional `FUXA_API_KEY` bearer auth.

Dependency direction is inward: routes depend only on shared libs (`@repo/supabase/server`, `@repo/redis`, `@/lib/api/*`, `@/lib/observability/metrics`) and never on other route handlers. All routes opt out of caching via `export const dynamic = "force-dynamic"`. The telemetry handler composes middleware-like wrappers (`withBodyLimit`, `applyCors`, `validateBody`) around its core `handlePost` logic.
