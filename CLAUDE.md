# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Arch Systems (Plantcor)** — Industrial mining-operations portal. pnpm + Turborepo monorepo with a Next.js 16 portal, NestJS API, and shared `@repo/*` packages. Supabase for auth/DB, Redis for caching/rate-limiting, Inngest for background jobs, Sentry for error monitoring, OpenTelemetry for observability.

> **Canonical agent policy:** `AGENTS.md` (including §20 Alignment Score). Cursor rules in `.cursor/rules/` always apply. Do not drift.

## Essential Commands

```bash
pnpm dev              # Full stack: Docker infra + Next.js (Turbopack HMR on :3000)
pnpm dev --quick      # Portal only, skip Docker
pnpm build            # Turborepo full build
pnpm lint             # ESLint across all packages (--max-warnings 0 enforced)
pnpm type-check       # tsc --noEmit across all packages
pnpm test             # Jest across all packages
pnpm quality          # lint + type-check + test + prettier check (run before marking done)
pnpm format           # Prettier write
pnpm clean            # Remove .next and dist dirs
pnpm --filter portal <cmd>  # Run a command for just the portal app
```

## Architecture

### Monorepo Layout

```
apps/
  portal/             # Next.js 16 (App Router, src/ layout) — the only deployable app
  api/                # NestJS backend (REST API)
  ops-gateway/        # Operations gateway service
packages/
  auth/               # @repo/auth/{ui,data-access,utils}
  contract/           # @repo/contract — shared Zod schemas / API contracts
  database/           # @repo/database — SQL migrations source of truth
  departments/        # @repo/departments/ui
  errors/             # @repo/errors — typed AppError classes
  eslint-config/      # @repo/eslint-config
  eval/               # @repo/eval — Python LLM eval suite
  hub/                # @repo/hub/ui
  logger/             # @repo/logger — structured logging
  rate-limiter/       # @repo/rate-limiter — Redis-backed
  redis/              # @repo/redis — shared ioredis singleton
  rust-bindings/      # @repo/rust-bindings
  shared/             # @repo/shared/{data-access,hooks,utils}
  supabase/           # @repo/supabase — server admin client + browser client
  theme/              # @repo/theme — Tailwind preset & design tokens
  typescript-config/  # @repo/typescript-config
  ui/                 # @repo/ui — shared headless React components
  utils/              # @repo/utils — pure utility helpers
scripts/              # dev.sh, shutdown.sh, validate-env.sh
```

### Portal src/ Layout

```
src/
  app/                # Next.js App Router: (auth), (hub), (departments), admin, api, docs
  components/         # Portal-specific: ai, nav, ui, system, weather, feedback, clock
  features/           # Feature modules: access-control, admin, analytics, auth, departments, hub
  hooks/              # Portal-specific hooks
  lib/                # ai, api, errors, jobs, observability, plugins, reports
  server/             # Edge middleware proxy (proxy.ts)
```

### Key Technology Choices

| Concern             | Choice                                                 |
| ------------------- | ------------------------------------------------------ |
| Framework           | Next.js 16 (App Router, Turbopack in dev)              |
| Language            | TypeScript 5.7 strict (no `any`, no `@ts-ignore`)      |
| Styling             | Tailwind CSS 3 via `@repo/theme` preset                |
| UI primitives       | `@repo/ui` (extend before reaching for Radix directly) |
| Client state        | Zustand 5 (global only)                                |
| Validation          | Zod 3 (all external input)                             |
| Auth / DB           | Supabase                                               |
| Caching / queues    | Redis via `@repo/redis`                                |
| Background jobs     | Inngest 4                                              |
| Observability       | OpenTelemetry + Sentry                                 |
| Error classes       | `@repo/errors` — AppError subclasses only              |
| Icons               | lucide-react only                                      |
| Package manager     | pnpm 9 (Never use npm or yarn)                         |
| Build orchestration | Turborepo 2                                            |
| Node                | >= 22 (Volta pin: 24)                                  |

## Spec-Driven Workflow (Mandatory)

Every non-trivial task follows a three-phase spec cycle. Spec files go in `.kiro/specs/<feature-slug>/`:

