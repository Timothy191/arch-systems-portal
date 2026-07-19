import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { db } from "@repo/database";
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
    const data = await db
      .selectFrom(table as any)
      .selectAll()
      .orderBy(orderBy as any, orderDir)
      .limit(limit)
      .offset(offset)
      .execute();

    const countResult = await db
      .selectFrom(table as any)
      .select(db.fn.count("id").as("cnt"))
      .executeTakeFirst();
    const count = countResult ? Number((countResult as any).cnt) : 0;

    return { data, count, limit, offset };
  }

  async updateData(
    table: string,
    body: { id: string; data: Record<string, unknown> },
    employeeId: string,
  ) {
    const parsed = adminDataUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { id, data } = parsed.data;
    if (!id) {
      throw new BadRequestException("Missing record id");
    }

    // Get before state for audit
    const before = await db
      .selectFrom(table as any)
      .selectAll()
      .where("id" as any, "=", id)
      .executeTakeFirst();

    await db
      .updateTable(table as any)
      .set(data)
      .where("id" as any, "=", id)
      .execute();

    await db
      .insertInto("audit_logs")
      .values({
        action: "update",
        table_name: table,
        record_id: id,
        old_values: before ? (before as any) : null,
        new_values: data,
        user_id: employeeId,
      })
      .execute();

    return { success: true };
  }

  async deleteData(table: string, id: string, employeeId: string) {
    if (!id) {
      throw new BadRequestException("Missing id query parameter");
    }

    // Get before state for audit
    const before = await db
      .selectFrom(table as any)
      .selectAll()
      .where("id" as any, "=", id)
      .executeTakeFirst();

    await db
      .deleteFrom(table as any)
      .where("id" as any, "=", id)
      .execute();

    await db
      .insertInto("audit_logs")
      .values({
        action: "delete",
        table_name: table,
        record_id: id,
        old_values: before ? (before as any) : null,
        new_values: null,
        user_id: employeeId,
      })
      .execute();

    return { success: true };
  }

  async assertAdmin(userId: string) {
    const employee = await db
      .selectFrom("employees")
      .select(["id", "role"])
      .where("auth_id", "=", userId)
      .executeTakeFirst();

    if (!employee || employee.role !== "admin") {
      throw new ForbiddenException("Forbidden");
    }
    return employee;
  }
}