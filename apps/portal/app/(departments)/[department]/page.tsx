import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { GlassCard } from "@repo/ui/GlassCard";
import { getDepartmentContext } from "~/lib/dept-context";
import { getCurrentShift } from "@repo/utils";

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
    import(
      "@/features/departments/components/control-room/ControlRoomActivityFeed"
    ).then((mod) => mod.ControlRoomActivityFeed),
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
    import(
      "@/features/departments/components/control-room/ShiftCoverageWidget"
    ).then((mod) => mod.ShiftCoverageWidget),
  {
    loading: () => (
      <div className="h-64 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
    ),
  },
);

const SatelliteMonitoringDashboard = dynamic(
  () =>
    import(
      "@/features/departments/components/satellite/SatelliteMonitoringDashboard"
    ).then((mod) => mod.SatelliteMonitoringDashboard),
  {
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-blue)]/20 border-t-[var(--accent-blue)] rounded-full animate-spin" />
      </div>
    ),
  },
);

const SafetyDashboard = dynamic(
  () =>
    import("@/features/departments/components/safety/SafetyDashboard").then(
      (mod) => mod.SafetyDashboard,
    ),
  {
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="w-8 h-8 border-2 border-[var(--accent-green)]/20 border-t-[var(--accent-green)] rounded-full animate-spin" />
      </div>
    ),
  },
);

export default async function DepartmentDashboard({
  params,
}: {
  params: Promise<{ department: string }>;
}) {
  const { department: deptSlug } = await params;
  const { dept, deptId, today } = await getDepartmentContext({
    department: deptSlug,
  });

  // 1. Early returns for satellite and safety — skip shared queries entirely
  if (dept.type === "satellite") {
    return <SatelliteMonitoringDashboard />;
  }

  if (dept.type === "safety") {
    return <SafetyDashboard deptId={deptId} />;
  }

  const isControlRoom = dept.type === "control_room";

  return (
    <div className="space-y-6">
      {isControlRoom ? (
        <>
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
              className="px-4 py-2 bg-white/70 backdrop-blur-md border border-black/[0.08] hover:bg-white/90 text-[var(--text-secondary)] hover:text-[var(--text-heading)] font-medium rounded-lg transition-all duration-200 text-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              + Log Delay
            </Link>
            <Link
              href={`/${deptSlug}/hourly-loads`}
              className="px-4 py-2 bg-white/70 backdrop-blur-md border border-black/[0.08] hover:bg-white/90 text-[var(--text-secondary)] hover:text-[var(--text-heading)] font-medium rounded-lg transition-all duration-200 text-sm hover:scale-[1.02] active:scale-[0.98]"
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
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold text-[var(--text-heading)]">
            Dashboard
          </h2>

          {/* Weather for drilling department - critical for outdoor operations */}
          {deptSlug === "drilling" && (
            <Suspense
              fallback={
                <div className="h-32 animate-pulse bg-[var(--bg-tertiary)] rounded-2xl" />
              }
            >
              <WeatherWidget variant="full" />
            </Suspense>
          )}

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
        </>
      )}
    </div>
  );
}

import { cookies } from "next/headers";
import {
  getControlRoomSummary,
  getNonControlRoomSummary,
  getShiftCoverageLogs,
} from "~/lib/data/operations";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

async function ControlRoomSummaryGrid({
  deptId,
  today,
}: {
  deptId: string;
  today: string;
}) {
  const cookieStore = await cookies();
  const summary = await getControlRoomSummary(deptId, today, cookieStore.getAll());

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
    todayDelays.reduce((sum: number, d: any) => sum + (d.delay_minutes || 0), 0) || 0;

  const totalLoads =
    todayLoads.reduce((sum: number, l: any) => sum + (l.total_loads || 0), 0) || 0;

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

async function NonControlRoomSummaryGrid({
  deptId,
  today,
}: {
  deptId: string;
  today: string;
}) {
  const cookieStore = await cookies();
  const summary = await getNonControlRoomSummary(deptId, today, cookieStore.getAll());

  const { todayLogs, machineCount } = summary;

  const shiftCount = todayLogs.length ?? 0;
  const latestShift = todayLogs[shiftCount - 1]?.shift;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <GlassCard>
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
      <GlassCard>
        <p className="text-[var(--text-muted)] text-sm">Active Machines</p>
        <p className="text-2xl font-bold text-[var(--text-heading)] mt-1">
          {machineCount}
        </p>
      </GlassCard>
      <GlassCard>
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

async function ShiftCoverageSection({
  deptId,
  deptSlug,
  today,
}: {
  deptId: string;
  deptSlug: string;
  today: string;
}) {
  const cookieStore = await cookies();
  const todayLogs = await getShiftCoverageLogs(deptId, today, cookieStore.getAll());

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
