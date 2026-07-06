# GitHub Agent Skills (`.github/skills/`)

This directory contains definitions for specialized skills that AI agents can utilize when performing actions in this repository.

## Structure

Each subfolder here represents a specific skill containing:

- `SKILL.md`: Markdown file with YAML frontmatter specifying `name` and `description`, followed by step-by-step instructions.
- `scripts/`: Optional helper scripts invoked by the skill.
- `resources/`: Optional templates or static files needed for executing the skill.
