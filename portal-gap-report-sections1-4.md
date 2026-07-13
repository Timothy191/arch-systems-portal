# Arch-Mk2 Portal — Gap Report (Checklist Sections 1–4)

Repo: `apps/portal` (Next.js 16.2.10 / React 19.2, App Router, `cacheComponents: true`)
Audit date: 2026-07-10 · Static + targeted-dynamic review (no full `pnpm build`).

Verdict legend: PASS / PARTIAL / FAIL / N/A

---

## Section 1 — Architecture & Component Design

- [PASS] **Server Components by default; "use client" only on leaf components** — `app/layout.tsx` and all `page.tsx`/`layout.tsx` under `app/` are server components (no `"use client"` at app/ root; `app/layout.tsx` has 0). All 51 `"use client"` directives sit on leaf components (forms, charts, widgets, providers) — see `app/(auth)/login/LoginForm.tsx:1`, `features/departments/components/control-room/AlertPanel.tsx:1`, `components/HeaderWidgets.tsx`.

- [PARTIAL] **Data fetching on server; no client-side `useEffect` fetches for initial page data** — Most data flows server-side via `"use cache: remote"` functions in `lib/data/*` (e.g. `operations.ts:8`). However at least one client component fetches initial data in `useEffect`: `AlertPanel.tsx:30-63` calls `createBrowserSupabaseClient()` + `.from("machines").select(...)` on mount (justified by the realtime `postgres_changes` channel it also opens, but it is still an initial client fetch). Same pattern likely in `ScadaPanel.tsx` / `ControlRoomActivityFeed.tsx` (both import `createBrowserSupabaseClient`). Recommendation: move the initial machine list into a server component / cached server function and let the client component only subscribe to realtime deltas.

- [PASS] **Streaming & Suspense with meaningful fallbacks** — Pervasive `<Suspense>` with skeleton fallbacks. `app/(departments)/production/page.tsx:136-214` wraps each slow panel; `app/layout.tsx:196-237` wraps `RouteAnnouncer`/`ViewportBoundaries`. Keep as-is.

- [PARTIAL] **No unnecessary deps in client bundle (no db drivers / heavy schemas)** — Good: no `@repo/database` and no `@repo/supabase/server` is ever imported into a client component (client code correctly uses `createBrowserSupabaseClient` from `@repo/supabase/client`). Concern: heavy libs (`@deck.gl/*`, `maplibre-gl`, `@univerjs/*`, `recharts`, `framer-motion`) ship to the client for their routes. They are mostly `dynamic()`-imported (e.g. `layout.tsx:15`, `production/page.tsx:8-94`, `SatelliteMonitoringDashboard`), but `@univerjs` (sheets) loads on the tools route. Recommendation: confirm via `ANALYZE=true next build` that these stay in route-level chunks; consider `ssr:false` + lazy mount for the Univer editor.

---

## Section 2 — Frontend Performance

- [PASS] **Fonts via `next/font` (display swap, subset); no external Google Fonts `<link>`** — `app/layout.tsx:56-67` loads `Inter` and `JetBrains_Mono` via `next/font/google` with `display:"swap"` and `subsets:["latin"]`; `Anurati` via `next/font/local` (`:50-54`). Search for `fonts.googleapis.com` / `fonts.gstatic.com` returned 0 hits. Good.

- [PARTIAL] **`next/image` for all local/remote images; width/height, `loading="lazy"`, proper `sizes`** — 10 `next/image` usages exist, but raw `<img>` is still used in: `components/RouteBackground.tsx:129` (auth bg poster), `app/global-error.tsx:24` (intentional boot-resilience error png — acceptable), `features/hub/components/TrustLogos.tsx:47` (partner logos). Recommendation: migrate `RouteBackground` poster and `TrustLogos` to `next/image` (with `width/height`/`sizes`); keep `global-error` raw for resilience. Verify `next/image` calls include explicit `sizes` (not all do).

- [PASS] **Code splitting: `dynamic()` for heavy components (modals, editors) with loading fallback** — Heavy widgets are `dynamic()` with fallbacks: `CommandBar`, `HeaderWidgets` (`layout.tsx:15-45`), `ScadaPanel`/`AlertPanel`/`SatelliteMonitoringDashboard`/`SafetyDashboard` (`production/page.tsx:8-94`). Good.

- [PASS] **CSS/JS minimization (Tailwind JIT purge)** — `tailwindcss@^3.4.17` (JIT purge on by default); `next.config.mjs:79` `experimental.inlineCss` in prod; `:50-54` `removeConsole` in prod; `:55` `reactStrictMode`. Next's default minification applies.

- [N/A] **LCP/CLS/INP green** — Not dynamically verified (no Lighthouse run). Config readiness is good: `webVitalsAttribution:["CLS","LCP","FCP","TTFB","INP"]` (`next.config.mjs:80`), `WebVitalsReporter` component, and `<Script type="speculationrules">` prerender (`layout.tsx:155-189`). Command to verify: `pnpm --filter portal build && pnpm --filter portal start` then run Lighthouse against `http://localhost:3000`.

- [PARTIAL] **Prefetching strategy: `<Link>` prefetch disabled/optimized on heavy routes** — Next `<Link>` default prefetch is active, and `layout.tsx:155-189` adds a `speculationrules` `prerender` block with `eagerness:"moderate"` over **all** department routes (`/drilling/*`, `/production/*`, `/control-room/*`, `/satellite-monitoring/*`, etc.). That is aggressive prerendering of the heaviest routes. Recommendation: set `prefetch={false}` on nav links to heavy dashboards, or lower speculation `eagerness` to `"conservative"`; verify no prefetch storms on the hub.

