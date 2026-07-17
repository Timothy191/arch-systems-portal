# Arch Official Palette — Design

## Architecture

```
palette.css (--palette-* primitives)
    ↓
variables.css (--arch*, --glass-*, semantic aliases)
    ↓
tailwind/preset.ts (arch.*, palette.* utilities)
    ↓
tokens/palette.ts (OFFICIAL_PALETTE for JS/TS)
```

## Token Roles

| Category | Tokens | Example use |
|---|---|---|
| Neutral | `--palette-neutral-0` … `950` | Scale foundation |
| Brand | `--palette-brand-primary`, hover, on-primary | CTAs, links, focus |
| Semantic | success, warning, danger, info + subtle/hover | Status badges, alerts |
| Surface | canvas, elevated, sunken, pressed, chrome | Backgrounds, title bars |
| Border | subtle → strong, glass, focus | Hairlines, glass edges |
| Text | primary → muted, on-glass | Typography hierarchy |
| Glass | fill layers, tint, backdrop, specular | Liquid Glass OS shell |
| Chrome | red, yellow, green | Window traffic lights |
| Canvas | from, to | Route background gradient |

## Usage

**CSS:** `background: var(--palette-glass-surface);`

**Tailwind:** `bg-palette-surface-elevated`, `text-arch-text-primary`, `border-arch-border-subtle`

**TypeScript:** `import { OFFICIAL_PALETTE } from "@repo/theme";`

## Files Changed

- `packages/theme/src/css/palette.css` (new)
- `packages/theme/src/css/index.css` (import palette first)
- `packages/theme/src/css/variables.css` (wire primitives to palette)
- `packages/theme/src/tokens/palette.ts` (new)
- `packages/theme/src/tokens/index.ts` (export)
- `packages/theme/src/tailwind/preset.ts` (complete arch + palette namespaces)
