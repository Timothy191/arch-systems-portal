Flat collection of Next.js "use client" React components under `features/departments/components/control-room/`, each owning one dashboard panel:

- `FuxaFrame.tsx` embeds an external FUXA SCADA instance via `<iframe>` (URL from `NEXT_PUBLIC_FUXA_URL`) with loading/error/retry UI and a cross-origin stylesheet injection attempt.
- `AlertPanel.tsx` and `ControlRoomActivityFeed.tsx` subscribe to Postgres Realtime channels on the `machines` table filtered by `department_id=eq.${departmentId}`, mapping `INSERT/UPDATE/DELETE` events into in-memory alert/activity lists kept up-to-date via `useThrottledState`.
- `ShiftCoverageWidget.tsx` fetches active machines plus `machine_operations` for the given `shift_date`/`shift_type`, merges them into a coverage table, and gates a `CloseShiftModal` dialog; it accepts optional `initialData` for server-side hydration.
- `DozerRollForm.tsx` is a stateful form validated with a Zod schema (`dozerRollSchema`) before inserting into `dozer_rolls`; area is computed client-side from length × width.
- `MachineControl.tsx` is a local-only parameter editor (RPM/power/pressure) using `PrecisionInput` — no network calls yet.
- `CloseShiftModal.tsx` is a sibling modal invoked by the coverage widget.

Dependency direction: components depend only on shared primitives (`@repo/ui/GlassCard`, `@repo/ui/AnimatedList`, `@repo/ui/ShiftToggle`, `@repo/supabase/client`, `@/hooks/useThrottledState`, `lucide-react`). There is no internal index barrel — consumers import individual files directly. The module has no server-side logic or API routes; all persistence goes through Supabase RLS-filtered queries.
