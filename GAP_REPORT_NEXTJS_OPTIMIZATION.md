# Arch-Mk2 — Next.js Full-Stack Production Optimization Gap Report

_Audited against the 12-section Next.js Production Optimization Checklist._
_Method: parallel static source review (3 subagents, 4 sections each). Not dynamically
verified unless noted — see "Dynamic verification limits" at the end._

## Scoreboard

| Section   | Topic                           | PASS   | PARTIAL | FAIL  | N/A   |
| --------- | ------------------------------- | ------ | ------- | ----- | ----- |
| 1         | Architecture & Component Design | 2      | 2       | 0     | 0     |
| 2         | Frontend Performance            | 3      | 2       | 0     | 1     |
| 3         | Routing & Middleware            | 2      | 2       | 0     | 0     |
| 4         | Data Fetching & Caching         | 2      | 3       | 0     | 0     |
| 5         | Server Actions & Mutations      | 2      | 1       | 2     | 0     |
| 6         | Backend / API (Route Handlers)  | 2      | 1       | 0     | 1     |
| 7         | Database & External Services    | 3      | 2       | 0     | 0     |
| 8         | Security Hardening              | 3      | 1       | 0     | 1     |
| 9         | TypeScript & Code Quality       | 2      | 3       | 0     | 0     |
| 10        | Testing & Reliability           | 3      | 0       | 1     | 0     |
| 11        | Monitoring & Observability      | 1      | 2       | 1     | 0     |
| 12        | Build & Deployment              | 3      | 1       | 0     | 0     |
| **Total** |                                 | **28** | **20**  | **4** | **3** |

**4 hard FAILs:** client-side DB writes (§5.1), missing optimistic-update rollback (§5.4),
mock-based data-layer tests with no real DB (§10.3), no threshold alerting (§11.4).
One additional security gap that is effectively a FAIL: the Inngest endpoint is
unauthenticated (§7.5, no signing key).

---

## Section 1 — Architecture & Component Design

- [PASS] Server Components by default — RSC is the norm; `"use client"` added only to leaf interactive components.
- [PARTIAL] Data fetching on server; no client `useEffect` for initial page data — `features/departments/components/safety/AlertPanel.tsx` (et al.) fetch initial data client-side. Move to Server Components + realtime subscriptions only.
- [PASS] Streaming & Suspense — async components wrapped in `<Suspense>` with fallbacks.
- [PARTIAL] No unnecessary deps in client bundle — heavy libs mostly `dynamic()`-split, but some still reach the client. Audit bundle with `pnpm analyze`.

## Section 2 — Frontend Performance

- [PARTIAL] `next/image` — 3 raw `<img>` tags remain (local/remote). Replace with `next/image` + `width`/`height`/`sizes`.
- [PASS] Fonts via `next/font` — `display: swap`, subset; no external Google Fonts `<link>`.
- [PASS] Code splitting — `dynamic(import())` used for heavy components with loading fallback.
- [PASS] CSS/JS minimization — Tailwind JIT purge active.
- [N/A] LCP / CLS / INP green — not dynamically verified (no Lighthouse run). Run `pnpm lighthouse` / PageSpeed. Config readiness: WebVitalsReporter present.
- [PARTIAL] Prefetching strategy — aggressive `speculationrules` prerender across all heavy routes. Consider `prefetch={false}` on data-heavy links.

## Section 3 — Routing & Middleware

- [PARTIAL] Thin proxy/middleware — `apps/portal/proxy.ts` does inline Redis + DB lookups (no declared `runtime`). Keep it Edge-thin or offload lookups to a cached server util.
- [PASS] Route handlers used only where Server Actions can't apply — webhooks/health/proxy only; CORS + content-type set.
- [PASS] No session-validation duplication — single source of truth via `@repo/supabase` `getUserSafely`, reused everywhere.
- [N/A] i18n — not present in this codebase.

## Section 4 — Data Fetching & Caching

- [PASS] Next.js cache — `cacheLife`/`cacheTag` + `revalidateTag` used; `no-store` where dynamic.
- [PASS] Deduped requests — React `cache()` wraps DB calls.
- [PARTIAL] ISR + on-demand revalidation — `cacheLife` revalidation present, but no `/api/revalidate` route for on-demand. Add one gated by secret.
- [PARTIAL] No over-fetching — `select("*")` used for counts in places; request only `id` for counts.
- [PARTIAL] Pagination/cursor — `limit: 100` used without cursor/`range`; add cursor-based pagination on critical lists.

## Section 5 — Server Actions & Mutations

