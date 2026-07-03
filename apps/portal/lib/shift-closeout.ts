"use server";

import { createServerSupabaseClient } from "@repo/supabase/server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit";
import {
  AuthError,
  NotFoundError,
  ForbiddenError,
  DatabaseError,
} from "@/lib/errors/error-classes";
import { logError } from "@/lib/errors/error-logger";
import { getShiftCompleteness } from "./shift-completeness";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

async function validateShiftData(
  supabase: SupabaseClient,
  departmentId: string,
  date: string,
  shiftType: "day" | "night",
): Promise<string[]> {
  const { data: existing } = await supabase
    .from("shift_status")
    .select("id, status")
    .eq("department_id", departmentId)
    .eq("shift_date", date)
    .eq("shift_type", shiftType)
    .single();

  if (existing?.status === "closed") {
    return ["Shift is already closed"];
  }

  const completeness = await getShiftCompleteness(
    supabase,
    departmentId,
    null,
    date,
    shiftType,
  );

  const errors: string[] = [];

  if (completeness.statuses.length === 0) {
    errors.push("No active machines found for this department");
  }

  for (const status of completeness.statuses) {
    if (!status.exempt && !status.hasEntry) {
      errors.push(`Machine '${status.machineName}': not reported`);
    }
  }

  for (const status of completeness.statuses) {
    if (
      status.hoursWorked !== undefined &&
      status.hoursWorked !== null &&
      Number(status.hoursWorked) > 12
    ) {
      errors.push(
        `Machine '${status.machineName}': ${Number(status.hoursWorked)}h exceeds 12h maximum`,
      );
    }
  }

  return errors;
}

export async function setPin(employeeCode: string, pin: string) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logError(new Error("Not authenticated"), { context: "setPin" });
    throw new AuthError("Not authenticated", { context: { action: "setPin" } });
  }

  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, role")
    .eq("auth_id", user.id)
    .single();

  if (error || !employee) {
    logError(new Error("Employee not found"), { context: "setPin" });
    throw new NotFoundError("Employee not found", { resource: "employee" });
  }

  if (employee.role !== "supervisor" && employee.role !== "admin") {
    logError(new Error("Only supervisors and admins can set PINs"), {
      context: "setPin",
    });
    throw new ForbiddenError("Only supervisors and admins can set PINs", {
      context: {
        requiredRoles: ["supervisor", "admin"],
        actualRole: employee.role,
      },
    });
  }

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(pin, salt);

  const { error: updateError } = await supabase
    .from("employees")
    .update({ pin_hash: hash, employee_code: employeeCode })
    .eq("id", employee.id);

  if (updateError) {
    throw new DatabaseError("Failed to set PIN", {
      operation: "update",
      table: "employees",
      context: { error: updateError.message },
    });
  }

  return { success: true };
}

export async function verifyPin(employeeCode: string, pin: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, full_name, pin_hash")
    .eq("employee_code", employeeCode)
    .single();

  if (error || !employee || !employee.pin_hash) {
    return { valid: false, employee: null };
  }

  const valid = await bcrypt.compare(pin, employee.pin_hash);

  return {
    valid,
    employee: valid ? { id: employee.id, full_name: employee.full_name } : null,
  };
}

export async function closeShift(
  departmentId: string,
  date: string,
  shiftType: "day" | "night",
  approvedById: string,
  pin: string,
  validateOnly: boolean = false,
  departmentSlug?: string,
) {
  const supabase = await createServerSupabaseClient();

  const errors = await validateShiftData(
    supabase,
    departmentId,
    date,
    shiftType,
  );
  if (errors.length > 0) {
    return { success: false, errors };
  }

  if (validateOnly) {
    return { success: true };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logError(new Error("Not authenticated"), { context: "closeShift" });
    throw new AuthError("Not authenticated", {
      context: { action: "closeShift" },
    });
  }

  const { data: closedBy } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!closedBy) {
    logError(new Error("Operator not found"), { context: "closeShift" });
    throw new NotFoundError("Operator not found", { resource: "employee" });
  }

  const { data: approver } = await supabase
    .from("employees")
    .select("id, pin_hash, full_name")
    .eq("id", approvedById)
    .single();

  if (!approver || !approver.pin_hash) {
    return {
      success: false,
      errors: ["Approving supervisor not found or has no PIN set"],
    };
  }

  const pinValid = await bcrypt.compare(pin, approver.pin_hash);
  if (!pinValid) {
    return { success: false, errors: ["Invalid supervisor PIN"] };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("shift_status")
    .insert({
      department_id: departmentId,
      shift_date: date,
      shift_type: shiftType,
      status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: closedBy.id,
      approved_by: approvedById,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { success: false, errors: ["Failed to close shift"] };
  }

  await logAuditEvent({
    action: "insert",
    tableName: "shift_status",
    recordId: inserted.id,
    departmentId,
  });

  if (departmentSlug) {
    revalidatePath(`/${departmentSlug}`);
    revalidatePath(`/${departmentSlug}/shift-coverage`);
  }

  return { success: true, shiftStatusId: inserted.id };
}
