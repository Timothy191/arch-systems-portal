import { Injectable, Inject, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";

function sanitizeCsvCell(value: string): string {
  const dangerous = /^[=+\-@\t\r]/;
  const sanitized = dangerous.test(value) ? "'" + value : value;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: Record<string, any>[]): string {
  return [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => sanitizeCsvCell(String(r[h] ?? ""))).join(","),
    ),
  ].join("\n");
}

function defaultFromDate(from?: string): string {
  return (
    from ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]!
  );
}

function defaultToDate(to?: string): string {
  return to ?? new Date().toISOString().split("T")[0]!;
}

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async resolveDeptId(dept?: string): Promise<string | undefined> {
    if (!dept) return undefined;
    const { data: deptRow } = await this.supabase
      .from("departments")
      .select("id")
      .eq("name", dept)
      .single();
    return deptRow?.id;
  }

  async exportFuelLogs(params: {
    from?: string;
    to?: string;
    dept?: string;
    limit: number;
    offset: number;
  }) {
    const fromDate = defaultFromDate(params.from);
    const toDate = defaultToDate(params.to);
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("daily_logs")
      .select(
        "id, log_date, shift, department_id, fuel_logs(id, diesel_litres, machine_id, machines(name, machine_type))",
        { count: "estimated" },
      )
      .gte("log_date", fromDate)
      .lte("log_date", toDate)
      .order("log_date", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    const rows: Record<string, any>[] = [];
    (data ?? []).forEach((log: any) => {
      const fLogs = Array.isArray(log.fuel_logs)
        ? log.fuel_logs
        : log.fuel_logs
          ? [log.fuel_logs]
          : [];
      fLogs.forEach((fl: any) => {
        rows.push({
          id: fl.id,
          log_date: log.log_date,
          shift: log.shift,
          department_id: log.department_id,
          machine_id: fl.machine_id,
          machine_name: fl.machines?.name ?? "Unknown",
          machine_type: fl.machines?.machine_type ?? "Unknown",
          diesel_litres: Number(fl.diesel_litres ?? 0).toFixed(2),
        });
      });
    });

    return {
      rows,
      fromDate,
      toDate,
      count: count ?? rows.length,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async exportMachines(params: {
    dept?: string;
    limit: number;
    offset: number;
  }) {
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("machines")
      .select(
        "id, name, machine_type, serial_number, bin_factor, active, department_id, site_id, created_at",
        { count: "estimated" },
      )
      .order("name")
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    return {
      data: data ?? [],
      count: count ?? data?.length ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async exportProduction(params: {
    from?: string;
    to?: string;
    dept?: string;
    limit: number;
    offset: number;
  }) {
    const fromDate = defaultFromDate(params.from);
    const toDate = defaultToDate(params.to);
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("daily_logs")
      .select(
        "id, log_date, shift, department_id, production_logs(coal_tonnes, waste_tonnes)",
        { count: "estimated" },
      )
      .gte("log_date", fromDate)
      .lte("log_date", toDate)
      .order("log_date", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    type ProdLog = { coal_tonnes: number | null; waste_tonnes: number | null };
    const rows = (data as any[]).map((log) => {
      const prods: ProdLog[] = Array.isArray(log.production_logs)
        ? log.production_logs
        : log.production_logs
          ? [log.production_logs]
          : [];
      const coal = prods.reduce((s, p) => s + (p.coal_tonnes ?? 0), 0);
      const waste = prods.reduce((s, p) => s + (p.waste_tonnes ?? 0), 0);
      return {
        log_date: log.log_date,
        shift: log.shift,
        department_id: log.department_id,
        coal_tonnes: coal.toFixed(2),
        waste_tonnes: waste.toFixed(2),
        total_tonnes: (coal + waste).toFixed(2),
      };
    });

    return {
      rows,
      fromDate,
      toDate,
      count: count ?? rows.length,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async exportSafetyIncidents(params: {
    month?: string;
    dept?: string;
    limit: number;
    offset: number;
  }) {
    const from = params.month ? `${params.month}-01` : defaultFromDate();
    const to = params.month
      ? new Date(
          new Date(`${params.month}-01`).getFullYear(),
          new Date(`${params.month}-01`).getMonth() + 1,
          0,
        )
          .toISOString()
          .split("T")[0]!
      : defaultToDate();
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("safety_incidents")
      .select(
        "id, incident_date, incident_type, severity, status, department_id, description",
        { count: "estimated" },
      )
      .gte("incident_date", from)
      .lte("incident_date", to)
      .order("incident_date", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    return {
      data: data ?? [],
      from,
      to,
      count: count ?? data?.length ?? 0,
      limit: params.limit,
      offset: params.offset,
    };
  }

  async generateMonthlyReport(input: {
    reportData: any;
    departmentId: string;
    userId: string;
  }): Promise<{ success: true; url: string }> {
    const { pdf, Document, Page, Text, View, StyleSheet } = await import(
      "@react-pdf/renderer"
    );
    const React = await import("react");

    const styles = StyleSheet.create({
      page: {
        padding: 40,
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica",
      },
      header: {
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        paddingBottom: 15,
        marginBottom: 20,
      },
      title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
      subtitle: { fontSize: 10, color: "#6b7280", marginTop: 4 },
      section: { marginBottom: 20 },
      sectionTitle: {
        fontSize: 11,
        fontWeight: "bold",
        color: "#374151",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      },
      grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
      card: {
        width: "48%",
        backgroundColor: "#f9fafb",
        borderWidth: 1,
        borderColor: "#f3f4f6",
        borderRadius: 6,
        padding: 12,
        marginHorizontal: 5,
        marginBottom: 10,
      },
      cardLabel: {
        fontSize: 8,
        color: "#6b7280",
        textTransform: "uppercase",
        fontWeight: "bold",
      },
      cardValue: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#111827",
        marginTop: 4,
      },
      footer: {
        position: "absolute",
        bottom: 30,
        left: 40,
        right: 40,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
      },
      footerText: { fontSize: 8, color: "#9ca3af" },
    });

    const data = input.reportData ?? {};
    const kpis = Array.isArray(data.kpis) ? data.kpis : [];
    const tableHeaders = Array.isArray(data.tableHeaders)
      ? data.tableHeaders
      : [];
    const tableRows = Array.isArray(data.tableRows) ? data.tableRows : [];

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            Text,
            { style: styles.title },
            data.title ?? "Monthly Report",
          ),
          React.createElement(
            Text,
            { style: styles.subtitle },
            data.subtitle ?? "Generated operational report",
          ),
        ),
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(
            Text,
            { style: styles.sectionTitle },
            "Key Performance Indicators",
          ),
          React.createElement(
            View,
            { style: styles.grid },
            ...kpis.map(
              (kpi: { label: string; value: string }, index: number) =>
                React.createElement(
                  View,
                  { key: index, style: styles.card },
                  React.createElement(
                    Text,
                    { style: styles.cardLabel },
                    kpi.label,
                  ),
                  React.createElement(
                    Text,
                    { style: styles.cardValue },
                    kpi.value,
                  ),
                ),
            ),
          ),
        ),
        tableRows.length > 0
          ? React.createElement(
              View,
              { style: styles.section },
              React.createElement(
                Text,
                { style: styles.sectionTitle },
                "Operational Details",
              ),
              React.createElement(Text, null, tableHeaders.join(" | ")),
              ...tableRows.map((row: string[], index: number) =>
                React.createElement(Text, { key: index }, row.join(" | ")),
              ),
            )
          : null,
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(
            Text,
            { style: styles.footerText },
            "Arch-Systems Mining Operations Portal",
          ),
          React.createElement(
            Text,
            { style: styles.footerText },
            `Generated on ${new Date().toLocaleDateString("en-ZA")}`,
          ),
        ),
      ),
    );

    const buffer = await pdf(doc as any).toBuffer();
    const filename = `${input.departmentId}/${input.userId}/report-${Date.now()}.pdf`;

    const { error: uploadError } = await this.supabase.storage
      .from("documents")
      .upload(filename, buffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: signedData, error: signedError } = await this.supabase.storage
      .from("documents")
      .createSignedUrl(filename, 3600);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(
        `Signed URL creation failed: ${signedError?.message ?? "missing URL"}`,
      );
    }

    return { success: true, url: signedData.signedUrl };
  }

  toCsv(headers: string[], rows: Record<string, any>[]): string {
    return toCsv(headers, rows);
  }
}
