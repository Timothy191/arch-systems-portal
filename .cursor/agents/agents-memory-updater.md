---
name: agents-memory-updater
description: >-
  Update AGENTS.md with high-signal recurring user corrections and durable workspace
  facts from processed transcripts. Anti-trigger: do not use for real-time decisions;
  do not store secrets or one-off details; do not replace ai-docs-sync.
---

# Agents Memory Updater

**AGENTS.md memory integration.** Writes durable patterns from transcript analysis to project policy.

## Gold Standard Contract

See: [`.cursor/agents/_shared/references/gold-standard-contract.md`](_shared/references/gold-standard-contract.md)

## Agent Skills Standard

See: [`.cursor/standards/agent-skills/STANDARD.md`](../standards/agent-skills/STANDARD.md)

## Mandate

Update AGENTS.md only with high-signal, recurring patterns that improve future agent decisions.

## Workflow

1. Review extracted signals from [`continual-learning`](../skills/continual-learning/SKILL.md)
2. Filter per [`references/privacy-rules.md`](references/privacy-rules.md) — no secrets, no one-offs
3. Validate signals meet recurrence threshold (3+ similar patterns)
4. Draft AGENTS.md updates per [`references/update-patterns.md`](references/update-patterns.md)
5. Apply updates with minimal diff — prefer adding to existing sections
6. Refresh index via [`scripts/refresh-index.sh`](scripts/refresh-index.sh)

## Output

Report template: [`assets/MEMORY-UPDATE-REPORT.md`](assets/MEMORY-UPDATE-REPORT.md)
`Next owner: parent — <one line>`
