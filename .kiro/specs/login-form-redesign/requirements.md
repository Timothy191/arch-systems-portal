# Login Form Redesign — Requirements

## Intent

Match the live Arch System Sign In card to the approved design mock (light frosted glass on dark ambient wallpaper), with theme tokens as the single source of truth for that look. Preserve existing login affordances (Remember me, Forgot password, OAuth).

**Reference mock:** `.cursor/projects/home-timothy-Projects/assets/design-element-dce4413d-1f2f-4f75-91bd-a1f29e295366.png`

**Policy:** Card chrome is **light** frosted glass (DECISIONS #003). Dark is wallpaper/ambient only — do not introduce portal dark-mode tokens for login UI.

## Functional Acceptance Criteria

1. Login card is wider than 380px (implemented `max-w-[420px]`), vertically centered between taskbar and dock (`my-auto mt-24`), using unified OS shell glass (`os-shell os-shell--login`).
2. Form includes a **Remember me** checkbox that, when checked, persists the employee ID/email in `localStorage` and restores it on next visit.
3. Form includes a **Forgot password?** link to `/reset-password`.
4. Form includes an “or continue with” divider and social buttons for **Google**, **Microsoft**, and **GitHub**.
5. Social buttons initiate Supabase `signInWithOAuth` with `redirectTo` pointing at `/auth/callback`.
6. `/auth/callback` exchanges the OAuth code for a session and redirects to `/` (or a safe `?next=` path).
7. Password sign-in via `/api/auth/login` remains unchanged in behavior.
8. Interactive elements are keyboard-accessible with visible focus rings; labels are associated with controls.
9. LoginForm tests cover new controls (remember me persistence, forgot-password link, OAuth button presence) and existing success/failure paths.
10. No new npm packages; lucide-react icons only; no secrets in client code.

## Visual Acceptance Criteria (mock parity)

11. **Card shell** — Centered vertical panel reads as milk-white frosted glass over the dark wave wallpaper: translucent white fill, strong backdrop blur, hairline border, soft ambient shadow. Outer radius **24px** (`--os-shell-radius-lg`). No dark/inverted card surface.
12. **Title bar** — Traffic-light dots (red/yellow/green) left; centered title **“Arch — System Sign In”** in secondary text; subtle chrome strip (`--overlay-dim` / palette chrome), not a solid opaque bar.
13. **Header row** — “Welcome Back” (left, secondary) + **Secure** badge (right): green text + lock icon, pill radius, success-tint border/fill (no purple/glow-slop).
14. **Brand block** — Folded Arch “A” mark (~5rem) with soft **red neon** halo behind it; wordmark **ARCH-SYSTEM** as hero-level display type (`font-display`, uppercase, wide tracking); subtitle “Sign in to Arch Systems” secondary. Brand must pass the brand test without the OS menu bar.
15. **Fields** — Two full-width controls (email, password): **silver frosted glass** fill (not opaque white), subtle border, control radius **16px** (`--radius-lg` / `--login-control-radius`), height ~44px (`h-11`). Password eye toggle on the right. Controls sit in the same glass family as `.os-shell`.
16. **Meta row** — “Remember me” (left) + “Forgot password?” (right), 13px secondary text, no cards/chips.
17. **Primary CTA** — Full-width **dark charcoal** Sign In button (brand primary family `#1c1c1e` / `--palette-neutral-950`), white label, same control radius as fields, soft contact shadow; hover darkens slightly. Not blue, not purple, not pill-full.
18. **OAuth row** — “or continue with” hairline divider; three equal buttons (Google / Microsoft / GitHub) with **muted silver glass** surfaces (same family as fields — not bright white chips), brand icons, same control radius family as fields.
19. **VPN notice** — Single info strip: light chrome fill + subtle border + info icon + “Notice: Please ensure you are connected to the corporate VPN.” No floating badge/sticker treatment.
20. **Footer** — Tagline “Plantcor Mainframe · Powered by Arch Systems · Integrated Intelligence”; partner/AI logo marquee (Arch, providers including Google, GitHub, Meta, Vercel, etc.) on a chrome strip under a hairline top border.
21. **Radii system** — Card 24px; fields / CTA / OAuth / notice use **16px** control radius (concentric, not full-pill). Secure badge remains capsule (`9999px`).
22. **Focus chrome** — Gold focus family (`--login-focus-gold-*`) on fields/controls; no change to focus behavior intent — only ensure hard-coded rgba in focus paths move onto tokens where still raw.
23. **Token SSOT** — No hard-coded `rgba(...)` / `bg-white/*` / `bg-[rgba(28,28,30,…)]` for login surfaces in `LoginForm`, notice strip, or brand neon; all login-specific paints resolve through `--login-*` (and existing `--os-shell-*` / `--palette-glass-*`) in `@repo/theme`.

## Status (2026-07-17)

Visual ACs 11–23 implemented via `--login-*` tokens + `.login-*` classes on the canonical `src/` login surface. Functional ACs 1–10 were already in place. Portal lint passes clean (0 errors, 0 warnings). Pre-existing `tsc` errors in packages remain unrelated to this change; LoginForm unit tests pass (13/13).
