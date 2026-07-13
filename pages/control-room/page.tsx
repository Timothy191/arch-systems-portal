import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GlassCard } from "@repo/ui/GlassCard";
import { getDepartmentContext } from "~/lib/dept-context";
import { getCurrentShift } from "@repo/utils";
import {
  getControlRoomSummary,
  getShiftCoverageLogs,
} from "~/lib/data/operations";

const ScadaPanel = dynamic(
  () =>
    import("@/features/departments/components/control-room/ScadaPanel").then(
      (mod) => mod.ScadaPanel,
    ),
  {
    loading: () => (
      <div className="h-[400px] animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
    ),
  },
);

const AlertPanel = dynamic(
  () =>
    import("@/features/departments/components/control-room/AlertPanel").then(
      (mod) => mod.AlertPanel,
    ),
  {
    loading: () => (
      <div className="h-[400px] animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
    ),
  },
);

const ControlRoomActivityFeed = dynamic(
  () =>
    import("@/features/departments/components/control-room/ControlRoomActivityFeed").then(
      (mod) => mod.ControlRoomActivityFeed,
    ),
  {
    loading: () => (
      <div className="h-[400px] animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
    ),
  },
);

const WeatherWidget = dynamic(
  () =>
    import("@/components/weather/WeatherWidget").then(
      (mod) => mod.WeatherWidget,
    ),
  {
    loading: () => (
      <div className="h-32 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
    ),
  },
);

const ShiftCoverageWidget = dynamic(
  () =>
    import("@/features/departments/components/control-room/ShiftCoverageWidget").then(
      (mod) => mod.ShiftCoverageWidget,
    ),
  {
    loading: () => (
      <div className="h-64 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
    ),
  },
);

// AGENT-TRACE: Cleaned up duplicate/dead code from legacy control-room dashboard template copy-paste.
export default async function ControlRoomDashboardPage() {
  const deptSlug = "control-room";
  const { deptId, today } = await getDepartmentContext({
    department: deptSlug,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-heading)]">
          Control Room Dashboard
        </h2>
        <p className="text-[var(--text-muted)] text-sm">
          {new Date().toLocaleDateString("en-ZA", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Control Room Summary Grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-28 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-28 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-28 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
            <div className="h-28 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
          </div>
        }
      >
        <ControlRoomSummaryGrid deptId={deptId} today={today} />
      </Suspense>

      {/* Weather Conditions */}
      <Suspense
        fallback={
          <div className="h-32 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
        }
      >
        <WeatherWidget variant="compact" />
      </Suspense>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/${deptSlug}/machine-operations`}
          className="px-4 py-2 bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 text-white font-medium rounded-lg transition-all duration-200 text-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          + Log Operation
        </Link>
        <Link
          href={`/${deptSlug}/operational-delays`}
          className="px-4 py-2 bg-white/70 backdrop-blur-md border border-border hover:bg-white/90 text-[var(--text-secondary)] hover:text-[var(--text-heading)] font-medium rounded-lg transition-all duration-200 text-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          + Log Delay
        </Link>
        <Link
          href={`/${deptSlug}/hourly-loads`}
          className="px-4 py-2 bg-white/70 backdrop-blur-md border border-border hover:bg-white/90 text-[var(--text-secondary)] hover:text-[var(--text-heading)] font-medium rounded-lg transition-all duration-200 text-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          Update Loads
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="h-64 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
        }
      >
        <ShiftCoverageSection
          deptId={deptId}
          deptSlug={deptSlug}
          today={today}
        />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense
          fallback={
            <div className="h-[400px] animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
          }
        >
          <ScadaPanel departmentId={deptId} />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-[400px] animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
          }
        >
          <AlertPanel departmentId={deptId} />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="h-[400px] animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
        }
      >
        <ControlRoomActivityFeed departmentId={deptId} />
      </Suspense>
    </div>
  );
}

async function ControlRoomSummaryGrid({
  deptId,
  today,
}: {
  deptId: string;
  today: string;
}) {
  const summary = await getControlRoomSummary(deptId, today);
  const { todayOperations, todayDelays, todayLoads, machineCount } = summary;

  const totalHours =
    todayOperations.reduce(
      (sum: number, op: any) => sum + (op.hours_worked || 0),
      0,
    ) || 0;
  const activeOperations =
    todayOperations.filter((op: any) => op.end_time === null).length || 0;

  const delayCount = todayDelays.length || 0;
  const delayMinutes =
    todayDelays.reduce(
      (sum: number, d: any) => sum + (d.delay_minutes || 0),
      0,
    ) || 0;

  const totalLoads =
    todayLoads.reduce((sum: number, l: any) => sum + (l.total_loads || 0), 0) ||
    0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <GlassCard hover accent="blue">
        <p className="system-label">Hours Today</p>
        <p className="text-2xl font-bold text-[var(--accent-blue)] mt-1">
          {totalHours.toFixed(1)}h
        </p>
        {activeOperations > 0 && (
          <p className="text-[var(--accent-blue)] text-xs mt-1">
            {activeOperations} in progress
          </p>
        )}
      </GlassCard>
      <GlassCard hover accent="none">
        <p className="system-label">Total Loads</p>
        <p className="text-2xl font-bold text-[var(--text-heading)] mt-1">
          {totalLoads.toLocaleString()}
        </p>
      </GlassCard>
      <GlassCard hover accent="red">
        <p className="system-label">Delays</p>
        <p className="text-2xl font-bold text-accent-red mt-1">{delayCount}</p>
        {delayMinutes > 0 && (
          <p className="text-[var(--text-muted)] text-xs mt-1">
            {delayMinutes} min lost
          </p>
        )}
      </GlassCard>
      <GlassCard hover accent="green">
        <p className="system-label">Machines</p>
        <p className="text-2xl font-bold text-accent-green mt-1">
          {machineCount}
        </p>
        <p className="system-label mt-1">Active</p>
      </GlassCard>
    </div>
  );
}

async function ShiftCoverageSection({
  deptId,
  deptSlug,
  today,
}: {
  deptId: string;
  deptSlug: string;
  today: string;
}) {
  const todayLogs = await getShiftCoverageLogs(deptId, today);
  const shiftCount = todayLogs?.length ?? 0;
  const latestShift = todayLogs?.[shiftCount - 1]?.shift;
  const currentShift = (latestShift as "day" | "night") || getCurrentShift();

  return (
    <ShiftCoverageWidget
      departmentId={deptId}
      departmentSlug={deptSlug}
      today={today}
      currentShift={currentShift}
    />
  );
}
