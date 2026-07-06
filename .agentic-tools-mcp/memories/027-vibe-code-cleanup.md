# Memory 027: Safe Codebase Cleanup and Hardening (vibe-code-cleanup)

## Context
The user requested execution of the `/vibe-code-cleanup` slash command to optimize and clean up AI-generated / vibe-coded fullstack parts of the codebase. The goal was to remove dead files, fix unused/duplicate exports, and resolve NestJS/NextJS eslint warnings without introducing regression or breaking builds.

## Actions Taken

1. **Deleted Unused Files**:
   - `apps/api/src/common/guards/ai-rate-limit.guard.ts` (unreferenced rate limiter guard)
   - `apps/api/test-redis.js` (unreferenced test script containing a plain text credentials vulnerability)
   - `apps/portal/lib/data/departments.ts`, `machines.ts`, `operations.ts`, `safety.ts` (unreferenced query helpers)
   - Removed the empty directory `apps/portal/lib/data/`.

2. **Cleaned Up Unused and Duplicate Exports**:
   - Removed duplicate default export from `apps/portal/hooks/useDepartmentForm.ts` (`export default useDepartmentForm`).
   - Cleaned up 25 unused cache tags revalidation functions in `apps/portal/lib/cache/revalidate.ts`, keeping only the 4 actively imported cache revalidators.
   - Removed `export` from `HourlyLoadsGridProps` interface in `HourlyLoadsGrid.tsx`.
   - Prevented TypeScript `TS4053` compiler errors for NestJS Controller return type inference by adding `/** @public */` JSDoc annotations to `ShiftCompleteness`, `ToolStatus`, and `WeatherData` interfaces in `apps/api`, rather than removing their `export` keywords. This satisfied both Knip's unused export linter and TS compiler requirements.

3. **Resolved ESLint Warnings**:
   - Removed unused imports (`OllamaMessage` in `ai.service.ts`).
   - Cleaned up unused variable mapping block (`toolDefs` in `tool-dispatch.service.ts`).
   - Removed unused schema configurations (`shiftCompletenessSchema` and `adminDataQuerySchema` in `schemas.ts`).
   - Removed unused `SUPABASE_TOKEN` constant declaration in `supabase.module.ts`.

4. **Formatting Compliance**:
   - Automatically formatted changed files via Prettier.
   - Restored package field key order in `packages/errors/package.json` via Syncpack.

## Outcomes & Verification
- `pnpm type-check` builds without errors.
- `pnpm lint` completes with zero errors and warnings.
- `pnpm knip` passes successfully.
- The monorepo full quality gate (`pnpm quality`) passes successfully.
