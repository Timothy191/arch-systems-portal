# Gold Standard Contract (all project agents)

Every agent under `.cursor/agents/` must include this block in its body, anti-triggers in YAML `description`, and an **Agent Skills Standard** section linking to `.cursor/standards/agent-skills/STANDARD.md`.

## Template

```markdown
## Gold Standard Contract

- **Required output sections:** <list from agent Output format>
- **Evidence rule:** Cite path or command; no "should work".
- **Fluff ban:** Max ~1 short sentence of prose outside the required template.
- End with: `Next owner: <agent|parent|skill> — <one line>`
```

## Ownership split

| Role                           | Owner                             |
| ------------------------------ | --------------------------------- |
| Formal Alignment Score (0–100) | `agent-alignment-score` skill     |
| Adversarial verdict + estimate | `sceptic` agent                   |
| Quality gate commands          | `quality` / `verify` skills       |
| Policy/docs/skill layout audit | `ai-docs-sync` agent              |
| Skill folder standard          | `.cursor/standards/agent-skills/` |

## Agent Skills runtime (mandatory)

Per [16-agent-compliance.md](../../standards/agent-skills/references/16-agent-compliance.md):

1. Agents **orchestrate**; skills **encode procedures**
2. Match task → `SKILL.md` → `scripts/` → `references/` → `assets/`
3. Validate skills: `.cursor/standards/agent-skills/scripts/validate.sh`
