# Remove Focus Mode — Requirements

## Intent

Remove the Focus Mode toggle and all related mode-switching so the portal always uses light-mode ambient UI/background only.

## Acceptance Criteria

1. The header Focus Mode toggle (`title="Enter Focus Mode"`) is not rendered.
2. Any hub/page Focus Mode button is not rendered.
3. `FocusModeProvider` no longer wraps the app; `body.focus-mode` is never applied by app code.
4. `RouteBackground` loads only the light-mode video (`/background/light-mode/light-mode.mp4`); focus-mode video is not mounted.
5. `useFocusMode` store and `FocusModeToggle` / `FocusModeProvider` components are removed from the portal (or unused).
6. `useAdaptivePerformance` no longer depends on focus mode.
7. Existing light-mode visuals and reduced-motion fallback still work.
8. Relevant tests updated; no references to FocusModeToggle remain under `apps/portal/src`.
