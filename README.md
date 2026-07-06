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

## Multi-Device Workflow (HP Zbook & Work-remote-server)

To work seamlessly between your two machines (`HP Zbook` and `Work-remote-server`), follow these steps to ensure both stay updated and push to `main` without conflicts:

### 1. Initial Setup on Work-remote-server

On your `Work-remote-server`, open a terminal and clone the repository:

```bash
git clone https://github.com/Timothy191/Project-One-Server.git
cd Project-One-Server
pnpm install
```

### 2. Starting a Work Session (Any PC)

**Always pull the latest changes** before you start coding to sync changes made from the other machine:

```bash
git checkout main
git pull origin main
pnpm install # (if dependencies were updated)
```

### 3. Ending a Work Session (Any PC)

When you finish your coding session, commit and push your changes so the other machine can access them:

```bash
git add .
git commit -m "feat: your descriptive commit message"
git push origin main
```

**Golden Rule:** Always remember to `git push` when you step away from the `HP Zbook`, and `git pull` when you sit down at the `Work-remote-server` (and vice versa).

## AI Assistant Initialization Prompt

When you clone this repository onto your new machine (`Work-remote-server`), copy and paste the following prompt into your Agentic AI (e.g., Antigravity, Claude Code, etc.) to immediately synchronize its codebase intelligence, rebuild the RepoWiki, and restore project memories without needing to push the large database cache files:

> **System Initialization Request:**
> Please initialize the local AI environment for this repository to match the primary workspace.
>
> 1. Run `pnpm install` if you haven't already.
> 2. Rebuild the Repowise index and codebase intelligence graphs by executing the update command: `./.aistack/tools/repowise/.venv/bin/repowise update -w --index-only`.
> 3. Review the `.agentic-tools-mcp/repowiki/` folder to absorb the central architecture, database structures, and development guidelines.
> 4. Ensure you have read and are strictly following the rules defined in `.agents/AGENTS.md` and `CLAUDE.md`.
> 5. Read the most recent entries in `.agentic-tools-mcp/memories/` to restore your working context.
> 6. Provide a brief summary of the workspace state and confirm you are ready to continue coding.

## License

MIT
