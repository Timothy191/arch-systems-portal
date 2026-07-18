# Requirements: agent-layout

## User Request

Mirror the Agent Skills folder standard for Cursor subagents: hybrid entry + collateral layout, validation scripts, meta-skill, and doc mirrors — without breaking Cursor's flat `.cursor/agents/<name>.md` discovery.

## Acceptance criteria

1. **Hybrid layout** — each of 6 agents has `<name>.md` (entry, ≤65 lines) + `<name>/` collateral (`references/`, optional `scripts/`, `assets/`).
2. **Shared contracts** — gold standard + skills runtime live in `.cursor/agents/_shared/references/`; legacy paths redirect.
3. **Canonical standard** — `.cursor/standards/agent-layout/STANDARD.md` documents layout, runtime, and validate commands.
4. **Meta-skill** — `.cursor/skills/agent-layout/` with `TEMPLATE-AGENT.md`, checklist, and `scripts/validate.sh` wrapper.
5. **Validation** — `validate-agents.sh` passes 0 errors; integrated into `agent-skills/scripts/validate.sh`.
6. **Doc mirrors** — `AGENTS.md`, `CLAUDE.md`, `.kiro/agents/default.json`, `.kiro/README.md`, `04-subagent-auto-routing.mdc`, and `16-agent-compliance.md` reference hybrid layout.
7. **ai-docs-sync pipeline** — `inventory.sh` + `verify-mirrors.sh` run cleanly and include agent-layout validators.
8. **Every agent entry** links `_shared/references/gold-standard-contract.md` and `agent-skills-runtime.md`.

## Non-goals

- Nested `AGENT.md` folders as Cursor entry points (unsupported)
- Merging or removing any of the 6 specialists
- Changing `AGENTS.md` policy (§18 never-dos)
- Portal or application code changes

## Success criteria

- [x] All acceptance criteria met
- [x] `validate-agents.sh` — 0 errors
- [x] `validate.sh` (skills + agents) — 0 errors, 0 warnings
- [x] Live `ai-docs-sync` inventory + verify-mirrors pass
- [x] Spec phases complete (this directory)
