# Wave Ambient Background — Design

## Decision

**Option B:** keep the MP4 (exact look). Encode a muted 120s H.264 cut matching `LOOP_END_SEC = 120`. Do not remake in WebGL.

## Files

| Path | Change |
|---|---|
| `apps/portal/public/background/ps3-wave.1920x1080.mp4` | Permanent muted 120s asset |
| `apps/portal/public/auth-bg-poster.jpg` | Regenerated from wave frame |
| `apps/portal/src/components/RouteBackground.tsx` | Poster + single-source comments; keep dual crossfade |
| `apps/portal/next.config.mjs` | Cache-Control for `/background/:path*` |
| `packages/theme/src/css/glass.css` | Remove focus-mode video CSS; darken container/fallback |
| `packages/ui/src/globals.css` | Remove `body.focus-mode` theme block |
| `packages/ui/src/lib/useFocusMode.ts` | Delete (unused) |

## Data flow

`layout.tsx` → `RouteBackground` (client) → two `<video>` layers, same `BACKGROUND_VIDEO_SRC`, rAF crossfade at 0.65× for first 120s.

## Env / packages

None. No new dependencies.

## Out of scope

Procedural/WebGL remake; deleting unrelated hub `HeroBackground` grain overlay.
