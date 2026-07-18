# 3.2 Supporting CLI Tools

| Tool                                                                    | Function                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| `npx skills`                                                            | Find + install from GitHub (Vercel official)   |
| [Skill_Seekers](https://github.com/yusufkaraaslan/Skill_Seekers)        | Convert docs sites, repos, PDFs → skill folder |
| [openskills](https://github.com/numman-ali/openskills)                  | Global load across agent platforms             |
| [skild.sh](https://skild.sh/)                                           | Install/sync across multiple tools             |
| [context7 cli](https://context7.com/docs/skills#skills)                 | context7 marketplace + local management        |
| [agent-skills-guard](https://github.com/brucevanfdm/agent-skills-guard) | Visual mgmt + security scan                    |
| [skillmaster](https://github.com/davidyangcool/agent-skill)             | Terminal install/list/use                      |

## npx skills commands

```bash
npx skills find <query>    # search index
npx skills add <owner/repo>  # install to tool path
```

## Security note

Skills may contain **executable scripts** agents run. Review unfamiliar skills with `agent-skills-guard` or skills.rest before install.

## Lifecycle mapping

| Stage           | Tool                                   |
| --------------- | -------------------------------------- |
| Discover        | skills.sh, skillsmp, `npx skills find` |
| Author          | skill-creator, Skill_Seekers           |
| Install         | `npx skills add`, skild.sh             |
| Sync multi-tool | skild.sh, openskills                   |
| Audit           | agent-skills-guard                     |
