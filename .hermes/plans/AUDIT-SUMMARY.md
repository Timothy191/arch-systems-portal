# Audit Summary — Headline Findings + R1–R7

Source: `.audit/COMPREHENSIVE_AUDIT_2026-07-15.md`

## 0. Headline findings

The repo is in a partial-checkout mid-refactor state on `feat/vercel-rebrand`.
The bulk of deletion is concentrated in `.agentic-tools-mcp/` and `.aistack/`.
Documentation, infrastructure config, and CI are substantially out of sync with
the live code tree. Six things must be fixed for the canonical quality gate to
pass today, and the Vercel rebrand is not actually started in the design system
despite the branch name and locked rebrand intent.

Top issues:
- `pnpm audit:rls`, `pnpm knip`, and `pnpm test:e2e` scripts are missing but called by CI.
- `turbo.json` is missing; cache-warmup workflow will fail.
- 3 files import `@repo/database` directly, including one `"use client"` component.
- 8 client components perform direct Supabase writes from the browser.
- Vercel rebrand tokens/components are not applied despite the branch name.
- API uses `service-role` for every route, so RLS is bypassed unless controller checks enforce isolation.

## 6. Severity-prioritized recommendations (R1–R7)

- **R1.** Add `turbo.json` at repo root.
- **R2.** Add the missing CI scripts to root `package.json`: `audit:rls`, `knip`, `knip:fix`, `test:e2e`, `format:check`, `lint:root`, `quality`, `policy:gen`.
- **R3.** Recreate `tools/audit-rls.cjs` to enforce `ENABLE ROW LEVEL SECURITY` in migrations.
- **R4.** Add `playwright.config.ts` for `pnpm test:e2e`.
- **R5.** Remove the client-side `@repo/database` import in `ShiftCoverageWidget.tsx` or refactor it to a server component.
- **R6.** Migrate the 8 client-side DB writes to server actions.
- **R7.** Restore the deleted repo state before other fixes if needed; otherwise continue from the current stripped tree and avoid reintroducing removed MCP/tooling.
