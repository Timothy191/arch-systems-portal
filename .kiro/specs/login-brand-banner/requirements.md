# Login Brand Banner — Requirements

## Intent

Replace the login card footer (language / version / ARCH OS text) with an animated horizontal brand marquee that shows existing Arch assets plus AI provider logos.

## Acceptance criteria

1. Footer no longer renders English (US), version, or ARCH OS text.
2. Footer shows a seamless infinite scrolling logo banner with edge fade.
3. Banner includes present Arch assets: `/logo.svg`, `/archlinux-logo-black-scalable.svg`, `/plantcor-login.png`.
4. Banner includes AI provider SVGs under `/branding/ai/`: openai, anthropic, google, github, meta — downloaded (non-empty SVG), not invented.
5. `@repo/ui` `Marquee` supports `children`, `className`, `pauseOnHover`, `reverse`, and disables animation under `prefers-reduced-motion`.
6. Logos use `next/image`, have meaningful `alt` text, and sit in a region labeled `Partner and AI provider brands`.
7. Logos are muted/grayscale by default; opacity increases on banner hover.
8. Login page remains a Server Component; banner is a portal feature component (client only if required for interaction — prefer CSS-only so server is fine).
9. Focused login tests pass; no new npm dependencies.

## Out of scope

- Language selector / version string relocation
- Hub TrustLogos asset replacement
- Colorful brand wordmarks (monochrome glyphs only)
