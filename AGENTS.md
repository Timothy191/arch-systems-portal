# AGENTS.md — Arch Systems Agent Rulebook

This file governs every AI agent (Kiro, Copilot, Claude, GPT, or any agentic tool) operating
inside this repository. Rules here are non-negotiable and take precedence over model defaults.

---

## 1. Spec-Driven Workflow — Mandatory for All Non-Trivial Tasks

Every feature, bugfix, or refactor that touches more than one file **must** follow the three-phase
spec cycle. Never write implementation code before completing the relevant phase.

### Phase 1 — Requirements (`*.spec.md › requirements`)

1. Read the user request carefully. Restate it in your own words.
2. List every concrete requirement as a numbered, testable acceptance criterion.
3. Call out ambiguities and ask the user to resolve them before proceeding.
4. Do not guess at missing requirements.

### Phase 2 — Design (`*.spec.md › design`)

1. Describe the architecture: which files change, which are created, what the data flow is.
2. Map server vs client boundaries explicitly (see §4).
3. Name every new route, component, Server Action, or API route handler.
4. List environment variables required.
5. Identify any new packages needed and justify them.
6. Get user sign-off before writing a single line of implementation.

### Phase 3 — Tasks (`*.spec.md › tasks`)

1. Break the design into the smallest independently-testable units of work.
2. Order them so each task builds on a passing baseline.
3. Mark each task complete only after the build and relevant tests pass.
4. Never skip a task to save time.

### Spec File Location

```
.kiro/specs/<feature-slug>/
  requirements.md
  design.md
  tasks.md
```

---

## 2. Monorepo Layout — Know Where Things Live

```
apps/
  portal/          # Next.js 16 app (App Router, src/ layout) — the only deployable app
apps(legacy)/      # Deprecated apps (portal, cms, overview) — do not modify
packages/
  errors/          # @repo/errors  — typed AppError classes
  redis/           # @repo/redis   — shared ioredis singleton
  supabase/        # @repo/supabase — server-only admin client + browser client
  theme/           # @repo/theme   — Tailwind preset & design tokens
  ui/              # @repo/ui      — shared headless React components
  utils/           # @repo/utils   — pure utility helpers
  logger/          # @repo/logger  — structured logging
  rate-limiter/    # @repo/rate-limiter — Redis-backed rate limiting
  contract/        # @repo/contract — shared Zod schemas / API contracts
  auth/            # @repo/auth/ui, @repo/auth/data-access, @repo/auth/utils
  shared/          # @repo/shared/data-access, @repo/shared/hooks, @repo/shared/utils
  departments/     # @repo/departments/ui
  hub/             # @repo/hub/ui
  eslint-config/   # @repo/eslint-config
  typescript-config/ # @repo/typescript-config
scripts/           # Shell helpers (dev.sh, shutdown.sh)
```

**Portal `src/` layout:**
```
apps/portal/src/
  app/          # Next.js App Router pages, layouts, route handlers
  components/   # Portal-specific React components
  features/     # Feature modules (access-control, admin, auth, departments, hub)
  hooks/        # Portal-specific hooks
  lib/          # Shared lib (ai, api, auth, cache, env, errors, jobs, plugins)
  server/       # Edge middleware proxy (proxy.ts)
```

**Rules:**

- Never add application logic to `packages/`. They are pure, framework-agnostic libraries.
- Never import from `apps/` inside `packages/`.
- Always add new workspace packages to `pnpm-workspace.yaml` and `turbo.json`.
- Use `workspace:*` for internal package references in `package.json`.

---

## 3. Technology Stack — Use What Is Already Here

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | `apps/portal` — React 19, Turbopack in dev |
| Language | TypeScript 5.7 strict | No `any`, no `@ts-ignore` |
| Styling | Tailwind CSS 3 | Use `@repo/theme` preset |
| UI primitives | `@repo/ui` | Extend before reaching for shadcn or Radix directly |
| State (client) | Zustand 5 | Only for global client state |
| Validation | Zod 3 | All external input: forms, API payloads, env vars |
| Auth / DB | Supabase | `@repo/supabase/server` (server), `@repo/supabase/client` (browser) |
| Caching / queues | Redis via `@repo/redis` | Rate-limiting, session caching |
| Background jobs | Inngest 4 | `/api/inngest` route handler, step functions |
| Observability | OpenTelemetry | `@opentelemetry/*` + `@vercel/otel`, traces to OTLP |
| Error monitoring | Sentry | `@sentry/nextjs` — source maps uploaded in CI only |
| Error classes | `@repo/errors` | `AppError` subclasses only — no raw `new Error()` for domain errors |
| Animations | Framer Motion 12 | Use sparingly; prefer CSS transitions for layout |
| Icons | lucide-react | Do not introduce a second icon library |
| Toast / notifications | sonner | Do not add react-toastify or similar |
| Package manager | pnpm 9 | Never use npm or yarn commands |
| Build orchestration | Turborepo 2 | `turbo run <task>` — never raw `tsc` or `next build` at root |
| Node | ≥ 22 (Volta pin: 24) | |

