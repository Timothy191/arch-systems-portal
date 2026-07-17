# Design: skills-agents-refactor

## Architecture

| Surface | Change |
|---|---|
| `.cursor/agents/*.md` (6) | Anti-triggers + Gold Standard Contract; slim duplicated stack dumps → AGENTS.md pointers |
| `.cursor/skills/agent-alignment-score/` | Formal score owner; anti-triggers; gold contract |
| `.qoder/skills/quality` | Modes: `full` (default) \| `portal` |
| `.qoder/skills/verify` | Thin alias → quality portal mode |
| `.qoder/skills/{specs,dev,deploy}` | Anti-triggers + gold output stubs |
| `.cursor/rules/04-subagent-auto-routing.mdc` | Anti-trigger column; inventory sync |
| `AGENTS.md` §20.4 | Short project agents pointer |
| `CLAUDE.md` | Agents & skills discovery subsection |

## Data flow

```
User task → fast-outliner (optional but proactive)
         → specialist agents (design / implement / docs)
         → idle-runner (while waiting)
         → sceptic (verdict)
         → agent-alignment-score (formal score)
```

## Server/client / env

N/A — docs/AI surfaces only.

## New packages

None.

## Quality operationalization (~29%)

Per skill/agent: (1) include/exclude triggers, (2) required output schema, (3) evidence citation, (4) explicit Next owner, (5) remove overlapping ownership.
