# Arch Official Palette — Requirements

## Goal

Introduce one official, complete color palette as the single source of truth for Arch Systems branding. All surfaces, text, borders, glass, chrome, and semantic status colors must map to this palette with no missing roles.

## Acceptance Criteria

1. **Single source** — `packages/theme/src/css/palette.css` defines all `--palette-*` primitive tokens.
2. **Complete coverage** — neutrals, brand, semantic (success/warning/danger/info), surfaces, borders, text, interactive, liquid glass, window chrome, canvas.
3. **Legacy compatibility** — existing `--arch*`, `--glass-*`, `--overlay-*`, `--os-shell-*` tokens alias to the official palette (no breaking changes).
4. **TypeScript export** — `OFFICIAL_PALETTE` exported from `@repo/theme` for charts, shaders, and runtime use.
5. **Tailwind access** — `arch.*` and `palette.*` namespaces in the preset expose every role for utility classes.
6. **Warning fix** — `--warning` uses amber (`#f59e0b`), not brand charcoal.

## Non-Goals

- Migrating every component to new class names (aliases preserve existing usage).
- Partner/AI brand colors in the login banner (those remain per-logo SVG fills).
