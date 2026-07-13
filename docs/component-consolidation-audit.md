# Component Consolidation Audit — Arch-Mk2

**Scope:** Frontend component duplication in `packages/ui` and `apps/portal/features|app`.
**Method:** Read every affected component; mapped prop APIs, variants, usages; grepped for import/usage; classified server vs client boundaries; surveyed icon/state families.
**Date:** 2026-07-11

> TL;DR: Three of the four button components and **all three** number components are either dead code or near-duplicates. `FormFields.tsx` is entirely unused while 11+ forms hand-roll identical field markup with _different_ design tokens. There is no shared `Spinner`, `EmptyState`, or `FieldError` primitive — every loading/empty/error state is re-implemented inline. Among the 8 primitives specifically listed, only `SecondaryButton` carries an unnecessary `"use client"`.

---

## 1. Inventory: Overlapping Button Components

| Component         | File                                                | `"use client"`        | Animation                       | Variants                                                                     | Tokens used                                              | Usage                       |
| ----------------- | --------------------------------------------------- | --------------------- | ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------- |
| `Button`          | `packages/ui/src/components/ui/button.tsx`          | **No**                | none                            | default/destructive/outline/secondary/ghost/link × default/sm/lg/icon        | shadcn palette (`bg-primary`, `text-primary-foreground`) | shared base                 |
| `SecondaryButton` | `packages/ui/src/components/SecondaryButton.tsx`    | **Yes (unnecessary)** | none                            | `default`/`rounded-lg` (shape only) × `sm`/`default`                         | `--text-heading`, `bg-white/80`                          | **15+ sites**               |
| `AnimatedButton`  | `packages/ui/src/components/ui/animated-button.tsx` | Yes (required)        | framer-motion scale             | default/accent/destructive/outline/secondary/ghost/link × default/sm/lg/icon | `var(--accent-cyan)` etc.                                | Login/Reset/Update password |
| `CyberButton`     | `packages/ui/src/components/ui/cyber-button.tsx`    | Yes (required)        | framer-motion scale + scanlines | cyan/blue/alert × default/sm/lg                                              | `var(--accent-cyan/blue/alert)`                          | **0 — dead code**           |

### Prop API map

- **Button** (`button.tsx:36-41`): `variant`, `size`, `asChild` + native `<button>` attrs. CVA at `button.tsx:7-34`.
- **SecondaryButton** (`SecondaryButton.tsx:7-11`): `size`, `variant` (shape), `asChild`. Renders `Slot`/`button`. No animation, no loading state.
- **AnimatedButton** (`animated-button.tsx:41-47`): `variant`, `size`, `hoverScale=1.02`, `tapScale=0.97` (+ `HTMLMotionProps`).
- **CyberButton** (`cyber-button.tsx:7-11`): `variant` (cyan/blue/alert), `size`, native motion props.

### Findings

- **Token inconsistency #1:** `Button` is the only one using shadcn semantic tokens (`bg-primary`, `text-primary-foreground`) while every other button uses the project CSS variables (`--accent-cyan`, `--text-heading`). This silently breaks theming when the shadcn palette isn't mapped.
- **SecondaryButton is dead-weight duplication:** its `default`/`secondary` visual intent already exists in `Button`'s CVA (`button.tsx:17-19`). Its only real additions are a white pill bg (`bg-white/80`) and a `rounded-lg` shape toggle — both expressible as a `Button` variant + `shape` prop.
- **CyberButton is unused** (grep found zero imports outside its own file). It's the most code (92 lines) for zero value.

### Consolidation strategy