- [FAIL] No client-side direct DB calls — `features/departments/components/safety/SafetyIncidentForm.tsx:96` and `features/departments/components/control-room/DozerRollForm.tsx:132` do `supabase.from(...).insert(...)` from `"use client"`. Route through existing Server Action layer.
- [PARTIAL] Zod validation before mutation — API side is good (`common/schemas.ts` + `safeParse`); portal actions weak: `actions.ts:110` `reportData: any`, `:111,170` `any`, manual string checks at `:173-177`. Add Zod schemas, infer types, kill `any`.
- [PASS] Targeted revalidation — `revalidatePath`/`revalidateTag` always scoped; zero blanket `revalidatePath('/')`.
- [FAIL] Optimistic updates with rollback — no `useOptimistic`/rollback paths. Server Actions return `{success|error}` and callers await. Add rollback or document out-of-scope.
- [PASS] User-friendly errors, no leakage — `global-exception.filter.ts:60-66` omits stack from body; login action maps rate-limit vs invalid creds.

## Section 6 — Backend / API (Route Handlers)

- [N/A] Edge/Node runtime per endpoint — NestJS/Fastify service; not a Next-edge concept. Portal `route.ts` use default Node (acceptable).
- [PARTIAL] Rate limiting on public endpoints — `ThrottlerModule` (100/60s) global incl. `@Public()` routes (`app.module.ts:34-39`); but `DISABLE_RATE_LIMIT` env flag can disable portal limiting — confirm it's off in prod and internal `RateLimiter` is wired into the proxy path.
- [PASS] Auth + Authz on every protected route — `SupabaseAuthGuard` bound via `APP_GUARD`; rejects empty/whitespace tokens and service-role JWTs as sessions; `@Public()` only on intended endpoints.
- [PASS] CORS + OPTIONS — `main.ts:55-65` explicit origin list, credentials, `OPTIONS` included, `x-internal-secret` header.

## Section 7 — Database & External Services

