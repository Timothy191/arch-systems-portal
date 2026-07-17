# Arch Start Menu — Requirements

## Goal

Replace the Arch taskbar pill’s thin dropdown with a Windows 11–style Start menu for fast access to portal features.

## Acceptance Criteria

1. Clicking `#arch-taskbar-trigger` toggles a Start panel (`#arch-taskbar-menu`) with Win11-like layout: search, pinned apps grid, all-apps list, user/power footer.
2. **Pinned (6):** Hub `/`, Drilling `/drilling`, Control Room `/control-room`, Safety `/safety`, Engineering `/engineering`, Admin `/admin`.
3. **All apps** includes remaining departments, API Docs `/docs/api`, Privacy `/privacy`, and a “Command palette” action that opens the existing CommandBar.
4. Search input filters pinned + all apps by label (client-side).
5. Navigating via a tile/link closes the menu.
6. Footer: Sign out (server `logout` action) and Lock (lightweight overlay).
7. Escape and outside click close the menu (existing MacMenuBar behavior preserved).
8. App catalog and actions live in `apps/portal` — no portal routes hardcoded as business logic inside `packages/ui` beyond the optional slot API.
9. Icons: lucide-react only. No new npm packages.
10. Unit tests cover pinned presence, search filter, and menu wiring.

## Out of Scope

- Dock “Start” button wiring
- Sleep / Shut Down overlays
- Typography redesign (Anurati / Roboto Mono)
