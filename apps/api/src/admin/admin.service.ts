import { Injectable, Inject, Logger, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminDataUpdateSchema } from "../common/schemas";

const OPERATIONAL_TABLES = new Set([
  "machines",
  "daily_logs",
  "machine_hours",
  "fuel_logs",
  "production_logs",
  "machine_operations",
  "hourly_loads",
  "operational_delays",
  "engineering_notes",
  "shift_status",
  "excavator_activity",
  "excavator_dumper_assignments",
  "dozer_rolls",
  "breakdowns",
  "safety_incidents",
  "drill_operations",
  "documents",
  "document_versions",
  "machine_configurations",
  "operators",
  "sites",
  "mine_blocks",
  "delay_categories",
  "report_templates",
  "safety_severities",
  "safety_incident_categories",
  "generated_reports",
  "personnel",
  "visitors",
  "badges",
  "fleet",
  "equipment",
  "access_logs",
]);

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  validateTable(table: string): string {
    const normalized = table.toLowerCase();
    if (!OPERATIONAL_TABLES.has(normalized)) {
      throw new NotFoundException("Unknown table");
    }
    return normalized;
  }

  async getData(
    table: string,
    limit: number,
    offset: number,
    orderBy: string,
    orderDir: "asc" | "desc",
  ) {
    const { data, error, count } = await this.supabase
      .from(table)
      .select("*", { count: "exact" })
      .order(orderBy, { ascending: orderDir === "asc" })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error("Database query failed", error.message);
      throw new Error("Database query failed");
    }

    return { data, count, limit, offset };
  }

  async updateData(table: string, body: { id: string; data: Record<string, unknown> }, employeeId: string) {
    const parsed = adminDataUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { id, data } = parsed.data;
    if (!id) {
      throw new BadRequestException("Missing record id");
    }

    // Get before state for audit
    const { data: before } = await this.supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await this.supabase.from(table).update(data).eq("id", id);
    if (error) {
      this.logger.error("Update failed", error.message);
      throw new Error("Update failed");
    }

    await this.supabase.from("audit_logs").insert({
      action: "update",
      table_name: table,
      record_id: id,
      old_data: before ?? null,
      new_data: data,
      performed_by: employeeId,
    });

    return { success: true };
  }

  async deleteData(table: string, id: string, employeeId: string) {
    if (!id) {
      throw new BadRequestException("Missing id query parameter");
    }

    // Get before state for audit
    const { data: before } = await this.supabase
      .from(table)
      .select("*")
      .eq("id", id)
      .single();

    const { error } = await this.supabase.from(table).delete().eq("id", id);
    if (error) {
      this.logger.error("Delete failed", error.message);
      throw new Error("Delete failed");
    }

    await this.supabase.from("audit_logs").insert({
      action: "delete",
      table_name: table,
      record_id: id,
      old_data: before ?? null,
      performed_by: employeeId,
    });

    return { success: true };
  }

  async assertAdmin(userId: string) {
    const { data: employee } = await this.supabase
      .from("employees")
      .select("id, role")
      .eq("auth_id", userId)
      .single();

    if (!employee || employee.role !== "admin") {
      throw new ForbiddenException("Forbidden");
    }

    return employee;
  }
}
