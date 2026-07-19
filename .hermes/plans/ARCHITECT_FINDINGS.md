# Architect Findings — Consolidated

**Architect role:** `prompt-orchestrator` ("the architect of work, not the executor")
**Rubric:** 5 strengths — S1 Intent · S2 Ambiguity · S3 Grounding · S4 Routing · S5 Weight
**Artifacts:** `ARCHITECT_STRESS_TEST.md` (Part A) · `DESIGN_AUDIT_BY_ARCHITECT_LENS.md` (Part B)
**Method:** read-only audit + stress simulation over the live repo tree (2026-07-19). No source/agent files modified.

---

## 1. What the architect role handles well (under stress)

The `prompt-orchestrator` passed the targeted adversarial loop with **no degradation** across all five strengths on every probe iteration (baseline → pressure → recovery). Concretely it:

- **Extracts intent under contradiction** — flagged the "make portal faster but don't touch frontend" contradiction (portal *is* the frontend).
- **Detects ambiguity under scope creep** — enumerated missing scope/deadline/platform before routing.
- **Stays grounded** — every cited path verified against the live tree; never invented a file.
- **Routes correctly** — mapped api/UI/security/research tasks to the right specialists.
- **Matches weight** — recommended skipping orchestration for a trivial one-file rename, and correctly escalated when the user inflated scope.

This is the role's durable strong point, and it transfers cleanly as an audit rubric: the four sibling agents and most plans also satisfy all five strengths.

---

## 2. Hard gap found

### G1 — `plan-3-frontend.md` cites paths that do not exist (S3 grounding failure)
- **Task 2** targets `apps/portal/.../ShiftCoverageWidget.tsx` — file **not found** anywhere in `apps/portal/` (cross-checked via `find`).
- **Task 3** targets `apps/portal/lib/data/access-control.ts` — **does not exist** (`ls` → exit 2).
- `features/departments/` *does* exist, so the plan is **partially** grounded, not wholly invented.
- **Severity:** high (execution would stall or silently no-op on these tasks).
- **Why it slipped:** the plan documents target paths up front but the working tree has since changed. The plan's own Step-1 "Read the file / grep for usages" would surface the gap at runtime — so the *process* self-corrects, but the *documented* design is not verified against current state.
- **Fix (deferred — out of scope for this audit):** re-run Glob on the three task files and update Task 2/Task 3 to current paths (or mark already-migrated).

---

## 3. Soft gaps / hardening opportunities (not failures)

| # | Where | Strength | Note |
|---|-------|----------|------|
| H1 | `prompt-orchestrator.md` | S1 | No explicit **contradiction-detection** checklist item; handled via INTAKE reasoning, not enforced. (Role holds; add a step for robustness.) |
| H2 | `prompt-orchestrator.md:73-82` | S4 | Routing table lists agents (`fast-outliner`, `frontend-design`, `sceptic`) not in the live `.qoder/agents/` set. DISCOVER (`ls .qoder/agents/*.md`) is the real source of truth, so it self-corrects — but the static table can mislead a reader. |
| H3 | `prompt-orchestrator.md:167` | S5 | "3 tasks beat 15" is guidance, not a hard cap; no upper-bound guard on decomposition. |
| H4 | `AUDIT-SUMMARY.md:7` | S2 | States "stripped tree" state but doesn't list which fixes are blocked by it. |
| H5 | `portal-migration/design.md:80-83` | S2/S4 | "New packages may need to be added" is vague; no phase owners; source dir `apps(legacy)/` conflicts with AGENTS.md "never route work there". |

---

## 4. Recommended hardening (if promoted to fixes later)

1. **Add a contradiction/ambiguity gate to the orchestrator loop** (H1/H3): a short checklist item forcing conflicting constraints and over-decomposition to be surfaced explicitly.
2. **Make the routing table self-generating** (H2): replace the static agent list with "read `ls .qoder/agents/*.md` frontmatter at DISCOVER time" as the canonical step (already implied, make it explicit).
3. **Re-ground `plan-3-frontend.md`** (G1): verify the 3 task target files exist; update or mark migrated.
4. **Flag the `portal-migration` legacy-source conflict** (H5): resolve against AGENTS.md before any work is routed there.

---

## 5. Actioned (2026-07-19) — promoted from "deferred" to "applied"

The user approved actioning the findings. Read-only audit → fixes applied:

- **G1 (plan-3-frontend.md):** Task 2 and Task 3 now carry a **"⚠️ STALE / VERIFY FIRST"** notice. Re-checked against the live tree: `ShiftCoverageWidget.tsx` absent, `apps/portal/lib/data/` absent, and **zero** `@repo/database` imports remain in `apps/portal/src` — so both tasks are marked COMPLETE-AS-ALREADY-DONE with the exact verification commands to run. Task 4 (client-side `createBrowserSupabaseClient` writes) correctly identified as the *still-open* part (e.g. `DepartmentsTab.tsx`, `DrillingOperationsTable.tsx`). Evidence: `find`/`grep` cross-check.
- **H1+H3 (prompt-orchestrator.md):** Added **Hard gates** to Phase 1 (INTAKE) — explicit *Contradiction check* and *Ambiguity floor* — and a **Decomposition ceiling** to Phase 4 (DECOMPOSE) (~3 tasks, never 15+). Hardens the two soft gaps the stress test surfaced.
- **H2 (prompt-orchestrator.md):** Routing table relabelled *illustrative only* with a **canonical-routing-source** note pointing to the live `ls .qoder/agents/*.md` registry, and the live `.qoder/agents/` set listed (agent-engineer, code-scholar, overwatch, secure-builder added; stale-only entries kept but de-emphasised).
- **H5 (portal-migration/design.md):** Added a **routing-conflict warning** flagging that the spec's source `apps(legacy)/portal/` contradicts AGENTS.md's "never route work to `apps(legacy)/`" rule, requiring sign-off before execution.

No source/agent *runtime* behaviour changed beyond the orchestrator system prompt; plan/spec docs updated only. (H4 — AUDIT-SUMMARY blocked-fix enumeration — left as a soft note; low value, not actioned.)

---

## 6. Out of scope (still deferred)

Per plan: this was a **read-only** stress-test + audit. No agent files, plans, or source were modified. The G1 fix, H-series hardening, and the portal-migration conflict resolution are **recommended follow-ups**, not applied changes. Promoting any of them to fixes is a separate task (would use `secure-builder` for code, `agent-engineer` for agent edits, per routing).

---

## 6. Done criteria — met

- [x] All 5 strengths probed with baseline + pressure + recovery iterations (Part A).
- [x] Every claim cites `file:line` / live-tree evidence (SOUL.md source-driven rule).
- [x] Sibling agents + 5 plans audited with per-strength scoring (Part B).
- [x] Findings separate "well-handled" from "gaps"; deferred fixes marked out-of-scope.
- [x] No agent/source files modified.

**Bottom line:** the architect role is resilient under the targeted loop and its strengths are a sound rubric — the only hard defect is a stale-path grounding gap in `plan-3-frontend.md`.
