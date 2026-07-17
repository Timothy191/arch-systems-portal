---
name: agent-alignment-score
description: >-
  Score agent work against AGENTS.md for drift, real-world verification, and
  quality gates. Use before claiming done, after multi-file changes, or when
  asked to check alignment / score / no-drift compliance.
---

# Agent Alignment Score

Run this skill before marking any non-trivial task complete.

## When to use

- User asks to score, align, check drift, or verify compliance
- Before saying "done" on multi-file or production-facing work
- After a subagent returns and you need a synthesis gate

## Procedure

1. Load rubric from `.cursor/rules/02-agent-scoring.mdc` (canonical weights).
2. Gather evidence:
   - Specs under `.kiro/specs/<slug>/` if multi-file
   - Diff / files touched this session
   - Quality command result (`pnpm quality` or scoped lint/type-check/test)
   - Real-world verify: test output, runtime log, or cited code proof
3. Score each dimension 0–max. Any AGENTS.md §18 never-do → hard fail (total 0).
4. Emit the required score block from `02-agent-scoring.mdc`.
5. If FAIL (< 80 or hard fail): list concrete fixes; do not claim done.

## CLI helper

```bash
node .cursor/skills/agent-alignment-score/scripts/score.mjs \
  --spec 20 --stack 15 --boundaries 15 --security 20 --quality 15 --verify 15 \
  --hard-fail false
```

Interactive checklist:

```bash
node .cursor/skills/agent-alignment-score/scripts/score.mjs --interactive
```

## Real-world logic reminder

Scores for Verify must cite evidence (command output, file path, test name). Guessing = 0 on Verify.
