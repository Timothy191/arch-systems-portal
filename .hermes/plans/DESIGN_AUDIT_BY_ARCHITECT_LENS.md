# Design Audit — by the Architect's Lens

**Audit rubric:** the five strengths of `prompt-orchestrator` (the architect role), established in `ARCHITECT_STRESS_TEST.md`:
- **S1 Intent extraction** — is the design's purpose/intent stated clearly & actionable?
- **S2 Ambiguity detection** — does it surface scope/unknown/dependency gaps before committing?
- **S3 Codebase grounding** — does it cite real `file:line`/paths that exist in the live tree?
- **S4 Capability-to-task routing** — is work decomposed with clear ownership & hand-offs?
- **S5 Orchestration-weight** — is the design size matched to the problem (no over/under-building)?

**Grading:** `✅ satisfied` · `△ partial` · `❌ gap`. Evidence cites `file:line` in the live tree.
**Grounding cross-check performed** against the live repo on 2026-07-19.

---

## A. Sibling agents (`.qoder/agents/`)

| Agent | S1 Intent | S2 Ambiguity | S3 Grounding | S4 Routing | S5 Weight | Notes |
|-------|-----------|--------------|--------------|------------|-----------|-------|
| `agent-engineer` | ✅ | ✅ | ✅ | ✅ | ✅ | Frontmatter `description` has triggers + anti-triggers (`agent-engineer.md:3-11`); explicit workflow `INVENTORY→AUDIT→…→VERIFY` (`:34`); hands off to other agents (`:101`); model tier `performance` (`:22`). |
| `code-scholar` | ✅ | ✅ | ✅ | n/a | ✅ | "Evidence over speculation" rule, mandates `file:line` (`:31`); anti-trigger on making changes (`:9`); correct readonly-leaning toolset. |
| `overwatch` | ✅ | ✅ | ✅ | ✅ | ✅ | Background guardian with explicit MONITOR→…→REPORT loop (`:34`); anti-triggers route to other agents (`:8-10`); `is_background: true` (`:23`). |
| `secure-builder` | ✅ | ✅ | ✅ | ✅ | ✅ | `BUILD→REVIEW→AUDIT` (`:33`); anti-triggers (`:10-11`); explicit hand-off to `sceptic` for review (`:78`). |
| `prompt-orchestrator` | ✅ | ✅ | ✅ | ✅ | ✅ | See Part A — passed stress test. |

**Verdict:** All five sibling agents satisfy the architect rubric. The ecosystem is healthy on intent/ambiguity/grounding/routing/weight. No gaps.

---

## B. Existing plans & designs

### B.1 `.hermes/plans/AUDIT-SUMMARY.md`
| Strength | Grade | Evidence / note |
|----------|-------|-----------------|
| S1 Intent | ✅ | Headline findings concise; R1–R7 prioritized (`:22-30`). |
| S2 Ambiguity | △ | Flags the "stripped tree" state (`:7`) but does not list which fixes are blocked by it. |
| S3 Grounding | ✅ | Each R references real files/scripts (`turbo.json`, `tools/audit-rls.cjs`, `ShiftCoverageWidget.tsx`). |
| S4 Routing | n/a | Not a decomposed plan; it is a findings summary. |
| S5 Weight | ✅ | Six must-fix items correctly scoped as P0. |

**Verdict:** solid summary; S2 could enumerate dependency blockers.

### B.2 `.hermes/plans/2026-07-15_162105-plan-3-frontend.md`
| Strength | Grade | Evidence / note |
|----------|-------|-----------------|
| S1 Intent | ✅ | Clear goal + reference target state (`:5-19`). |
| S2 Ambiguity | ✅ | Explicit ASSUMPTIONS block, verified at Task 1 (`:21-25`); gated on Plan 2 green (`:30`). |
| S3 Grounding | ❌ | **Stale paths vs. live tree** (cross-checked 2026-07-19): `ShiftCoverageWidget.tsx` not found anywhere in `apps/portal/` (Task 2, `:51-57`); `apps/portal/lib/data/access-control.ts` does NOT exist (Task 3, `:98`). `features/departments/` *does* exist, so some paths are valid — grounding is partial, not wholly invented. |
| S4 Routing | ✅ | 12 tasks, each with files/objective/steps/commit; "commit after every task" (`:3`). |
| S5 Weight | △ | 12 tasks is appropriate for the scope, but Task 5 is "planning only / no changes" yet sits mid-plan (`:204-223`) — minor weight mismatch (could be a pre-phase inventory). |

