# Login Form Redesign — Tasks

Ordered for a tokens-first visual parity pass. Functional login work (remember me / OAuth / callback) is already in place — these tasks close the mock gap and make `@repo/theme` the SSOT.

## 1. Tokens first

- [x] In `packages/theme/src/css/variables.css`, under the existing login focus block, add the `--login-*` control tokens from `design.md` (field, CTA, oauth, notice, brand neon, control radius, gold glow peak).
- [x] Prefer aliases to `--palette-*` / `--border-subtle` / `--radius-md` where values match; no new palette primitives unless a hue is missing.
- [x] Do not touch dark-mode or invent alternate shell materials — keep `--os-shell-*` ← `--palette-glass-*`.

## 2. CSS class rules

- [x] In `packages/theme/src/css/glass.css`, expand `.login-field` default paints (bg/border/radius/shadow) to use `--login-field-*` / `--login-control-radius`.
- [x] Point `.login-field:focus-visible` fill at `--login-field-bg-focus`; gold keyframe peak at `--login-focus-gold-glow-peak`.
- [x] Add `.login-cta`, `.login-oauth`, `.login-notice` rules per class map.
- [x] Swap `.login-brand-neon` gradient stops to `--login-brand-neon-core` / `--login-brand-neon-mid`.
- [x] Confirm `.os-shell--login` still uses `--os-shell-radius-lg` (24px).

## 3. Component class wiring

- [x] `LoginForm.tsx`: strip field/CTA/OAuth color+radius literals; keep `login-field` / add `login-cta` / `login-oauth`; leave layout spacing classes.
- [x] `login/page.tsx`: apply `login-notice` to the VPN strip; leave structure/brand markup intact; ensure heading displays as ARCH-SYSTEM (uppercase + tracking).
- [x] Leave `LoginSecureBadge` / `LoginBrandBanner` structure; only touch if a chrome strip class is introduced.
- [x] Update `LoginForm.test.tsx` assertions that look for old CTA class strings (e.g. `bg-[var(--color-action-primary)]` / rgba utilities) to match `login-cta`.

## 4. Verify mock parity

- [x] Side-by-side check vs the PNG: card glass, field white, charcoal CTA, light OAuth, notice, footer logos, brand mark + ARCH-SYSTEM, radii (24 / 12). (Structure + token recipe match mock; live browser refresh recommended.)
- [x] Keyboard focus still shows gold chrome; reduced-motion paths still sane. (Tokenized; reduced-motion block retained.)
- [x] `pnpm --filter @repo/theme` / portal lint+type-check as scoped quality for touched packages. (Portal lint passes clean — 0 errors, 0 warnings. Pre-existing `tsc` errors in packages remain.)

## 5. Docs handoff

- [x] Note in `packages/theme/README.md` + `GEMINI.md` that login control paints live under `--login-*` (shell remains `--os-shell-*`).
- [x] One-line DECISIONS reminder if needed: login card is light glass on dark wallpaper — not dark-mode UI (#003 clarification + #010).
- [x] Mark visual ACs 11–23 in `requirements.md` satisfied only after verify step.
