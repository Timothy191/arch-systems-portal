# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

> **Canonical rulebook for all AI agents.** Rules here are non-negotiable and take precedence over model defaults.
> Detailed rules are in `@.qoder/rules/` (loaded automatically): `code-style.md`, `security.md`, `testing.md`, `spec-driven-workflow.md`, `alignment-scoring.md`.

## Two Layers (hard separation)

| Layer | Owns | Required to run the product? |
| ----- | ---- | ---------------------------- |
| **Product monorepo** | `apps/`, `packages/`, product `scripts/` (`dev.sh`, …), `turbo` tasks | **Yes** |
| **Agentic AI** | `.cursor/`, `.claude/`, skills/agents, `AGENTS.md`, `pnpm ai`, agent scripts | **No** |

Product `pnpm build` / `pnpm quality` / `pnpm dev` must not import or invoke AI surfaces. Full contract: [`.cursor/standards/layer-boundary/STANDARD.md`](.cursor/standards/layer-boundary/STANDARD.md).

## Commands

```bash
# ── Product (standalone) ──────────────────────────────────────────
pnpm dev              # Full stack: Docker infra + Next.js (Turbopack HMR on :3000)
pnpm dev --quick      # Portal only, skip Docker
pnpm build            # Turborepo full build
pnpm quality          # lint + type-check + test + prettier check (run before marking done)
pnpm format           # Prettier write (product paths; agentic dirs ignored)
pnpm --filter portal <cmd>  # Target one package
pnpm audit:rls        # Verify RLS after migration changes
pnpm policy:gen       # Regenerate dependency boundary rules

# ── Agentic AI (optional; CLI agents only) ────────────────────────
pnpm ai               # AI system health (guardrails, layouts, sync, dedupe, drift)
pnpm ai init          # First clone / cold start — restore + sync + validate
pnpm ai onboard       # Onboarding checklist for humans + agents
pnpm ai check         # Validate AI surfaces only
pnpm ai fix           # Safe repair + validate
```

ESLint `--max-warnings 0`; tsc `noEmit` strict; Jest `--passWithNoTests`.

## Monorepo Layout

```
apps/
  portal/                 # Next.js 16 (App Router) — primary deployable UI
  ops-gateway/            # Control-plane / MCP ops bridge (not product UI)
packages/
  contract/               # @repo/contract — shared Zod schemas
  database/               # @repo/database — SQL migrations source of truth
  departments/            # @repo/departments (+ ui/)
  errors/                 # @repo/errors — typed AppError classes
  eslint-config/          # @repo/eslint-config
  logger/                 # @repo/logger — structured logging
  rate-limiter/           # @repo/rate-limiter — Redis-backed
  redis/                  # @repo/redis — shared ioredis singleton
  supabase/               # @repo/supabase — server + browser clients
  theme/                  # @repo/theme — Tailwind preset & design tokens
  typescript-config/      # @repo/typescript-config
  ui/                     # @repo/ui — shared headless React components
  utils/                  # @repo/utils — pure utility helpers
scripts/                  # Product: dev.sh, shutdown.sh, … | Agentic: ai.sh, agency-*, …
```


**Portal `src/` layout:**

```
apps/portal/src/
  app/          # App Router: (auth), hub, (departments), admin, api, docs
  components/   # Portal-specific React components
  config/       # Portal config
  features/     # Feature modules (access-control, admin, analytics, auth, departments, hub)
  hooks/        # Portal-specific hooks
  lib/          # Shared lib (ai, api, errors, jobs, observability, reports, …)
```

- Never add application logic to `packages/` — they are pure, framework-agnostic libraries.
- Never import from `apps/` inside `packages/`.
- New packages must be added to `pnpm-workspace.yaml` and `turbo.json`.
- Product UI lives in `apps/portal/` only — do not treat `ops-gateway` as the app shell.

## Technology Stack

