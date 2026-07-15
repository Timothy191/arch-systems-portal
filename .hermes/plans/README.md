# Arch-Mk2 Local-Deploy Plans

Three plans, one per audit layer. Implement in strict order (1 -> 2 -> 3) — each plan assumes the previous is green.

**Source of truth:** `.audit/COMPREHENSIVE_AUDIT_2026-07-15.md` (60 KB, 12 sections).

**Working subset:** `AUDIT-SUMMARY.md` in this directory (just §0 Headline findings + §6 R1-R7 — the actionable items).

## The 3 plans

| Plan | File | Goal | Tasks | Approx time |
|---|---|---|---|---|
| 1 | `2026-07-15_162105-plan-1-infra-monorepo-plumbing.md` | Get the monorepo itself to: `pnpm install/build/lint/type-check/test` all green + CI quality-gate passes. | 14 | ~2-3 hr |
| 2 | `2026-07-15_162105-plan-2-backend-data-layer.md` | Bring up `supabase start` + Postgres + Redis + ops-gateway + API on a fresh machine. Migrations apply. Login works. RLS is the primary gate. | 14 | ~3-4 hr |
| 3 | `2026-07-15_162105-plan-3-frontend.md` | Portal renders against the local API. 8 client-side DB writes migrated to Server Actions. GlassCard/MacMenuBar/MacTitleBar deleted. Vercel tokens applied. | 12 | ~3-4 hr |

## End state (after all 3)

```
$ pnpm install
$ supabase start
$ pnpm dev

# In another terminal:
$ curl -sf http://localhost:3000/           # portal serves
$ curl -sf http://localhost:3001/api/health/live   # API serves
$ curl -sf http://localhost:3100/health              # ops-gateway serves
$ curl -sf http://localhost:54321/auth/v1/health    # Supabase up
$ psql -h localhost -p 54322 -U postgres -c "SELECT 1"   # DB reachable
$ redis-cli ping                                   # Redis up

# Login:
$ TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@arch-mk2.local","password":"admin12345"}' | jq -r .access_token)
$ curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/drilling
```

## Per-plan verification gates

Each plan ends with a "Done criteria" checklist. **Do not move to the next plan until the previous plan's gate is green.** The plan skill is explicit on this: "Do not proceed to Plan 2 until Plan 1 is green."

## Execution approach

The plan skill recommends `subagent-driven-development`: one fresh subagent per task, two-stage review (spec compliance then code quality). With a single user (you) reviewing both stages, this gives ~40 sub-agent dispatches across all 3 plans. The first plan alone is ~14 tasks. Expect ~2-3 hours of focused work per plan.

For tasks that are risky (e.g. Plan 2 Task 8: introducing a per-request Supabase client; Plan 3 Task 4: migrating 8 client writes to Server Actions), keep the diffs small and commit per controller / per form. The incremental-implementation skill applies: one thing per commit, builds stay green between commits.

## Important locked decisions (DO NOT regress)

From the user's prior locked calls and the master audit:

1. **Inngest S2S `@Public()`** stays. Do not recommend removing. Signing key is the real control.
2. **Status colors** (`--destructive/--success/--warning/--info`) are FUNCTIONAL SEVERITY, not decorative. Keep them. Map the existing macOS arch12-15 status tokens to the new shadcn-compatible aliases — do not delete.
3. **shadcn/ui is the substrate** (already wired). Token retargeting in `variables.css` reskins the whole UI; do not rewrite call-sites.
4. **Boundary rule:** apps import from `@repo/supabase`, NEVER from `@repo/database`. This is now also enforced by the ESLint `no-restricted-imports` rule Plan 1 wires up.
5. **`acc.db` files are gitignored** after Plan 1 Task 4. Do not re-add.

## How to read these plans

Each plan follows the same structure:

1. **Goal / Architecture / Tech Stack** — what this plan delivers
2. **Reference target state** — concrete end-state checklist
3. **Tasks 1..N** — bite-sized (2-5 min each), each with:
   - **Files** (exact paths)
   - **Step 1..M** (the actions to take)
   - **Expected** output for each verification command
   - **Commit** message at the end
4. **Done criteria** — final gate

If a task takes longer than 10 minutes, you're probably doing too much in one task. Split it. If a task is shorter than 2 minutes, you might be over-granular. The plan skill says: "2-5 minutes of focused work."

## Files created by these plans (cumulative)

After all 3 plans:
- `turbo.json` (Plan 1)
- `playwright.config.ts` (Plan 1)
- `knip.json` (Plan 1)
- `commitlint.config.cjs`, `lint-staged.config.cjs` (Plan 1)
- `.husky/pre-commit`, `.husky/commit-msg` (Plan 1)
- `.secretlintrc.json` (Plan 1)
- `tools/audit-rls.cjs` (Plan 1)
- `tools/policy-compiler.cjs`, `tools/policy/*` (Plan 1)
- `supabase/config.toml` (Plan 2)
- `supabase/migrations` (symlink) (Plan 2)
- `packages/database/seeds/local-admin.sql` (Plan 2)
- `docker-compose.local.yml`, `docker/nginx/Dockerfile` (Plan 2)
- `packages/ui/src/components/PortalNav.tsx` (Plan 3)
- `packages/theme/scripts/codegen.mjs` (Plan 3)

And deleted:
- `packages/ui/src/components/MacMenuBar.tsx` (Plan 3)
- `packages/ui/src/components/MacTitleBar.tsx` (Plan 3)
- `packages/ui/src/components/GlassCard.tsx` (Plan 3)
- `packages/theme/src/css/glass.css` (Plan 3)
- `apps/portal/lib/data/{drilling,operations,access-control}.ts` (Plan 3)
- `apps/portal/features/departments/components/control-room/ShiftCoverageWidget.tsx` (Plan 3, if Option A in Task 2)

And modified (~30 files):
- `package.json` (Plan 1)
- `apps/api/src/supabase/supabase.module.ts` + 6+ controllers (Plan 2)
- `apps/api/src/app.module.ts` (Plan 2)
- `apps/api/src/auth/guards/supabase-auth.guard.ts` (Plan 2)
- `apps/portal/proxy.ts` (Plan 3)
- `apps/portal/app/layout.tsx` (Plan 3)
- `apps/portal/app/(departments)/*/actions.ts` × 8 (Plan 3)
- `packages/theme/src/css/variables.css` (Plan 3)
- `packages/ui/src/globals.css` (Plan 3)
- `packages/ui/package.json` (Plans 1, 3)
- `.github/workflows/secret-scan.yml` (Plan 1)
- ... plus 10+ more across `apps/portal/**`, `apps/api/**`, `packages/**`
