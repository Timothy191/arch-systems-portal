import { getDepartmentContext } from "~/lib/dept-context";
import SuspenseOnSearchParams from "@/components/providers/SuspenseOnSearchParams";
import { ControlRoomReport } from "@/components/reports/ControlRoomReport";
import { GenericReport } from "@/components/reports/GenericReport";

export default async function ReportsPage({
  params: _params,
  searchParams,
}: {
  params: Promise<{}>;
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
      <ReportsContent params={_params} searchParams={searchParams} />
    </SuspenseOnSearchParams>
  );
}

async function ReportsContent({
  params: _params,
  searchParams,
}: {
  params: Promise<{}>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const department = "safety";
  const deptSlug = department;
  const { from: fromParam, to: toParam } = await searchParams;
  const { dept, deptId, supabase } = await getDepartmentContext({
    department: deptSlug,
  });

  const todayStr = new Date().toISOString().split("T")[0]!;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const toDateStr = toParam && dateRegex.test(toParam) ? toParam : todayStr;
  const fromDateStr =
    fromParam && dateRegex.test(fromParam)
      ? fromParam
      : new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]!;

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
