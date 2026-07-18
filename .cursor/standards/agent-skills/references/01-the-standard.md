# 1.1 The Agent Skills Standard

## What it is

Open standard at **agentskills.io**, led by Anthropic. Encodes repeatable task knowledge as a **plain folder** any compatible AI agent reads at session start.

**Problem solved:** re-explanation overhead — teach once, benefit every session.

## Design philosophy

| Principle                | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| Teach once               | Workflow encoded in a skill folder; agent reads at session start |
| File-system native       | No proprietary format, API, or runtime service                   |
| Human + machine readable | Markdown serves authors and agents                               |
| Composable with MCP      | Skills wrap MCP tools into reliable workflows                    |
| Cross-platform           | One folder works across 17+ tools via path convention            |

## File-system convention

```
skill-name/
  SKILL.md      # Required entry (YAML frontmatter + workflow)
  scripts/      # Executable — run during task
  references/   # Docs — read on demand
  assets/       # Templates, configs — static inputs
```

**Two scopes:**

- **Project-local:** `<repo>/.cursor/skills/` (committed, team-shared)
- **Global:** `~/.cursor/skills/` (user-wide, not committed)

## vs other mechanisms

| Mechanism         | Scope               | Skills advantage                |
| ----------------- | ------------------- | ------------------------------- |
| Inline prompts    | Single conversation | Persist across sessions         |
| MCP servers       | Tool connection     | Skills teach _how_ to use tools |
| Projects / memory | Platform-managed    | Portable files across tools     |

## Standard at a glance

| Property   | Value                                            |
| ---------- | ------------------------------------------------ |
| Home       | agentskills.io                                   |
| Maintainer | Anthropic                                        |
| Required   | At least one `*.md` (typically `SKILL.md`)       |
| Optional   | scripts, references, assets                      |
| Tools      | 17+ programming tools + conversational platforms |
