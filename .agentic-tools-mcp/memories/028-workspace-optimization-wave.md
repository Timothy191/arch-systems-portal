# Memory 028: Workspace Optimization Wave
Created: 2026-07-07

## Context
The user requested repository-wide performance and structure optimizations, following up on a stability analysis that highlighted dead code, denormalized database tables, caching gaps, and unstandardized error handling.

## Accomplishments
1. **Dead Code & Dependency Removal**:
   - Cleaned up 11 unused NestJS controller/service files in `apps/api/src/ai`.
   - Removed unused dependency `@sentry/node` from `apps/api/package.json`.
   - Removed unused schemas (`aiSafetySchema`, etc.) from `apps/api/src/common/schemas.ts`.
   - Stopped exporting internal types from `ollama.service.ts`.
2. **Database Performance Enhancements**:
   - Added CHECK constraints to ensure `hourly_loads` hours fields remain non-negative.
   - Partitioned the high-volume `audit_logs` and `memory_embeddings` tables by `created_at` (range).
   - Set up pre-created monthly partitions for 2025-2027.
   - Migrated existing data to the new partitioned tables and cleaned up legacy backups.
   - Updated the auto-partitioning job script `create_next_month_partitions()` to dynamically spawn partitions for these new tables.
3. **CI / Turborepo Optimization**:
   - Enabled Turborepo Remote Caching variables (`TURBO_TOKEN`, `TURBO_TEAM`) in `.github/workflows/quality-gate.yml`.
   - Configured `bundlesize` limits directly in the root `package.json` for Turbopack bundle outputs (`.js` limit at 5.5MB, `.css` at 120KB).
   - Added a `pnpm bundlesize` run step in the GitHub Actions quality gate.
4. **Structured Error Handling**:
   - Refactored 50+ generic `throw new Error` statements in portal server actions and helpers (`actions.ts`, `shift-closeout.ts`, `hourly-loads/actions.ts`) to use customized typed HTTP/Domain error classes from `@repo/errors`.
   - Added `@repo/errors` package dependency to `apps/portal/package.json`.
   - Disabled experimental `cacheComponents` in `next.config.mjs` to resolve Turbopack page build conflicts with page dynamic declarations.

## Verification
- Checked database RLS policies using `pnpm audit:rls` (passed with 0 errors/warnings).
- Built all applications using `pnpm build` (passed).
- Verified bundle sizes satisfy constraints using `pnpm bundlesize` (passed).
