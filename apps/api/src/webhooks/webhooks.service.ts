import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createWebhookSchema, updateWebhookSchema } from "../common/schemas";

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getEmployee(userId: string) {
    const { data: employee } = await this.supabase
      .from("employees")
      .select("department_id, role, accessible_departments, id")
      .eq("auth_id", userId)
      .single();

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
    let query = this.supabase
      .from("webhook_endpoints")
      .select("*")
      .is("deleted_at", null);

    if (employee.role !== "admin") {
      const depts = employee.accessible_departments || [];
      if (depts.length > 0) {
        query = query.or(
          `department_id.eq.${employee.department_id},department_id.in.(${depts.join(",")})`,
        );
      } else {
        query = query.eq("department_id", employee.department_id);
      }
    }

    const { data: webhooks, error } = await query;
    if (error) {
      this.logger.error("Database query failed", error.message);
      throw new Error("Database query failed");
    }
    return { webhooks };
  }

  async createWebhook(employee: any, body: any) {
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { url, description, event_types, department_id } = parsed.data;

    // Non-admins can only create webhooks for their department
    if (employee.role !== "admin") {
      const targetDept = department_id || employee.department_id;
      if (
        targetDept !== employee.department_id &&
        !employee.accessible_departments?.includes(targetDept)
      ) {
        throw new ForbiddenException("Forbidden");
      }
    }

    const { data: webhook, error } = await this.supabase
      .from("webhook_endpoints")
      .insert({
        url,
        description,
        event_types,
        department_id: department_id || employee.department_id,
        active: true,
      })
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to create webhook", error.message);
      throw new Error("Failed to create webhook");
    }

    return { webhook };
  }

  async updateWebhook(id: string, employee: any, body: any) {
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { url, description, event_types, active } = parsed.data;

    // Check ownership
    const { data: existingWebhook } = await this.supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("id", id)
      .single();

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

    const { data: webhook, error } = await this.supabase
      .from("webhook_endpoints")
      .update({
        ...(url !== undefined && { url }),
        ...(description !== undefined && { description }),
        ...(event_types !== undefined && { event_types }),
        ...(active !== undefined && { active }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      this.logger.error("Failed to update webhook", error.message);
      throw new Error("Failed to update webhook");
    }

    return { webhook };
  }

  async deleteWebhook(id: string, employee: any) {
    // Check ownership
    const { data: existingWebhook } = await this.supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("id", id)
      .single();

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

    // Soft delete
    const { error } = await this.supabase
      .from("webhook_endpoints")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      this.logger.error("Failed to delete webhook", error.message);
      throw new Error("Failed to delete webhook");
    }

    return { success: true };
  }

  async getLogs(id: string, employee: any) {
    // Check ownership
    const { data: existingWebhook } = await this.supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("id", id)
      .single();

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

    const { data: logs, error } = await this.supabase
      .from("webhook_delivery_logs")
      .select("*")
      .eq("webhook_endpoint_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error("Database query failed", error.message);
      throw new Error("Database query failed");
    }

    return { logs };
  }
}
