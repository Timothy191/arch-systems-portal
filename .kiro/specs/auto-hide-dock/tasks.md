# Auto-Hide Dropdown Dock — Tasks

- [x] T1. Specs written (`requirements.md`, `design.md`, `tasks.md`).
- [x] T2. Add `revealed` state, hide-delay timer, Escape handler in `ViewportBoundaries.tsx`.
- [x] T3. Wrap dock in hot-zone; apply hide/reveal transforms; keep split-window shift.
- [x] T4. Add peeker button (`data-testid="dock-peeker"`, lucide `ChevronsUp`, focus ring, toggle).
- [x] T5. Update `ViewportBoundaries.test.tsx` for peeker, default-hidden, reveal, split-window.
- [x] T6. Run `pnpm --filter portal test -- ViewportBoundaries` and emit alignment score.
