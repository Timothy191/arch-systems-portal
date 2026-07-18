# GitHub Agent Skills (`.github/skills/`)

Skills for GitHub Copilot and VS Code agent customization ([Agent Skills standard](https://agentskills.io/home)).

## Layout

Each skill folder contains:

- `SKILL.md` — YAML frontmatter (`name`, `description`) + workflow entry
- `scripts/` — helper scripts (optional)
- `references/` — detailed documentation (optional)
- `assets/` — templates and static resources (optional)

Scaffold new skills from [`TEMPLATE.md`](TEMPLATE.md).

## Skills in this repo

| Skill                                                                                       | Purpose                                      |
| ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [verify-changes](verify-changes/)                                                           | Format → lint → type-check → test            |
| [frontend-api-integration-patterns](frontend-api-integration-patterns/)                     | Async fetch, cancellation, retry patterns    |
| [awesome-copilot--acquire-codebase-knowledge](awesome-copilot--acquire-codebase-knowledge/) | Codebase onboarding docs in `docs/codebase/` |

## Related

- Cursor score skill: `.cursor/skills/agent-alignment-score/`
- Qoder workflows: `.qoder/skills/README.md`
- Canonical policy: `AGENTS.md`
