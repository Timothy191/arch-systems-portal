# Wave Ambient Background — Requirements

## Intent

Ship one permanent optimized PS3-wave MP4 as the global ambient background that **keeps playing** while the tab is visible, and remove focus-mode / multi-video / legacy background paths that conflict with it.

## Acceptance Criteria

1. `/background/ps3-wave.1920x1080.mp4` exists, is muted H.264, ~120s, web-optimized (target ≤7MB), and returns HTTP 200.
2. `RouteBackground` mounts a **single** muted looping video of that source (no dual-decode crossfade).
3. No app code mounts `light-mode.mp4`, `focused-mode.mp4`, or any second ambient video path.
4. Dead focus-mode background CSS (`route-bg-focus*`, `body.focus-mode` video swap) is removed from `@repo/theme` and `@repo/ui`.
5. Unused `useFocusMode` is removed from `@repo/ui`.
6. `/auth-bg-poster.jpg` matches a frame of the permanent wave clip (poster for first paint).
7. Video container / reduced-motion fallback colors match the dark wave (no light flash).
8. `prefers-reduced-motion: reduce` is the only intentional stop (static fallback). `low-perf-fallback` must **not** hide or stop the ambient video.
9. Production Cache-Control for `/background/*` allows long-lived CDN caching.
10. Playback uses `autoplay` + `muted` + `loop` + `playsInline`, with JS keep-alive on pause / visibility / watchdog so the wave does not stay stopped while the tab is visible.
