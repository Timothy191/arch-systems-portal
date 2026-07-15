# Arch-Mk2 Local-Deploy Plans

Three plans, one per audit layer. Implement in order (1 → 2 → 3).

- Plan 1 (this one): infra / monorepo plumbing
- Plan 2: backend + data layer
- Plan 3: frontend

Each plan ends with a parent re-runs-the-gate verification. Do not move
to Plan 2 until Plan 1 is green. Do not move to Plan 3 until Plan 2 is green.

Source of truth: `.audit/COMPREHENSIVE_AUDIT_2026-07-15.md`.