- **KEEP + EXTEND `Button`** as the single source of truth. Add optional motion via a `motion?: boolean` flag (default false → server component, no framer bundle) plus `hoverScale`/`tapScale` passthrough.
- **MERGE `AnimatedButton` into `Button`** — identical variant set, same CVA pattern; promote its `hoverScale`/`tapScale` to the unified API. Remove `animated-button.tsx`.
- **FOLD `SecondaryButton` into `Button`** via a `secondary` variant (already present) + `shape: "pill" | "rounded-lg"`. Delete `SecondaryButton.tsx` and re-point the 15+ import sites.
- **DEPRECATE + DELETE `CyberButton`** (dead code). If a cyber aesthetic is later required, re-introduce as a styled `Button` `variant="cyber"` rather than a new file.

### Unified `Button` API proposal

```ts
type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link"
  | "cyber";
type ButtonSize = "sm" | "default" | "lg" | "icon";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: "default" | "pill" | "rounded-lg"; // absorbs SecondaryButton
  asChild?: boolean;
  motion?: boolean; // absorbs AnimatedButton (opt-in → keeps Button SSR)
  hoverScale?: number;
  tapScale?: number;
}
```

### Effort / impact

- Files changed: ~6 (delete `animated-button.tsx`, `cyber-button.tsx`, `SecondaryButton.tsx`; rewrite `button.tsx`; update `cyber-button`/`SecondaryButton` barrel exports).
- Import sites to re-point: **15+** (`error.tsx`, `(hub)/error.tsx`, `unauthorized.tsx`, `not-found.tsx`, `forbidden.tsx`, 6× `CopyReportButton.tsx`, 3× `DailyLogForm.tsx`, `HourlyLoadsGrid.tsx`, `drilling/reports/page.tsx`).
- Breaking changes: `SecondaryButton` prop `variant="rounded-lg"` → `shape="rounded-lg"`; `AnimatedButton` import path removed (callers use `@repo/ui/AnimatedButton`).
- Test impacts: `LoginForm.test.tsx:29`, `ResetPasswordForm.page.test.tsx:25`, `UpdatePasswordForm.page.test.tsx:27` all `jest.mock("@repo/ui/AnimatedButton", ...)` — mocks must move to `@repo/ui/Button` (motion variant).
- Risk: **Medium** (widespread import surface). Token fix on `Button` is the highest-value, lowest-risk first step.

---

## 2. Inventory: Overlapping Number-Animation Components

| Component        | File                                                | Lib                                   | Trigger                 | Props                                                    | Usage        |
| ---------------- | --------------------------------------------------- | ------------------------------------- | ----------------------- | -------------------------------------------------------- | ------------ |
| `AnimatedNumber` | `packages/ui/src/components/ui/animated-number.tsx` | framer-motion                         | on mount / value change | `value`,`duration`,`prefix`,`suffix`                     | **0 — dead** |
| `NumberTicker`   | `packages/ui/src/components/ui/number-ticker.tsx`   | framer-motion `useInView`+`useSpring` | in-view                 | `value`,`startValue`,`direction`,`delay`,`decimalPlaces` | **0 — dead** |
| `AnimeNumber`    | `packages/ui/src/components/motion/AnimeNumber.tsx` | **animejs** (dynamic import)          | on value change         | `value`,`duration`,`round`,`prefix`,`suffix`,`format`    | **0 — dead** |

### Findings

- **All three are unused** across `apps/portal` (grep matched only their own definitions). Zero migration risk.
- `AnimeNumber` pulls in `animejs` as a dependency used nowhere else in the app bundle — a pure cost.
- Capability coverage: `NumberTicker` (in-view + decimals + direction) ⊃ `AnimatedNumber` (digits roll) ⊃ mostly `AnimeNumber` (format: number/percentage/time). They should collapse to one API exposing `{ value, startValue, direction, decimalPlaces, prefix, suffix, format, inView }`.

### Consolidation strategy

- **KEEP `NumberTicker`** as canonical (lightweight, in-view spring, no extra dep). Extend with `format` ("number"|"percentage"|"time") and `prefix`/`suffix` from the others.
- **DELETE `AnimatedNumber` and `AnimeNumber`** (and drop the `animejs` dependency if unused elsewhere — verify with `knip`/`syncpack`).
- Add a barrel export `@repo/ui/AnimatedNumber` → `NumberTicker` alias during a short deprecation window if any external import exists (none found).

