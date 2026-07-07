import { getDepartmentContext } from "~/lib/dept-context";
import SuspenseOnSearchParams from "@/components/SuspenseOnSearchParams";
import { ControlRoomReport } from "./ControlRoomReport";
import { GenericReport } from "./GenericReport";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ department: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  return (
    <SuspenseOnSearchParams
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse bg-[var(--bg-tertiary)] rounded-lg" />
          <div className="grid grid-cols-4 gap-4">
            <div className="h-24 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-24 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-24 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-24 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
          </div>
          <div className="h-16 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
          <div className="h-96 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
        </div>
      }
    >
      <ReportsContent params={params} searchParams={searchParams} />
    </SuspenseOnSearchParams>
  );
}

async function ReportsContent({
  params,
  searchParams,
}: {
  params: Promise<{ department: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { department: deptSlug } = await params;
  const { from: fromParam, to: toParam } = await searchParams;
  const { dept, deptId, supabase } = await getDepartmentContext({
    department: deptSlug,
  });

  const todayStr = new Date().toISOString().split("T")[0]!;
  const toDateStr = toParam || todayStr;
  const fromDateStr =
    fromParam ||
    new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]!;

  const isControlRoom = dept.type === "control_room";

  if (isControlRoom) {
    return (
      <ControlRoomReport
        supabase={supabase}
        deptId={deptId}
        deptSlug={deptSlug}
        deptName={dept.displayName || "Department"}
        fromDateStr={fromDateStr}
        toDateStr={toDateStr}
        todayStr={todayStr}
      />
    );
  }

  return (
    <GenericReport
      supabase={supabase}
      deptId={deptId}
      deptSlug={deptSlug}
      deptName={dept.displayName || "Department"}
      fromDateStr={fromDateStr}
      toDateStr={toDateStr}
      todayStr={todayStr}
    />
  );
}
