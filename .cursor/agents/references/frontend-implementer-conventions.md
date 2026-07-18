# Frontend Implementer — Conventions Reference

Canonical policy: `AGENTS.md` §3–4 and §18. This file expands portal-specific patterns only.

## File layout

```
apps/portal/src/
  app/           # routes, layouts, route handlers
  components/    # portal-specific UI
  features/      # feature modules
```

Feature pattern:

```
features/<feature>/
  <Feature>Page.tsx      # Server Component
  <Feature>Form.tsx      # "use client"
  _actions/              # Server Actions
  _data/                 # server data fetchers
```

## Naming

- Pages: `<FeatureName>Page` (default export)
- Interactive: `<FeatureName>Form|Modal|Table`
- Data: `get|list|find<Resource>`
- Mutations: `create|update|delete<Resource>Action`
- Always `interface <Component>Props` on signatures
- Every `page.tsx` exports `metadata` (`title` + `description`)
- `loading.tsx` beside async pages; `error.tsx` (`"use client"`) for failing segments

## Server vs client

- Default Server Components; no `"use client"` on layouts
- Never import `@repo/supabase/server` or `@repo/redis` in client
- Never expose service-role or non-`NEXT_PUBLIC_` secrets
- Never `fetch("/api/...")` from Server Components
- Server Actions: `"use server"`, Zod, `{ data } | { error }`, revalidate after mutations

## Styling & a11y

- Tailwind + `@repo/theme`; light-only macOS glass (DECISIONS #003 / #010)
- Login SSOT: `apps/portal/src/app/(auth)/login/page.tsx` — `--os-shell-*`, `--login-*`
- `focus-visible:ring` on interactive elements; semantic HTML; WCAG 2.1 AA
- `next/image`, `next/font`; lazy-load heavy client UI with `next/dynamic`

## Performance targets

LCP < 2.5s, CLS < 0.1, INP < 200ms. Named lucide imports only.

## Multi-file work

Follow `.kiro/specs/<slug>/` phases per AGENTS.md §1 before large implementation.
