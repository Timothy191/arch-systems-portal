# 3 Discovering Skills

## Two channels

| Layer            | Examples                              | Use                     |
| ---------------- | ------------------------------------- | ----------------------- |
| Web marketplaces | skills.sh, skillsmp.com, context7.com | Browse, compare, vet    |
| CLI              | `npx skills`, skild.sh, openskills    | Terminal search/install |

Common workflow: discover on marketplace → install via `npx skills add`.

## CLI (primary)

```bash
npx skills find <query>
npx skills add <owner/repo>
```

`add` copies into detected tool path (e.g. `.cursor/skills/`).

## When to use what

| Situation               | Channel                                        |
| ----------------------- | ---------------------------------------------- |
| Explore domain          | skills.sh (trending) or skillsmp.com (broad)   |
| Security vetting        | skillstore.io, skills.rest, agent-skills-guard |
| Known skill install     | `npx skills add`                               |
| Multi-tool sync         | skild.sh                                       |
| Docs → skill conversion | Skill_Seekers                                  |
| Cross-platform load     | openskills                                     |

See also: `07-marketplaces.md`, `08-cli-tools.md`
