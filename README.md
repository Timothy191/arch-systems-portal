# Arch-Systems (Plantcor)

Industrial mining-operations portal.

A pnpm + Nx monorepo containing three Next.js 16 / React 19 apps and shared packages.

## Apps

| App             | Port   | Description                 |
| --------------- | ------ | --------------------------- |
| `apps/portal`   | `3000` | Operations dashboard (main) |
| `apps/cms`      | `3001` | Payload CMS v3              |
| `apps/overview` | `3002` | Architecture/flow viewer    |

## Packages

| Package                                                                         | Purpose                                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `@repo/supabase`                                                                | Data access layer (server/client, Kysely, typed DB) |
| `@repo/database`                                                                | SQL migrations source of truth                      |
| `@repo/theme`                                                                   | Design tokens + Tailwind preset                     |
| `@repo/ui`                                                                      | shadcn-style primitives                             |
| `@repo/redis`                                                                   | Caching                                             |
| `@repo/rate-limiter`                                                            | Rate limiting                                       |
| `@repo/eval`                                                                    | Python LLM eval suite                               |
| `@repo/errors`, `@repo/utils`, `@repo/eslint-config`, `@repo/typescript-config` | Shared support                                      |

## Tooling

- **Package manager:** pnpm 9.15.9 (Node >=22, Volta pins 24.15.0)
- **Orchestration:** Nx 22.7.5
- **Lint/Format:** ESLint + Prettier
- **E2E:** Playwright
- **Quality gate:** `pnpm quality`

## Common commands

```bash
pnpm dev              # Supabase + Portal + health checks + browser
pnpm dev --quick      # Portal only, no Docker
pnpm quality          # lint + type-check + test + token/css lint + format + syncpack + knip
pnpm build            # Build everything
pnpm test             # Unit tests
pnpm test:e2e         # E2E (requires pnpm dev running)
pnpm format           # Format all files
```

## Documentation

- `CLAUDE.md` — Claude Code guidance for this repository
- `GEMINI.md` — Team working conventions
- `docs/` — VitePress wiki
- `tools/policy-definitions.ts` — Dependency/intent boundary SSoT

## License

MIT
