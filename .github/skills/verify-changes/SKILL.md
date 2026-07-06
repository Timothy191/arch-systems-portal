---
name: verify-changes
description: Runs project-wide formatting, lint check, typechecking, and tests to verify code stability.
---

# Verifying Changes

Follow these steps to run a full check on current changes:

1. **Format Check**: Run `pnpm format:check`.
2. **Lint Check**: Run `pnpm lint`.
3. **Type-Check**: Run `pnpm type-check`.
4. **Unit Tests**: Run `pnpm test`.

If any of the above checks fail, stop and notify the user about the details of the failure.
