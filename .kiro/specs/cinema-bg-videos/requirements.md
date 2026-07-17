# Cinema Background Videos — Requirements

## Intent

Replace the missing portal ambient intro videos with popcorn/cinema-themed loops so light-mode and focus-mode backgrounds load successfully and match a movie-night vibe.

## Acceptance Criteria

1. `/background/light-mode/light-mode.mp4` exists and returns HTTP 200 from the portal.
2. `/background/focused-mode/focused-mode.mp4` exists and returns HTTP 200 from the portal.
3. Light-mode clip is popcorn-themed; focus-mode clip is cinema/theater-themed.
4. Assets use a free/open license suitable for commercial use (no Mixkit CDN dependency if blocked).
5. [`HeroBackground.tsx`](../../../apps/portal/src/features/hub/components/HeroBackground.tsx) references `light-mode.mp4` (no space in filename).
6. Unused hash-named `.webm` files under `public/background/` are removed.
7. Poster image reflects the new theme when refreshed from the light-mode clip.
