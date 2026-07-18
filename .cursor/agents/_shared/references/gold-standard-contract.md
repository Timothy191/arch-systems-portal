# Gold Standard Contract (all project agents)

Every entry file `.cursor/agents/<name>.md` must include this block. Anti-triggers go in YAML `description`.

## Required output

End every response with:

```
Next owner: <agent|parent|skill> — <one line>
```

## Template sections

Define agent-specific sections in `<name>/assets/*-TEMPLATE.md` and cite them from the entry file.

## Ownership split

| Role                           | Owner                               |
| ------------------------------ | ----------------------------------- |
| Formal Alignment Score         | `agent-alignment-score` skill       |
| Adversarial verdict + estimate | `sceptic` agent                     |
| Quality gate                   | `quality` / `verify` skills         |
| Policy/docs/layout audit       | `ai-docs-sync` agent                |
| Skill procedures               | `.cursor/skills/`, `.qoder/skills/` |

## Agent Skills runtime

Agents orchestrate; skills encode procedures. See [agent-skills-runtime.md](agent-skills-runtime.md).
