# 🚀 Migration / Hardening Plan: Arch-Mk2 Next.js 16+ Production Optimization

**Goal:** Close the gaps identified in `GAP_REPORT_NEXTJS_OPTIMIZATION.md` and reach zero FAILs, following the project's established principles: zero `any`, no mocks in the data layer, security-first, server-side mutations only.

> ⚠️ **Repository Context (read this first)**
> Arch-Mk2 is **already** a Next.js 16 App Router + React 19 codebase (Turborepo monorepo). There is no Pages Router to migrate.
>
> - `apps/portal` — Next.js 16 App Router frontend (RSC + Server Actions). Auth proxy is `apps/portal/proxy.ts` (Next 16), **not** `middleware.ts`.
> - `apps/api` — NestJS 11 (Fastify) backend. Inngest is served here via `apps/api/src/jobs/inngest.controller.ts` (a Nest route, not a Next Route Handler).
> - `apps/ai-agents` — FastAPI microservice.
> - `packages/*` — shared `@repo/supabase` (data access — apps MUST use this, never `@repo/database`), `@repo/redis` (L1 memory + L2 Redis cache, already implemented), `@repo/rate-limiter`, `@repo/errors`.
>
> Therefore the **Pages-Router migration phases of the original plan (Phases 1–3, and Phase 9.1 "delete `pages/`") are N/A here** — they describe a different, pre-App-Router project. What follows keeps the original plan's _gap-remediation_ structure (Phases 4–8) which maps directly onto the audit's open FAILs, and corrects the security steps that were wrong for this codebase.

---

## 📋 Current Audit Status (from `GAP_REPORT_NEXTJS_OPTIMIZATION.md`)

| #       | Gap                                                                       | Status                                                                                                                      |
| ------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| FAIL #1 | Client-side DB writes (`SafetyIncidentForm`, `DozerRollForm`)             | ✅ FIXED — Server Actions + Zod in `apps/portal/app/actions.ts`; forms rewritten to call them                               |
| FAIL #2 | Inngest endpoint accepts unsigned requests (`@Public()` + no signing key) | ✅ FIXED — `INNGEST_SIGNING_KEY` wired into `packages/utils/src/inngest.ts`; `@Public()` **kept** (required, see Phase 6.3) |
| FAIL #3 | No optimistic-update rollback on mutations                                | 🔲 OPEN                                                                                                                     |
| FAIL #4 | Mock-based data-layer tests (`drilling.test.ts`)                          | 🔲 OPEN                                                                                                                     |
| FAIL #5 | No Prometheus alerting (5xx / latency / failed jobs)                      | 🔲 OPEN                                                                                                                     |

28 PASS / 20 PARTIAL / 4 FAIL / 3 N/A originally. FAIL #1 and FAIL #2 are now resolved.

---

## 🗂️ Target Structure (already largely in place)

The monorepo already matches the intended architecture. Relevant new/changed files for the remaining work:

```
apps/portal/
├── app/actions.ts                 # Server Actions (FAIL #1 done; extend for #3)
├── lib/validations/mutations.ts   # Shared Zod schemas (no `any`)
├── lib/env.ts                     # Zod env validation (already exists)
├── features/departments/components/{safety,control-room}/*.tsx  # client form leaves
└── proxy.ts                       # Next 16 auth proxy (NOT middleware.ts)
packages/utils/src/inngest.ts      # Inngest client (FAIL #2 done)
apps/api/src/jobs/inngest.controller.ts  # Inngest serve handler (@Public() — required)
```

---

## 🔁 Remaining Work Phases (mapped to open FAILs)

### Phase 4: Redis Caching & Cache Invalidation (PARTIAL → close)

**Objective:** Tighten cache invalidation so mutations precisely invalidate both Redis (via `@repo/redis`) and Next.js caches.

**Tasks:**

