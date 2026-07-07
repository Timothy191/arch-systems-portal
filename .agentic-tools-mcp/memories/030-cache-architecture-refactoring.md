# Cache Architecture Refactoring (030-cache-architecture-refactoring.md)

## Summary
Migrated direct Supabase database queries from Next.js route segments to a dedicated, cached data-access layer (`lib/data/`) using read-replica Supabase clients, Next.js `unstable_cache` via the safe `cachedRSC` wrapper, and Redis L1/L2 memory caching via `withCache`. Standardized all cache invalidations by moving them out of individual Server Actions and route files into a centralized `revalidate.ts` invalidator, which handles both Next.js Data Cache tag invalidation and Redis invalidation synchronously. Added React `<Suspense>` streaming boundaries to access control and department pages to allow instant page loads and lazy-loaded dynamic content tables.

## Implementation Details

### 1. Data Access Layer Centralization
- **Access Control Data Access**: Created [access-control.ts](file:///home/arch/Applications/Arch-Mk2/apps/portal/lib/data/access-control.ts) to house:
  - `getAccessLogsForDepartment(deptId, cookies)`
  - `getBadgesForDepartment(deptId, cookies)`
  - `getVisitorsForDepartment(deptId, cookies)`
- **Operations Data Access**: Created [operations.ts](file:///home/arch/Applications/Arch-Mk2/apps/portal/lib/data/operations.ts) to house:
  - `getControlRoomSummary(deptId, today, cookies)`
  - `getNonControlRoomSummary(deptId, today, cookies)`
  - `getShiftCoverageLogs(deptId, today, cookies)`
- These functions utilize `createReadReplicaClient(cookieList)` and execute queries through `cachedRSC` + `withCache` for robust caching.
- **Server-Only Poisoning Protection**: Imported `"server-only"` in both `access-control.ts` and `operations.ts` to guarantee these database queries never leak into client component bundles.

### 2. Route Migrations & Suspense Streaming
- **Access Logs Page**: Refactored `access-logs/page.tsx` to read logs via `getAccessLogsForDepartment`. Extracted the data table into `AccessLogsTable` and wrapped it in a `<Suspense fallback={<GlassSkeleton showHeader rows={5} />} />` boundary.
- **Badges Page**: Refactored `badges/page.tsx` to read badges via `getBadgesForDepartment`. Extracted the list into `BadgesTable` and wrapped it in a `<Suspense>` boundary.
- **Visitors Page**: Refactored `visitors/page.tsx` to read visitors via `getVisitorsForDepartment`. Extracted the list into `VisitorsTable` and wrapped it in a `<Suspense>` boundary.
- **Department Page**: Refactored summary grids (`ControlRoomSummaryGrid`, `NonControlRoomSummaryGrid`, `ShiftCoverageSection`) to load data using cached operations functions. Suspense boundaries were verified and are actively present in the parent layout wrapper.

### 3. Centralized Cache Invalidation
- Standardized all cache invalidators in [revalidate.ts](file:///home/arch/Applications/Arch-Mk2/apps/portal/lib/cache/revalidate.ts) using `updateTag` and `cacheInvalidateTags` from `@repo/redis` inside a unified `updateTags` helper.
- Removed direct calls to `@repo/redis`'s `cacheInvalidateTags` from Server Actions. Instead, delegated invalidation to:
  - `revalidateBadgesCache(deptId)`
  - `revalidateAccessLogsCache()`
  - `revalidateVisitorsCache()`
  - `revalidateOperationsCache()`
  - `revalidateBreakdownsCache()`
  - `revalidateSitesCache()`
  - `revalidateMachinesCache()`
- Updated files:
  - `app/(departments)/access-control/actions.ts`
  - `features/departments/components/engineering/breakdowns/actions.ts`
  - `features/admin/actions/sites.ts`
  - `features/admin/actions/fleet.ts`

### 4. ESLint, TypeScript, and CSS Verification
- Fixed TypeScript parameter casting in `revalidateBadgesCache` for department tags.
- Cleared all pre-existing and introduced unused import ESLint warnings across the refactored code (`page.tsx`, `bottom-widget-bar/index.tsx`, `bottom-widget-bar/sub-components.tsx`).
- Bypassed HMR console logs in `ServicesDropdown.tsx` with a lint rule disable.
- Fixed a build-time TypeScript type error in `app/(departments)/training/page.tsx` where Lucide icons were missing from the stats metrics list.
- **CSS Warning Resolution**: Refactored Tailwind v4 style `@theme inline` block in `packages/ui/src/globals.css` into standard CSS keyframes and `@layer utilities` classes. This completely resolved the PostCSS parser warning `Unknown at rule: @theme` under Tailwind v3, resulting in a 100% clean production build.
- Verified compilation and production build via `pnpm --filter portal build` (succeeded with exit status 0).

## Outcomes
- **Faster Page Loads**: Suspense boundaries allow the initial shell layout to render instantly while heavy queries are resolved in the background.
- **Lower Read Latency**: Read operations are served from L1 memory/L2 Redis or Next.js's Data Cache.
- **Cache Consistency**: Modifying database records now invalidates all related Next.js and Redis cached values in a single synchronous invalidator call.
- **Code Maintainability**: Clean, decoupled separation of database query code and React page presentation logic.
- **Clean Build Pipeline**: Standardized on CSS conventions compatible across bundler targets without warnings or parser anomalies.
