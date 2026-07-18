# 1.2 Skill Folder Structure

## Normalized folder

Every skill is one **kebab-case** directory bundling Markdown, scripts, and assets.

Examples: `skill-creator`, `docx`, `pptx`, `xlsx`, `pdf`, `rls-audit`

Installed at: `.cursor/skills/skill-name/` (project-local Cursor)

## Component types

| Component          | Patterns                      | Role                                                           |
| ------------------ | ----------------------------- | -------------------------------------------------------------- |
| Markdown           | `SKILL.md`, `references/*.md` | Task description, workflow, constraints; read at session start |
| Executable scripts | `*.sh`, `*.py`, `*.mjs`       | Procedural logic; subprocess during execution                  |
| Assets             | templates, configs, data      | Static inputs; not executed                                    |

### SKILL.md must contain

- YAML frontmatter: `name`, `description` (include when + anti-triggers)
- What the skill does and when to invoke
- Step-by-step workflow
- Links to scripts, references, assets
- Constraints and edge cases

### Scripts enable

- External CLI/API interaction
- Filesystem operations
- MCP tool sequences
- Structured output for agent inspection

## Runtime behavior

1. **Session start** — agent reads `*.md` across loaded skill folders
2. **Task invocation** — match `description` → follow workflow → run scripts
3. **During execution** — read assets at workflow-prescribed points

Repeated invocations need no re-explanation within the session.

## Project layout (required)

```
skill-name/
├── SKILL.md
├── scripts/          # required if procedural steps exist
├── references/     # required if SKILL.md would exceed ~60 lines
└── assets/           # optional
```

Validate: `.cursor/standards/agent-skills/scripts/validate.sh`