- [PASS] Connection pooling — Supabase pooler + Kysely `pg` Pool (`max:10`) with pooled `DATABASE_URL` (`kysely.ts:92,97`); not 1:1 per request.
- [PASS] Parameterized queries — Supabase JS builder + Kysely; no string-concatenated SQL. (Caveat: can't prove every RPC body param-safe without reading each.)
- [PARTIAL] RLS present & user-scoped — RLS enabled on many tables (`015_shift_closeout.sql:28`, `025_machine_telemetry.sql:99`, ongoing hardening in `041_rls_performance_indexes.sql`) but not verified across all 65+ tables / all policies key off `auth.uid()`. Rec: CI assertion `ENABLE ROW LEVEL SECURITY` on every app table + positive/deny test per policy.
- [PASS] Redis caching — TTL via `setEx` (`cache.ts:169`); `getRedisClientSafe()` null → DB remains source of truth; non-blocking `SCAN`/`UNLINK` invalidation.
- [PARTIAL] Inngest idempotent & signed — `sync-playback` idempotent via `idempotency_key` (`inngest.service.ts:84-87,123-156`) but `InngestController` is `@Public()` (`inngest.controller.ts:21`) with **no signing key** (`inngest.ts:6-8`, `config.toml:113` commented). **Effectively a security gap (treat as FAIL):** set `INNGEST_SIGNING_KEY` and verify signatures in prod; declare per-function `retries`/`onFailure`.

## Section 8 — Security Hardening

- [PASS] Env vars in `.env.example` + validated at startup — Zod (`lib/env.ts:23-129`) fails fast in prod; rejects localhost URL/dummy anon key.
- [PASS] Secrets never exposed — server-only vars never bundled; only `NEXT_PUBLIC_*` public; service-role key stays server-side.
- [PASS] CSP headers — `next.config.mjs:137-171` real CSP in prod, report-only in dev; plus HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- [PARTIAL] CSRF for cookie sessions — cookies `httpOnly` + `sameSite: "lax"`; Server Actions carry built-in origin protection. No explicit double-submit token. Keep SameSite + framework protection; add test that `/api/backend` proxy preserves posture.
- [N/A] Dependencies audited (`pnpm audit`) — not run. Static signal: `next.config.mjs:3-4` disables `next-pwa` due to transitive advisory. Rec: `pnpm audit --recursive` gated in CI; re-enable PWA once `workbox-build >= 7.4.0`.

## Section 9 — TypeScript & Code Quality

- [PASS] Strict mode — `packages/typescript-config/base.json:17` `strict:true` + `noUncheckedIndexedAccess`. All extend it.
- [PARTIAL] Zero `any` — 141 `any` matches across ~40 files (some in tests, acceptable, but service code too: `webhooks.service.ts`, `packages/utils/src/n8n.ts`, `exports.service.ts`). Escape hatch `SKIP_TYPE_CHECK=true` → `ignoreBuildErrors`. Rec: `no-explicit-any` as error outside tests; use `unknown` + guards.
- [PASS] Shared types client/server — `packages/supabase/src/database.types.ts`, exported Zod schemas, `@repo/errors`.
- [PARTIAL] ESLint & Prettier passing — wired (`pnpm lint`, `format:check`, `quality`), boundary rules generated; not run here. Rec: `pnpm lint && pnpm format:check`.
- [PARTIAL] No dead code (knip) — configured + CI-gated, but all rules `"warn"` (won't fail) and a sizeable `ignore` list masks real files. Rec: promote key rules to `error`, shrink ignore list.

## Section 10 — Testing & Reliability

- [PASS] E2E (Playwright) — 8 specs covering login/auth/navigation/data-entry; CI runs unauth + auth suites. (Chromium-only.)
- [PASS] Unit tests for handlers/validation — Jest specs across `apps/api` + packages; portal data-layer tests.
- [FAIL] DB queries tested against real test DB — `apps/portal/lib/data/__tests__/drilling.test.ts:9,22-35` mock `@repo/supabase/service-role` entirely. No seeded integration. Rec: add integration tests vs local Supabase/Postgres for high-value queries; keep mocks unit-only.
- [PASS] Visual regression — `e2e/visual/*`, `maxDiffPixelRatio:0.02`.

## Section 11 — Monitoring & Observability

- [PARTIAL] Sentry + source maps — initialized client/server + API 5xx logging; upload configured (`next.config.mjs:243-251`) but only with `enableHeavyPlugins` and needs `SENTRY_AUTH_TOKEN` (commented in `.env.example`; `deploy.yml` doesn't set it). Rec: provision token or maps silently skip.
- [PARTIAL] Performance monitoring / RUM — `WebVitalsReporter.tsx` stamps `data-*`/sessionStorage (no backend beacon); Sentry `tracesSampleRate`; Prometheus scrapes `/api/metrics`. No Speed Insights / real RUM aggregation. Rec: POST web-vitals or add Speed Insights.
- [PASS] Structured JSON logs, no PII — `lib/errors/error-logger.ts`, Sentry `beforeSend` filters secrets, API filter never returns stack.
- [FAIL] Alerts for 5xx / latency / job failure — Prometheus has **no `rule_files` / Alertmanager**; no `alert*.yml` in repo. Only reactive in-app `SERVER_CRASH` event. Rec: add Prometheus alert rules (5xx rate, p95 latency, job-failure) + Alertmanager, or Sentry alert rules.

## Section 12 — Build & Deployment

- [PARTIAL] Build clean + bundle control — analyzer wired, Lighthouse CI asserts unused/unminified JS; **build not run here**, and `SKIP_TYPE_CHECK` escape hatch exists; Lighthouse perf assertions are `warn` (non-blocking). Rec: `pnpm build` + `pnpm analyze`; add a bundle-size regression gate.
- [PASS] ISR/SSR fallback loading states — 18 `loading.tsx` across route segments; `cacheComponents:true`. No blank-page gaps.
- [PASS] Env-specific config + feature flags — per-env examples, zod validation, env-gated behavior, staging/prod/preview deploy targets, env-var flags.
- [PASS] CI/CD lint→type-check→test→build→deploy — `ci.yml` + `quality-gate.yml` + `deploy.yml` (gates both on `needs: quality-gate`, health checks). **Caveat:** test steps pipe to `tail -N` (e.g. `quality-gate.yml:84,146`) — nonzero exits can be masked; Lighthouse perf is `warn`. Rec: add `set -o pipefail` / drop the pipe.

---

## Consolidated Top Fixes (priority order)

1. **Close the client-side DB writes (§5.1) — correctness + security.** `SafetyIncidentForm.tsx:96` and `DozerRollForm.tsx:132` write to Supabase directly from the browser, bypassing server validation/authz. Route both through Server Actions.
2. **Secure the Inngest endpoint (§7.5) — security.** `/api/inngest` is `@Public()` with no signing key; external actors could trigger jobs. Set `INNGEST_SIGNING_KEY`, verify signatures, declare `retries`/`onFailure`.
3. **Add real alerting (§11.4).** No Prometheus rules/Alertmanager or Sentry alerts exist. Add 5xx-rate, p95-latency, and failed-job alerts so incidents are paged, not just logged.
4. **Add seeded integration tests for the data layer (§10.3).** Data-layer tests fully mock Supabase; high-value queries need a real test DB.
5. **Tighten gates that currently can't fail:** `no-explicit-any` + knip → error (§9.2/9.5), shrink knip ignore list, `set -o pipefail` in CI test steps (§12.4), kill `SKIP_TYPE_CHECK` escape hatch, provision `SENTRY_AUTH_TOKEN` (§11.1), and `pnpm audit --recursive` in CI (§8.5).

---

## Dynamic verification limits

The four FAILs and most PARTIALs are from **static source review only**. The following were
NOT executed (no build/network environment in the audit subagents): `pnpm lint`,
`pnpm type-check`, `pnpm build`, `pnpm analyze`, Lighthouse/PageSpeed, `pnpm audit`,
Inngest signature replay, live RLS enforcement, and the real-DB test run.

**Run to confirm the dynamic items:**

```
pnpm quality                       # lint + type-check + test + build + format
pnpm lint && pnpm format:check
pnpm --filter portal build && pnpm --filter portal analyze
pnpm audit --recursive
pnpm lighthouse                    # or Vercel Speed Insights in CI
./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only
```

Run `pnpm quality` locally to turn the "not dynamically verified" PARTIALs into firm PASS/FAIL.