### Effort / impact

- Files changed: 3 (delete 2, augment `number-ticker.tsx`).
- Breaking changes: none in app code (no callers).
- Test impacts: none.
- Risk: **Low**.

---

## 3. Duplicate Form-Field Implementations vs `FormFields.tsx`

### Current state

- `packages/ui/src/components/FormFields.tsx` defines `FormInput`, `FormSelect`, `FormTextarea`, `SubmitButton` with `inputStyles` at `FormFields.tsx:12` (`--bg-secondary`, `--border-default`, rounded-lg, focus `--accent-blue`).
- **`FormFields` is imported nowhere in `apps/portal`** (grep: 0 matches). It is dead/divergent code.
- Meanwhile 11+ forms hand-roll the identical `label` + `input/select/textarea` + error-`<p>` trio with **different tokens** (`--bg-primary`, `--border-emphasis`, focus `--color-status-positive`):

| Form               | File                                                                                     | Field count                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| SafetyIncidentForm | `apps/portal/features/departments/components/safety/SafetyIncidentForm.tsx`              | 9 (`:149-353`), error `<p>` at `:174,:199,:272,:295,:395`                      |
| MachineForm        | `apps/portal/features/admin/components/MachineForm.tsx`                                  | 7 (`:73-199`), error `:212`                                                    |
| BookInForm         | `apps/portal/features/departments/components/engineering/breakdowns/BookInForm.tsx`      | 4+ (`:120-202`)                                                                |
| BookOutForm        | `apps/portal/features/departments/components/engineering/breakdowns/BookOutForm.tsx`     | 10+ (`:146-403`)                                                               |
| DozerRollForm      | `apps/portal/features/departments/components/control-room/DozerRollForm.tsx`             | 7 (`:177-285`), error `:299`                                                   |
| CloseShiftModal    | `apps/portal/features/departments/components/control-room/CloseShiftModal.tsx`           | 2 (`:210-227`) + error blocks `:169-178`,`:307`                                |
| WebhookManager     | `apps/portal/features/webhooks/components/WebhookManager.tsx`                            | 4 (`:203-273`)                                                                 |
| UsersTab           | `apps/portal/features/admin/tabs/UsersTab.tsx`                                           | 3 (`:301-343`)                                                                 |
| DepartmentsTab     | `apps/portal/features/admin/tabs/DepartmentsTab.tsx`                                     | 5 (`:289-371`)                                                                 |
| SitesTab           | `apps/portal/features/admin/tabs/SitesTab.tsx`                                           | 2 (`:336-374`)                                                                 |
| BreakdownsTable    | `apps/portal/features/departments/components/engineering/breakdowns/BreakdownsTable.tsx` | search/select (`:50-60`) — also hand-rolls a `<table>` ignoring `ui/table.tsx` |

### Token inconsistency #2

`FormFields.inputStyles` uses `--bg-secondary`/`--border-default`; the live forms use `--bg-primary`/`--border-emphasis`/`--color-status-positive`. Adopting `FormFields` as-is would _change_ the visual design of every form — so the component must be re-themed to the real tokens first.

### Consolidation strategy

- **KEEP + THEME `FormFields`** to match the actual design system tokens. Add `description?`, `charCount?`, `required?` (already partially present) and a unified `FieldError` render.
- **EXTEND `SubmitButton`** with `loading` + `loadingText` (already has `loading`, hardcodes `"Saving..."` at `:180`) and `variant` passthrough.
- **MIGRATE the 11 forms** to `FormInput`/`FormSelect`/`FormTextarea`, removing the per-field error `<p className="text-accent-red text-xs">` duplication in favor of built-in `error` prop.
- **Bonus:** `BreakdownsTable`'s inline `<table>` should adopt `ui/table.tsx` (`Table/TableHeader/...`) to stop a 4th table implementation.

