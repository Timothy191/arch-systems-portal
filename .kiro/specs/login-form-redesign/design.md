# Login Form Redesign — Design

## Goal

Token recipe so the live login matches the approved mock and `@repo/theme` owns every login paint. **No layout redesign** — keep current structure in `login/page.tsx` + `LoginForm` + badge/banner.

**Mock:** light frosted card on dark ambient wallpaper. UI chrome stays light-only (DECISIONS #003).

## Files (structure — keep)

| Path                                                            | Role                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------- |
| `apps/portal/src/app/(auth)/login/page.tsx`                     | Shell, brand block, notice, footer chrome                         |
| `apps/portal/src/features/auth/components/LoginForm.tsx`        | Fields, CTA, OAuth — wire token classes                           |
| `apps/portal/src/features/auth/components/LoginSecureBadge.tsx` | Secure pill (already class-based)                                 |
| `apps/portal/src/features/auth/components/LoginBrandBanner.tsx` | Footer marquee                                                    |
| `packages/theme/src/css/variables.css`                          | Define `--login-*` + keep `--os-shell-*` / `--login-focus-gold-*` |
| `packages/theme/src/css/palette.css`                            | Keep `--palette-glass-*` (shell material)                         |
| `packages/theme/src/css/glass.css`                              | Class rules for `.os-shell--login`, `.login-*`                    |
| `packages/theme/DECISIONS.md` / README / GEMINI.md              | Docs handoff only after tokens land                               |

## Layout (as implemented — do not recompose)

- Wrapper: `max-w-[420px]`, `os-shell-enter-2`, centered between taskbar/dock.
- Card: `os-shell os-shell--login login-card-container`, `min-h-[720px]`.
- Title bar → Welcome/Secure → brand mark + ARCH-SYSTEM → `LoginForm` → VPN notice → `LoginBrandBanner`.
- OAuth: `grid grid-cols-3 gap-2`.

## Visual direction (mock → recipe)

| Element    | Mock read                 | Token / class target                                          |
| ---------- | ------------------------- | ------------------------------------------------------------- |
| Wallpaper  | Dark ethereal waves       | Existing ambient canvas (out of scope for `--login-*`)        |
| Card       | Milk frosted glass, 24px  | `--os-shell-*` ← `--palette-glass-*`                          |
| Fields     | Near-solid white, 12px    | `--login-field-*` + `.login-field`                            |
| CTA        | Charcoal `#1c1c1e` family | `--login-cta-*` + `.login-cta`                                |
| OAuth      | Light frosted chips       | `--login-oauth-*` + `.login-oauth`                            |
| Notice     | Chrome strip              | `--login-notice-*` + `.login-notice`                          |
| Brand neon | Soft red halo on A        | `--login-brand-neon-*` + `.login-brand-neon`                  |
| Secure     | Green success pill        | Existing `.login-secure-badge` + `--palette-semantic-success` |
| Focus      | Gold chrome               | Existing `--login-focus-gold-*`                               |

## Token table

### Keep (existing — do not rename)

| Token                                                                                         | Source              | Use                                                                                |
| --------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `--palette-glass-fill-*`, `--palette-glass-tint`, `--palette-glass-backdrop`, specular/shadow | `palette.css`       | Shell material                                                                     |
| `--os-shell-surface`, `--os-shell-border`, `--os-shell-shadow`, `--os-shell-backdrop`         | `variables.css`     | `.os-shell`                                                                        |
| `--os-shell-radius-lg` (`24px`)                                                               | `variables.css`     | `.os-shell--login` outer radius                                                    |
| `--os-shell-font` (`var(--font-sans)`), enter timing tokens                                   | `variables.css`     | Shell body typography / entrance; `font-display` reserved for ARCH-SYSTEM wordmark |
| `--login-focus-gold`, `-bright`, `-deep`, `-dim`, `-ring`, `-glow`, `-border`                 | `variables.css`     | Focus rings / sweep                                                                |
| `--overlay-dim` / `--palette-surface-chrome*`                                                 | palette/variables   | Title bar + footer strips                                                          |
| `--palette-semantic-success*`                                                                 | `palette.css`       | Secure badge                                                                       |
| `--palette-neutral-950` / `--palette-brand-primary` (`#1c1c1e`)                               | `palette.css`       | CTA base hue                                                                       |
| `--palette-semantic-danger` (`#d22118`)                                                       | `palette.css`       | Brand neon hue                                                                     |
| `--radius-md` (`12px`)                                                                        | generated/variables | Control radius alias target                                                        |
| `--border-subtle`, `--text-heading`, `--text-secondary`                                       | semantic            | Borders / copy                                                                     |

### Add (new `--login-*` in `variables.css`)

Values are the **silver-glass recipe** (controls share the os-shell family — not opaque white chips).

| Token                          | Proposed value                                                        | Replaces                                    |
| ------------------------------ | --------------------------------------------------------------------- | ------------------------------------------- |
| `--login-control-radius`       | `var(--radius-lg)` → `16px`                                           | fields / CTA / OAuth / notice               |
| `--login-field-bg`             | `color-mix(… neutral-100 58%, transparent)`                           | silver glass — not opaque white             |
| `--login-field-bg-focus`       | `color-mix(… neutral-0 72%, transparent)`                             | focus fill                                  |
| `--login-field-backdrop`       | `blur(12px) saturate(140%)`                                           | field frost                                 |
| `--login-oauth-bg`             | `color-mix(… neutral-100 42%, transparent)`                           | muted chip (was too white)                  |
| `--login-oauth-bg-hover`       | `color-mix(… neutral-100 58%, transparent)`                           | hover lift                                  |
| `--login-oauth-backdrop`       | `blur(10px) saturate(140%)`                                           | oauth frost                                 |
| `--login-cta-bg`               | `rgba(28, 28, 30, 0.88)`                                              | charcoal Sign In                            |
| `--login-cta-bg-hover`         | `rgba(28, 28, 30, 0.96)`                                              | CTA hover                                   |
| `--login-cta-fg`               | `var(--palette-brand-on-primary)`                                     | white label                                 |
| `--login-cta-border`           | `var(--border-subtle)`                                                | CTA border                                  |
| `--login-cta-shadow`           | `0 2px 10px rgba(0, 0, 0, 0.18)`                                      | CTA contact shadow                          |
| `--login-field-border`         | `var(--palette-border-subtle)`                                        | field/oauth border                          |
| `--login-field-shadow`         | inset specular + soft contact                                         | field depth                                 |
| `--login-notice-bg`            | `var(--overlay-dim)`                                                  | notice `bg-[var(--overlay-dim)]`            |
| `--login-notice-border`        | `var(--border-subtle)`                                                | notice border                               |
| `--login-notice-radius`        | `var(--login-control-radius)`                                         | notice `rounded-lg`                         |
| `--login-brand-neon-core`      | `color-mix(in srgb, var(--palette-semantic-danger) 55%, transparent)` | `rgba(210, 33, 24, 0.55)`                   |
| `--login-brand-neon-mid`       | `color-mix(in srgb, var(--palette-semantic-danger) 22%, transparent)` | `rgba(210, 33, 24, 0.22)`                   |
| `--login-focus-gold-glow-peak` | `rgba(255, 189, 46, 0.32)`                                            | raw peak in `login-card-gold-glow` keyframe |

Optional alias (only if it clarifies): `--login-cta-bg: color-mix(in srgb, var(--palette-brand-primary) 88%, transparent)`.

### Do not add

- Dark-mode / `.dark` login variants.
- New purple/indigo accents, cream+terracotta marketing palette, or full-pill CTA radius.
- New npm deps or duplicate glass stacks outside `--os-shell-*`.

## Class map

Wire paints in CSS; components mostly swap Tailwind color utilities for these classes (layout utilities may remain).

| Class                                                            | Owns                                                                                  | Notes                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `.os-shell`                                                      | surface / border / shadow / backdrop / font                                           | Shared with taskbar/dock                       |
| `.os-shell--login`                                               | `border-radius: var(--os-shell-radius-lg)`                                            | Login + dock share lg radius today             |
| `.os-shell--login.login-card-container`                          | focus-within gold glow                                                                | Keep                                           |
| `.login-field`                                                   | bg, border, radius, shadow, height rhythm                                             | Move field paints off Tailwind literals        |
| `.login-field:focus-visible`                                     | gold sweep + `--login-field-bg-focus`                                                 | Already mostly in `glass.css`                  |
| `.login-cta`                                                     | CTA bg/hover/fg/border/shadow/radius                                                  | Replace AnimatedButton long class color string |
| `.login-oauth`                                                   | OAuth surface + hover + radius                                                        | Replace OAuthButton color utilities            |
| `.login-notice`                                                  | notice bg/border/radius/padding text                                                  | Move notice strip off page Tailwind paints     |
| `.login-secure-badge` (+ `__*`)                                  | success pill                                                                          | Keep; already token-based                      |
| `.login-brand-mark` / `.login-brand-neon` / `.login-brand-fold*` | mark + neon                                                                           | Neon gradient uses `--login-brand-neon-*`      |
| `.login-brand-logo`                                              | SVG size                                                                              | Keep                                           |
| Title/footer chrome                                              | may keep `bg-[var(--overlay-dim)]` **or** add `.login-chrome-strip` → `--overlay-dim` | Prefer one class if touching those nodes       |

### Component wiring (high level)

```
LoginForm
  Input     → class includes "login-field" (drop bg-white/80, border/radius color literals)
  AnimatedButton → add "login-cta" (drop rgba CTA utilities)
  OAuthButton → "login-oauth"

login/page.tsx
  notice div → "login-notice"
  h1         → keep font-display / tracking; visible text ARCH-SYSTEM via uppercase
```

## Hardcoded inventory → tokens (implementer checklist)

| Location                            | Current literal                                                  | Target token                                |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| `LoginForm.tsx` `LOGIN_FIELD_CLASS` | `bg-white/80`, `rounded-lg`, `shadow-sm`, `border-border-subtle` | `--login-field-*`, `--login-control-radius` |
| `LoginForm.tsx` CTA `className`     | `rgba(28,28,30,0.72                                              | 0.86)`, shadow rgba                         | `--login-cta-*` |
| `LoginForm.tsx` `OAuthButton`       | `bg-white/70`, `hover:bg-white`, `rounded-lg`                    | `--login-oauth-*`                           |
| `login/page.tsx` notice             | `rounded-lg`, `border-border-subtle`, `bg-[var(--overlay-dim)]`  | `.login-notice` / `--login-notice-*`        |
| `glass.css` `.login-brand-neon`     | `rgba(210,33,24,…)`                                              | `--login-brand-neon-*`                      |
| `glass.css` field focus             | `rgba(255,255,255,0.98)`                                         | `--login-field-bg-focus`                    |
| `glass.css` gold keyframe peak      | `rgba(255,189,46,0.32)`                                          | `--login-focus-gold-glow-peak`              |

Brand SVG path fills in OAuth icons (`#EA4335`, etc.) stay as brand-accurate literals — not theme tokens.

## Boundaries

- Client: `LoginForm` (`"use client"`), badge interactivity.
- Server: `login/page.tsx` composition (no `"use client"` on layout).
- Theme package: tokens + CSS only — no app imports from `apps/`.

## Form behavior (unchanged)

| Control         | Behavior                                       |
| --------------- | ---------------------------------------------- |
| Remember me     | `localStorage` key `arch-login-remember-email` |
| Forgot password | `Link` → `/reset-password`                     |
| OAuth           | `signInWithOAuth` → `/auth/callback`           |

## Motion (keep; do not expand)

1. Shell enter: `os-shell-enter-2`.
2. Brand neon pulse + fold (reduced-motion safe).
3. Gold focus sweep / card glow on focus-within.

## Handoff to frontend-implementer

**Do**

1. Add `--login-*` tokens to `variables.css` first.
2. Implement `.login-field` / `.login-cta` / `.login-oauth` / `.login-notice` (+ neon token swap) in `glass.css`.
3. Thin component classNames to structural utilities + those classes.
4. Keep layout/structure/copy; verify against PNG.
5. Update theme README/GEMINI/DECISIONS note that login control paints are `--login-*`.

**Don’t**

- Redesign layout, add cards in hero, change wallpaper strategy, or invent dark-mode login.
- Change OAuth/callback/auth behavior.
- Leave CTA/field rgba in TSX after token migration.
- Use `--color-action-primary` blue for Sign In (mock is charcoal).
