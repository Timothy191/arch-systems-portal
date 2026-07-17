---
name: verify
description: >-
  Portal-scoped quality alias (quality skill in portal mode). Use after
  portal-only changes when full monorepo pnpm quality is unnecessary.
  Anti-trigger: do not claim full monorepo quality; do not replace sceptic,
  deploy, specs, or agent-alignment-score.
---

# Verify (alias → quality / portal)

This skill is a **thin alias** of `.qoder/skills/quality` in **portal** mode.

## Steps

Follow **Quality Gate → Steps — portal** exactly:

```bash
pnpm --filter portal lint
pnpm --filter portal type-check
pnpm --filter portal test
```

## Gold Standard Contract

Identical to `quality` portal mode:

```
Mode: portal
Result: PASS | FAIL
Evidence:
- <command> → <exit / key line>
Failures (if any):
- <package/file>: <message> → <fix hint>
Next owner: parent | sceptic | agent-alignment-score — <one line>
```

For monorepo-wide gates, use `/quality` (full mode) instead.