---

## Section 3 — Routing & Middleware

- [PARTIAL] **Thin middleware/proxy (Edge, no heavy imports)** — `proxy.ts` is the Next 16 auth proxy (correctly not `middleware.ts`). But it is not thin: it imports `@repo/redis/cache` and runs **inline DB + Redis lookups** — `resolveDeptUuid` does `supabase.from("departments").select(...)` (`proxy.ts:77-86`) and `resolveEmployee` does `supabase.from("employees").select("role, department_id, accessible_departments")` (`proxy.ts:157-168`), plus `cacheGet/cacheSet`. No `export const runtime = "edge"` is present, so it inherits the default (nodejs) runtime. Recommendation: confirm/declare runtime; consider moving the employee/dept resolution to a cached server util called from the proxy (already partly duplicated with `lib/employee.ts`) to keep the proxy a thin gate.

- [PASS] **Route handlers (`route.ts`) only where Server Actions can't apply** — Only two route handlers exist: `app/api/health/route.ts` (liveness) and `app/api/backend/[[...slug]]/route.ts` (CORS-aware proxy to NestJS with blocked-path guard, `:19-32`). Both are legitimately outside Server Actions' scope.

- [PASS] **No session-validation logic duplication (single source of truth)** — Auth gating lives in `proxy.ts`; downstream code reuses it via the `x-auth-employee-id` header read in `lib/employee.ts:14-15` (avoids a redundant DB hit). `getDepartmentContext` is the single cached resolver (`lib/dept-context.ts:16`, wrapped in `cache()`). Good separation.

- [N/A] **i18n without bundle bloat** — No i18n framework is used (searches for `next-intl`/`react-i18next`/`useTranslation` returned 0). The only `locale` usage is Univer's `en-US` sheets locale (`features/.../UniverSheet.tsx:11,30`). Not applicable.

---

## Section 4 — Data Fetching & Caching

- [PASS] **Next.js cache: `cacheLife`/`cacheTag` (ISR-style) / `no-store` where dynamic; `unstable_cache` equivalent** — `lib/data/operations.ts:8-15` uses `"use cache: remote"` + `cacheTag(...)` + `cacheLife({expire:300})`; mutations call `revalidateTag` (`app/actions.ts:5`) and `revalidatePath` (`access-control/actions.ts:5`). Dynamic routes opt in via dynamic data APIs (per `AGENT_TRACER.md:242`, `export const revalidate` is incompatible with `cacheComponents` and was removed intentionally). This is the correct Next 16 pattern.

- [PASS] **Deduped requests via React `cache()`** — `getDepartmentContext` is wrapped in `cache()` (`lib/dept-context.ts:16`), and the proxy caches employee/dept in Redis (`proxy.ts:153,73`). Per-request dedup is in place.

- [PARTIAL] **ISR for content pages with revalidation + on-demand revalidation via API route** — Revalidation is driven by Server Actions (`revalidateTag`/`revalidatePath` after writes), which is valid on-demand invalidation. However there is **no dedicated on-demand revalidation API route** (e.g. `/api/revalidate?tag=...&secret=...`) for external cache busting (webhooks, CMS). Recommendation: add a secret-gated `/api/revalidate` route handler if any non-action trigger (NestJS webhook, scheduler) needs to bust the `cacheTag`s in `lib/cache/tags.ts`.

- [PARTIAL] **No over-fetching (only needed fields; no nested client calls)** — Most queries select explicit columns (e.g. `access-control.ts:15-31` selects a scoped `badge:` relation). BUT count-only queries use `select("*", { count:"exact", head:true })` — fetching all columns just to count rows: `operations.ts:37` and `access-control.ts:64`. Recommendation: use `select("id", {count:"exact", head:true})` (or a DB count function) instead of `select("*")` for counts.

- [PARTIAL] **Pagination / cursor-based for list endpoints; no `SELECT *` with huge LIMIT** — List reads use `.order(...).limit(n)` with no cursor/range pagination. Example: `getAccessLogsForDepartment(deptId, limit=100)` (`access-control.ts:7,33-34`) and report queries (`.order("scanned_at", {ascending:false}).limit(limit)`). A default `limit=100` with `order` (offset-style) is acceptable for these volumes but is not cursor-based and will page poorly / over-scan at scale. Recommendation: adopt `.range(from,to)`/cursor keyset pagination for access logs and any unbounded list; cap `limit` lower by default.

---

## Top 3 Fixes

1. **Eliminate client-side initial `useEffect` fetches** (AlertPanel, ScadaPanel, ControlRoomActivityFeed) — fetch the base dataset on the server and let the client only subscribe to realtime deltas. (Sec 1)
2. **Stop shipping `select("*")` for count-only queries** (`operations.ts:37`, `access-control.ts:64`) and **add cursor/`range` pagination** to list endpoints (`access-control.ts:34`). (Sec 4)
3. **Thin out `proxy.ts` + tame prefetch** — move employee/dept resolution out of the per-request proxy path and set `prefetch={false}` / lower `speculationrules` eagerness on heavy dashboard routes. (Sec 3 & 2)

### Quick commands to dynamically verify

- Lint (passed for `proxy.ts`): `pnpm --filter portal exec eslint proxy.ts --max-warnings 0`
- Bundle analysis: `ANALYZE=true pnpm --filter portal build`
- Lighthouse: `pnpm --filter portal build && pnpm --filter portal start` → run Lighthouse vs `http://localhost:3000`
- Full lint gate: `pnpm --filter portal lint`
