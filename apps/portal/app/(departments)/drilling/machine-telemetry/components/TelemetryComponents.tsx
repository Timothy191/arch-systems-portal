import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { GlassCard } from "@repo/ui/GlassCard";
import { Button } from "@repo/ui/components/ui/button";
import {
  Activity,
  Archive,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Gauge,
  Thermometer,
  Droplets,
  ArrowDown,
  Layers,
  Database,
  Clock,
  BarChart3,
} from "lucide-react";
import { TelemetryRecord, ArchivedMonth, DrillMonthlySummary } from "./types";

function formatNumber(
  num: number | null | undefined,
  decimals: number = 1,
): string {
  if (num === null || num === undefined) return "-";
  return num.toFixed(decimals);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  if (!year || !month) return yearMonth;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
  });
}


export function TelemetryHeader({ currentMonth }: { currentMonth: string }) {
  return (
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

  );
}

export function TelemetryKPICards({ totalRecords, totalAlerts, avgPenetration, maxBitDepth, drills }: { totalRecords: number, totalAlerts: number, avgPenetration: number, maxBitDepth: number, drills: {id: string, name: string}[] }) {
  return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard>
          <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            Active Drills
          </p>
          <p className="text-2xl font-bold text-[var(--text-heading)] mt-1">
            {drills.length}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            Data Points
          </p>
          <p className="text-2xl font-bold text-[var(--accent-blue)] mt-1">
            {totalRecords.toLocaleString()}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider">
            Avg Penetration
          </p>
          <p className="text-2xl font-bold text-accent-green mt-1">
            {formatNumber(avgPenetration, 2)} m/h
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wider text-accent-red">
            Alerts
          </p>
          <p className="text-2xl font-bold text-accent-red mt-1">
            {totalAlerts}
          </p>
        </GlassCard>
      </div>

  );
}

export function TelemetryMonthlySummary({ monthlySummary, currentMonth }: { monthlySummary: DrillMonthlySummary[], currentMonth: string }) {
  return (
      <GlassCard className="overflow-hidden p-0">
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--accent-blue)]" />
              <h3 className="text-lg font-semibold text-[var(--text-heading)]">
                Monthly Availability & Utilization
              </h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Auto-built from {formatMonth(currentMonth)} drill operations.
              Downtime = Standard + External + Production + Engineering delays.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-subtle)] hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider">
                  <Activity className="w-3 h-3 inline mr-1" />
                  Drill Rig
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Scheduled (h)
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  Productive (h)
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Downtime (h)
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  Availability %
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  Utilization %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlySummary.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-[var(--text-muted)]"
                  >
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>
                      No drill operations logged for {formatMonth(currentMonth)}{" "}
                      yet.
                    </p>
                    <p className="text-sm mt-1">
                      Log shifts in Drilling Operations to populate the summary.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                monthlySummary.map((s) => {
                  const scheduled = Number(s.scheduled_hours ?? 0);
                  const productive = Number(s.productive_hours ?? 0);
                  const downtime = Number(s.downtime_hours ?? 0);
                  const availabilityPct = s.availability_pct;
                  const utilizationPct = s.utilization_pct;

                  const availabilityClass =
                    availabilityPct === null
                      ? "text-[var(--text-muted)]"
                      : availabilityPct >= 85
                        ? "text-accent-green"
                        : availabilityPct >= 70
                          ? "text-accent-blue"
                          : "text-accent-red";

                  const utilizationClass =
                    utilizationPct === null
                      ? "text-[var(--text-muted)]"
                      : utilizationPct >= 85
                        ? "text-accent-green"
                        : utilizationPct >= 70
                          ? "text-accent-blue"
                          : "text-accent-red";

                  return (
                    <TableRow
                      key={s.machine_id}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/30"
                    >
                      <TableCell className="font-medium text-[var(--text-heading)]">
                        {s.machine_name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--text-body)]">
                        {scheduled > 0 ? scheduled.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--text-body)]">
                        {productive > 0 ? productive.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--text-body)]">
                        {downtime > 0 ? downtime.toFixed(2) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${availabilityClass}`}
                      >
                        {availabilityPct === null
                          ? "—"
                          : `${availabilityPct.toFixed(1)}%`}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${utilizationClass}`}
                      >
                        {utilizationPct === null
                          ? "—"
                          : `${utilizationPct.toFixed(1)}%`}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

  );
}

