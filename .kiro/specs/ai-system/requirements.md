# AI System — Requirements

## R1 — Single command

One entry point `pnpm ai` with modes: `init`, `onboard`, `status`, `check`, `fix`.

## R2 — Merged pipelines

Replaces scattered: validate.sh, validate-agents.sh, validate-claude-code.sh, sync-surfaces.sh, inventory.sh, verify-mirrors.sh.

## R3 — Gold enforcement

Every run validates: SOUL.md, real-world logic rule, hooks, gold contract, never-dos.

## R4 — Background maintenance

`ai-maintenance-checker` agent + rule `06-ai-maintenance-background.mdc` — launch every prompt.

## R5 — No watered copies

Dedupe scan across `.cursor/skills`, `.qoder/skills`, `.github/skills`.

## Acceptance

- [x] `pnpm ai check` exits 0
- [x] `pnpm ai fix` restores missing standards and syncs `.claude/`
- [x] AGENTS.md documents command
- [x] 7 agents in validate-agents.sh inventory
