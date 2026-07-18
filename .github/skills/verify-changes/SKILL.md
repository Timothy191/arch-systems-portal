---
name: verify-changes
description: >-
  Run project-wide format, lint, type-check, and tests. Use before PR or when
  validating a broad change set. Anti-trigger: do not replace agent-alignment-score;
  for portal-only scoped checks use quality skill portal mode.
---

# Verifying Changes

Full monorepo stability check (format → lint → type-check → test).

## Workflow

1. Run `scripts/verify.sh` from repo root
2. On any failure: stop, report package/file and error
3. Do not claim done without pass evidence

## Scripts

```bash
.github/skills/verify-changes/scripts/verify.sh
```

## References

- [`references/steps.md`](references/steps.md) — command sequence and failure handling
