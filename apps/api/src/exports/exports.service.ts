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
    ...rows.map((r) => headers.map((h) => sanitizeCsvCell(String(r[h] ?? ""))).join(",")),
  ].join("\n");
}

function defaultFromDate(from?: string): string {
  return from ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]!;
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

  async exportFuelLogs(params: { from?: string; to?: string; dept?: string; limit: number; offset: number }) {
    const fromDate = defaultFromDate(params.from);
    const toDate = defaultToDate(params.to);
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("daily_logs")
      .select("id, log_date, shift, department_id, fuel_logs(id, diesel_litres, machine_id, machines(name, machine_type))", { count: "estimated" })
      .gte("log_date", fromDate)
      .lte("log_date", toDate)
      .order("log_date", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    const rows: Record<string, any>[] = [];
    (data ?? []).forEach((log: any) => {
      const fLogs = Array.isArray(log.fuel_logs) ? log.fuel_logs : log.fuel_logs ? [log.fuel_logs] : [];
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

    return { rows, fromDate, toDate, count: count ?? rows.length, limit: params.limit, offset: params.offset };
  }

  async exportMachines(params: { dept?: string; limit: number; offset: number }) {
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("machines")
      .select("id, name, machine_type, serial_number, bin_factor, active, department_id, site_id, created_at", { count: "estimated" })
      .order("name")
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    return { data: data ?? [], count: count ?? data?.length ?? 0, limit: params.limit, offset: params.offset };
  }

  async exportProduction(params: { from?: string; to?: string; dept?: string; limit: number; offset: number }) {
    const fromDate = defaultFromDate(params.from);
    const toDate = defaultToDate(params.to);
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("daily_logs")
      .select("id, log_date, shift, department_id, production_logs(coal_tonnes, waste_tonnes)", { count: "estimated" })
      .gte("log_date", fromDate)
      .lte("log_date", toDate)
      .order("log_date", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    type ProdLog = { coal_tonnes: number | null; waste_tonnes: number | null };
    const rows = (data as any[]).map((log) => {
      const prods: ProdLog[] = Array.isArray(log.production_logs) ? log.production_logs : log.production_logs ? [log.production_logs] : [];
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

    return { rows, fromDate, toDate, count: count ?? rows.length, limit: params.limit, offset: params.offset };
  }

  async exportSafetyIncidents(params: { month?: string; dept?: string; limit: number; offset: number }) {
    const from = params.month ? `${params.month}-01` : defaultFromDate();
    const to = params.month
      ? new Date(new Date(`${params.month}-01`).getFullYear(), new Date(`${params.month}-01`).getMonth() + 1, 0).toISOString().split("T")[0]!
      : defaultToDate();
    const deptId = await this.resolveDeptId(params.dept);

    let query = this.supabase
      .from("safety_incidents")
      .select("id, incident_date, incident_type, severity, status, department_id, description", { count: "estimated" })
      .gte("incident_date", from)
      .lte("incident_date", to)
      .order("incident_date", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (deptId) query = query.eq("department_id", deptId);

    const { data, error, count } = await query;
    if (error) throw new Error("Database query failed");

    return { data: data ?? [], from, to, count: count ?? data?.length ?? 0, limit: params.limit, offset: params.offset };
  }

  toCsv(headers: string[], rows: Record<string, any>[]): string {
    return toCsv(headers, rows);
  }
}
