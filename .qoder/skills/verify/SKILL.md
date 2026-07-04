---
name: verify
description: Run lint, type-check, and unit tests to verify code changes are correct before committing.
---

Run the following checks in order to verify the current changes:

1. `pnpm lint` — ESLint across all workspace packages
2. `pnpm type-check` — TypeScript strict mode check
3. `pnpm test` — Jest unit tests via Turborepo

If any step fails, report the errors clearly and stop. Do not proceed to the next step.

If the user specifies a package (e.g., `/verify portal`), scope all commands to that package:
- `pnpm --filter <pkg> lint`
- `pnpm --filter <pkg> type-check`
- `pnpm --filter <pkg> test`

After all checks pass, summarize what was verified.