| Concern         | Choice                  | Notes                                                               |
| --------------- | ----------------------- | ------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) | React 19, Turbopack in dev                                          |
| Language        | TypeScript 5.7 strict   | No `any`, no `@ts-ignore`                                           |
| Styling         | Tailwind CSS 3          | `@repo/theme` preset; **light-only** (DECISIONS #003)               |
| UI primitives   | `@repo/ui`              | Extend before reaching for Radix                                    |
| Validation      | Zod 3                   | All external input                                                  |
| Auth / DB       | Supabase                | `@repo/supabase/server` (server), `@repo/supabase/client` (browser) |
| Caching         | Redis via `@repo/redis` | L1 memory + L2 Redis                                                |
| Background jobs | Inngest 4               | `/api/inngest` route handler                                        |
| Error classes   | `@repo/errors`          | `AppError` subclasses only                                          |
| Icons           | lucide-react            | Do not add a second icon library                                    |
| Toasts          | sonner                  | Do not add react-toastify                                           |
| Package manager | pnpm 9                  | Never use npm or yarn                                               |
| Build           | Turborepo 2             | `turbo run <task>`                                                  |
| Node            | >= 22 (Volta pin: 24)   |                                                                     |

**Do not add new dependencies without design-phase approval.**

## Environment Variables

| Variable                        | Visibility               |
| ------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Secret** (server only) |
| `REDIS_URL`                     | **Secret** (server only) |

- Document new vars in `apps/portal/.env.example`. Never prefix a secret with `NEXT_PUBLIC_`.

## Git & Commits

- Conventional Commits: `type(scope): description` — `feat|fix|chore|docs|refactor|perf|test|ci|build`
- Scope is the package or app: `feat(portal): add dashboard stats`
- Husky enforces commitlint + lint-staged (ESLint + Prettier)
- Never force-push to `main`/`master`. Never commit `.env*.local`.

## Performance & Accessibility

- Use `next/image` for all images — never raw `<img>`. Exception: signed Supabase storage URLs with rotating signatures (e.g. `card-actions-view.tsx`) where `next/image` cannot handle URL expiry. Use `next/font` for custom fonts.
- Lazy-load heavy Client Components with `next/dynamic` + `{ ssr: false }`.
- All interactive elements must be keyboard-navigable with visible focus rings.
- Semantic HTML: `<button>`, `<nav>`, `<form>`, `<label>` — not `<div>` onClick.
- WCAG 2.1 AA contrast (4.5:1 text, 3:1 UI). Forms need `<label>` via `htmlFor`.

## Legacy & Migration

- Product UI: `apps/portal/src/` only. Do not revive deleted Nest `apps/api` or legacy app trees as the primary surface.
- PWA uses manual service worker at `apps/portal/public/sw.js` (next-pwa disabled for Next 16 + Turbopack).

## What Agents Must Never Do

- Never use npm or yarn — use `pnpm add` only (pnpm 9).
- Never add `"use client"` to a layout file.
- Never `fetch("/api/...")` from a Server Component — call the data function directly.
- Never expose service-role credentials to the client bundle.
- Never skip Zod validation on user input.
- Never use `console.log` in production code — use `console.error`/`console.warn` with `[context]` prefixes.
- Never hard-code URLs, ports, or environment-specific values.
- Never create a `packages/` entry without updating `pnpm-workspace.yaml` and `turbo.json`.
- Never skip spec phases for multi-file changes (see `@.qoder/rules/spec-driven-workflow.md`).
- Never mark a task complete without running `pnpm quality`.

## Self-Check Checklist

Before responding "done":

- [ ] Spec phases followed (multi-file changes)
- [ ] `pnpm quality` passes
- [ ] No new `any` types
- [ ] No secrets committed or logged
- [ ] Server/client boundaries respected
- [ ] New env vars in `.env.example`
- [ ] Components have `interface <Name>Props`
- [ ] Pages export `metadata`
- [ ] Server Actions validate with Zod, return `{ data } | { error }`
- [ ] `@repo/errors` used for domain errors
- [ ] Accessibility: semantic HTML, focus rings, labels
- [ ] Conventional commit message, no secrets staged
- [ ] Alignment Score >= 80 (see `@.qoder/rules/alignment-scoring.md`)

## Project Agents & Skills

Canonical policy remains this file. Agents and skills **mirror** it — never fork policy.

### Project subagents (Cursor)

Fleet specialists under `.cursor/agents/` (see table). **Hybrid layout:** entry `<name>.md` + collateral `<name>/`. Standard: `.cursor/standards/agent-layout/STANDARD.md`. Auto-routing: `.cursor/rules/04-subagent-auto-routing.mdc`. CLI matrix: `.cursor/agents/_shared/references/external-cli-matrix.md`.

| Agent                    | Role                                        |
| ------------------------ | ------------------------------------------- |
| `fast-outliner`          | Pre-flight scope, gaps, handoffs            |
| `frontend-design`        | Branded/landing visual composition          |
| `frontend-implementer`   | Portal UI implementation (`apps/portal/`)   |
| `nextjs-fullstack`       | Next.js full-stack vertical slices (portal) |
| `ai-docs-sync`           | AI surfaces + docs drift audit              |
| `sceptic`                | Adversarial review + alignment **estimate** |
| `idle-runner`            | Safe parallel work while blocked            |
| `ai-maintenance-checker` | Background layout/sync/dedupe every prompt  |
| `vercel-brand-sync`      | Vercel-family brand assets                  |
| `openspec`               | OpenSpec change lifecycle (CLI)             |
| `aider`                  | Aider surgical headless edits               |
| `goose`                  | Goose recipes / MCP automation              |
| `omp`                    | omp heavy headless coding                   |
| `security`               | AppSec, vuln review, threat modeling        |
| `test-engineer`          | Test automation, flake diagnosis, E2E       |
| `db-optimizer`           | PostgreSQL/Supabase performance tuning      |
| `backend-architect`      | API design, service architecture            |
| `agency-lead`            | Coordinating background self-healing loops  |
| `agents-memory-updater`  | Update agent memory from transcripts        |
| `gap-analyst`            | System gap and compilation log analyzer     |
| `spec-auditor`           | OpenSpec & global constraint compliance     |
| `routing-optimizer`      | AI provider latency and cooldown optimizer  |
| `patch-builder`          | Executing automated repairs and patches     |
| `root-cause-healer`      | Verify hypothesis → fix → AI hardening      |
| `import-auditor`         | Import/path connectivity audit              |
| `ai-system-optimizer`    | AI surface bloat prune, layout compliance   |

**Unified AI command:** `pnpm ai` — see `.cursor/standards/ai-system/STANDARD.md`. Background rule: `.cursor/rules/06-ai-maintenance-background.mdc`.

**Cursor slash commands:** `.cursor/commands/` (e.g. `/swarm` — Claude Flow swarm lifecycle).

Gold contract: `.cursor/agents/_shared/references/gold-standard-contract.md`

### Claude Code (Anthropic)

Native surfaces under `.claude/`: `CLAUDE.md`, `settings.json`, `rules/`, synced `skills/` + `agents/`. Standard: `.cursor/standards/claude-code/STANDARD.md`. Sync: `.claude/scripts/sync-surfaces.sh`.

Reasoning contract: `SOUL.md` (project extension — import via `.claude/CLAUDE.md`).

### Third-party AI tool configs

The repo contains configuration directories for additional AI tools. These are **not managed** by the canonical policy (`AGENTS.md` / `.cursor/`) and are maintained by their respective tools:

| Tool | Path | Purpose |
| ---- | ---- | ------- |
| Qoder | `.qoder/agents/` | Qoder-specific agent definitions (5 agents) |
| Windsurf | `.windsurf/` | Windsurf IDE rules and harness config |
| Roo | `.roo/` | Roo CLI rules |
| Serena | `.serena/` | Serena editor project config |
| Grok | `.grok/` | Grok (xAI) settings |
| Devin | `.devin/` | Devin AI config |
| Claude Flow | `.swarm/` | Swarm orchestration |
| Generic | `.agents/` | Generic agent configs |

These configs are outside the canonical policy scope and may diverge from AGENTS.md.

### Project skills

| Surface               | Path              | Index                      |
| --------------------- | ----------------- | -------------------------- |
| Cursor (formal score) | `.cursor/skills/` | `.cursor/skills/README.md` |
| Qoder workflows       | `.qoder/skills/`  | `.qoder/skills/README.md`  |
| GitHub Copilot        | `.github/skills/` | `.github/skills/README.md` |

Standard layout per skill folder: `SKILL.md` + `scripts/` + `references/` + `assets/` (when needed).

**Canonical references:**

- Claude Code surfaces: `.cursor/standards/claude-code/STANDARD.md` (Anthropic official)
- Skill folders: `.cursor/standards/agent-skills/STANDARD.md`
- Agent layout: `.cursor/standards/agent-layout/STANDARD.md`

| Skill                                 | Owner                                  |
| ------------------------------------- | -------------------------------------- |
| `agent-alignment-score`               | Formal Alignment Score / gold enforcer |
| `skill-self-improve`                  | Hermes observe→distill→patch loop      |
| `ai-system`                           | Unified `pnpm ai` command              |
| `skill-layout` / `agent-layout`       | Skill + agent folder standards         |
| `claude-code-layout`                  | Claude Code `.claude/` surfaces        |
| `continual-learning`                  | Memory update from transcripts         |
| `provider-router`                     | Multi-provider model routing           |
| `redis-caching`                       | L1/L2 cache patterns                   |
| `quality` / `verify`                  | Quality gate (full / portal alias)     |
| `verify-changes`                      | GitHub/Copilot alias → `quality` full  |
| `specs`, `dev`, `deploy`, `rls-audit` | Qoder workflow commands                |

Quality aliases (`quality` / `verify` / `verify-changes`) are one family — see `.cursor/agents/_shared/references/agent-families.md`.

**Sceptic** emits verdict + estimate; **agent-alignment-score** emits the formal extended score block. Repeatable gaps → **skill-self-improve** (`.cursor/rules/07-adaptive-skill-loop.mdc`).

### Agent Communication & Delegation Protocol

When agents and subagents communicate and delegate tasks, they must adhere to the context sharing and asset handling contract defined in `.cursor/rules/08-agent-communication-delegation.mdc`:

1. **Prompts & References:** Explicitly pass system prompts, active references, and relevant files in the payload.
2. **Prior Calls:** Document prior agent calls, responses, and state modifications.
3. **Images:** If images are required, download them into a temp directory (e.g. `/tmp/attachments/`) and attach them as absolute file paths. Never send raw base64 or inline image URLs in plain text communication blocks.