### Effort / impact

- Files changed: 1 (re-theme `FormFields.tsx`) + **11 forms** + 1 table.
- Lines affected: ~600 (forms) + ~120 (FormFields). Mostly mechanical.
- Breaking changes: `FormFields` currently exports `FormInput/FormSelect/FormTextarea/SubmitButton` — keeping those names = non-breaking for any future consumer; the breaking part is the _internal_ token change which only matters once forms adopt it.
- Test impacts: `SafetyIncidentForm.test.tsx` (`:133` error, `:154` loading) and `BookInForm.test.tsx` (`:79` empty) assert on rendered label/error text — adoption must preserve text/`role="alert"` and `aria-describedby` (already in `FormFields`).
- Risk: **Medium** (form behavior is business-critical; requires careful aria parity).

---

## 4. Client-Component Overuse

### Reality check vs the brief

The brief asserts "32+ UI primitives marked `'use client'` unnecessarily." Auditing the **8 specifically named** primitives:

| Primitive             | `"use client"` | Verdict                                                            |
| --------------------- | -------------- | ------------------------------------------------------------------ |
| `skeleton.tsx`        | No             | ✅ correct (pure div)                                              |
| `badge.tsx`           | No             | ✅ correct                                                         |
| `pill.tsx`            | No             | ✅ correct (`Slot` + `badgeVariants`, no hooks)                    |
| `card.tsx`            | No             | ✅ correct                                                         |
| `input.tsx`           | No             | ✅ correct                                                         |
| `table.tsx`           | No             | ✅ correct                                                         |
| `tabs.tsx`            | **Yes**        | ✅ legitimate (Radix `TabsPrimitive`)                              |
| `SecondaryButton.tsx` | **Yes**        | ❌ **unnecessary** (only `forwardRef`+`Slot`+`cn`, no hooks/state) |

The genuinely unnecessary client boundary in scope is **`SecondaryButton` only**. Other `"use client"` directives in the package are justified: `GlassCard` (motion + refs + ResizeObserver), `KPI` (`useAutoAnimate`), `separator` (Radix), `dialog`/`dropdown-menu` (Radix), `animated-*`/`motion/*` (framer-motion). `StatusBadge.tsx` (`apps/...`) also has an unnecessary directive (pure `className` switch, no hooks).

### Recommendation

- Remove `"use client"` from `SecondaryButton.tsx` (and `StatusBadge.tsx`). This shrinks the client bundle and removes a needless client/server split at 15+ call sites.
- Run a **full** `knip` + a custom lint (`no-"use client"-without-hook`) across `packages/ui` to validate the broader "32+" claim — that is out of scope for this targeted audit but the harness already exists (`pnpm quality`).

### Effort / impact

- Files changed: 2 (`SecondaryButton.tsx`, `StatusBadge.tsx`).
- Lines affected: 2 (remove directive lines).
- Breaking changes: none.
- Test impacts: none (no behavior change; pure bundling/SSR boundary shift).
- Risk: **Low** (re-validate SSR renders in `error.tsx`/`unauthorized.tsx` since those import `SecondaryButton`).

---

## 5. Icon Family Inconsistency

### Inventory

- **Primary family: `lucide-react`** — 83 files import it (per grep). Examples: `AlertTriangle`, `Copy`, `Check`, `Loader2`, `RefreshCw`, `Search`, `Trash2`, `Wrench`, `Zap`, `Clock`. This is the de-facto standard and should be canonical.
- **Emoji-as-icon (inconsistent):** `WeatherWidget.tsx` (`💨` `💧` `🧭` `☀️` `⛈️`), `SafetyIncidentsList.tsx:91` (`📍`), `:97` (`⚠`), `app/(departments)/training/page.tsx:176` (`👥`), `ExcavatorDumperTable.tsx:282` (`✕`).
- **Custom inline SVG:** `cyber-button.tsx` (scanline `<span>`), `animated-number.tsx` (digit strip), `WeatherWidget` wind/compass glyphs.
- **Token inconsistency #3:** status coloring is split between shadcn tokens (`StatusBadge.tsx` uses `bg-success`/`text-danger`/`bg-warning`) and project tokens (forms use `text-accent-red`/`text-accent-blue`). Two different palettes for "status".

