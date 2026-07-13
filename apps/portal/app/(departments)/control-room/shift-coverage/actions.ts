"use server";

import { createServerSupabaseClient } from "@repo/supabase/server";

export interface ShiftCoverageData {
  machines: MachineWithOp[];
  isClosed: boolean;
  history: ShiftHistoryItem[];
}

export interface MachineWithOp {
  id: string;
  name: string;
  machine_type: string;
  hours_worked: number | null;
  has_entry: boolean;
}

export interface ShiftHistoryItem {
  id: string;
  shift_date: string;
  shift_type: "day" | "night";
  closed_at: string;
}

export async function getShiftCoverage(
  departmentId: string,
  date: string,
  shiftType: "day" | "night",
): Promise<{ data?: ShiftCoverageData; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const [machinesRes, opsRes, statusRes, historyRes] = await Promise.all([
    supabase
      .from("machines")
      .select("id, name, machine_type")
      .eq("department_id", departmentId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("machine_operations")
      .select("machine_id, hours_worked")
      .eq("department_id", departmentId)
      .eq("shift_date", date)
      .eq("shift_type", shiftType),
    supabase
      .from("shift_status")
      .select("status")
      .eq("department_id", departmentId)
      .eq("shift_date", date)
      .eq("shift_type", shiftType)
      .maybeSingle(),
    supabase
      .from("shift_status")
      .select("id, shift_date, shift_type, closed_at")
      .eq("department_id", departmentId)
      .eq("status", "closed")
      .order("shift_date", { ascending: false })
      .limit(20),
  ]);

  if (machinesRes.error) {
    return { error: "Failed to load machines" };
  }
  if (opsRes.error) {
    return { error: "Failed to load shift operations" };
  }

  const opsHours: Record<string, number | null> = {};
  const hasEntry: Record<string, boolean> = {};
  for (const op of opsRes.data || []) {
    opsHours[op.machine_id] = op.hours_worked;
    hasEntry[op.machine_id] = true;
  }

  const machines: MachineWithOp[] = (machinesRes.data || []).map((m) => ({
    id: m.id,
    name: m.name,
    machine_type: m.machine_type,
    hours_worked: opsHours[m.id] ?? null,
    has_entry: hasEntry[m.id] ?? false,
  }));

  const isClosed = statusRes.data?.status === "closed";

  const history: ShiftHistoryItem[] = (historyRes.data || []).map((row) => ({
    id: row.id,
    shift_date: row.shift_date,
    shift_type: row.shift_type as "day" | "night",
    closed_at: row.closed_at,
  }));

  return { data: { machines, isClosed, history } };
}
