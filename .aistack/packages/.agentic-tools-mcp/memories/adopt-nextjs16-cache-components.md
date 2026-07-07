

# Next.js 16 Cache Components Adoption Pass — 2026-07-07

Adopted Next.js 16 Cache Components across `apps/portal/app` routes by removing the `export const instant = false` opt-out and restoring appropriate segment configs.

## Approach

- Removed all `export const instant = false` exports and their associated TODO comments from portal routes and co-located test files.
- For routes whose TODO indicated original dynamic intent, restored `export const dynamic = "force-dynamic"`:
  - `(hub)/page.tsx`
  - `(hub)/executive/page.tsx`
  - `(departments)/engineering/page.tsx`
  - `(departments)/engineering/tire-management/page.tsx`
  - `(departments)/drilling/page.tsx`
  - `(departments)/drilling/reports/page.tsx`
  - `(departments)/drilling/machine-telemetry/page.tsx`
  - `(departments)/access-control/page.tsx`
  - `(departments)/access-control/visitors/page.tsx`
  - `(departments)/access-control/badges/page.tsx`
  - `(departments)/access-control/access-logs/page.tsx`
- For `(departments)/[department]/excavator-activity/page.tsx`, restored `export const revalidate = 0` to preserve no-cache semantics.
- For remaining routes (history, generic reports, training subtree, auth layouts, root layout, admin, and [department] sub-pages), removed the opt-out so Next.js can apply automatic cache-components semantics / partial prerendering.
- Removed stale "Removed force-dynamic segment config to comply with cacheComponents" comment from `(auth)/login/page.tsx`.

## Files touched

62 route/test files under `apps/portal/app/`, including the priority set from the previous pass: history, reports, drilling, machine-telemetry, access-control, training, hub.

## Verification

- `pnpm --filter portal lint`
- `pnpm --filter portal type-check`
- `pnpm --filter portal build` (smoke test)


## Correction: legacy segment configs are incompatible with cacheComponents

During the build smoke test, Next.js 16.3.0-canary.78 rejected `export const dynamic = "force-dynamic"` and `export const revalidate = 0` with the message "Route segment config ... is not compatible with `nextConfig.cacheComponents`. Please remove it." Therefore those legacy exports were removed and dynamic intent is expressed solely through dynamic data APIs (`cookies()`, `createServerSupabaseClient()`, `getDepartmentContext()`, `connection()`, etc.).

To allow prerendering, shared client components that use `usePathname()` were wrapped in `<Suspense fallback={null}>`:
- `app/layout.tsx`: `RouteAnnouncer`, `ViewportBoundaries`
- `app/(hub)/layout.tsx`: `BottomNav`

Final verification:
- `pnpm --filter portal lint` passed
- `pnpm --filter portal type-check` passed
- `pnpm --filter portal build` passed with routes classified as Static / Partial Prerender / Dynamic
