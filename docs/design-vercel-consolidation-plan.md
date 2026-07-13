# Combined Plan: Component Consolidation (shadcn/ui) → Vercel Rebrand

Status: PLAN ONLY — no code changed.
Date: 2026-07-12. Supersedes `docs/design-vercel-rebrand-plan.md` (that doc is now
Phase 3 detail; this is the orchestrated whole).
Merges: `docs/component-consolidation-audit.md` (your Phase 1+2) + the Vercel token map.

## 0. Reality check that changes the merge

shadcn/ui is **already wired in**:

- `packages/ui/components.json` + `pnpm ui` (shadcn CLI).
- CVA primitives under `packages/ui/src/components/ui/*` (button, card, input, table,
  badge, tabs, dialog, dropdown-menu, skeleton, ...).
- `Button` already consumes shadcn HSL tokens (`bg-primary`, `text-primary-foreground`).
- `packages/theme/src/css/variables.css` already carries a shadcn HSL block:
  `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`,
  `--border`, `--ring`, `--destructive`, `--destructive-foreground`, `--input`, `--radius`.

**Consequence (the correction to the consolidation audit):**

- The audit's Step 1 ("make Button use project `--accent-*` tokens instead of shadcn
  palette") is BACKWARDS for a Vercel direction. It would _diverge_ from shadcn right
  before we retarget shadcn. DROP IT. Keep shadcn tokens; the Vercel look is achieved by
  **retargeting the HSL values** in `variables.css`. Zero call-site edits to reskin Button/
  Card/Input/Badge.
- GlassCard / MacMenuBar / RouteBackground / MacTitleBar are CUSTOM (not shadcn) — they
  still need explicit restyling (or deletion). The Vercel look there is manual.

So the two initiatives share one lever (the shadcn HSL layer) for ~80% of surfaces, and
only the custom glass chrome needs surgical work. This is why combining is strictly better
than doing them separately.

---

## PHASE 1 — Architectural cleanup (from your consolidation audit, reordered)

Goal: one component substrate, dead code gone, consistent client boundaries. NO visual
change yet (we retarget tokens in Phase 3, so cleanup is behavior/structure only).

1. **Delete dead code** (low risk): `CyberButton` (0 usages), `AnimatedNumber`,
   `NumberTicker`-keep/`AnimeNumber`-delete, `animated-number.tsx`. Verify `animejs` +
   `framer-motion` usage via `knip`; drop `animejs` if orphaned.
2. **Remove unnecessary `"use client"`** from `SecondaryButton.tsx` + `StatusBadge.tsx`
   (low risk; re-validate SSR at `error.tsx`/`unauthorized.tsx`).
3. **Unify buttons** (medium): extend canonical `Button` with `motion?` + `shape?` props;
   fold `AnimatedButton` → `Button` (motion variant), fold `SecondaryButton` → `Button`
   (`secondary` variant + `shape:"pill"`); delete the two files; re-point 15+ import sites;
   move the 3 auth-form test mocks (`@repo/ui/AnimatedButton` → `@repo/ui/Button` motion).
   **Keep `Button`'s shadcn token classes** (do NOT switch to `--accent-*`).
4. **Add shared state primitives** (low): `Spinner`, `LoadingState`, `EmptyState`,
   `FieldError`, `FormError`. Route loading/empty/error blocks through them (~30 files).
5. **Adopt `FormFields`** (medium): re-theme `FormFields.inputStyles` to the REAL current
   tokens (the audit noted it uses divergent `--bg-secondary`/`--border-default`); migrate
   the 11 hand-rolled forms + `BreakdownsTable` inline `<table>` to `ui/table.tsx`. Preserve
   `role="alert"` + error text for existing tests.
6. **Icon sweep** (low-med): replace emoji (WeatherWidget, SafetyIncidentsList, training,
   ExcavatorDumperTable) with `lucide-react`; update `WeatherWidget.test.tsx` text asserts;
   unify status palette to shadcn `--destructive`/`--success`/`--warning` (fix Token
   inconsistency #3: `StatusBadge` already on shadcn tokens — leave it, migrate the
   `--accent-*` form usages to the shadcn severity tokens).

