# 5.2 Skill Creation

## Resources

| Resource                 | Type                              | Output                          |
| ------------------------ | --------------------------------- | ------------------------------- |
| `skill-creator`          | Meta-skill in `anthropics/skills` | New skill folder                |
| Anthropic building guide | Markdown in awesome-agent-skills  | Author knowledge                |
| `Skill_Seekers`          | CLI automation                    | Skill folder from docs/repo/PDF |

## skill-creator

Install like any skill → agent applies its workflow to generate new skills.

```bash
npx skills add anthropics/skills
# use skill-creator folder
```

## Skill_Seekers

```bash
# yusufkaraaslan/Skill_Seekers — scrape docs, repos, or PDFs
```

## Project workflow

1. Read `.cursor/standards/agent-skills/references/02-folder-structure.md`
2. Copy `.cursor/skills/skill-layout/assets/TEMPLATE-SKILL.md`
3. Run `.cursor/standards/agent-skills/scripts/validate.sh`
4. Update skill index README in target path
