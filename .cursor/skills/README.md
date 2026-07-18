# Cursor Project Skills (`.cursor/skills/`)

Agent Skills open standard ([agentskills.io](https://agentskills.io/home)). **Canonical reference:** [`.cursor/standards/agent-skills/STANDARD.md`](../standards/agent-skills/STANDARD.md)

## Layout

```
skill-name/
├── SKILL.md          # YAML frontmatter + workflow entry
├── scripts/          # Executable wrappers (optional)
├── references/       # Detailed docs (optional)
└── assets/           # Templates, static resources (optional)
```

## Skills in this repo

| Skill                                           | Purpose                                    | Key script                 |
| ----------------------------------------------- | ------------------------------------------ | -------------------------- |
| [agent-alignment-score](agent-alignment-score/) | Formal Alignment Score (0–100)             | `scripts/score.mjs`        |
| [skill-layout](skill-layout/)                   | Meta-skill for creating/refactoring skills | `assets/TEMPLATE-SKILL.md` |
| [agent-layout](agent-layout/)                   | Meta-skill for hybrid agent layout         | `scripts/validate.sh`      |
| [claude-code-layout](claude-code-layout/)       | Claude Code `.claude/` surfaces            | `scripts/validate.sh`      |

## Usage

```bash
node .cursor/skills/agent-alignment-score/scripts/score.mjs --interactive
```

## Validation

```bash
.cursor/standards/agent-skills/scripts/validate.sh
```

## Related surfaces

- Qoder workflows: `.qoder/skills/README.md`
- GitHub Copilot: `.github/skills/README.md`
- Project subagents: `.cursor/agents/` + `.cursor/rules/04-subagent-auto-routing.mdc`