**Do not add new dependencies without prior design-phase approval.**
If a package already exists in the repo that solves the problem, use it.

---

## 4. Next.js App Router Rules

### 4.1 Server vs Client Boundary

| Runs where | Directive | When to use |
|---|---|---|
| Server (default) | _(none)_ | Data fetching, DB access, secrets |
| Server only | `import "server-only"` | Packages that must never reach the browser |
| Client | `"use client"` | Interactivity, browser APIs, hooks |
| Server Action | `"use server"` | Form mutations, data writes from the client |

**Rules:**

- Default to Server Components. Add `"use client"` only when required.
- Never import `@repo/supabase/server` or `@repo/redis` from a Client Component.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or any non-`NEXT_PUBLIC_` secret to the client.
- All `"use client"` components must be leaf nodes or thin wrappers — keep them small.
- Do not put `"use client"` on layout files.

### 4.2 Data Fetching

- Fetch data in Server Components using `async/await` directly — no `useEffect` for initial data.
- Use `fetch` with explicit `{ cache: 'force-cache' }` or `{ next: { revalidate: N } }` when caching is desired. Default is `no-store` in Next.js 16.
- Co-locate data-fetching functions in a `_actions/` or `_data/` folder next to the route segment.
- Use React `cache()` to deduplicate DB calls within a single request.
- Never `fetch()` your own Next.js API routes from Server Components — call the data function directly.

### 4.3 Routing & File Conventions

```
src/app/
  [locale]/           # i18n route group (future)
    (auth)/           # auth route group — no shared layout with dashboard
      login/
        page.tsx
    (dashboard)/      # protected route group
      layout.tsx      # ← auth guard lives here
      page.tsx
  api/
    health/
      route.ts        # Route Handlers only for true REST/webhook endpoints
  layout.tsx          # Root layout — metadata, fonts, providers
  error.tsx           # "use client" error boundary
  not-found.tsx       # 404 boundary
  page.tsx            # Root redirect
```

- Use Route Groups `(name)` to share layouts without affecting the URL.
- Parallel Routes and Intercepting Routes are acceptable for modals/drawers.
- Prefer Server Actions over Route Handlers for form submissions and mutations.
- Route Handlers are only for webhooks, OAuth callbacks, and third-party integrations.

### 4.4 Server Actions

```typescript
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AppError } from "@repo/errors";

const schema = z.object({ name: z.string().min(1) });

export async function createItemAction(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }
  // … DB write …
  revalidatePath("/dashboard");
}
```

- Always validate with Zod before touching the database.
- Return `{ data }` or `{ error }` — never throw from a Server Action.
- Call `revalidatePath` or `revalidateTag` after mutations.

### 4.5 Metadata

- Every `page.tsx` must export a `metadata` object or a `generateMetadata` function.
- Include at minimum `title` and `description`.
- Use the [metadata file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata) for `opengraph-image`, `favicon`, etc.

### 4.6 Loading & Suspense

- Add `loading.tsx` alongside any `page.tsx` that performs async data fetching.
- Wrap expensive or async sections in `<Suspense fallback={<Spinner />}>`.
- Use the `<Spinner />` component from `@repo/ui`.

### 4.7 Error Handling

- Every route segment that can fail needs an `error.tsx` (must be `"use client"`).
- Throw `AppError` subclasses from `@repo/errors` — never raw strings.
- Log errors server-side before rethrowing or returning.
- Do not expose stack traces or internal error details to the client.

---

## 5. TypeScript Rules

- `strict: true` is non-negotiable. No `any`. Use `unknown` + type guards instead.
- No `@ts-ignore` or `@ts-expect-error` without an explanatory comment and a tracking ticket.
- Export types alongside their implementations — co-locate them, don't create separate `types/` files unless they are truly shared across multiple packages.
- Use `satisfies` to validate object literals against types without widening.
- Prefer `interface` for public API shapes, `type` for unions, intersections, and utility types.
- Always type function return values explicitly for exported functions.

