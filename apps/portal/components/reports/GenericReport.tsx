import { GlassCard } from "@repo/ui/GlassCard";
import { Input } from "@repo/ui/Input";
import Form from "next/form";
import { CopyReportButton } from "@/components/ui/CopyReportButton";
import { ExportButton } from "@/features/analytics/components/ExportButton";
import { PDFDownloadButton } from "@/features/analytics/components/PDFDownloadButton";
import { createServerSupabaseClient } from "@repo/supabase/server";
type SupabaseClientType = Awaited<
  ReturnType<typeof createServerSupabaseClient>
>;

export async function GenericReport({
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
  const { data: logs } = await supabase
    .from("daily_logs")
    .select("id, log_date, shift, notes")
    .eq("department_id", deptId)
    .gte("log_date", fromDateStr)
    .lte("log_date", toDateStr)
    .order("log_date", { ascending: false });

  const logIds = logs?.map((l) => l.id) || [];

  const [{ data: machineHours }, { data: fuelLogs }, { data: productionLogs }] =
    await Promise.all([
      logIds.length > 0
        ? supabase
            .from("machine_hours")
            .select("daily_log_id, hours_worked")
            .in("daily_log_id", logIds)
        : Promise.resolve({ data: [] }),
      logIds.length > 0
        ? supabase
            .from("fuel_logs")
            .select("daily_log_id, diesel_litres")
            .in("daily_log_id", logIds)
        : Promise.resolve({ data: [] }),
      logIds.length > 0
        ? supabase
            .from("production_logs")
            .select("daily_log_id, coal_tonnes, waste_tonnes")
            .in("daily_log_id", logIds)
        : Promise.resolve({ data: [] }),
    ]);

  const totalHours =
    machineHours?.reduce((sum, m) => sum + (m.hours_worked || 0), 0) || 0;
  const totalFuel =
    fuelLogs?.reduce((sum, f) => sum + (f.diesel_litres || 0), 0) || 0;
  const totalCoal =
    productionLogs?.reduce((sum, p) => sum + (p.coal_tonnes || 0), 0) || 0;
  const totalWaste =
    productionLogs?.reduce((sum, p) => sum + (p.waste_tonnes || 0), 0) || 0;

  const machineHoursByLog = new Map<string, number>();
  machineHours?.forEach((m) => {
    machineHoursByLog.set(
      m.daily_log_id,
      (machineHoursByLog.get(m.daily_log_id) || 0) + (m.hours_worked || 0),
    );
  });

  const fuelLogsByLog = new Map<string, number>();
  fuelLogs?.forEach((f) => {
    fuelLogsByLog.set(
      f.daily_log_id,
      (fuelLogsByLog.get(f.daily_log_id) || 0) + (f.diesel_litres || 0),
    );
  });

  const productionByLog = new Map<
    string,
    { coal_tonnes: number; waste_tonnes: number }
  >();
  productionLogs?.forEach((p) => {
    productionByLog.set(p.daily_log_id, p);
  });

  const csvRows = [
    [
      "Date",
      "Shift",
      "Notes",
      "Total Hours",
      "Total Fuel (L)",
      "Coal (t)",
      "Waste (t)",
    ],
    ...(logs || []).map((log) => {
      const mh = machineHoursByLog.get(log.id) || 0;
      const fl = fuelLogsByLog.get(log.id) || 0;
      const pl = productionByLog.get(log.id);
      return [
        log.log_date,
        log.shift,
        log.notes || "",
        mh.toFixed(2),
        fl.toFixed(2),
        (pl?.coal_tonnes || 0).toFixed(2),
        (pl?.waste_tonnes || 0).toFixed(2),
      ];
    }),
  ];

  const csvContent = csvRows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const exportRows = (logs || []).map((log) => {
    const mh = machineHoursByLog.get(log.id) || 0;
    const fl = fuelLogsByLog.get(log.id) || 0;
    const pl = productionByLog.get(log.id);
    return {
      Date: log.log_date,
      Shift: log.shift,
      Notes: log.notes || "",
      "Total Hours": Number(mh.toFixed(2)),
      "Total Fuel (L)": Number(fl.toFixed(2)),
      "Coal (t)": Number((pl?.coal_tonnes || 0).toFixed(2)),
      "Waste (t)": Number((pl?.waste_tonnes || 0).toFixed(2)),
    };
  });

  const pdfReportData = {
    title: `${deptName} Department Report`,
    subtitle: `Generated on ${todayStr} — Date range: ${fromDateStr} to ${toDateStr}`,
    kpis: [
      { label: "Total Machine Hours", value: `${totalHours.toFixed(1)} h` },
      { label: "Diesel Consumed (L)", value: `${totalFuel.toFixed(1)} L` },
      { label: "Coal Removed (t)", value: `${totalCoal.toFixed(1)} t` },
      { label: "Waste Removed (t)", value: `${totalWaste.toFixed(1)} t` },
    ],
    tableHeaders: [
      "Date",
      "Shift",
      "Hours",
      "Fuel (L)",
      "Coal (t)",
      "Waste (t)",
    ],
    tableRows: exportRows.map((r) => [
      r.Date,
      r.Shift,
      r["Total Hours"].toString(),
      r["Total Fuel (L)"].toString(),
      r["Coal (t)"].toString(),
      r["Waste (t)"].toString(),
    ]),
  };

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
            filename={`${deptSlug}-report-${fromDateStr}-to-${toDateStr}`}
            rows={exportRows}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard>
          <p className="text-[var(--text-muted)] text-sm">
            Total Machine Hours
          </p>
          <p className="text-2xl font-medium text-[var(--text-heading)] mt-1">
            {totalHours.toFixed(1)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[var(--text-muted)] text-sm">
            Diesel Consumed (L)
          </p>
          <p className="text-2xl font-medium text-[var(--text-heading)] mt-1">
            {totalFuel.toFixed(1)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[var(--text-muted)] text-sm">Coal Removed (t)</p>
          <p className="text-2xl font-medium text-accent-green mt-1">
            {totalCoal.toFixed(1)}
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[var(--text-muted)] text-sm">Waste Removed (t)</p>
          <p className="text-2xl font-medium text-accent-blue mt-1">
            {totalWaste.toFixed(1)}
          </p>
        </GlassCard>
      </div>

      {/* Date Filter */}
      <GlassCard>
        <Form action="" className="flex items-end gap-4">
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
        </Form>
      </GlassCard>

      {/* Report Table */}
      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider"
                >
                  Shift
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider text-right"
                >
                  Hours
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider text-right"
                >
                  Fuel (L)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider text-right"
                >
                  Coal (t)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider text-right"
                >
                  Waste (t)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {logs?.map((log) => {
                const mh = machineHoursByLog.get(log.id) || 0;
                const fl = fuelLogsByLog.get(log.id) || 0;
                const pl = productionByLog.get(log.id);
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <td className="px-6 py-4 text-[var(--text-heading)] text-sm">
                      {log.log_date}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.shift === "day"
                            ? "bg-accent-blue/10 text-accent-blue"
                            : "bg-accent-blue/10 text-accent-blue"
                        }`}
                      >
                        {log.shift}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)] text-sm text-right">
                      {mh.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)] text-sm text-right">
                      {fl.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-accent-green text-sm text-right">
                      {(pl?.coal_tonnes || 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-accent-blue text-sm text-right">
                      {(pl?.waste_tonnes || 0).toFixed(1)}
                    </td>
                  </tr>
                );
              })}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td
                    colSpan={6}
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
