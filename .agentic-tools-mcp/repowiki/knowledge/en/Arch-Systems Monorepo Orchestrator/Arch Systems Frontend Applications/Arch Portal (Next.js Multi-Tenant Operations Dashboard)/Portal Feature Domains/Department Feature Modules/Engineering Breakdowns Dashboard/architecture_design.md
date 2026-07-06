Single React feature module under `features/departments/components/engineering/breakdowns/` exposing one public entry point (`index.ts`) that re-exports the `BreakdownsDashboard` component plus shared types.

Internal layering:

- Presentation layer: `BreakdownsDashboard.tsx` is a client component (`"use client"`) that owns tab state (`overview | bookin | bookout | query`) and renders four sub-components — `BreakdownStats`, `BookInForm`, `BookOutForm`, and `BreakdownsTable`. The chart panel (`BreakdownCharts`) is loaded via Next.js `dynamic()` with `ssr: false` to avoid SSR overhead.
- Server actions layer: `actions.ts` declares `"use server"` functions (`createBreakdown`, `bookOutBreakdown`, `directCheckout`, `softDeleteBreakdown`) that authenticate via Supabase (`createServerSupabaseClient().auth.getUser()`), mutate the `breakdowns` table, emit audit events through `@/lib/audit.logAuditEvent`, invalidate the Redis tag `table:breakdowns`, and call `revalidatePath` on `/engineering/breakdowns` and `/control-room/engineering-notes`.
- Shared contract: `types.ts` defines the domain interfaces (`Breakdown`, `BreakdownMetrics`, `Machine`, input DTOs) plus the `MACHINE_TYPES` const enum used by forms.

Dependency direction is strictly one-way: components import from `./types` and `./actions`; server actions depend only on shared libs (`@repo/supabase/server`, `@repo/redis`, `@/lib/audit`, `@/lib/errors`). There is no internal API route or data-fetching hook — this module is purely a UI + action boundary consumed by a parent page.
