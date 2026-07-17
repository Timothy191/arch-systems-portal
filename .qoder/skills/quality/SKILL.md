---
name: quality
description: >-
  Full monorepo quality gate (lint + type-check + test + format) or portal-scoped
  mode. Use before marking work complete, pre-commit, or when verifying changes.
  Anti-trigger: do not replace sceptic adversarial review or agent-alignment-score;
  do not use portal mode to claim full monorepo quality; do not deploy.
---

# Quality Gate (full | portal)

Single quality skill with two modes. Prefer **full** before claiming done on multi-package or production-facing work.

## Mode selection

| Mode | When | Command |
|---|---|---|
| `full` (default) | Mark complete, pre-commit, multi-package, release | `pnpm quality` |
| `portal` | Portal-only change; scoped check enough | `pnpm --filter portal lint` + `type-check` + `test` |

`/verify` is an **alias** of this skill in `portal` mode — same steps, same output contract.

## Steps — full

1. Run:
   ```bash
   pnpm quality
   ```
   (`turbo run lint type-check test --concurrency=4 && pnpm format:check`)

2. On failure, report package, error, suggested fix.

3. If format fails:
   ```bash
   pnpm format
   ```
   Re-run `pnpm quality`.

## Steps — portal

1. ```bash
   pnpm --filter portal lint
   pnpm --filter portal type-check
   pnpm --filter portal test
   ```
2. Report pass/fail with paths. Never claim this equals full `pnpm quality`.

## Gold Standard Contract

**Required output:**

```
Mode: full | portal
Result: PASS | FAIL
Evidence:
- <command> → <exit / key line>
Failures (if any):
- <package/file>: <message> → <fix hint>
Next owner: parent | sceptic | agent-alignment-score — <one line>
```

**Evidence rule:** Cite real command output. No "should pass".

**Fluff ban:** No narrative beyond the template.

**Notes:** ESLint `--max-warnings 0`; tsc `noEmit`; Jest `--passWithNoTests`; Prettier on `**/*.{ts,tsx,md,json}`.
