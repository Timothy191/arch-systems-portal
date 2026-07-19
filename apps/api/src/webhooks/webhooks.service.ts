import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { db } from "@repo/database";
import { createWebhookSchema, updateWebhookSchema } from "../common/schemas";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor() {
    // No Supabase client - we use db directly
  }

  async getEmployee(userId: string) {
    const employee = await db
      .selectFrom("employees")
      .select(["department_id", "role", "accessible_departments", "id"])
      .where("auth_id", "=", userId)
      .executeTakeFirst();

    if (!employee) {
      throw new NotFoundException("Employee not found");
    }
    return employee;
  }

  async listWebhooks(employee: {
    department_id: string | null;
    role: string;
    accessible_departments: string[] | null;
  }) {
    let query = db
      .selectFrom("webhook_endpoints")
      .selectAll()
      .where("deleted_at", "is", null);

    if (employee.role !== "admin") {
      const depts = employee.accessible_departments || [];
      if (depts.length > 0) {
        query = query.where((qb) =>
          qb.or([
            qb("department_id", "=", employee.department_id),
            qb("department_id", "in", depts),
          ]),
        );
      } else {
        query = query.where("department_id", "=", employee.department_id);
      }
    }

    const webhooks = await query.execute();
    return { webhooks };
  }

  async createWebhook(employee: any, body: any) {
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { url, description, event_types, department_id } = parsed.data;

    if (employee.role !== "admin") {
      const targetDept = department_id || employee.department_id;
      if (
        targetDept !== employee.department_id &&
        !employee.accessible_departments?.includes(targetDept)
      ) {
        throw new ForbiddenException("Forbidden");
      }
    }

    const newWebhook = {
      url,
      description,
      event_types,
      department_id: department_id || employee.department_id,
      active: true,
    };

    const webhook = await db
      .insertInto("webhook_endpoints")
      .values(newWebhook)
      .returningAll()
      .executeTakeFirst();

    return { webhook };
  }

  async updateWebhook(id: string, employee: any, body: any) {
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { url, description, event_types, active } = parsed.data;

    const existingWebhook = await db
      .selectFrom("webhook_endpoints")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!existingWebhook) {
      throw new NotFoundException("Webhook not found");
    }

    if (employee.role !== "admin") {
      if (
        existingWebhook.department_id !== employee.department_id &&
        !employee.accessible_departments?.includes(
          existingWebhook.department_id,
        )
      ) {
        throw new ForbiddenException("Forbidden");
      }
    }

    const updateData: Record<string, any> = {};

    if (url !== undefined) {
      updateData.url = url;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (event_types !== undefined) {
      updateData.event_types = event_types;
    }
    if (active !== undefined) {
      updateData.active = active;
    }

    const updatedWebhook = await db
      .updateTable("webhook_endpoints")
      .set(updateData)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return { webhook: updatedWebhook };
  }

  async deleteWebhook(id: string, employee: any) {
    const existingWebhook = await db
      .selectFrom("webhook_endpoints")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!existingWebhook) {
      throw new NotFoundException("Webhook not found");
    }

    if (employee.role !== "admin") {
      if (
        existingWebhook.department_id !== employee.department_id &&
        !employee.accessible_departments?.includes(
          existingWebhook.department_id,
        )
      ) {
        throw new ForbiddenException("Forbidden");
      }
    }

    await db
      .updateTable("webhook_endpoints")
      .set({ deleted_at: new Date().toISOString() })
      .where("id", "=", id)
      .executeTakeFirst();

    return { success: true };
  }

  async getLogs(id: string, employee: any) {
    const existingWebhook = await db
      .selectFrom("webhook_endpoints")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!existingWebhook) {
      throw new NotFoundException("Webhook not found");
    }

    if (employee.role !== "admin") {
      if (
        existingWebhook.department_id !== employee.department_id &&
        !employee.accessible_departments?.includes(
          existingWebhook.department_id,
        )
      ) {
        throw new ForbiddenException("Forbidden");
      }
    }

    const logs = await db
      .selectFrom("webhook_delivery_logs")
      .selectAll()
      .where("webhook_endpoint_id", "=", id)
      .orderBy("created_at", "desc")
      .limit(50)
      .execute();

    return { logs };
  }
}