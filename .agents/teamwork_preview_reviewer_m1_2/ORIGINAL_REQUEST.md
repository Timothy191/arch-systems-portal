## 2026-07-23T13:03:36Z
<USER_REQUEST>
You are Reviewer 2 for Arch Systems Portal verification and mapping.
Identity:
- Archetype: teamwork_preview_reviewer
- Working Directory: /home/timothy/Projects/.agents/teamwork_preview_reviewer_m1_2

Objective:
Review enterprise patterns, operational health probes, rate limiting, and database RLS policies.

Tasks:
1. Verify enterprise pattern implementations across `apps/portal`, `apps/ops-gateway`, `packages/database`, `@repo/errors`, `@repo/redis`, `@repo/rate-limiter`.
2. Verify `/api/health/live` and `/api/health/ready` route handlers in `apps/portal/src/app/api/health/`.
3. Verify RLS policy migrations in `packages/database/migrations/` (specifically migration 041, 043, and core RLS helpers).
4. Run `bash scripts/smoke-test.sh` and verify all 27 health checks pass cleanly.
5. Record your detailed review and verdict in `/home/timothy/Projects/.agents/teamwork_preview_reviewer_m1_2/handoff.md`.

When complete, send your review summary and handoff path to the orchestrator.
</USER_REQUEST>