Phase 1 outcome: clean, canonical shadcn-based `@repo/ui`. Visual identity unchanged.

---

## PHASE 2 — Consistency bugs (the four from the audit + one cross-cutting)

- **Version drift**: `PORTAL_VERSION` fallbacks disagree — `(hub)/page.tsx`→"2.4.1",
  `(auth)/login/page.tsx`→"2.0.0.1", `footer.tsx`→"dev", `env.ts`→"1.0.0". Single source:
  `next.config.mjs` injects `process.env.PORTAL_VERSION` from `package.json`. Remove the
  hardcoded fallbacks (or centralize in one helper). Add a guard test.
- **Admin page shell bypass**: `admin/page.tsx` renders its own header (`max-w-7xl`, bare
  Tailwind `bg-[var(--bg-primary)]`) instead of the shared chrome. After Phase 1, mount it
  on `DepartmentLayout` (or a shared `AdminLayout`) so it inherits the unified surface.
- **Primitive import inconsistency**: `@repo/ui/Button` vs `@repo/ui/components/ui/button`.
  Pick the public `@repo/ui/Button` barrel; run `knip` to catch stragglers.
- **Hero duplication**: `(hub)/page.tsx` has a duplicated comment block + inline copy
  (HeroRotator/HeroBackground). Dedup; rely on the `HeroRotator` primitive.

---

## PHASE 3 — Vercel rebrand (token retarget + custom-chrome restyle)

### 3A. shadcn HSL retarget (the big lever — ZERO call-site edits)

In `packages/theme/src/css/variables.css`, change ONLY the shadcn HSL block values:

