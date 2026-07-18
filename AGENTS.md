# AGENTS.md

This file provides guidance to the AI agent when working with code in this repository.

> **Canonical rulebook for all AI agents.** Rules here are non-negotiable and take precedence over model defaults.
> Detailed rules are in `@.qoder/rules/` (loaded automatically): `code-style.md`, `security.md`, `testing.md`, `spec-driven-workflow.md`, `alignment-scoring.md`.

## Commands

```bash
pnpm dev              # Full stack: Docker infra + Next.js (Turbopack HMR on :3000)
pnpm dev --quick      # Portal only, skip Docker
pnpm build            # Turborepo full build
pnpm quality          # lint + type-check + test + prettier check (run before marking done)
pnpm format           # Prettier write
pnpm --filter portal <cmd>  # Target one package
pnpm audit:rls        # Verify RLS after migration changes
pnpm policy:gen       # Regenerate dependency boundary rules
```

ESLint `--max-warnings 0`; tsc `noEmit` strict; Jest `--passWithNoTests`.

## Monorepo Layout

```
apps/
  portal/             # Next.js 16 (App Router, src/ layout) — the only deployable app
apps(legacy)/         # Deprecated — DO NOT MODIFY
packages/
  errors/             # @repo/errors — typed AppError classes
  redis/              # @repo/redis — shared ioredis singleton
  supabase/           # @repo/supabase — server admin client + browser client
  theme/              # @repo/theme — Tailwind preset & design tokens
  ui/                 # @repo/ui — shared headless React components
  utils/              # @repo/utils — pure utility helpers
  contract/           # @repo/contract — shared Zod schemas
  auth/               # @repo/auth/{ui,data-access,utils}
  shared/             # @repo/shared/{data-access,hooks,utils}
  rate-limiter/       # @repo/rate-limiter — Redis-backed
  logger/             # @repo/logger — structured logging
  database/           # @repo/database — SQL migrations source of truth
scripts/              # dev.sh, shutdown.sh
```

**Portal `src/` layout:**

```
apps/portal/src/
  app/          # Next.js App Router: (auth), (hub), (departments), admin, api
  components/   # Portal-specific React components
  features/     # Feature modules (access-control, admin, auth, departments, hub)
  hooks/        # Portal-specific hooks
  lib/          # Shared lib (ai, api, errors, jobs, observability, plugins)
  server/       # Edge middleware proxy (proxy.ts)
```

- Never add application logic to `packages/` — they are pure, framework-agnostic libraries.
- Never import from `apps/` inside `packages/`.
- New packages must be added to `pnpm-workspace.yaml` and `turbo.json`.

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
| Package manager | pnpm 9                  | Never npm or yarn                                                   |
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

- `apps(legacy)/` is deprecated — **do not modify**. Work in `apps/portal/src/` only.
- PWA uses manual service worker at `apps/portal/public/sw.js` (next-pwa disabled for Next 16 + Turbopack).

## What Agents Must Never Do

- Never use `npm install` or `yarn add` — use `pnpm add`.
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
