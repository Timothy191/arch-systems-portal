import type { SupabaseClient } from "@supabase/supabase-js";

export interface ShiftCompletenessResult {
  statuses: Array<{
    machineName: string;
    hasEntry: boolean;
    exempt: boolean;
  }>;
}

/**
 * Get shift completeness for a department.
 * Stub — returns empty statuses (no machines missing).
 */
export async function getShiftCompleteness(
  _supabase: SupabaseClient,
  _departmentId: string,
  _areaId: string | null,
  _date: string,
  _shiftType: "day" | "night"
): Promise<ShiftCompletenessResult> {
  return { statuses: [] };
}