1. **Requirements** — numbered, testable acceptance criteria. Resolve ambiguities before proceeding.
2. **Design** — architecture, files changed, data flow, server/client boundaries, env vars, new packages. Get sign-off before coding.
3. **Tasks** — smallest independently-testable units, ordered to build on a passing baseline.

## Server vs Client Boundary

- **Server (default)**: Data fetching, DB access, secrets. Use `import "server-only"` for packages that must never reach the browser.
- **Client** (`"use client"`): Interactivity, browser APIs, hooks. Keep small — leaf nodes or thin wrappers.
- **Server Actions** (`"use server"`): Form mutations, data writes. Always validate with Zod, return `{ data } | { error }`, call `revalidatePath`/`revalidateTag` after mutations.
- Never import `@repo/supabase/server` or `@repo/redis` from a Client Component.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or any non-`NEXT_PUBLIC_` secret to the client.
- Never put `"use client"` on layout files.
- Never `fetch()` your own Next.js API routes from Server Components — call the data function directly.

## Component Conventions

- Page-level: `<FeatureName>Page` (Server Component, default export)
- Client interactive: `<FeatureName>Form`, `<FeatureName>Modal`, `<FeatureName>Table`
- Server data: `get<Resource>`, `list<Resource>`, `find<Resource>`
- Server mutations: `create<Resource>Action`, `update<Resource>Action`, `delete<Resource>Action`
- Always define `interface <Component>Props` — no inline object types on function signatures.
- Every `page.tsx` must export `metadata` (at minimum `title` and `description`).
- Add `loading.tsx` alongside any page that performs async data fetching.
- Every route segment that can fail needs an `error.tsx` (`"use client"`).

## Testing

- Unit tests live next to the file: `foo.ts` → `foo.test.ts`
- Integration tests for Server Actions in `__tests__/actions/`
- Jest with SWC transform, jsdom environment
- Every new utility in `packages/` needs at least one test
- Every Server Action needs happy-path + validation-failure test
- Coverage targets: lines 40%, branches 30%, functions 35%

## Git & Commits

- Conventional Commits: `type(scope): description` — types: `feat|fix|chore|docs|refactor|perf|test|ci|build`
- Scope is the package or app: `feat(portal): add dashboard stats`
- Husky enforces commitlint + lint-staged (ESLint + Prettier)
- Never force-push to `main`/`master`

## Key Rules

- Never use npm or yarn — use `pnpm add` only (pnpm 9)
- New packages must be added to `pnpm-workspace.yaml` and `turbo.json`
- Application logic goes in `apps/portal/`, not in `packages/`
- Packages never import from `apps/`
- Throw `AppError` subclasses from `@repo/errors` — never raw `new Error()` for domain errors
- **Light-only** UI (AGENTS.md §7 / DECISIONS #003). Login reference: `apps/portal/src/app/(auth)/login/page.tsx` — control paints via `--login-*`, shell via `--os-shell-*` (DECISIONS #010)
- All interactive elements must be keyboard-navigable with visible focus rings
- Use `next/image` for all images — never raw `<img>` tags. Exception: signed Supabase storage URLs with rotating signatures (e.g. `card-actions-view.tsx`) where `next/image` cannot handle URL expiry.
- Lazy-load heavy Client Components with `next/dynamic` + `{ ssr: false }`
- Never commit `.env.local` or any secrets

## Real-World Thinking & Proven Methods

### Engineering Principles (AGENTS.md §20.2)

- **Start with simplest solution** - Don't over-engineer; implement minimum viable solution first
- **Progressive enhancement** - Make it work → make it right → make it fast
- **Production mindset** - Consider monitoring, debugging, maintenance costs
- **Evidence-based decisions** - Prefer data over opinions, benchmark before optimizing
- **Learn from production** - Real user problems > theoretical edge cases
- **Fail fast** - Detect problems early, don't silently swallow errors

### Engineering Heuristics

- **YAGNI** - You Ain't Gonna Need It (don't build features before needed)
- **KISS** - Keep It Simple, Stupid (complexity = reliability enemy)
- **DRY** - Don't Repeat Yourself (but know when duplication beats wrong abstraction)
- **Single Responsibility** - One reason to change, one thing to fix
- **Measure everything** - Can't improve what you don't measure

## Alignment Scoring (AGENTS.md §20)