**Grounding defects (S3):**
- Task 2 targets `ShiftCoverageWidget.tsx` — file absent in live tree. Either already migrated/deleted, or the plan is out of date with the working tree.
- Task 3 references `apps/portal/lib/data/{drilling,operations,access-control}.ts` — `access-control.ts` absent; verify the other two before trusting Task 3.
- Mitigation: the plan's own Step 1/2 ("Read the file", `grep` for usages) would surface these gaps at execution time — so the *process* self-corrects, but the *documented* paths are not all grounded.

**Verdict:** strong plan; fails S3 on 2 cited paths. Recommend a grounding re-pass (Glob the 3 task files) before execution.

### B.3 `.kiro/specs/portal-migration/design.md`
| Strength | Grade | Evidence / note |
|----------|-------|-----------------|
| S1 Intent | ✅ | States migration goal (`:3-5`). |
| S2 Ambiguity | △ | "New Packages Needed… may need to be added" (`:80-83`) is vague; no concrete decision. |
| S3 Grounding | △ | Maps `legacy → new` (`:14-38`); references `apps(legacy)/portal/` which AGENTS.md marks deprecated/never-modify — consistent with a migration, but never confirms the legacy tree still exists. |
| S4 Routing | △ | Migration phases listed (`:87-93`) but no owner per phase. |
| S5 Weight | ✅ | Copy-then-adapt strategy is proportionate (`:85-93`). |

**Verdict:** acceptable migration design; S2/S4 could be tightened with concrete package decisions + phase owners. Note conflict: `AGENTS.md` says never route work to `apps(legacy)/`, yet this spec's source is exactly that dir — flag for the architect before execution.

### B.4 `.kiro/specs/unified-os-shell/design.md`
| Strength | Grade | Evidence / note |
|----------|-------|-----------------|
| S1 Intent | ✅ | "All shell visuals are theme-owned" (`:5`). |
| S2 Ambiguity | ✅ | Calls out the dock transform-conflict trade-off explicitly (`:60-62`). |
| S3 Grounding | ✅ | Every referenced file verified present: `packages/theme/src/css/{variables,glass,animations}.css`, `packages/ui/src/components/MacMenuBar.tsx` (confirmed exists), `apps/portal/src/app/(auth)/login/page.tsx` (confirmed exists), `apps/portal/src/components/system/ViewportBoundaries.tsx` (confirmed exists). |
| S4 Routing | ✅ | Files-changed table with exact edits (`:74-81`). |
| S5 Weight | ✅ | CSS-only; correctly states no new client components, no env vars, no new packages (`:64-70`). |

**Verdict:** best-grounded design in the repo — passes all five strengths. Model example of S3.

### B.5 `BACKEND_AUDIT.md`
| Strength | Grade | Evidence / note |
|----------|-------|-----------------|
| S1 Intent | ✅ | Scope = `apps/api/`, status stated (`:3-5`). |
| S2 Ambiguity | ✅ | Separates "Critical / Security / Quality / Architecture" with severities (`:15-141`). |
| S3 Grounding | ✅ | Each issue cites `file:line` (e.g. `auth.service.ts:9`, `gateway-proxy.controller.ts:21`) — cross-checked: `apps/api/src/auth/auth.service.ts` exists. |
| S4 Routing | ✅ | P0/P1/P2 recommendations map to owners/actions (`:164-182`). |
| S5 Weight | ✅ | Prioritized by blast radius (build-breaking → security → quality). |

**Verdict:** passes all five; strong grounding and severity-based routing.

---

## Consolidated Part B scorecard

| Target | S1 | S2 | S3 | S4 | S5 | Net |
|--------|----|----|----|----|----|-----|
| agent-engineer | ✅ | ✅ | ✅ | ✅ | ✅ | pass |
| code-scholar | ✅ | ✅ | ✅ | n/a | ✅ | pass |
| overwatch | ✅ | ✅ | ✅ | ✅ | ✅ | pass |
| secure-builder | ✅ | ✅ | ✅ | ✅ | ✅ | pass |
| AUDIT-SUMMARY | ✅ | △ | ✅ | n/a | ✅ | pass* |
| plan-3-frontend | ✅ | ✅ | ❌ | ✅ | △ | **gap** |
| portal-migration | ✅ | △ | △ | △ | ✅ | pass* |
| unified-os-shell | ✅ | ✅ | ✅ | ✅ | ✅ | pass |
| BACKEND_AUDIT | ✅ | ✅ | ✅ | ✅ | ✅ | pass |

\* = passes with minor soft notes.

**Single hard gap:** `plan-3-frontend.md` fails S3 (2 non-existent cited paths). Everything else satisfies the architect rubric.

See `ARCHITECT_FINDINGS.md` for consolidated recommendations + deferred fixes.
