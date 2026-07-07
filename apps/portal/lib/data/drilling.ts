import "server-only";

import { createServiceRoleClient } from "@repo/supabase/service-role";
import { cacheLife, cacheTag } from "next/cache";
import { CACHE_TAGS } from "../cache/tags";
import { getOperationalToday } from "@repo/utils";

interface TelemetryRecord {
  period: string;
  machine_id: string;
  machine_name: string;
  avg_engine_rpm: number | null;
  avg_engine_temp: number | null;
  avg_hydraulic_pressure: number | null;
  max_bit_depth: number | null;
  max_hole_depth: number | null;
  avg_penetration_rate: number | null;
  total_alerts: number;
  record_count: number;
}

interface ArchivedMonth {
  id: string;
  year_month: string;
  machine_name: string;
  archived_at: string;
  record_count: number;
}

interface DrillMonthlySummary {
  machine_id: string;
  machine_name: string;
  scheduled_hours: number | null;
  downtime_hours: number | null;
  productive_hours: number | null;
  availability_pct: number | null;
  utilization_pct: number | null;
}

export async function getDrillingOpsData(deptId: string) {
  "use cache: remote";
  cacheTag(
    CACHE_TAGS.drillOperations,
    CACHE_TAGS.machines,
    CACHE_TAGS.employees,
  );
  cacheLife("minutes");

  const supabase = createServiceRoleClient();
  const today = getOperationalToday();

  const [{ data: drills }, { data: ops }, { data: operators }] =
    await Promise.all([
      supabase
        .from("machines")
        .select("id, name")
        .eq("machine_type", "Drill Rig")
        .eq("active", true)
        .order("name"),
      supabase
        .from("drill_operations")
        .select(
          "id, machine_id, shift_type, operation_date, open_hours, close_hours, total_hours, operator_name, block_drilled, site, external_delays_minutes, standard_delays_hours, production_delays_minutes, engineering_delays_minutes, comments, status",
        )
        .eq("department_id", deptId)
        .eq("operation_date", today),
      supabase
        .from("employees")
        .select("id, full_name")
        .eq("department_id", deptId)
        .order("full_name"),
    ]);

  return {
    drills: drills ?? [],
    ops: ops ?? [],
    operators: operators ?? [],
    deptId,
  };
}

export async function getMachineTelemetryData(
  deptId: string,
  selectedMachineId?: string,
): Promise<{
  currentMonth: string;
  telemetry: TelemetryRecord[];
  archives: ArchivedMonth[];
  drills: { id: string; name: string }[];
  monthlySummary: DrillMonthlySummary[];
}> {
  "use cache: remote";
  cacheTag(
    CACHE_TAGS.machineTelemetry,
    CACHE_TAGS.drillOperations,
    CACHE_TAGS.machines,
  );
  cacheLife("minutes");

  const supabase = createServiceRoleClient();
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [
    { data: drills },
    { data: telemetry },
    { data: archives },
    { data: allMachines },
    { data: monthlySummary },
  ] = await Promise.all([
    supabase
      .from("machines")
      .select("id, name")
      .eq("machine_type", "Drill Rig")
      .eq("active", true)
      .order("name"),
    supabase.rpc("get_telemetry_summary", {
      p_department_id: deptId,
      p_machine_id: selectedMachineId || null,
      p_granularity: "day",
    }),
    supabase
      .from("machine_telemetry_archive")
      .select("id, year_month, archived_at, record_count, machine_id")
      .eq("department_id", deptId)
      .order("archived_at", { ascending: false })
      .limit(12),
    supabase
      .from("machines")
      .select("id, name")
      .eq("machine_type", "Drill Rig"),
    supabase.rpc("get_drill_monthly_summary", {
      p_department_id: deptId,
      p_year_month: currentMonth,
    }),
  ]);

  const machineNameMap = new Map(
    (allMachines || []).map((m: { id: string; name: string }) => [
      m.id,
      m.name,
    ]),
  );

  const transformedArchives: ArchivedMonth[] = (archives || []).map(
    (a: any) => ({
      id: a.id,
      year_month: a.year_month,
      machine_name: machineNameMap.get(a.machine_id) || "Unknown",
      archived_at: a.archived_at,
      record_count: a.record_count,
    }),
  );

  return {
    currentMonth,
    telemetry: (telemetry || []) as TelemetryRecord[],
    archives: transformedArchives,
    drills: drills || [],
    monthlySummary: (monthlySummary || []) as DrillMonthlySummary[],
  };
}
