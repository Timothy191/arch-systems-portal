# Plan: Vercel-Style Rebrand of the Arch-Mk2 Portal

Status: PLAN ONLY — no code changed yet.
Author: audit + plan pass (user approved "Full Vercel rebrand" on 2026-07-12).
Scope decision: This is a **brand flip** from the current "Arch System" (macOS light /
glassmorphism / animated aurora+caustic / Mac traffic-light chrome / Inter+JetBrains Mono)
to the **Vercel design language** (stark white gallery, near-black `#171717` text, Geist
font with aggressive negative tracking, shadow-as-border, zero glass/blur, zero decorative
motion, achromatic palette with workflow accent colors used only in pipeline context).

---

## 0. Method — why this is a token/primitive rewrite, NOT 184 page edits

The portal is already centralized. 124 "glass/blur/liquid/rounded-2xl-3xl" class hits live
in portal `app/` files, but those files mostly _inherit_ the look from two shared sources:

- `packages/theme/src/css/variables.css` — every CSS variable (the "Arch System" tokens).
- `packages/ui/src/globals.css` + `packages/ui/src/components/*` — GlassCard (33 hits),
  MacMenuBar (6), DepartmentLayout, glass-skeleton, and 36 animation keyframes
  (aurora-shadow, caustic-glow-*, glass-shimmer, solar-flare, wave-drift).

Pages use `text-[var(--text-heading)]`, `bg-[var(--bg-tertiary)]`, `<GlassCard>`,
`<DepartmentLayout>`, `rounded-2xl/3xl`. If we rewrite the tokens + the @repo/ui primitives,
**every page inherits the Vercel look automatically**. The page-level hits become benign
(rounded-2xl still works; glass utilities become no-ops once the tokens flatten).

This means the real work is ~12 files, not 184. The remaining page edits are surgical
(remove Mac-window chrome, swap login card, fix a few bare-Tailwind outliers).

---

## 1. Design token target (Vercel mapping)

Rewrite `packages/theme/src/css/variables.css`. Keep the same variable _names_ the pages
already reference so pages don't break; change their _values_.

| Token (existing name)            | Current (Arch)                                                     | New (Vercel)                                                                                                |
| -------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `--bg-primary`                   | `#f5f5f7` (macOS gray)                                             | `#ffffff`                                                                                                   |
| `--bg-secondary`                 | `#ffffff`                                                          | `#ffffff`                                                                                                   |
| `--bg-tertiary`                  | `#e8e8ed` (sunken input)                                           | `#fafafa` (subtle tint)                                                                                     |
| `--text-heading`                 | `#1d1d1f`                                                          | `#171717`                                                                                                   |
| `--text-body` / `--text-primary` | `#3a3a3c`                                                          | `#171717`                                                                                                   |
| `--text-secondary`               | `#6e6e73`                                                          | `#4d4d4d`                                                                                                   |
| `--text-muted`                   | `#a1a1a6`                                                          | `#666666`                                                                                                   |
| `--border-subtle`                | `rgba(0,0,0,.06)`                                                  | `rgba(0,0,0,.08)` → used as `box-shadow 0 0 0 1px`                                                          |
| `--border-default`               | `rgba(0,0,0,.12)`                                                  | `rgba(0,0,0,.08)`                                                                                           |
| `--accent-red`                   | `#ff3b30`                                                          | `#ff5b4f` (Ship Red)                                                                                        |
| `--accent-green`                 | `#34c759`                                                          | keep as status only; add `--accent-mint #10b981`                                                            |
| `--accent-blue`                  | `#1c1c1e` (mislabeled)                                             | `#0a72ef` (Develop Blue) for workflow; focus ring `#0070f3`                                                 |
| shadows                          | `--shadow-card`/`--shadow-window`/diffusion stacks (soft, layered) | replace with Vercel shadow stack: `rgba(0,0,0,.08) 0 0 0 1px, rgba(0,0,0,.04) 0 2px 2px, #fafafa 0 0 0 1px` |
| radius                           | `--liquid-glass-radius-*` (16px), card 16px                        | `--radius` → 8px cards, 6px buttons, 12px image cards, 9999px pills                                         |

Add Vercel workflow tokens: `--ship-red #ff5b4f`, `--preview-pink #de1d8d`,
`--develop-blue #0a72ef`, `--focus-blue hsla(212,100%,48%,1)`.

