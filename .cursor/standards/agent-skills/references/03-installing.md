# 2 Installing Skills

## How it works

Installing = placing the skill folder where the tool scans at session start. No build step.

| Method                        | When                              |
| ----------------------------- | --------------------------------- |
| `npx skills add <owner/repo>` | Recommended; auto path resolution |
| `npx skills find <query>`     | Discovery before install          |
| Manual copy                   | Full control; no Node.js          |

## Manual pattern

```
<project-root>/<tool-dotfolder>/skills/<skill-name>/
~/<tool-config>/skills/<skill-name>/     # global
```

## Installation scope

| Scope         | Path                     | Use                          |
| ------------- | ------------------------ | ---------------------------- |
| Project-local | e.g. `.cursor/skills/`   | Repo-specific; commit to git |
| Global        | e.g. `~/.cursor/skills/` | All projects; never commit   |

Project-local takes precedence when both exist.

## Checklist

1. Obtain skill folder (clone or `npx skills add`)
2. Choose scope (project vs global)
3. Copy to tool path (see `04-programming-tool-integration.md`)
4. Restart or start new agent session
5. Verify skill appears in tool's skill list

## This repo paths

| Tool                     | Project-local     |
| ------------------------ | ----------------- |
| Cursor                   | `.cursor/skills/` |
| Qoder                    | `.qoder/skills/`  |
| GitHub Copilot / VS Code | `.github/skills/` |
