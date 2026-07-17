# Arch Start Menu — Design

## Architecture

```
MacMenuBar (packages/ui)
  └── appMenu?: ({ close }) => ReactNode
        └── ArchStartMenu (apps/portal) — catalog, search, lock, logout
```

## MacMenuBar slot

```ts
appMenu?: (ctx: { close: () => void }) => React.ReactNode;
```

When `appMenu` is provided, render its result inside `#arch-taskbar-menu` instead of the default `APP_MENU_ITEMS` list. Panel wrapper allows child-controlled width (`w-auto` / min-width unset).

## ArchStartMenu

Client component. Props: `{ onClose: () => void }`.

Sections:
1. Search (`aria-label="Search Arch"`)
2. Pinned grid (links with icon + label)
3. All apps filtered list
4. Footer: user stub + Lock button + Sign out form (`action={logout}`)

Lock: layout-mounted `ArchLockOverlay` listens for `arch-lock-screen` custom event so the overlay survives menu unmount.

Command palette: `window.dispatchEvent(new CustomEvent("arch-open-command-bar"))` — CommandBar listens and opens.

## Files

| File | Role |
|---|---|
| `packages/ui/src/components/MacMenuBar.tsx` | Slot API |
| `apps/portal/src/components/system/ArchStartMenu.tsx` | Panel |
| `apps/portal/src/components/system/ArchStartMenu.test.tsx` | Tests |
| `apps/portal/src/app/layout.tsx` | Wire slot |
| `apps/portal/src/components/CommandBar.tsx` | Listen for open event |