---

## 6. Component Architecture Rules

### 6.1 Structure

```
src/components/
  ui/           # Re-exports / thin wrappers around @repo/ui
  features/
    <feature>/
      <Feature>Page.tsx      # Page-level composition (Server Component)
      <Feature>Form.tsx      # "use client" form
      <Feature>Table.tsx     # "use client" interactive table
      _actions/
        create<Feature>.ts   # Server Actions
      _data/
        get<Feature>.ts      # Server-side data fetching
```

### 6.2 Naming

- Page-level: `<FeatureName>Page` (Server Component, exported as `default`)
- Client interactive: `<FeatureName>Form`, `<FeatureName>Modal`, `<FeatureName>Table`
- Server data: `get<Resource>`, `list<Resource>`, `find<Resource>`
- Server mutations: `create<Resource>Action`, `update<Resource>Action`, `delete<Resource>Action`
- Types: `<Resource>`, `<Resource>Input`, `<Resource>Row` (database row shape)

### 6.3 Props

- Always define a named `interface <Component>Props` — no inline object types on function signatures.
- Pass only the data a component needs. Avoid prop drilling beyond two levels; use composition or Zustand.
- Memoize with `React.memo` only after profiling proves a render bottleneck.

---

## 7. Styling Rules

- Tailwind utility classes only — no inline `style={{}}` except for truly dynamic values.
- Use the `@repo/theme` Tailwind preset; do not override design tokens ad-hoc.
- Dark mode is the default (gray-950 backgrounds, gray-900 cards).
- Interactive states must include `focus-visible:ring` — never remove focus outlines.
- Keep class lists readable: group by concern (layout → spacing → colour → typography → state).
- Use `cn()` (className merge helper) from `@repo/utils` or `clsx` for conditional classes if added.

---

## 8. Security Rules

- Never commit secrets. All secrets go in `.env.local` (gitignored).
- Every Server Action and Route Handler that requires authentication must verify the session **before** reading inputs.
- Rate-limit any public-facing mutation endpoint using `@repo/redis`.
- Validate all external input (forms, URL params, request bodies) with Zod before use.
- Use parameterised Supabase queries — never string-interpolated SQL.
- The Supabase service-role key (`SUPABASE_SERVICE_ROLE_KEY`) is server-only and must never appear in client bundles.
- Set `poweredByHeader: false` in `next.config.mjs` (already done).
- Apply Content Security Policy headers in `middleware.ts` for production.

---

## 9. Performance Rules

### Build & Bundle

- Enable `output: "standalone"` (already set) for Docker deployments.
- Use `next/image` for all images — never raw `<img>` tags. Configure `remotePatterns` explicitly.
- Use `next/font` for all custom fonts to eliminate layout shift.
- Lazy-load heavy Client Components with `next/dynamic` + `{ ssr: false }` when they are not critical path.
- Tree-shake icon imports: `import { IconName } from "lucide-react"` (already named imports).

### Caching Strategy

| Data type | Strategy |
|---|---|
| Static content | `force-cache` or ISR `revalidate` |
| User-specific data | `no-store` (per-request) |
| Shared mutable data | `revalidate` + `revalidateTag` on mutation |
| Heavy DB queries | `React.cache()` for request dedup |
| Rate-limit counters | Redis with TTL |

### Core Web Vitals Targets

- LCP < 2.5 s on a simulated 4G connection.
- CLS < 0.1 — always set `width` and `height` on images and media.
- INP < 200 ms — avoid long-running JS on the main thread.

---

## 10. Accessibility Rules

- All interactive elements must be keyboard-navigable and have a visible focus ring.
- Use semantic HTML: `<button>`, `<nav>`, `<main>`, `<header>`, `<form>`, `<label>` — not `<div>` onClick.
- Every `<img>` needs a meaningful `alt` attribute. Decorative images use `alt=""`.
- ARIA attributes are a last resort — prefer native HTML semantics.
- Colour contrast must meet WCAG 2.1 AA (4.5:1 text, 3:1 UI components).
- Forms must have `<label>` elements associated via `htmlFor` or wrapping — no placeholder-only labels.

---

## 11. Error Handling Patterns