### Consolidation strategy

- **Mandate `lucide-react`** for all icon needs. Replace emoji icons:
  - `💨`→`Wind`, `💧`→`Droplets`, `🧭`→`Compass`, `☀️`→`Sun`, `⛈️`→`CloudRain` (WeatherWidget)
  - `📍`→`MapPin`, `⚠`→`AlertTriangle` (SafetyIncidentsList)
  - `👥`→`Users` (training/page)
  - `✕`→`X` (ExcavatorDumperTable)
- Keep custom SVG **only** when lucide lacks the glyph; wrap such SVGs as named `Icon` components (not inline JSX) so they can be themed via `currentColor`.
- Unify status color tokens: pick **one** palette (recommend project `--accent-*` + `--color-status-*`) and make `StatusBadge` consume it, or make `Badge`/`StatusBadge` share a single `statusVariants` CVA.

### Effort / impact

- Files changed: ~6 (WeatherWidget, SafetyIncidentsList, training/page, ExcavatorDumperTable, StatusBadge, Badge).
- Lines affected: ~40.
- Breaking changes: none (visual only).
- Test impacts: `WeatherWidget.test.tsx:108,136,137,163` assert exact emoji text (`"☀️"`, `"💨 15 km/h ESE"`, `"💧 60%"`, `"⚠️ Thunderstorm..."`) — **these tests must be updated** to lucide element assertions.
- Risk: **Low-Medium** (test churn; otherwise cosmetic).

---

## 6. Duplicate Loading-State Patterns

### Inventory (no shared `Spinner` exists)

- **`Loader2` + `animate-spin`** spinner, hand-styled in 8 places:
  - `CloseShiftModal.tsx:162` (cyan), `:245`, `:293` (blue)
  - `UpdatePasswordForm.tsx:84` (blue, centered)
  - `WebhookManager.tsx:167` (`text-arch-text-tertiary`)
  - `FuxaFrame.tsx:40` **custom** border-spinner (`border-2 border-arch-accent-green border-t-transparent ... animate-spin`) — divergent impl
  - `OfflineBanner.tsx:95` (`h-4 w-4`)
  - `DrillingOperationsTable.tsx:285` (`"Saving…"`), `:372`
  - `WorkflowBuilder.tsx:205` (`w-3.5 h-3.5`)
- **Text-only loading**: `UsersTab.tsx:166`, `DepartmentsTab.tsx:172`, `AuditLogsTab.tsx:156` (`"Loading..."`), `ShiftCoverageClient.tsx:174`, `ToolsPageClient.tsx:121` (`"Loading..."` / `"Loading Spreadsheet Data..."`).
- **Button busy text**: `SafetyIncidentForm.tsx:392` (`"Saving..."`), `ToolsPageClient.tsx:121`.

### Consolidation strategy

- Add **`<Spinner size="sm"|"md"|"lg" color="current" />`** (lucide `Loader2` + `animate-spin`) to `packages/ui`.
- Add **`<LoadingState icon? label="Loading..." />`** for full-block states (covers the `<p>` + spinner pattern in tabs/WebhookManager).
- Route all button-busy UI through `SubmitButton loading loadingText` (already exists in `FormFields`) instead of manual `"Saving..."` strings.

### Effort / impact

