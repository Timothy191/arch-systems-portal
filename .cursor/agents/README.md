# Project Subagents

Cursor loads **flat entry files** only: `.cursor/agents/<name>.md`.  
Collateral: `.cursor/agents/<name>/{references,scripts,assets}/`.

**Layout standard:** [`.cursor/standards/agent-layout/STANDARD.md`](../standards/agent-layout/STANDARD.md)  
**Auto-routing:** [`.cursor/rules/04-subagent-auto-routing.mdc`](../rules/04-subagent-auto-routing.mdc)

## Agents

| Entry                                                  | Role                               | Collateral                                         |
| ------------------------------------------------------ | ---------------------------------- | -------------------------------------------------- |
| [fast-outliner.md](fast-outliner.md)                   | Pre-flight scope, gaps, handoffs   | [fast-outliner/](fast-outliner/)                   |
| [frontend-design.md](frontend-design.md)               | Branded/landing visual composition | [frontend-design/](frontend-design/)               |
| [frontend-implementer.md](frontend-implementer.md)     | Portal UI implementation           | [frontend-implementer/](frontend-implementer/)     |
| [ai-docs-sync.md](ai-docs-sync.md)                     | AI surfaces + docs drift           | [ai-docs-sync/](ai-docs-sync/)                     |
| [sceptic.md](sceptic.md)                               | Adversarial review                 | [sceptic/](sceptic/)                               |
| [idle-runner.md](idle-runner.md)                       | Parallel safe work while blocked   | [idle-runner/](idle-runner/)                       |
| [ai-maintenance-checker.md](ai-maintenance-checker.md) | Background AI layout janitor       | [ai-maintenance-checker/](ai-maintenance-checker/) |
| [vercel-brand-sync.md](vercel-brand-sync.md)           | Vercel-family brand assets         | [vercel-brand-sync/](vercel-brand-sync/)           |
| [openspec.md](openspec.md)                             | OpenSpec change lifecycle (CLI)    | [openspec/](openspec/)                             |
| [aider.md](aider.md)                                   | Aider surgical headless edits      | [aider/](aider/)                                   |
| [goose.md](goose.md)                                   | Goose recipes / MCP automation     | [goose/](goose/)                                   |
| [omp.md](omp.md)                                       | omp heavy headless coding          | [omp/](omp/)                                       |

## Shared

- [_shared/references/](_shared/references/) — gold contract, skills runtime, [external-cli-matrix.md](_shared/references/external-cli-matrix.md)

## Validate

```bash
pnpm ai check
```

## Related

- Skills: `.cursor/skills/README.md`
- Hooks: `.cursor/hooks.json`
- Kiro gates: `.kiro/agents/default.json`
