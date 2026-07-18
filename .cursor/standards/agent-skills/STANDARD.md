# Agent Skills Standard (Project Canonical)

**Source:** [agentskills.io](https://agentskills.io/home) · indexed from [awesome-agent-skills DeepWiki](https://deepwiki.com/libukai/awesome-agent-skills)

This directory is the **single canonical reference** for how skills and agents behave in Arch Systems. `AGENTS.md` points here; do not fork policy.

## Quick rules

| Layer                   | Standard                                                                        |
| ----------------------- | ------------------------------------------------------------------------------- |
| **Skill folder**        | `skill-name/SKILL.md` + `scripts/` + `references/` + `assets/`                  |
| **Skill naming**        | kebab-case (`skill-creator`, `rls-audit`)                                       |
| **Agent file**          | `.cursor/agents/<name>.md` with Gold Standard Contract + Skills runtime section |
| **Install (this repo)** | `.cursor/skills/`, `.qoder/skills/`, `.github/skills/`                          |
| **Discovery**           | `npx skills find <query>` · `npx skills add <owner/repo>`                       |

## Runtime sequence (all agents must follow)

1. **Session start** — tool loads all `*.md` in skill folders; agent internalizes workflows
2. **Task match** — user intent matches skill `description` → follow that skill's `SKILL.md`
3. **Execution** — run `scripts/` as subprocesses; read `references/` and `assets/` at prescribed steps
4. **Never duplicate** — procedural steps live in skills; agents orchestrate and delegate

## Reference index

| #   | Topic                                    | File                                                                                             |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1.1 | The Agent Skills Standard                | [`references/01-the-standard.md`](references/01-the-standard.md)                                 |
| 1.2 | Skill Folder Structure                   | [`references/02-folder-structure.md`](references/02-folder-structure.md)                         |
| 2   | Installing Skills                        | [`references/03-installing.md`](references/03-installing.md)                                     |
| 2.1 | Programming Tool Integration             | [`references/04-programming-tool-integration.md`](references/04-programming-tool-integration.md) |
| 2.2 | Conversational Tool Integration          | [`references/05-conversational-tools.md`](references/05-conversational-tools.md)                 |
| 3   | Discovering Skills                       | [`references/06-discovering-skills.md`](references/06-discovering-skills.md)                     |
| 3.1 | Skill Marketplaces                       | [`references/07-marketplaces.md`](references/07-marketplaces.md)                                 |
| 3.2 | Supporting CLI Tools                     | [`references/08-cli-tools.md`](references/08-cli-tools.md)                                       |
| 4   | Learning Resources                       | [`references/09-learning-resources.md`](references/09-learning-resources.md)                     |
| 5   | Curated Collections                      | [`references/10-curated-collections.md`](references/10-curated-collections.md)                   |
| 5.1 | Official Organization Skills             | [`references/11-official-org-skills.md`](references/11-official-org-skills.md)                   |
| 5.2 | Skill Creation                           | [`references/12-skill-creation.md`](references/12-skill-creation.md)                             |
| 5.3 | Document Processing                      | [`references/13-document-processing.md`](references/13-document-processing.md)                   |
| 5.4 | Content Creation                         | [`references/14-content-creation.md`](references/14-content-creation.md)                         |
| 5.5 | Programming Assistance                   | [`references/15-programming-assistance.md`](references/15-programming-assistance.md)             |
| —   | **Agent compliance** (project extension) | [`references/16-agent-compliance.md`](references/16-agent-compliance.md)                         |

## Validation

```bash
.cursor/standards/agent-skills/scripts/validate.sh
```

## Related project surfaces

- Meta-skill: `.cursor/skills/skill-layout/`
- Agent contract: `.cursor/agents/references/gold-standard-contract.md`
- Routing: `.cursor/rules/04-subagent-auto-routing.mdc`