```typescript
// Server Action — return errors, never throw to the client
export async function someAction(input: unknown) {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };

  try {
    const result = await db.doSomething(parsed.data);
    return { data: result };
  } catch (err) {
    console.error("[someAction]", err);
    if (isAppError(err)) return { error: err.toJSON() };
    return { error: { code: "INTERNAL_ERROR", message: "Unexpected error." } };
  }
}

// Route Handler — return proper HTTP status codes
export async function POST(request: Request) {
  try {
    // ...
    return Response.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return Response.json(err.toJSON(), { status: err.status });
    }
    return Response.json({ error: { code: "INTERNAL_ERROR" } }, { status: 500 });
  }
}
```

- Use `isAppError()` from `@repo/errors` to narrow errors.
- Log with `[context]` prefixes for easy grep-ability.
- Never swallow errors silently.

---

## 12. Environment Variables

| Variable | Used by | Visibility |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **Secret** |
| `REDIS_URL` | Server only | **Secret** |

- All new environment variables must be documented in `/apps/portal/.env.example`.
- Server-only variables must also be validated at startup (use the `getEnv()` pattern in `@repo/supabase/server`).
- Never prefix a secret with `NEXT_PUBLIC_`.

---

## 13. Git & Commit Rules

- Follow Conventional Commits: `type(scope): description`
  - `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`
- Scope is the package or app: `feat(portal): add dashboard stats`
- Commits must pass `lint-staged` (ESLint + Prettier) and `commitlint` — hooks are enforced via Husky.
- Never force-push to `main`/`master`.
- Never commit `.env.local` or any file matching `.env*.local`.
- Always create a feature branch; open a PR for review.

---

## 14. Turbo & Build Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start all services (Docker infra + Next.js) |
| `pnpm build` | Turborepo full build |
| `pnpm lint` | ESLint across all packages |
| `pnpm type-check` | TypeScript strict check across all packages |
| `pnpm test` | Jest across all packages |
| `pnpm quality` | lint + type-check + test + prettier check |
| `pnpm format` | Prettier write |
| `pnpm clean` | Remove `.next` and `dist` dirs |

- Always run `pnpm quality` before marking a task complete.
- Fix all ESLint warnings — `--max-warnings 0` is enforced.
- Fix all TypeScript errors — `noEmit` strict check is enforced.

---

## 15. Testing Rules

- Unit tests live next to the file they test: `foo.ts` → `foo.test.ts`.
- Integration tests for Server Actions live in `__tests__/actions/`.
- Test runner is Jest (configured per-app). Run with `--passWithNoTests` for now.
- Every new utility function in `packages/` must have at least one test.
- Every Server Action must have at least one happy-path and one validation-failure test.
- Do not test implementation details — test behaviour and outputs.
- Mocking: prefer `jest.mock()` for external services; never mock `@repo/utils` or `@repo/errors`.

---

## 16. Docker & Deployment Rules

- The portal builds to a standalone Docker image (`output: "standalone"`).
- The `Dockerfile` lives at `apps/portal/Dockerfile`.
- Do not include `node_modules` or `.next/cache` in the image.
- All secrets are injected as environment variables at runtime — never baked into the image.
- Use `docker-compose.yml` at the repo root for local infrastructure (Redis, Postgres via Supabase local).

---

## 17. Agent Self-Check Checklist

Before responding "done" on any task, verify each item:

- [ ] Phase 1 requirements written and approved (for multi-file changes)
- [ ] Phase 2 design written and approved (for multi-file changes)
- [ ] Phase 3 tasks completed in order
- [ ] `pnpm quality` passes (lint + type-check + test + format)
- [ ] No new `any` types introduced
- [ ] No secrets committed or logged
- [ ] Server/client boundaries respected
- [ ] All new environment variables in `.env.example`
- [ ] New components have `interface <Name>Props` defined
- [ ] New pages export `metadata`
- [ ] New Server Actions validate with Zod and return `{ data } | { error }`
- [ ] `@repo/errors` AppError subclasses used for all domain errors
- [ ] Accessibility: semantic HTML, focus rings, labels, alt text
- [ ] Performance: `next/image` used, no unnecessary `"use client"`, no fetch-your-own-api antipattern
- [ ] Git: conventional commit message, no secrets staged
- [ ] Alignment Score ≥ 80 emitted (AGENTS.md §20); any §18 never-do → hard fail
- [ ] Claims backed by OBSERVE→VERIFY evidence (not speculation)

---

## 18. What Agents Must Never Do

