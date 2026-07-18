# Verify Steps

Run in order; stop on first failure:

1. **Format:** `pnpm format:check`
2. **Lint:** `pnpm lint`
3. **Type-check:** `pnpm type-check`
4. **Tests:** `pnpm test`

On format failure, user may run `pnpm format` then re-verify.

Equivalent to portions of `pnpm quality` but explicit step reporting for Copilot workflows.