**Glass tokens (`--glass-*`, `--vibrancy-*`, `--dark-glass-*`)**: neutralize — set to
solid white/transparent so `backdrop-blur` / `bg-white/70` usages render as plain white.
Do NOT delete the variable names (pages reference them); make them inert.

**Fonts**: layout.tsx swaps `Inter`+`JetBrains Mono` for `Geist`+`Geist Mono`
(Google Fonts: `family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500`).
Drop `Anurati` local font (it's the decorative display face — wrong for Vercel).
Set `--font-sans`/`--font-mono` to Geist stacks. Add global `font-feature-settings:"liga"`
and negative letter-spacing scale via a `.vercel-display` utility (apply -2.4px @48px,
-1.28px @32px, -0.96px @24px, 0 @14px).

---

## 2. @repo/ui primitives to rewrite (the 12 real files)

1. `packages/ui/src/components/GlassCard.tsx` (33 hits) — replace frosted glass with
   Vercel card: white bg, `box-shadow 0 0 0 1px rgba(0,0,0,.08)`, radius 8px, optional
   inner `#fafafa` ring. `variant="liquid"` → plain card. Remove blur/shimmer.
2. `packages/ui/src/globals.css` (36 hits) — delete aurora/caustic/glass-shimmer/solar-flare/
   wave-drift keyframes + their `.aurora-shadow`/`.caustic-glow-*`/`.glass-shimmer` utility
   classes. Strip the 100-line `body.focus-mode` dark-glass block (focus mode becomes a
   flat dark variant, not blurred glass — or drop it; confirm with user). Keep skip-link,
   z-index matrix, view-transition. Add Vercel card-shadow + focus-ring utilities.
3. `packages/ui/src/components/MacMenuBar.tsx` (6 hits) — replace macOS menu bar + traffic
   lights with a **Vercel-style sticky white nav**: left wordmark, center/right links
   (Geist 14px/500), dark pill CTA. Keep `rightSlot` (FocusModeToggle/HeaderWidgets) but
   restyle as plain controls.
4. `packages/ui/src/components/MacTitleBar.tsx` — delete or repurpose; no more macOS title bar.
5. `packages/ui/src/components/DepartmentLayout.tsx` (2 hits) — drop glass tint, use plain
   white section + hairline `border-bottom: 1px solid #171717` separators.
6. `packages/ui/src/components/ui/glass-skeleton.tsx` (3 hits) — rename/flatten to plain
   skeleton (solid `#fafafa` pulse, no glass).
7. `packages/ui/src/components/ui/card.tsx` (2 hits) — align to Vercel card shadow.
8. `packages/ui/src/components/ui/animated-dialog.tsx` (2) / `hero-video-dialog.tsx` (7) /
   `cyber-button.tsx` / `dock.tsx` — strip glow/glass; use shadow-border + Geist.
   (`cyber-button`, `dock`, `hero-video-dialog` look like unused/experimental — verify with
   `knip` before touching; possibly delete.)
9. `packages/ui/src/components/WorkflowBuilder.tsx` (5) + `edges/FlowEdge.tsx`,
   `nodes/*` — if these render the deploy pipeline, recolor to Vercel Develop→Preview→Ship
   (blue→pink→red) using the new workflow tokens.
10. `apps/portal/app/layout.tsx` — swap fonts (Geist), remove `RouteBackground` (animated
    wave canvas) and `MacMenuBar` import → `VercelNav`. Keep a11y (skip-link, RouteAnnouncer,
    landmarks). `themeColor` → `#ffffff`.
11. `apps/portal/components/layout/RouteBackground.tsx` — delete (the animated wave canvas is
    the opposite of Vercel's static whitespace). Replace hero backdrop with a barely-there
    pastel gradient wash if desired (optional, low opacity).
12. `apps/portal/app/(auth)/login/page.tsx` + `LoginForm.tsx` (18 hits) — remove macOS window
    chrome (traffic lights, "Arch OS", liquid-glass card). Replace with a Vercel auth card:
    white, shadow-border, plain heading "Arch" (Geist 600, -2.4px), Inter→Geist. Keep the
    VPN notice + Secure lock + company logo.

---

## 3. Page-level surgical edits (after tokens/primitives land)

Most pages need **no edit** — they inherit. Only outliers:

- `apps/portal/app/admin/page.tsx` — currently bypasses the shell (own sticky header,
  `max-w-7xl`, bare Tailwind). Move it onto `DepartmentLayout`/shared chrome so it matches.
- `apps/portal/app/(hub)/page.tsx` (12 hits) — remove duplicate hero comment block; hero
  already uses GlassCard/HeroBackground → inherits. Confirm after primitive swap.
- `apps/portal/app/footer.tsx` — flatten glass footer to white hairline divider + Geist.
- Any `bg-white/70`, `bg-black/[0.0x]`, `backdrop-blur` left in pages → now inert (tokens
  neutralized) but should be cleaned for clarity in a follow-up lint pass.

---

## 4. Consistency bugs to fix as part of this (real, found in audit)

- **Version drift**: `PORTAL_VERSION` hardcoded fallbacks disagree —
  `(hub)/page.tsx`→"2.4.1", `(auth)/login/page.tsx`→"2.0.0.1", `footer.tsx`→"dev",
  `env.ts`→"1.0.0". The real value is injected by `next.config.mjs` from `package.json`.
  Fix: remove all hardcoded fallbacks; read one source (`process.env.NEXT_PUBLIC_PORTAL_VERSION`
  in footer, `process.env.PORTAL_VERSION` elsewhere). Add a guard test.
- **Primitive import inconsistency**: some pages import `@repo/ui/Button`, others
  `@repo/ui/components/ui/button`. Pick one public export path; update imports. Run `knip`.
- **Hero duplication** in (hub)/page.tsx: delete the repeated comment + inline copy; rely on
  `HeroRotator` primitive.

---

## 5. Verification gate (run after implementation, before merge)

1. `pnpm --filter @repo/ui type-check` and `pnpm --filter portal type-check`
2. `pnpm lint` (root + portal) — no new `border` usage, no leftover `backdrop-blur`
3. `pnpm knip` — confirm `cyber-button`/`dock`/`hero-video-dialog` are dead or cleaned
4. `pnpm --filter portal test` — existing Jest suites pass (login tests reference
   `data-testid="login-card"` — keep that testid on the new Vercel card)
5. `pnpm build` (Next 16) — succeeds
6. Visual: `pnpm dev`, screenshot hub + a department dashboard + login + admin. Confirm:
   white gallery, Geist headings with negative tracking, shadow-borders (no glass blur),
   no aurora/caustic motion, Mac chrome gone.
7. A11y: skip-link, focus ring (`hsla(212,100%,48%,1)`), landmarks intact.

---

## 6. Risks / decisions to confirm before executing

- **Focus Mode** (`body.focus-mode` 100-line block): currently a blurred dark glass variant.
  Vercel has no such thing. Options: (a) drop focus mode, (b) make it a flat dark theme
  (white-on-#171717, no blur). Needs user call.
- **Status colors**: ops relies on green/amber/red for incidents/breakdowns. Vercel is
  achromatic except workflow colors. Keep status colors as _functional_ (severity tokens),
  not decorative — consistent with Vercel's "color is functional" rule.
- **Brand**: removing "Arch OS" / macOS identity is a rebrand. Confirm that's intended
  (user already approved the flip; this is just noting the trade-off).
- **Next 16 gotcha**: layout.tsx uses `next/font` — Geist is on Google Fonts, so
  `Geist`/`Geist_Mono` from `next/font/google` work. Anurati (local .otf) removal is safe.

---

## 7. Execution order (suggested)

1. Tokens (variables.css) — flatten glass, add Vercel values + workflow colors.
2. globals.css — kill animation keyframes + focus-mode glass; add card-shadow/focus-ring.
3. GlassCard + skeleton + card primitives.
4. MacMenuBar → VercelNav; delete MacTitleBar/RouteBackground.
5. layout.tsx fonts + chrome swap.
6. Login page restyle.
7. Admin page onto shared chrome.
8. Version-drift + import-consistency + hero-dedup fixes.
9. Run gate (§5).

Est. files touched: ~20 (12 @repo/ui/theme/layout + 4 page outliers + 4 config/test).
NOT 184. The portal's centralization is what makes this tractable.
