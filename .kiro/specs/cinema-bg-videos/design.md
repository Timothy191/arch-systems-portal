# Cinema Background Videos — Design

## Architecture

No new packages or runtime libraries. Static MP4 assets only, consumed by existing video elements.

```
RouteBackground / HeroBackground
        │
        ▼
public/background/light-mode/light-mode.mp4      (popcorn loop)
public/background/focused-mode/focused-mode.mp4  (cinema loop)
public/auth-bg-poster.jpg                        (first-frame poster)
```

## Files changed

| Path | Action |
|------|--------|
| `apps/portal/public/background/light-mode/light-mode.mp4` | Create (converted from Wikimedia popcorn source) |
| `apps/portal/public/background/focused-mode/focused-mode.mp4` | Create (converted from Wikimedia cinema source) |
| `apps/portal/public/auth-bg-poster.jpg` | Regenerate from light-mode frame |
| `apps/portal/src/features/hub/components/HeroBackground.tsx` | Fix src path (remove space) |
| `apps/portal/public/background/*.webm` (hash names) | Delete unused orphans |

## Server / client

No boundary changes. Videos remain public static assets; client components already load them.

## Sources (free / open)

Mixkit CDN was blocked in this environment (Fortiguard SSL intercept). Used Wikimedia Commons instead:

- Light: [Roaring old-fashioned popcorn machine](https://commons.wikimedia.org/wiki/File:Roaring_old-fashioned_popcorn_machine.webm) → `light-mode.mp4` (~942 KB, 720p, ~5s loop).
- Focus: [Mini Movie Theater](https://commons.wikimedia.org/wiki/File:Mini_Movie_Theater.webm) → `focused-mode.mp4` (~1.2 MB, 720p, ~15s).

Converted with ffmpeg (H.264, `-an`, `+faststart`). Poster regenerated from light-mode frame 1s.

## Env vars / deps

None.