- Never generate or suggest `npm install` or `yarn add` — use `pnpm add`.
- Never add `"use client"` to a layout file.
- Never call `fetch("/api/...")` from a Server Component.
- Never expose service-role credentials to the client bundle.
- Never skip Zod validation on user input.
- Never use `console.log` in production code — use structured `console.error`/`console.warn` with context prefixes.
- Never hard-code URLs, ports, or environment-specific values.
- Never create a new `packages/` entry without updating `pnpm-workspace.yaml` and `turbo.json`.
- Never skip the spec phases for tasks that change more than one file.
- Never mark a task complete without running the quality check.

---

## 19. Legacy & Migration Notes

- `apps(legacy)/` contains deprecated apps (portal, cms, overview). **Do not modify these** — they are kept for reference during the migration to the new `apps/portal/`.
- The new portal uses a `src/` directory layout (`apps/portal/src/app/`, `apps/portal/src/components/`, etc.).
- PWA is implemented via a manual service worker at `apps/portal/public/sw.js`. The `next-pwa` plugin is disabled because Next.js 16 + Turbopack doesn't support PWA plugins.
- When adding new features, always work in `apps/portal/src/`, never in `apps(legacy)/`.

---

## 20. Alignment, Real-World Logic & Scoring (No Drift)

`AGENTS.md` is the single source of truth. Cursor (`.cursor/rules/`), Qoder (`.qoder/rules/`), and Kiro (`.kiro/agents/default.json`) must mirror this file — never invent conflicting policy.

### 20.1 Thought process

Every non-trivial decision follows:

```
OBSERVE → HYPOTHESIZE → VERIFY → ACT → SCORE
```

- **Observe** facts from the repo or runtime (cite paths).
- **Hypothesize** in one sentence.
- **Verify** with a tool call before treating the hypothesis as true.
- **Act** with a minimal diff supported by evidence.
- **Score** before claiming done (below).

Guessing, “should work”, or unverified claims are forbidden.

### 20.2 Real-World Proven Methods & Practical Thinking

In addition to the spec-driven workflow, agents must apply real-world engineering principles:

#### A. Practical Problem-Solving Approach
1. **Start with the simplest solution that works** - Don't over-engineer
2. **Progressive enhancement** - Make it work, then make it right, then make it fast
3. **Test in production-like environments** - Not just local "it works on my machine"
4. **Consider operational realities** - Monitoring, debugging, maintenance costs
5. **Learn from production incidents** - Real bugs > theoretical edge cases

#### B. Engineering Heuristics
- **You Ain't Gonna Need It (YAGNI)** - Don't build features before they're needed
- **Keep It Simple, Stupid (KISS)** - Complexity is the enemy of reliability
- **Don't Repeat Yourself (DRY)** - But know when duplication is better than wrong abstraction
- **Single Responsibility Principle** - One reason to change, one thing to fix
- **Fail Fast** - Detect problems early, don't silently swallow errors

#### C. Production-Ready Thinking
1. **Assume failure will happen** - Design for it
2. **Measure everything** - You can't improve what you don't measure
3. **Automate repetitive tasks** - But keep humans in the loop for critical decisions
4. **Document for the next person** - Not for yourself today
5. **Prioritize based on impact** - Fix what users actually experience

#### D. Evidence-Based Decision Making
- **Prefer data over opinions** - "I think" → "The logs show"
- **Benchmark before optimizing** - Don't guess what's slow
- **A/B test when uncertain** - Let real usage decide
- **Monitor before and after changes** - Prove your improvement
- **Learn from similar systems** - Don't reinvent proven patterns

### 20.3 Alignment Score

Before responding “done” on non-trivial work, emit:

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

| Dimension | Max | Meaning |
|---|---:|---|
| Spec compliance | 20 | Multi-file → `.kiro/specs/` phases followed |
| Stack fidelity | 15 | pnpm, approved stack, `@repo/*` |
| Boundaries | 15 | Server/client rules respected |
| Security | 20 | Zod, no secrets, no service-role leakage |
| Quality gate | 15 | `pnpm quality` (or scoped equivalent) passed |
| Real-world verify | 15 | Test/runtime/read evidence for the claim |

- **Pass threshold: ≥ 80**
- Any §18 never-do → **hard fail (score = 0)**
- Helper: `node .cursor/skills/agent-alignment-score/scripts/score.mjs --interactive`
- Skill: `.cursor/skills/agent-alignment-score/SKILL.md`
- Hooks: `.cursor/hooks.json` (session reminder + forbidden-command block)
