# Login Brand Banner — Design

## Architecture

```
apps/portal/public/branding/ai/*.svg     ← downloaded AI marks
apps/portal/public/{logo,arch...,plantcor} ← existing Arch marks
packages/ui/src/components/Marquee.tsx   ← real CSS marquee
apps/portal/src/features/auth/components/LoginBrandBanner.tsx
apps/portal/src/app/(auth)/login/page.tsx  ← footer swap
```

## Marquee

Uses existing `@theme` keyframes `marquee` and `--animate-marquee` from `packages/ui/src/globals.css`. Two identical tracks; `--duration` and `--gap` via CSS variables on the element. `pauseOnHover` pauses animation; `reverse` sets `animation-direction: reverse`. Reduced motion: no animation, single static row.

## LoginBrandBanner

Server-compatible component (no hooks). Renders masked wrapper + Marquee of `next/image` logos. Catalog constant co-located in the file.

## Server/client

Login page stays Server Component. Marquee is pure CSS — no `"use client"` required unless React children force it; keep Marquee without client directive.

## Files

| File                                                          | Change                                      |
| ------------------------------------------------------------- | ------------------------------------------- |
| packages/ui/src/components/Marquee.tsx                        | real implementation                         |
| packages/ui/src/Marquee.tsx                                   | re-export for `@repo/ui/Marquee` if missing |
| apps/portal/public/branding/ai/*                              | 5 SVG downloads                             |
| apps/portal/src/features/auth/components/LoginBrandBanner.tsx | new                                         |
| apps/portal/src/app/(auth)/login/page.tsx                     | replace footer body                         |
| login tests                                                   | drop footer text assertions if any          |
