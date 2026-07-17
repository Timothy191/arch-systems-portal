# Auto-Hide Dropdown Dock — Design

## Architecture

All behavior lives in [`apps/portal/src/components/system/ViewportBoundaries.tsx`](../../../apps/portal/src/components/system/ViewportBoundaries.tsx) (client component).

```
fixed inset-0 pointer-events-none (existing)
└── bottom center wrapper (os-shell-enter-3)
    └── dock shell column (pointer-events-auto, md+)
        ├── hot-zone + dock panel group
        │   └── unified-dock (slides via translate-y)
        └── dock-peeker button (always visible when md+)
```

## State

| State | Meaning |
|---|---|
| `revealed: false` | Dock translated below viewport; peeker prominent |
| `revealed: true` | Dock visible; peeker may stay faint |

Hide delay: 280ms after `pointerleave` of the combined dock+peeker container. Clear delay timer on re-enter.

## Triggers

| Event | Action |
|---|---|
| `pointerenter` on hot-zone / dock / peeker | `setRevealed(true)`, clear hide timer |
| `pointerleave` on combined container | schedule hide |
| Peeker click | toggle `revealed` |
| `Escape` (when revealed) | hide |
| Focus inside dock or peeker | keep revealed |

## Motion

- Reveal: `translate-y-0 opacity-100`
- Hide: `translate-y-[calc(100%+12px)] opacity-0` (dock only; peeker stays)
- Duration: 300ms with `ease-glass` / existing transition
- Reduced motion: drop transform transition to 0ms via `motion-reduce:transition-none`

## Files

| File | Role |
|---|---|
| `ViewportBoundaries.tsx` | Reveal state, peeker, hot-zone |
| `ViewportBoundaries.test.tsx` | Jest coverage |
| Specs under `.kiro/specs/auto-hide-dock/` | Requirements / design / tasks |

## Boundaries

- Client-only (`"use client"` already). No server imports. No new env vars. No new packages. Icons: `lucide-react` (`ChevronsUp`).
