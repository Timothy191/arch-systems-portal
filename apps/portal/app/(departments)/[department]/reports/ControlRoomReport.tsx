import { GlassCard } from "@repo/ui/GlassCard";
import { Input } from "@repo/ui/Input";
import Link from "next/link";
import { getShiftCompleteness } from "@/lib/shift-completeness";
import { CopyReportButton } from "./CopyReportButton";
import { ExportButton } from "@/features/analytics/components/ExportButton";
import { PDFDownloadButton } from "@/features/analytics/components/PDFDownloadButton";
import { createServerSupabaseClient } from "@repo/supabase/server";
type SupabaseClientType = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function ControlRoomReport({
  supabase,
  deptId,
  deptSlug,
  deptName,
  fromDateStr,
  toDateStr,
  todayStr,
}: {
  supabase: SupabaseClientType;
  deptId: string | undefined;
  deptSlug: string | undefined;
  deptName: string | undefined;
  fromDateStr: string;
  toDateStr: string;
  todayStr: string;
}) {
    const [
      { data: operations },
      { data: loads },
      { data: delays },
      { data: excavatorAssignments },
      { data: dozerRolls },
    ] = await Promise.all([
      supabase
        .from("machine_operations")
        .select("shift_date, shift_type, hours_worked")
        .eq("department_id", deptId)
        .gte("shift_date", fromDateStr)
        .lte("shift_date", toDateStr)
        .order("shift_date", { ascending: false }),
      supabase
        .from("hourly_loads")
        .select("load_date, shift_type, total_loads")
        .eq("department_id", deptId)
        .gte("load_date", fromDateStr)
        .lte("load_date", toDateStr),
      supabase
        .from("operational_delays")
        .select("delay_date, shift_type, delay_minutes")
        .eq("department_id", deptId)
        .gte("delay_date", fromDateStr)
        .lte("delay_date", toDateStr),
      supabase
        .from("excavator_dumper_assignments")
        .select(
          "total_bcm, excavator_activity!inner(activity_date, shift_type, department_id, site:sites(name))",
        )
        .eq("excavator_activity.department_id", deptId)
        .gte("excavator_activity.activity_date", fromDateStr)
        .lte("excavator_activity.activity_date", toDateStr),
      supabase
        .from("dozer_rolls")
        .select("roll_date, shift_type, blade_passes, hours_operated")
        .eq("department_id", deptId)
        .gte("roll_date", fromDateStr)
        .lte("roll_date", toDateStr),
    ]);

    // Aggregate totals for KPIs
    const totalHours =
      operations?.reduce((sum, o) => sum + (o.hours_worked || 0), 0) || 0;
    const totalLoads =
      loads?.reduce((sum, l) => sum + (l.total_loads || 0), 0) || 0;
    const totalDelayMin =
      delays?.reduce((sum, d) => sum + (d.delay_minutes || 0), 0) || 0;
    const totalBcm =
      excavatorAssignments?.reduce((sum, a) => sum + (a.total_bcm || 0), 0) ||
      0;

    // Build per-(site, date, shift) row map
    type CRRow = {
      site: string;
      date: string;
      shift: string;
      hours: number;
      loads: number;
      bcm: number;
      delayMin: number;
      dozerPasses: number;
    };
    const rowMap = new Map<string, CRRow>();

    const key = (site: string, date: string, shift: string) =>
      `${site}|${date}|${shift}`;

    const getOrCreate = (site: string, date: string, shift: string): CRRow => {
      const k = key(site, date, shift);
      if (!rowMap.has(k)) {
        rowMap.set(k, {
          site,
          date,
          shift,
          hours: 0,
          loads: 0,
          bcm: 0,
          delayMin: 0,
          dozerPasses: 0,
        });
      }
      return rowMap.get(k)!;
    };

    operations?.forEach((o) => {
      getOrCreate("", o.shift_date, o.shift_type).hours += o.hours_worked || 0;
    });
    loads?.forEach((l) => {
      getOrCreate("", l.load_date, l.shift_type).loads += l.total_loads || 0;
    });
    delays?.forEach((d) => {
      getOrCreate("", d.delay_date, d.shift_type).delayMin +=
        d.delay_minutes || 0;
    });
    excavatorAssignments?.forEach((a) => {
      const act = Array.isArray(a.excavator_activity)
        ? a.excavator_activity[0]
        : a.excavator_activity;
      if (act) {
        const rawSite = (act as unknown as { site?: unknown }).site;
        const siteObj = Array.isArray(rawSite)
          ? ((rawSite as { name: string }[])[0]?.name ?? "")
          : ((rawSite as { name: string } | null | undefined)?.name ?? "");
        getOrCreate(siteObj, act.activity_date, act.shift_type).bcm +=
          a.total_bcm || 0;
      }
    });
    dozerRolls?.forEach((r) => {
      getOrCreate("", r.roll_date, r.shift_type).dozerPasses +=
        r.blade_passes || 0;
    });

    const rows = Array.from(rowMap.values()).sort((a, b) => {
      if (a.site !== b.site) return a.site.localeCompare(b.site);
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.shift.localeCompare(b.shift);
    });

    const csvRows = [
      [
        "Site",
        "Date",
        "Shift",
        "Hours",
        "Total Loads",
        "BCM",
        "Delay (min)",
        "Dozer Passes",
      ],
      ...rows.map((r) => [
        r.site || "—",
        r.date,
        r.shift,
        r.hours.toFixed(2),
        r.loads.toString(),
        r.bcm.toFixed(2),
        r.delayMin.toString(),
        r.dozerPasses.toString(),
      ]),
    ];

    const csvContent = csvRows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const exportRows = rows.map((r) => ({
      Site: r.site || "—",
      Date: r.date,
      Shift: r.shift,
      Hours: Number(r.hours.toFixed(2)),
      "Total Loads": r.loads,
      BCM: Number(r.bcm.toFixed(2)),
      "Delay (min)": r.delayMin,
      "Dozer Passes": r.dozerPasses,
    }));

    const pdfReportData = {
      title: `${deptName || "Department"} Department Report`,
      subtitle: `Generated on ${todayStr} — Date range: ${fromDateStr} to ${toDateStr}`,
      kpis: [
        { label: "Total Hours", value: `${totalHours.toFixed(1)} h` },
        { label: "Total Loads", value: `${totalLoads.toLocaleString()}` },
        { label: "Total BCM", value: `${totalBcm.toFixed(1)}` },
        { label: "Delay Minutes", value: `${totalDelayMin.toLocaleString()}` },
      ],
      tableHeaders: [
        "Site",
        "Date",
        "Shift",
        "Hours",
        "Loads",
        "BCM",
        "Delay (min)",
        "Dozer Passes",
      ],
      tableRows: exportRows.map((r) => [
        r.Site,
        r.Date,
        r.Shift,
        r.Hours.toString(),
        r["Total Loads"].toString(),
        r.BCM.toString(),
        r["Delay (min)"].toString(),
        r["Dozer Passes"].toString(),
      ]),
    };

    // ── Shift completeness gate ──────────────────────────────────────────────
    const currentHour = new Date().getHours();
    const currentShift: "day" | "night" =
      currentHour >= 6 && currentHour < 18 ? "day" : "night";

    const completeness = await getShiftCompleteness(supabase, deptId || "", deptSlug || "", todayStr, currentShift);

    if (!completeness.complete) {
      const missing = completeness.statuses.filter(
        (s) => !s.exempt && !s.hasEntry,
      );
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--text-heading)]">
              Reports
            </h2>
          </div>
          <GlassCard className="border-accent-red/30 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-red mt-1 shrink-0" />
              <div>
                <p className="text-[var(--text-heading)] font-medium">
                  Shift report cannot be generated
                </p>
                <p className="text-[var(--text-muted)] text-sm mt-0.5">
                  {missing.length} machine
                  {missing.length !== 1 ? "s are" : " is"} missing entries for
                  the current {currentShift} shift. Complete all entries first.
                </p>
              </div>
            </div>
            <div className="divide-y divide-[var(--border-default)] rounded-lg overflow-hidden border border-[var(--border-default)]">
              {missing.map((s) => (
                <div
                  key={s.machineId}
                  className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)]"
                >
                  <div>
                    <p className="text-[var(--text-heading)] text-sm font-medium">
                      {s.machineName}
                    </p>
                    <p className="text-[var(--text-muted)] text-xs">
                      {s.machineType}
                    </p>
                  </div>
                  <Link
                    href={s.formPath}
                    className="text-[var(--accent-cyan)] text-sm hover:underline"
                  >
                    → {s.formLabel}
                  </Link>
                </div>
              ))}
            </div>
            <Link
              href={`/${deptSlug}/machine-operations`}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--accent-cyan)] hover:underline"
            >
              View full coverage checklist →
            </Link>
          </GlassCard>
        </div>
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[var(--text-heading)]">
            Reports
          </h2>
          <div className="flex items-center gap-2">
            <CopyReportButton csvContent={csvContent} />
            <PDFDownloadButton
              reportData={pdfReportData}
              departmentId={deptId || ""}
            />
            <ExportButton
              filename={`control-room-report-${fromDateStr}-to-${toDateStr}`}
              rows={exportRows}
            />
          </div>
        </div>

        {/* CR KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard>
            <p className="text-[var(--text-muted)] text-sm">Total Hours</p>
            <p className="text-2xl font-medium text-[var(--text-heading)] mt-1">
              {totalHours.toFixed(1)}h
            </p>
          </GlassCard>
          <GlassCard>
            <p className="text-[var(--text-muted)] text-sm">Total Loads</p>
            <p className="text-2xl font-medium text-[var(--accent-cyan)] mt-1">
              {totalLoads.toLocaleString()}
            </p>
          </GlassCard>
          <GlassCard>
            <p className="text-[var(--text-muted)] text-sm">Total BCM</p>
            <p className="text-2xl font-medium text-accent-green mt-1">
              {totalBcm.toFixed(1)}
            </p>
          </GlassCard>
          <GlassCard>
            <p className="text-[var(--text-muted)] text-sm">Delay Minutes</p>
            <p className="text-2xl font-medium text-accent-blue mt-1">
              {totalDelayMin.toLocaleString()}
            </p>
          </GlassCard>
        </div>

        {/* Date Filter */}
        <GlassCard>
          <form method="GET" className="flex items-end gap-4">
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                From
              </label>
              <Input
                type="date"
                name="from"
                defaultValue={fromDateStr}
                className="px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1">
                To
              </label>
              <Input
                type="date"
                name="to"
                defaultValue={toDateStr}
                className="px-4 py-2"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-heading)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Update
            </button>
          </form>
        </GlassCard>

        {/* CR Report Table */}
        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {[
                    "Site",
                    "Date",
                    "Shift",
                    "Hours",
                    "Loads",
                    "BCM",
                    "Delay (min)",
                    "Dozer Passes",
                  ].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={`px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider ${i > 2 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {rows.map((row) => (
                  <tr
                    key={`${row.site}-${row.date}-${row.shift}`}
                    className="hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <td className="px-6 py-4 text-[var(--text-muted)] text-sm">
                      {row.site ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                          {row.site}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)] text-xs">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-heading)] text-sm">
                      {row.date}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.shift === "day"
                            ? "bg-accent-blue/10 text-accent-blue"
                            : "bg-accent-blue/10 text-accent-blue"
                        }`}
                      >
                        {row.shift}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)] text-sm text-right">
                      {row.hours.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-[var(--accent-cyan)] text-sm text-right">
                      {row.loads.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-accent-green text-sm text-right">
                      {row.bcm.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-accent-blue text-sm text-right">
                      {row.delayMin}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)] text-sm text-right">
                      {row.dozerPasses.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-[var(--text-muted)] text-sm"
                    >
                      No data found for the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    );
  }

