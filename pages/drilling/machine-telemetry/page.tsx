import { redirect } from "next/navigation";
import { getDepartmentContext } from "~/lib/dept-context";
import { getMachineTelemetryData } from "~/lib/data/drilling";
import SuspenseOnSearchParams from "@/components/providers/SuspenseOnSearchParams";
import { GlassSkeleton } from "@repo/ui/components/ui/glass-skeleton";
import {
  TelemetryKPICards,
  TelemetryMonthlySummary,
  TelemetryCurrentTable,
  TelemetryArchives,
  TelemetryArchiveInfo,
} from "./components/TelemetryComponents";
import { Calendar, Activity, Gauge } from "lucide-react";
import { Button } from "@repo/ui/Button";
import Link from "next/link";
import { formatMonth } from "./components/TelemetryComponents";

interface MachineTelemetryPageProps {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

async function MachineTelemetryContent({
  deptId,
  machineId,
}: {
  deptId: string;
  machineId?: string;
}) {
  const selectedMachineId = machineId === "all" ? undefined : machineId;
  const { currentMonth, telemetry, archives, drills, monthlySummary } =
    await getMachineTelemetryData(deptId, selectedMachineId);

  // Calculate monthly totals
  const totalRecords = telemetry.reduce(
    (sum, t) => sum + (t.record_count || 0),
    0,
  );
  const totalAlerts = telemetry.reduce(
    (sum, t) => sum + (t.total_alerts || 0),
    0,
  );
  const avgPenetration =
    telemetry.length > 0
      ? telemetry.reduce((sum, t) => sum + (t.avg_penetration_rate || 0), 0) /
        telemetry.length
      : 0;
  const maxBitDepth = Math.max(
    ...telemetry.map((t) => t.max_bit_depth || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-heading)]">
            Machine Telemetry
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              Current Period:{" "}
              <span className="font-medium text-[var(--accent-blue)]">
                {formatMonth(currentMonth)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/drilling/drilling-operations">
            <Button variant="outline" className="border-[var(--border-subtle)]">
              <Activity className="w-4 h-4 mr-2" />
              Live Operations
            </Button>
          </Link>
          <Button className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90">
            <Gauge className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>
      <TelemetryKPICards
        totalRecords={totalRecords}
        totalAlerts={totalAlerts}
        avgPenetration={avgPenetration}
        maxBitDepth={maxBitDepth}
        drills={drills}
      />
      <TelemetryMonthlySummary
        monthlySummary={monthlySummary}
        currentMonth={currentMonth}
      />
      <TelemetryCurrentTable
        telemetry={telemetry}
        drills={drills}
        machineId={selectedMachineId}
        maxBitDepth={maxBitDepth}
        currentMonth={currentMonth}
      />
      <TelemetryArchives archives={archives} currentMonth={currentMonth} />
      <TelemetryArchiveInfo />
    </div>
  );
}

export default async function MachineTelemetryPage({
  searchParams,
}: MachineTelemetryPageProps) {
  const { deptId } = await getDepartmentContext({ department: "drilling" });
  if (!deptId) redirect("/login");

  const { machineId } = await searchParams;

  return (
    <SuspenseOnSearchParams fallback={<GlassSkeleton />}>
      <MachineTelemetryContent deptId={deptId} machineId={machineId} />
    </SuspenseOnSearchParams>
  );
}
