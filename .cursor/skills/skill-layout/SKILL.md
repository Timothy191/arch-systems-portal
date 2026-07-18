---
name: skill-layout
description: >-
  Meta-skill for creating or refactoring skills to the Agent Skills open standard
  (agentskills.io). Use when adding a skill, reorganizing SKILL.md, auditing
  layout, or installing external skills. Anti-trigger: do not replace agent
  orchestration or sceptic review.
---

# Skill Layout Standard

**Canonical reference:** [`.cursor/standards/agent-skills/STANDARD.md`](../../standards/agent-skills/STANDARD.md)

Every project skill follows the [Agent Skills open standard](https://agentskills.io/home) (DeepWiki: awesome-agent-skills §1.1–1.2).

## Required structure

```
skill-name/                 # kebab-case folder name
├── SKILL.md                # YAML frontmatter + lean workflow
├── scripts/                # .sh / .py / .mjs — executed during task
├── references/             # detailed docs — read on demand
└── assets/                 # templates, configs — static inputs (optional)
```

## SKILL.md rules

1. Frontmatter: `name`, `description` (when + anti-triggers)
2. Body: workflow, links to scripts/references/assets
3. Keep ≤ ~60 lines — depth in `references/`

## Runtime (all agents)

1. Session start → read skill `*.md`
2. Task match → follow `SKILL.md`
3. Execute `scripts/`; read `references/` and `assets/` as prescribed

## Validate

```bash
.cursor/skills/skill-layout/scripts/validate.sh
```

## Install external skills

```bash
npx skills find <query>
npx skills add <owner/repo>
```

Paths: [`../../standards/agent-skills/references/04-programming-tool-integration.md`](../../standards/agent-skills/references/04-programming-tool-integration.md)

## This repo paths

| Surface        | Path              |
| -------------- | ----------------- |
| Cursor         | `.cursor/skills/` |
| Qoder          | `.qoder/skills/`  |
| GitHub Copilot | `.github/skills/` |

## References

- [`references/checklist.md`](references/checklist.md) — new skill checklist
- [`assets/TEMPLATE-SKILL.md`](assets/TEMPLATE-SKILL.md) — starter SKILL.md
- Full standard library: `.cursor/standards/agent-skills/references/`

## Examples

- Minimal: `agent-alignment-score/`
- Full: `.github/skills/awesome-copilot--acquire-codebase-knowledge/`
- Alias: `.qoder/skills/verify/` → `quality/`