export function TelemetryCurrentTable({ telemetry, drills, maxBitDepth, machineId, currentMonth }: { telemetry: TelemetryRecord[], drills: {id: string, name: string}[], maxBitDepth: number, machineId?: string, currentMonth: string }) {
  return (
      <GlassCard className="overflow-hidden p-0">
        <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">
              {formatMonth(currentMonth)} Telemetry
            </h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Daily aggregated telemetry data for active month
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Filter Dropdown */}
            <form method="GET" className="flex items-center gap-2">
              <label
                htmlFor="machineId"
                className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold"
              >
                Filter Rig:
              </label>
              <select
                id="machineId"
                name="machineId"
                defaultValue={machineId || "all"}
                className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-heading)] text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[var(--accent-blue)]"
              >
                <option value="all">All Drill Rigs</option>
                {drills.map((drill) => (
                  <option key={drill.id} value={drill.id}>
                    {drill.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-[var(--bg-tertiary)] hover:bg-[var(--border-subtle)] text-xs text-[var(--text-heading)] font-semibold rounded-lg border border-[var(--border-subtle)] transition-colors"
              >
                Apply
              </button>
            </form>

            <div className="flex items-center gap-2 border-l border-[var(--border-subtle)] pl-4">
              <TrendingUp className="w-5 h-5 text-accent-green" />
              <span className="text-sm text-[var(--text-body)]">
                Max Depth:{" "}
                <span className="font-semibold text-accent-green">
                  {formatNumber(maxBitDepth, 1)}m
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-subtle)] hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider">
                  <Calendar className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Date
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider">
                  <Activity className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Drill Rig
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Gauge className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Engine RPM
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Thermometer className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Temp (°C)
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Droplets className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Pressure
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <ArrowDown className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Bit Depth
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Layers className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Hole Depth
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <TrendingUp className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Pen. Rate
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-center">
                  <AlertTriangle className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Alerts
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Database className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Records
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {telemetry.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-12 text-[var(--text-muted)]"
                  >
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No telemetry data for {formatMonth(currentMonth)}</p>
                    <p className="text-sm mt-1">
                      Data will appear once machines start reporting telemetry
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                telemetry.map((record) => {
                  const isHighRPM =
                    record.avg_engine_rpm && record.avg_engine_rpm > 2100;
                  const isOverheating =
                    record.avg_engine_temp && record.avg_engine_temp > 95;
                  const isWarm =
                    record.avg_engine_temp &&
                    record.avg_engine_temp > 85 &&
                    record.avg_engine_temp <= 95;

                  return (
                    <TableRow
                      key={`${record.machine_id}-${record.period}`}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/50"
                    >
                      <TableCell className="font-semibold text-[var(--text-heading)]">
                        {formatDate(record.period)}
                      </TableCell>
                      <TableCell className="text-[var(--text-body)]">
                        {record.machine_name}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${isHighRPM ? "text-accent-blue" : "text-[var(--text-body)]"}`}
                      >
                        {formatNumber(record.avg_engine_rpm, 0)} rpm
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${isOverheating ? "text-accent-red" : isWarm ? "text-accent-blue" : "text-[var(--text-body)]"}`}
                      >
                        {formatNumber(record.avg_engine_temp, 1)}°C
                      </TableCell>
                      <TableCell className="text-right text-[var(--text-body)] font-medium">
                        {formatNumber(record.avg_hydraulic_pressure, 0)} bar
                      </TableCell>
                      <TableCell className="text-right font-semibold text-accent-green">
                        {formatNumber(record.max_bit_depth, 1)}m
                      </TableCell>
                      <TableCell className="text-right font-semibold text-[var(--accent-cyan)]">
                        {formatNumber(record.max_hole_depth, 1)}m
                      </TableCell>
                      <TableCell className="text-right text-[var(--text-body)] font-medium">
                        {formatNumber(record.avg_penetration_rate, 2)} m/h
                      </TableCell>
                      <TableCell className="text-center">
                        {record.total_alerts > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-red/10 text-accent-red">
                            {record.total_alerts}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-green/10 text-accent-green">
                            0
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-[var(--text-muted)] text-sm">
                        {record.record_count}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

  );
}

export function TelemetryArchives({ archives, currentMonth }: { archives: ArchivedMonth[], currentMonth: string }) {
  return (
      <GlassCard className="overflow-hidden p-0">
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-[var(--text-muted)]" />
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">
              Archived Months
            </h3>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Previous months telemetry data is automatically archived and
            preserved for safe keeping
          </p>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[var(--border-subtle)] hover:bg-transparent">
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider">
                  <Calendar className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Month
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider">
                  <Activity className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Drill Rig
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Database className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Records
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-right">
                  <Archive className="w-3 h-3 inline mr-1 text-[var(--text-muted)]" />
                  Archived On
                </TableHead>
                <TableHead className="text-[var(--text-muted)] font-semibold text-xs uppercase tracking-wider text-center">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archives.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-[var(--text-muted)]"
                  >
                    <Archive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No archived telemetry data yet</p>
                    <p className="text-sm mt-1">
                      Data is archived automatically when each month ends
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                archives.map((archive) => (
                  <TableRow
                    key={archive.id}
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]/50"
                  >
                    <TableCell className="font-semibold text-[var(--text-heading)]">
                      {formatMonth(archive.year_month)}
                    </TableCell>
                    <TableCell className="text-[var(--text-body)]">
                      {archive.machine_name}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-body)] font-medium">
                      {archive.record_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-[var(--text-muted)] text-sm">
                      {formatDate(archive.archived_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/90"
                      >
                        View Summary
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

  );
}

export function TelemetryArchiveInfo() {
  return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <h4 className="font-semibold text-[var(--text-heading)] mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent-green" />
            How Archival Works
          </h4>
          <ul className="text-sm text-[var(--text-body)] space-y-1 list-disc list-inside">
            <li>Telemetry data is captured continuously during operation</li>
            <li>At month end, data is automatically summarized and archived</li>
            <li>Active table holds only current month for fast queries</li>
            <li>Archived data includes daily averages and maximums</li>
            <li>Historical data is preserved indefinitely for analysis</li>
          </ul>
        </GlassCard>

        <GlassCard className="p-4">
          <h4 className="font-semibold text-[var(--text-heading)] mb-2 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[var(--accent-blue)]" />
            Telemetry Metrics
          </h4>
          <ul className="text-sm text-[var(--text-body)] space-y-1 list-disc list-inside">
            <li>
              <strong>Engine:</strong> RPM, temperature, operating hours
            </li>
            <li>
              <strong>Hydraulics:</strong> Pressure, temperature, flow rate
            </li>
            <li>
              <strong>Drilling:</strong> Bit depth, penetration rate, WOB
            </li>
            <li>
              <strong>Environment:</strong> Ambient temp, vibration levels
            </li>
            <li>
              <strong>Alerts:</strong> Warning codes and fault conditions
            </li>
          </ul>
        </GlassCard>
      </div>
  );
}