- [ ] **4.1** Audit every Server Action / mutation for precise invalidation: use `revalidateTag`/`revalidatePath` on the exact affected path — never a blanket `revalidatePath('/')`.
- [ ] **4.2** Where server-side DB reads are used, wrap them with `unstable_cache` / the `@repo/redis` cache wrapper with registered `CACHE_TTL_REGISTRY` entries.
- [ ] **4.3** Confirm Redis TTLs ≤ Next.js revalidation windows to avoid serving stale overlays.

**Verification:** Mutate via a Server Action, reload → updated data appears; Redis key invalidated.

---

### Phase 5: Server Actions & Client-Side Mutations

> **5.1 — already COMPLETE (FAIL #1).** `SafetyIncidentForm.tsx` and `DozerRollForm.tsx` no longer import a Supabase client on the client; they call `submitSafetyIncident` / `submitDozerRoll` Server Actions in `apps/portal/app/actions.ts`, which perform the insert server-side (RLS context, `revalidatePath`/`revalidateRSC`) and trigger the n8n workflow server-side. `grep -r "createBrowserSupabaseClient" apps/portal/features` returns no data-mutating usage.

**Remaining tasks:**

- [ ] **5.2** Confirm all other form submissions use Server Actions with Zod-validated input and typed responses (`{ success: boolean; error?: string }`).
- [ ] **5.3** **FAIL #3 — implement `useOptimistic` with guaranteed rollback** on the two forms (and any other critical mutation). The action returns a typed result; on failure the optimistic update reverts and the error message is surfaced (never a stack trace / DB error).
- [ ] **5.4** Remove any legacy API route handlers now covered by Server Actions. Keep only genuine external webhooks (Stripe, Inngest) as Route Handlers.

**Verification:** No direct DB-client imports in any `"use client"` file; optimistic UI updates and rolls back on failure.

---

### Phase 6: Middleware & Security Hardening

**6.1 Rate limiting.** Apply `@repo/rate-limiter` (fixed/sliding/token-bucket) to public Route Handlers and form submissions. Note: auth is enforced in `apps/portal/proxy.ts` (Next 16), not `middleware.ts` — do not add a `middleware.ts` that duplicates proxy logic.

**6.2 Auth checks.** Session validation + role/department checks live in `proxy.ts` (Redis-cached). Ensure no unauthenticated access to protected routes.

**6.3 — Inngest security (COMPLETE, with a correction to the original plan).**

> ❌ **The original plan said: "Remove `@Public()` decorator from `InngestController` and add proper authentication."** This is **wrong for this codebase and would reopen the gap**. Inngest's `serve` handler receives _server-to-server_ calls from Inngest's infrastructure, which carry **no user session**. The global `SupabaseAuthGuard` would reject every legitimate Inngest request if `@Public()` were removed, breaking background jobs.
>
> ✅ **Correct fix (already applied):** the `Inngest` client in `packages/utils/src/inngest.ts` is constructed with `signingKey: process.env.INNGEST_SIGNING_KEY`. Inngest's `serve` handler uses this key to cryptographically verify that every inbound request to `/api/inngest` originates from Inngest's servers. Without the key it falls back to dev mode and accepts unsigned requests — which is the vulnerability. `@Public()` is therefore **kept**, and the signing key is the actual control. `INNGEST_SIGNING_KEY` is documented in `apps/api/.env.example` and `apps/portal/.env.example`.

**Tasks (none outstanding for 6.3):** ensure `INNGEST_SIGNING_KEY` is set in all environments where `/api/inngest` is reachable. Consider a non-guessable path and IP allowlist as defense-in-depth.

**Verification:** Calling `/api/inngest` without a valid Inngest signature is rejected (401/zip rejection) in production; valid signed requests succeed.

**6.4** Review remaining Route Handlers for CORS + input sanitization.

---

### Phase 7: Testing & Quality Gates (FAIL #4)

**Objective:** Eliminate mock-based data-layer tests; enforce CI gates.

**Tasks:**

- [ ] **7.1** **FAIL #4 — replace mocks in `drilling.test.ts` (and similar) with real seeded-DB integration tests** against a test Postgres (via `@repo/supabase` / `@repo/database` migrations), no `supabase` client mocking.
- [ ] **7.2** Add Playwright tests for critical journeys (incident submission, dozer roll) against the real backend.
- [ ] **7.3** CI order: `pnpm lint` → `pnpm type-check` → `test` (integration) → `pnpm build` → `pnpm audit` → knip. Fail on any non-zero exit.
- [ ] **7.4** `SENTRY_AUTH_TOKEN` provisioned in CI for source-map upload (already referenced in `next.config.mjs` gating).

**Verification:** CI passes on a data-layer PR; no Supabase mock remains in tests.

---

### Phase 8: Monitoring & Alerting (FAIL #5)

**Objective:** Proactive alerting + observability.

**Tasks:**

- [ ] **8.1** **FAIL #5 — add Prometheus `rule_files`** for 5xx spike, p95 latency, and failed Inngest/background-job alerts; wire to Alertmanager → Slack/PagerDuty. (Repo already has `docker-compose.monitoring.yml` with Prometheus + Grafana — extend with alerting rules.)
- [ ] **8.2** Sentry alerts for new unhandled errors + performance regressions (Sentry already integrated).
- [ ] **8.3** Confirm structured JSON logging with no PII/secrets.
- [ ] **8.4** Vercel Analytics / Speed Insights if hosted on Vercel.

**Verification:** Intentionally trigger a 500 → alert fires in the test channel; Prometheus rules evaluate.

---

### Phase 9: Final Audit & Rollout (App-Router steps N/A)

> Phases 1–3 and "delete `pages/`" from the original plan are **N/A** — Arch-Mk2 is already App Router. Skip them.

**Tasks:**

- [ ] **9.1** (N/A) No `pages/` directory exists.
- [ ] **9.2** Remove any legacy API handlers now covered by Server Actions (none expected).
- [ ] **9.3** Run `repowise update -w --index-only` after significant changes.
- [ ] **9.4** Run `pnpm quality` (lint + type-check + test + build) and confirm zero FAILs / zero `any`.
- [ ] **9.5** Deploy to staging, smoke test, then canary/blue-green rollout.

---

## ✅ Success Criteria (current)

- 28 original PASS items remain PASS.
- FAIL #1 (client-side DB writes) — ✅ resolved.
- FAIL #2 (Inngest unsigned requests) — ✅ resolved (signing key; `@Public()` kept intentionally).
- FAIL #3 (optimistic rollback) — 🔲 to implement.
- FAIL #4 (mock data-layer tests) — 🔲 to replace with seeded-DB integration tests.
- FAIL #5 (Prometheus alerting) — 🔲 to add.
- Lighthouse ≥ 90 mobile/desktop on key routes.
- `pnpm lint` + `pnpm type-check` clean (zero `any`, zero warnings).

---

## ⚠️ Risk Mitigation

- **Don't remove `@Public()` from the Inngest controller** — it breaks server-to-server Inngest calls; the signing key is the security control.
- **Don't add `middleware.ts`** that duplicates `proxy.ts` auth logic (Next 16 uses `proxy.ts`).
- **Cache poisoning:** keep TTLs reasonable; invalidate aggressively on mutation.
- **Data integrity:** run integration tests in CI before merging data-layer changes.
- **Rollback:** tag releases before cutover; revert to tag if prod issues arise.

---

## 🔧 Execution Commands

```bash
pnpm quality                 # lint + type-check + test + build (full gate)
pnpm --filter portal type-check
pnpm --filter portal lint
pnpm --filter @repo/utils exec jest
pnpm audit:rls               # RLS audit after schema changes
repowise update -w --index-only
```

---

**This document is the source of truth for closing the Arch-Mk2 optimization gaps. The Pages-Router migration content of the original draft does not apply to this repository. Every change must follow: no `any`, real implementations, secure by design, server-side mutations only.**
