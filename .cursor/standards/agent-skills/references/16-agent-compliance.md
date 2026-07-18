# 16 Agent Compliance (Arch Systems Extension)

Project subagents (`.cursor/agents/*.md`) **orchestrate**; skills (`.cursor/skills/`, `.qoder/skills/`, `.github/skills/`) **encode procedures**.

## Every agent MUST

1. Include **Gold Standard Contract** in body — see `.cursor/agents/references/gold-standard-contract.md`
2. Include **anti-triggers** in YAML `description`
3. End output with `Next owner: <agent|parent|skill> — <one line>`
4. **Delegate** to skills instead of duplicating procedural steps
5. Follow **runtime sequence** from `STANDARD.md`:
   - Match task → read skill `SKILL.md`
   - Execute `scripts/` when workflow says so
   - Load `references/` / `assets/` on demand

## Agent → skill routing

| Agent                | Primary skills                                        |
| -------------------- | ----------------------------------------------------- |
| fast-outliner        | `specs` (if spec needed)                              |
| frontend-implementer | `frontend-api-integration-patterns` (review)          |
| ai-docs-sync         | `skill-layout` (audit layout)                         |
| sceptic              | `agent-alignment-score` (formal score after estimate) |
| idle-runner          | any safe read-only skill scripts                      |
| frontend-design      | — (visual brief; no skill duplication)                |

## Parent agent (orchestrator)

Before claiming done on multi-file work:

1. `sceptic` → verdict + alignment estimate
2. `agent-alignment-score` → formal score block
3. `quality` or `verify` → gate evidence

## Authoring new skills

Use `skill-layout` meta-skill + validate:

```bash
.cursor/standards/agent-skills/scripts/validate.sh
```

## Never

- Embed full quality/RLS/spec procedures in agent files — use Qoder skills
- Fork Agent Skills standard in agent bodies — link to `.cursor/standards/agent-skills/`
- Emit formal Alignment Score from `sceptic` (estimate only)
