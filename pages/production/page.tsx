import { Suspense } from "react";
import { GlassCard } from "@repo/ui/GlassCard";
import { getDepartmentContext } from "~/lib/dept-context";
import { getNonControlRoomSummary } from "~/lib/data/operations";

// AGENT-TRACE: Cleaned up duplicate/dead code from legacy control-room dashboard template copy-paste.
export default async function ProductionDashboardPage() {
  const { deptId, today } = await getDepartmentContext({
    department: "production",
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--text-heading)]">
        Production Dashboard
      </h2>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-28 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-28 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-28 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
          </div>
        }
      >
        <NonControlRoomSummaryGrid deptId={deptId} today={today} />
      </Suspense>
    </div>
  );
}

async function NonControlRoomSummaryGrid({
  deptId,
  today,
}: {
  deptId: string;
  today: string;
}) {
  const summary = await getNonControlRoomSummary(deptId, today);
  const { todayLogs, machineCount } = summary;

  const shiftCount = todayLogs.length ?? 0;
  const latestShift = todayLogs[shiftCount - 1]?.shift;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <GlassCard hover>
        <p className="text-[var(--text-muted)] text-sm">Today&apos;s Log</p>
        <p className="text-2xl font-bold text-[var(--text-heading)] mt-1">
          {shiftCount > 0
            ? `${shiftCount} shift${shiftCount > 1 ? "s" : ""} logged`
            : "Not logged"}
        </p>
        {latestShift && (
          <p className="text-[var(--text-muted)] text-xs mt-1">
            Latest: {latestShift}
          </p>
        )}
      </GlassCard>
      <GlassCard hover>
        <p className="text-[var(--text-muted)] text-sm">Active Machines</p>
        <p className="text-2xl font-bold text-[var(--text-heading)] mt-1">
          {machineCount}
        </p>
      </GlassCard>
      <GlassCard hover>
        <p className="text-[var(--text-muted)] text-sm">Status</p>
        <p className="text-2xl font-bold text-[var(--accent-green)] mt-1">
          {machineCount > 0
            ? `${machineCount} machine${machineCount > 1 ? "s" : ""} active`
            : "No machines online"}
        </p>
      </GlassCard>
    </div>
  );
}
