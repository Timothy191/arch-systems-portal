# Wave Ambient Background — Tasks

1. [x] Encode muted 120s H.264 into `public/background/ps3-wave.1920x1080.mp4`; refresh poster.
2. [x] Purge focus-mode / legacy route-bg-focus CSS from theme + ui globals; delete `useFocusMode`.
3. [x] Wire poster + dark fallback colors; add `/background/*` cache headers.
4. [x] Verify asset probe + HTTP 200 on `:3000`; PerformanceListener tests pass. Full `pnpm quality` blocked by pre-existing repo lint/tsc issues unrelated to this change.