| Token                            | Current                | Vercel target                              |
| -------------------------------- | ---------------------- | ------------------------------------------ |
| `--background`                   | `240 5% 96%` (#f5f5f7) | `0 0% 100%` (#fff)                         |
| `--foreground`                   | `240 6% 10%` (#1d1d1f) | `0 0% 9%` (#171717)                        |
| `--primary`                      | `240 6% 10%`           | `0 0% 9%` (#171717)                        |
| `--primary-foreground`           | `0 0% 100%`            | `0 0% 100%`                                |
| `--secondary`                    | `240 5% 91%`           | `240 5% 96%` (fafafa-ish)                  |
| `--muted` / `--muted-foreground` | keep, nudge to #666    |
| `--border`                       | `240 6% 87%`           | `0 0% 92%` (≈ rgba(0,0,0,.08))             |
| `--input`                        | `240 5% 91%`           | `0 0% 92%`                                 |
| `--ring`                         | `240 6% 10%`           | `212 100% 48%` (Vercel focus blue)         |
| `--destructive`                  | `4 86% 58%` (#ff3b30)  | `4 86% 58%` → retune to Ship Red `#ff5b4f` |
| `--radius`                       | `0.75rem` (12px)       | `0.5rem` (8px cards)                       |

Add Vercel workflow tokens (used only by pipeline UI): `--ship-red #ff5b4f`,
`--preview-pink #de1d8d`, `--develop-blue #0a72ef`, `--focus-blue hsla(212,100%,48%,1)`.

This instantly reskins Button / Card / Input / Badge / Table / Tabs / Dialog everywhere.

### 3B. Custom-chrome restyle (the parts shadcn doesn't cover)

- **GlassCard.tsx** (33 hits): replace frosted glass with Vercel card — white bg,
  `box-shadow: 0 0 0 1px rgba(0,0,0,.08)` (shadow-as-border), radius 8px, optional inner
  `#fafafa` ring. `variant="liquid"` → plain card. Remove blur/shimmer.
- **globals.css** (36 hits): delete `aurora-shadow` / `caustic-glow-*` / `glass-shimmer` /
  `solar-flare` / `wave-drift` keyframes + their utility classes. The `body.focus-mode`
  block (100 lines of blurred dark glass) → **flat dark theme** (per locked decision):
  `bg-[#171717]`-style solid, white text, subtle `1px` border, NO backdrop-blur.
- **MacMenuBar / MacTitleBar / RouteBackground**: replace macOS traffic-light menu bar +
  animated wave canvas with a **Vercel sticky white nav** (wordmark left, Geist 14/500
  links, dark pill CTA). Delete `MacTitleBar` + `RouteBackground` (the wave canvas is the
  antithesis of Vercel whitespace). Keep `rightSlot` controls (FocusModeToggle/HeaderWidgets)
  restyled as plain.
- **layout.tsx**: swap `Inter`+`JetBrains Mono`+`Anurati` → `Geist`+`Geist Mono` (Google
  Fonts via `next/font/google`; Geist is available there). Remove `RouteBackground` import;
  `themeColor` → `#ffffff`. Keep a11y (skip-link, RouteAnnouncer, landmarks).
- **Login page** (18 hits): remove macOS window chrome (traffic lights, "Arch OS",
  liquid-glass card). Vercel auth card: white, shadow-border, plain "Arch" heading (Geist
  600, -2.4px), keep VPN notice + Secure lock + company logo. **Keep
  `data-testid="login-card"`** (LoginForm.test.tsx relies on it).
- **footer.tsx**: flatten glass footer → white hairline divider + Geist.

### 3C. Geist typography enforcement

- Global: `font-feature-settings:"liga"` on Geist; add a `.vercel-display` utility applying
  negative tracking scale: -2.4px @48px, -1.28px @32px, -0.96px @24px, 0 @14px. Apply to
  hero/section headings.
- The macOS `--arch-brand-blue` (#1c1c1e mislabeled) → real Vercel blue `#0a72ef` where used
  as a workflow/link accent.

---

## PHASE ORDER & WHY

1 → 2 → 3A → 3B → 3C.
Rationale: clean the substrate (1) and fix bugs (2) first so Phase 3's token flip doesn't
get muddied by dead components or divergent import paths. 3A (HSL retarget) is a single
file and proves the Vercel look on all shadcn primitives immediately; 3B/3C finish the
custom chrome + type. Each phase is independently verifiable and revertable.

## VERIFICATION GATE (after each phase; full gate before merge)

- `pnpm --filter @repo/ui type-check` + `pnpm --filter portal type-check`
- `pnpm lint` (root + portal): no new `border` (use shadow-border), no leftover
  `backdrop-blur`/`glass-*`/`aurora`/`caustic` classes.
- `pnpm knip`: confirm dead components gone; no orphaned `animejs`/`framer-motion`.
- `pnpm --filter portal test`: login tests (`data-testid="login-card"`), `WeatherWidget`
  (emoji→lucide), `SafetyIncidentForm` (error/loading text), `BookInForm` (empty) still pass.
- `pnpm build` (Next 16).
- Visual: `pnpm dev` → screenshot hub, a department dashboard, login, admin. Confirm: white
  gallery, Geist headings w/ negative tracking, shadow-borders (no glass blur), no
  aurora/caustic motion, Mac chrome gone. Focus Mode = flat dark, no blur.

## RISKS

- Phase 1 button merge touches 15+ sites + 3 auth test mocks (medium) — do behind a
  changeset; keep `SecondaryButton` re-export shim if any external import is missed.
- FormFields migration is business-critical (medium) — preserve aria + error text exactly.
- Phase 3B Focus Mode rewrite — confirm flat-dark is acceptable (locked decision: yes).
- Status colors stay functional (locked decision: yes) — do NOT make them decorative.

## ESTIMATED SURFACE

- Phase 1: ~25 files (deletes + 15 import re-points + 11 forms + new primitives).
- Phase 2: ~6 files (version helper, admin layout, import fixes, hub dedup).
- Phase 3: 1 token file (3A) + ~8 custom-chrome files (3B) + layout/font (3C).
  NOT 184 page edits. Centralization + shadcn HSL layer make the rebrand tractable.