- Files changed: 1 new primitive + ~10 consumers.
- Lines affected: ~60.
- Breaking changes: none.
- Test impacts: low (loading text may be asserted in `ScadaPanel.test.tsx:72`, `DepartmentCard.test.tsx`); keep `loadingText` default `"Saving..."` to avoid breakage.
- Risk: **Low**.

---

## 7. Duplicate Empty-State Patterns

### Inventory (no shared `EmptyState` exists)

| Message                                      | File:line                                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| "No records found."                          | `BreakdownsTable.tsx:80`                                                                                   |
| "No incidents reported today"                | `SafetyDashboard.tsx:188`                                                                                  |
| "No incidents recorded today"                | `SafetyIncidentsList.tsx:37`                                                                               |
| "No employees found."                        | `UsersTab.tsx:175`                                                                                         |
| "No departments found."                      | `DepartmentsTab.tsx:181`                                                                                   |
| "No audit logs found."                       | `AuditLogsTab.tsx:165`                                                                                     |
| "No visitors found for this department."     | `access-control/visitors/page.tsx:51`                                                                      |
| "No badges found for this department."       | `access-control/badges/page.tsx:83`                                                                        |
| "No access logs found for this department."  | `access-control/access-logs/page.tsx:92`                                                                   |
| "No data found for the selected date range." | `GenericReport.tsx` ×≈8 (safety/production/engineering/control-room/access-control + ControlRoom variants) |
| "No <X> found matching your query/filters."  | training `courses/page.tsx:228`, `certifications/page.tsx:259`, `schedules/page.tsx:227`                   |
| "All systems operational. No active alerts." | `AlertPanel.tsx:114`                                                                                       |

All are `<p className="text-[var(--text-secondary)] text-sm text-center py-8">…</p>` inside a `GlassCard` (or bare div). Roughly **20 duplicate empty states**.

### Consolidation strategy

- Add **`<EmptyState icon? title description />`** primitive (lucide `Inbox`/`SearchX` default icon, themed, centered) to `packages/ui`.
- Replace the ~20 inline blocks; for the report pages, pass `title="No data found for the selected date range."` (and consider a shared `<ReportEmptyState>` that also renders the date-range context).

### Effort / impact

- Files changed: 1 new primitive + ~18 consumers (incl. 8 GenericReport copies worth de-duplicating via a shared report component).
- Lines affected: ~120.
- Breaking changes: none.
- Test impacts: `SystemTray.test.tsx:167` ("renders empty state"), `ScadaPanel.test.tsx:72`, `BookInForm.test.tsx:79` assert empty-state copy — keep default text identical or update tests.
- Risk: **Low**.

---

## 8. Duplicate Error-State Patterns

### Inventory

- **Field-level error**: `SafetyIncidentForm.tsx` repeats `<p className="text-accent-red text-xs">{errors.x}</p>` at `:174` (incidentType), `:199` (severity), `:272` (injuredParties), `:295` (description); submit error `:395` (`.text-sm`).
- **Form-level banner**: `DozerRollForm.tsx:299` (`text-accent-red text-sm`); `MachineForm.tsx:212`; `BookInForm.tsx:47-52` (`type:"error"` message object).
- **Modal error blocks**: `CloseShiftModal.tsx` `has_errors` (`:169-178`) and `api_error` (`:307`) — two distinct shapes rendered separately.
- **Token inconsistency #3 (again)**: `StatusBadge.tsx` uses `bg-success`/`text-danger`/`bg-warning` while the forms above use `text-accent-red`/`text-accent-blue`. Same status, two palettes.

### Consolidation strategy

- Add **`<FieldError id message />`** (renders `<p role="alert" className="text-accent-red text-xs">`, wires `aria-describedby`) → absorbs the 4× repeat in `SafetyIncidentForm` and equivalents elsewhere.
- Add **`<FormError>`** banner primitive for submit-level errors (used by `DozerRollForm`, `MachineForm`, `CloseShiftModal`).
- Unify error color to the project `--accent-*` / `--color-status-*` tokens; document `StatusBadge` to consume the same CVA as `Badge`.

