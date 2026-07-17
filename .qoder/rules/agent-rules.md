---
description: Reference to AGENTS.md rulebook for agent behavior
globs: ["**/*"]
---

# AGENTS.md Reference Rule

## Primary Reference

All agents must follow the rules defined in the root `AGENTS.md` file. This rule serves as a pointer to that comprehensive rulebook.

## Key Sections

### 1. Spec-Driven Workflow (AGENTS.md §1)
- Mandatory for all non-trivial tasks (multi-file changes)
- Three-phase cycle: Requirements → Design → Tasks
- Spec location: `.kiro/specs/{feature-slug}/`

### 2. Monorepo Layout (AGENTS.md §2)
- `apps/portal/` — only deployable Next.js 16 app
- `apps(legacy)/` — DO NOT MODIFY (deprecated)
- `packages/` — framework-agnostic libraries
- Rules: Never add app logic to packages, never import from apps inside packages

### 3. Technology Stack (AGENTS.md §3)
- Next.js 16 (App Router), TypeScript 5.7 strict
- Tailwind CSS 3 with `@repo/theme` preset
- `@repo/ui` primitives (extend before shadcn/Radix)
- Zustand 5, Zod 3, Supabase via `@repo/supabase`
- pnpm 9, Turborepo 2, Node ≥ 22

### 4. Next.js App Router Rules (AGENTS.md §4)
- Default to Server Components, add "use client" only when required
- Never import `@repo/supabase/server` or `@repo/redis` from Client Components
- Never expose service-role keys to client
- Prefer Server Actions over Route Handlers for forms
- All pages must export `metadata`

### 5. TypeScript Rules (AGENTS.md §5)
- `strict: true` — no `any`, no `@ts-ignore`
- Use `unknown` + type guards instead of `any`
- Use `satisfies` for object literals
- Always type function return values explicitly

### 6. Component Architecture (AGENTS.md §6)
- Always define `interface <Component>Props`
- Page-level: `<FeatureName>Page` (Server Component)
- Client interactive: `<FeatureName>Form`, `<FeatureName>Modal`
- Server data: `get<Resource>`, `list<Resource>`
- Server mutations: `create<Resource>Action`, etc.

### 7. Security Rules (AGENTS.md §8)
- Never commit secrets (`.env.local` gitignored)
- Validate all external input with Zod
- Rate-limit public mutation endpoints
- Parameterised Supabase queries only

### 8. Real-World Thinking (AGENTS.md §20.2)
- **Practical problem-solving** - Start simple, progressive enhancement
- **Engineering heuristics** - YAGNI, KISS, DRY, Fail Fast, Measure Everything
- **Production mindset** - Consider monitoring, debugging, maintenance
- **Evidence-based decisions** - Data over opinions, benchmark before optimizing
- **Learn from production** - Real user problems > theoretical edge cases

### 9. Self-Check Checklist (AGENTS.md §17 + §20)
- Checklist before responding "done"
- Includes spec phases, quality checks, security, accessibility
- Alignment Score ≥ 80 required; §18 never-do → hard fail
- Real-world thinking applied (practical solutions, production considerations)

## Enforcement

1. **Pre-task**: Check if multi-file change → require specs
2. **During task**: Follow component architecture patterns + OBSERVE→VERIFY→ACT
3. **Post-task**: Run self-check checklist (AGENTS.md §17)
4. **Before "done"**: `pnpm quality` must pass + Alignment Score ≥ 80 (AGENTS.md §20)
5. **No drift**: Cursor/Qoder/Kiro must mirror AGENTS.md — never invent conflicting rules

## Quick Commands

```bash
# Check if multi-file change needs specs
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | wc -l

# Run quality check
pnpm quality

# Create spec directory
mkdir -p .kiro/specs/{feature-slug}
```

## Configuration Files

- `.kiro/agents/default.json` — Agent configuration
- `.kiro/templates/` — Spec templates
- `.devin/config.local.json` — Devin workflow hooks
- `.qoder/rules/` — Qoder rules (including this one)

## What Agents Must NEVER Do (AGENTS.md §18)

- Never skip spec phases for multi-file changes
- Never add "use client" to layout files
- Never `fetch("/api/...")` from Server Components
- Never expose service-role credentials to client
- Never skip Zod validation on user input
- Never use `console.log` in production code
- Never hard-code URLs/ports/env-specific values
- Never create new packages without updating `pnpm-workspace.yaml` and `turbo.json`