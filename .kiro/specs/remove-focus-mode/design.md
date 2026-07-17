# Remove Focus Mode — Design

## Files

- Delete: `apps/portal/src/components/FocusModeToggle.tsx`, `FocusModeProvider.tsx`, `hooks/useFocusMode.ts`
- Update: `apps/portal/src/app/layout.tsx`, `(hub)/page.tsx`, `components/RouteBackground.tsx`, `features/hub/components/HeroBackground.tsx`, `hooks/useAdaptivePerformance.ts` (+ test)
- Leave theme CSS `body.focus-mode` rules inert (harmless); no package theme churn unless needed.

## Behavior

Always light mode. Single ambient video. Adaptive performance uses FPS heuristics only.
