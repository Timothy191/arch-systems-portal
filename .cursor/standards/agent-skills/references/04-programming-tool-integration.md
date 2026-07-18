# 2.1 Programming Tool Integration

Full path table. Project-local paths are committed; global paths are user-only.

| Tool           | Project-local        | Global                          |
| -------------- | -------------------- | ------------------------------- |
| Cursor         | `.cursor/skills/`    | `~/.cursor/skills/`             |
| Claude Code    | `.claude/skills/`    | `~/.claude/skills/`             |
| Codex          | `.codex/skills/`     | `~/.codex/skills/`              |
| GitHub Copilot | `.github/skills/`    | `~/.copilot/skills/`            |
| VS Code        | `.github/skills/`    | `~/.copilot/skills/`            |
| Amp            | `.agents/skills/`    | `~/.config/agents/skills/`      |
| Antigravity    | `.agent/skills/`     | `~/.gemini/antigravity/skills/` |
| CodeBuddy      | `.codebuddy/skills/` | `~/.codebuddy/skills/`          |
| Droid/Factory  | `.factory/skills/`   | `~/.factory/skills/`            |
| Gemini CLI     | `.gemini/skills/`    | `~/.gemini/skills/`             |
| Goose          | `.goose/skills/`     | `~/.config/goose/skills/`       |
| Kilo Code      | `.kilocode/skills/`  | `~/.kilocode/skills/`           |
| Kimi CLI       | `.kimi/skills/`      | `~/.kimi/skills`                |
| OpenCode       | `.opencode/skills/`  | `~/.config/opencode/skills/`    |
| Qwen Code      | `.qwen/skills/`      | `~/.qwen/skills/`               |
| Roo Code       | `.roo/skills/`       | `~/.roo/skills/`                |
| Trae           | `.trae/skills/`      | _(none documented)_             |
| Windsurf       | `.windsurf/skills/`  | `~/.codeium/windsurf/skills/`   |

**Notes:**

- VS Code and Copilot share identical paths
- Trae: project-local only
- Amp, Goose, OpenCode: global under `~/.config/`

Machine-readable copy: [`../assets/tool-paths.json`](../assets/tool-paths.json)

## Install commands

```bash
npx skills find <query>
npx skills add <owner/repo>
```

Docs: https://www.npmjs.com/package/skills
