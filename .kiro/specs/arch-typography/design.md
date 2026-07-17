# Arch Typography — Design

## Tokens

| CSS var | Font | Loader |
|---|---|---|
| `--font-display` | Anurati | `next/font/local` → `Anurati-Regular.otf` |
| `--font-mono` | Roboto Mono | `next/font/google` |
| `--font-sans` | Inter | existing |

## Files

- `apps/portal/public/fonts/Anurati-Regular.otf` + `README.md` (attribution)
- `apps/portal/src/app/layout.tsx` — register fonts on `<html>`
- `packages/theme/src/css/variables.css` — `--font-display` fallback
- `packages/theme/src/tailwind/preset.ts` — `fontFamily.display`
- `SystemClock.tsx`, login `page.tsx`, `MacMenuBar.tsx` — apply classes

## Usage rules

- Display: headings, weekday, brand pill only
- Mono: clock time, SAST label, numeric chrome
- Sans: everything else
