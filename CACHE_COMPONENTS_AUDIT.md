# Cache Components / PPR Audit — Next.js 16.2.10

> Audit-only. No source or config changes were made. Performed against the
> working tree on the current branch (uncommitted changes from the
> optimization work may coexist).

## Scope

Verify whether Cache Components / PPR is actually working correctly on
`next@16.2.10`, surface hidden issues, and report without modifying anything.
This was the "investigate / audit current state" option before deciding
between (A) upgrading to 16.3+ and re-running the adoption codemod, or
(B) going straight to the static-shell (PPR) render-loop optimization.

## Current State (from real files + build artifacts)

- **Next version**: `16.2.10` (apps/portal/package.json:25).
- **`cacheComponents: true`** set at the top level of
  `apps/portal/next.config.mjs:57`.
- **`experimental.ppr: true`** ALSO set (next.config.mjs experimental block).
  So PPR and Cache Components are both enabled.
- **Source usage of the cache API** is correct and server-side only:
  `apps/portal/app/(hub)/page.tsx` (and its data functions) use
  `"use cache: private"` + `cacheTag(...)` + `cacheLife({ expire: 300 })`
  imported from `next/cache`. Caching is per-user, keyed by `auth:${userId}`.
- **Build artifact** (`apps/portal/.next/required-server-files.json`):
  `cacheComponents: true`; top-level `ppr: undefined` but `experimental.ppr: true`
  is honored.

## The Smoking Gun — `apps/portal/.next/prerender-manifest.json`

- Authenticated, **per-user** routes — `/`, `/control-room`, `/access-control` —
  are listed in `prerender-manifest.routes` with:
  - `initialRevalidateSeconds: false`
  - a `.rsc` data route (e.g. `/control-room.rsc`)
- Only `/legal/[...slug]` is a true `dynamicRoute`.
- `appPageChunks` (the Cache-Components static-shell marker) is **absent**.

## Interpretation — AMBIGUOUS, NOT A CLEAN PASS

This signature is exactly the shape of EITHER:

- **(A) Correct PPR**: a static shell is prerendered, and the
  `getUserSafely(...)` session read forces the per-user segments to stream in
  dynamically. The `"use cache: private"` directive keyed by `userId` makes
  those segments per-request, not build-frozen.
- **(B) Stale-data bug**: the page was frozen at build time and every visitor
  receives the same snapshot. Because `initialRevalidateSeconds: false`, there
  is NO ISR refresh — a genuine correctness bug for authenticated, per-user
  pages.

The manifest ALONE cannot distinguish (A) from (B). The presence of
`"use cache: private"` makes (A) _likely_, but `initialRevalidateSeconds: false`

- authed routes listed as static is precisely the pattern that breaks silently
  after a Next.js upgrade changes how session reads are treated as dynamic.

## Other Findings

1. **Redundant/overlapping flags**: `experimental.ppr: true` + top-level
   `cacheComponents: true`. In 16.3 the `ppr` flag was consolidated and its
   semantics shifted. Harmless on 16.2.10 today, but a config smell that 16.3
   may reinterpret.
2. **Cache API shape is 16.2-era**: `cacheLife({ expire: 300 })` (object form)
   and `cacheTag(...)` from `next/cache`. 16.3 changed `cacheLife` to a richer
   object (`{ stale, revalidate, expire }` / `Date`-based). Hub code will
   likely need adjustment on upgrade.
3. **`experimental.authInterrupts: true`** interacts with Cache Components/PPR —
   another area where 16.3 changed behavior.

## Required Next Step Before Any Upgrade (runtime confirmation)

Hit `/control-room` (and `/access-control`) **logged in as two different users**
and inspect:

- response `Cache-Control`, `x-nextjs-stale-times`, `x-nextjs-cache`,
  `x-nextjs-prerender` headers
- confirm each user sees THEIR OWN data, not a build-time snapshot

This is the only way to prove (A) vs (B). It requires a running instance plus
two authenticated sessions, so it was NOT performed during this read-only audit.

## Verdict

Cache Components is enabled and the build succeeds with it; the code uses the
cache API in the intended server-side, per-user way. It is _probably_ functioning
as a static shell + dynamic per-user segments. However, the prerender manifest
shows authed routes as static with **no revalidation** — a genuine ambiguity
that must be confirmed at runtime before you (a) trust it, or (b) upgrade to
16.3 where `ppr` / `cacheComponents` / `use cache` semantics shift and could
silently flip (B) on.

## Recommended Decision Order

1. Run the two-user runtime check (proves A vs B).
2. If (A): the PPR / static-shell optimizer render-loop (option B) is safe to
   pursue. You may also plan the 16.3 upgrade.
3. If (B): fix the stale-data bug on 16.2.10 FIRST, only then consider the
   upgrade.

No files were changed.
