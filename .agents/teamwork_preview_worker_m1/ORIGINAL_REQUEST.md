## 2026-07-23T13:00:00Z
You are Worker 1 for Arch Systems Portal verification and mapping implementation.
Identity:
- Archetype: teamwork_preview_worker
- Working Directory: /home/timothy/Projects/.agents/teamwork_preview_worker_m1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Execute the implementation tasks for Milestone 1 (Spec Creation), Milestone 2 (Codebase Maps under `Codebase-maps/`), and Milestone 3 (Quality & Enterprise Pattern Verification).

Tasks:
1. **Spec Creation**:
   Create `.kiro/specs/arch-systems-portal-verification/spec.md`. The spec must define the requirements, architecture, enterprise pattern verification, testing, and acceptance criteria for:
   - R1: Architecture & Codebase Mapping (`Codebase-maps/`)
   - R2: Enterprise Patterns Verification (caching, `@repo/errors`, RLS policies, rate limiting, health probes `/api/health/live` & `/api/health/ready`)
   - R3: Quality Guardrails (unit tests, `.size-limit.json`, `pnpm ai check`)

2. **Codebase Mapping**:
   Generate/update all required reference and visual maps under `Codebase-maps/`:
   - `Codebase-maps/workspace-packages.md`: Complete topology of workspace apps (`apps/portal`, `apps/ops-gateway`, `apps/api-gateway`) and 14 `@repo/*` packages.
   - `Codebase-maps/api-routes.md`: Index of all 51 portal API routes and gateway endpoints.
   - `Codebase-maps/dataflow-pipelines.md`: Telemetry ingestion, Inngest background jobs, webhooks, event dispatching.
   - `Codebase-maps/caching-layers.md`: Next.js 16 `"use cache"`, `cacheTag()`, hybrid L1 memory/L2 Redis mesh, auth decoupling.
   - `Codebase-maps/client-server-boundaries.md`: Server Actions, Server Components vs Client Components (`'use client'`), runtime data boundaries.

3. **Automated Quality & Operational Verification**:
   Execute the following build, test, and verification commands and capture exact output:
   - Clean Workspace Build: Run `pnpm build` and verify clean build across all workspace apps and packages.
   - Unit Tests: Run `pnpm --filter portal test` and verify **57/57 test suites** and **413/413 tests** pass.
   - Operational Smoke Test: Run `bash scripts/smoke-test.sh` (or `pnpm test:smoke`) and verify **27/27 health checks** pass across 6 phases.
   - AI Surface Check: Run `pnpm ai check` and verify **0 errors and 0 warnings**.
   - Bundle Size Limits: Inspect `apps/portal/.size-limit.json` and build stats.

4. Document all command outputs, build logs, and file paths in `/home/timothy/Projects/.agents/teamwork_preview_worker_m1/changes.md` and your handoff report `/home/timothy/Projects/.agents/teamwork_preview_worker_m1/handoff.md`.

When complete, send a message to the orchestrator with your results and handoff path.