### Effort / impact

- Files changed: 2 new primitives + ~5 forms + `StatusBadge`.
- Lines affected: ~80.
- Breaking changes: none (keep `role="alert"` + text to satisfy existing tests).
- Test impacts: `SafetyIncidentForm.test.tsx:133` ("shows error when submission fails") and `:154` ("loading state") assert error text → preserve copy.
- Risk: **Low**.

---

## 9. Implementation Sequence (recommended)

1. **Token baseline (prep):** Make `Button` use project `--accent-*` tokens instead of shadcn palette. Zero call-site change, fixes theming. _(Low risk, high value.)_
2. **Delete dead code:** Remove `CyberButton`, `AnimatedNumber`, `AnimeNumber`; verify `animejs` is otherwise unused. _(Low risk.)_
3. **Remove unnecessary client directive** from `SecondaryButton` (+ `StatusBadge`). _(Low risk.)_
4. **Unify buttons:** Extend `Button` with `motion`/`shape` props; delete `AnimatedButton` + `SecondaryButton`; re-point 15+ imports; move test mocks. _(Medium.)_
5. **Add shared state primitives:** `Spinner`, `LoadingState`, `EmptyState`, `FieldError`, `FormError`, `SubmitButton` enhancements. _(Low.)_
6. **Adopt `FormFields`:** Re-theme to real tokens; migrate 11 forms + `BreakdownsTable`. _(Medium.)_
7. **Icon sweep:** Replace emoji with lucide; unify status palette; update `WeatherWidget` tests. _(Low-Medium.)_
8. **Replace state patterns:** Swap inline loading/empty/error blocks for the new primitives across ~30 files.

## 10. Risk Assessment (summary)

| Workstream                  | Risk       | Primary risk driver                                  |
| --------------------------- | ---------- | ---------------------------------------------------- |
| Token baseline on `Button`  | Low        | Theme breakage if shadcn tokens referenced elsewhere |
| Delete dead buttons/numbers | Low        | `animejs`/Radix tree-shaking; verify via `knip`      |
| Remove `"use client"`       | Low        | SSR boundary shift at error pages                    |
| Button merge                | Medium     | 15+ import sites + 3 auth-form test mocks            |
| `FormFields` adoption       | Medium     | aria parity in business-critical forms               |
| Icon/emoji swap             | Low-Medium | `WeatherWidget` snapshot/test text assertions        |
| State primitives            | Low        | Loading/empty text asserted in a few tests           |

## 11. Key file:line references (at-a-glance)

- `packages/ui/src/components/ui/button.tsx:7-34` CVA; `:36-41` props (shadcn tokens).
- `packages/ui/src/components/SecondaryButton.tsx:1` unnecessary client; `:29-34` white-pill styling.
- `packages/ui/src/components/ui/animated-button.tsx:8-39` CVA; `:54` hover/tap scales.
- `packages/ui/src/components/ui/cyber-button.tsx` — **0 usages**.
- `packages/ui/src/components/ui/animated-number.tsx` / `number-ticker.tsx` / `motion/AnimeNumber.tsx` — **0 usages** each.
- `packages/ui/src/components/FormFields.tsx:12` `inputStyles` (divergent tokens); `:159-183` `SubmitButton`.
- `apps/portal/features/departments/components/safety/SafetyIncidentForm.tsx:174,199,272,295,392,395` repeated error/loading markup.
- `apps/portal/components/weather/WeatherWidget.tsx` emoji icons (💨💧🧭☀️⛈️) + `WeatherWidget.test.tsx:108-163` text assertions.
- `apps/portal/features/access-control/components/StatusBadge.tsx:20-74` shadcn-status tokens (vs `--accent-*` elsewhere).
- `apps/portal/features/departments/components/engineering/breakdowns/BreakdownsTable.tsx:50-60,80` hand-rolled input/select + empty state.
