# Arch Typography — Requirements

## Goal

Introduce sci-fi display typography (Anurati) and technical mono (Roboto Mono) for chrome/clock without harming form readability.

## Acceptance Criteria

1. Anurati is self-hosted under `apps/portal/public/fonts/` and exposed as `--font-display` via `next/font/local`.
2. Roboto Mono is loaded via `next/font/google` as `--font-mono` (replacing JetBrains Mono for chrome).
3. Body/UI remains Inter (`--font-sans`) — Anurati is not used on form fields or long copy.
4. SystemClock weekday uses `font-display` (uppercase + tracking); time uses `font-mono`.
5. Login page `Arch-System` heading uses `font-display`.
6. MacMenuBar “Arch” label uses `font-display`.
7. Tailwind exposes `font-display` utility via theme preset.