```
Alignment: <score>/100 [<PASS|FAIL>]
- Spec: <n>/20 — <evidence>
- Stack: <n>/15 — <evidence>
- Boundaries: <n>/15 — <evidence>
- Security: <n>/20 — <evidence>
- Quality: <n>/15 — <evidence>
- Verify: <n>/15 — <evidence>
Hard fails: <none | list>
```

**Pass threshold: ≥ 80**. Any AGENTS.md §18 never-do violation → **hard fail (score = 0)**.

### Scoring Dimensions

| Dimension         | Pts | Evidence Required                                                       |
| ----------------- | --- | ----------------------------------------------------------------------- |
| Spec compliance   | 20  | Multi-file → `.kiro/specs/` phases followed; single-file → N/A full pts |
| Stack fidelity    | 15  | pnpm, Next 16 patterns, `@repo/*`, no banned deps                       |
| Boundaries        | 15  | Server/client correct; no server-only imports in client                 |
| Security          | 20  | Zod on input; no secrets; no service-role leakage                       |
| Quality gate      | 15  | `pnpm quality` (or scoped equivalent) passed this session               |
| Real-world verify | 15  | Observed runtime/test/read evidence for the claim                       |

### Helper Commands

```bash
# Run interactive alignment score
node .cursor/skills/agent-alignment-score/scripts/score.mjs --interactive

# Check if multi-file change needs specs
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l

# Create spec directory
mkdir -p .kiro/specs/{feature-slug}
```

## Agents & Skills

Discovery index for project-local AI surfaces (policy source: `AGENTS.md`).

### Subagents (`.cursor/agents/`)

### Claude Code (Anthropic)

Hybrid layout: entry `<name>.md` + folder `<name>/`. Native mirror: `.claude/agents/`. Standard: [`.cursor/standards/claude-code/STANDARD.md`](.cursor/standards/claude-code/STANDARD.md).

| Agent                    | When to delegate                             |
| ------------------------ | -------------------------------------------- |
| `fast-outliner`          | Multi-step work — outline before specialists |
| `frontend-design`        | Branded/landing visual composition           |
| `frontend-implementer`   | Portal pages, components, Server Actions UI  |
| `ai-docs-sync`           | Skills, rules, agents, docs drift            |
| `ai-maintenance-checker` | Background AI layout/sync every prompt       |
| `sceptic`                | Before claiming done — adversarial review    |
| `idle-runner`            | Independent work while other agents blocked  |
| `vercel-brand-sync`      | Vercel-family brand assets                   |
| `openspec`               | OpenSpec change lifecycle (CLI)              |
| `aider`                  | Aider surgical headless edits                |
| `goose`                  | Goose recipes / MCP automation               |
| `omp`                    | omp heavy headless coding                    |

Routing: `.cursor/rules/04-subagent-auto-routing.mdc` · Maintenance: `.cursor/rules/06-ai-maintenance-background.mdc` · Hooks: `.cursor/hooks/README.md`

**AI system:** `pnpm ai` · `.cursor/standards/ai-system/STANDARD.md`

### Skills

| Location          | Skills                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `.cursor/skills/` | `agent-alignment-score`, `skill-self-improve`, `ai-system`, `skill-layout`, `agent-layout`, `claude-code-layout` |
| `.qoder/skills/`  | `quality`, `verify` (portal alias), `specs`, `dev`, `deploy`, `rls-audit`                                        |
| `.github/skills/` | `verify-changes`, `frontend-api-integration-patterns`, `acquire-codebase-knowledge`                              |

Each skill folder: `SKILL.md` + `scripts/` + `references/` + `assets/`. See `.cursor/skills/README.md` for layout and commands.

**Canonical standard:** `.cursor/standards/agent-skills/STANDARD.md` — full index (install, discovery, marketplaces, curated collections).

**Validate:** `pnpm ai check` (unified — skills + agents + claude-code + guardrails)

**Agents:** hybrid layout per `.cursor/standards/agent-layout/STANDARD.md`

**Claude Code:** `.claude/` + [`.cursor/standards/claude-code/STANDARD.md`](.cursor/standards/claude-code/STANDARD.md)

**Score split:** `sceptic` → verdict + estimate; `agent-alignment-score` → formal score block.
