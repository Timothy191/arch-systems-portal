# Auto-Hide Dropdown Dock — Requirements

## Goal

Convert the always-visible bottom unified dock into an auto-hiding dock with a persistent peeker so users can discover it and reveal it on proximity.

## Acceptance Criteria

1. On `md+` viewports, the dock (`data-testid="unified-dock"`) is **hidden by default** (slid below the viewport).
2. A persistent **peeker** control (`data-testid="dock-peeker"`) remains visible at bottom-center when the dock is hidden so users can identify that a dock exists.
3. When the pointer enters the peeker or the bottom hot-zone (~40px), the dock **reveals** (slides up into view).
4. When the pointer leaves the dock + peeker region, the dock **re-hides** after a short delay (~280ms) to avoid flicker.
5. Peeker click / keyboard activation **toggles** reveal (touch and a11y fallback).
6. Pressing **Escape** while revealed hides the dock.
7. Existing dock content is preserved: Start, Hub / Drilling / Engineering / Alerts / Settings links, latency, shift, SAST time.
8. Split-window open still applies `sm:-translate-x-[200px]` on the dock.
9. Desktop-only: dock + peeker remain `hidden` below `md` (unchanged).
10. `prefers-reduced-motion: reduce` uses instant show/hide (no long slide).
11. Peeker is keyboard-focusable with a visible focus ring and an accessible name (e.g. “Show dock” / “Hide dock”).
12. Unit tests cover peeker presence, default-hidden state, reveal on interaction, and split-window translate.

## Out of Scope

- Top taskbar popovers / Feedback / Weather / Clock menus
- Changing dock app destinations or metrics sources
