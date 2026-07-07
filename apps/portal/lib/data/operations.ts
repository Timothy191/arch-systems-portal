import "server-only";

import { createServiceRoleClient } from "@repo/supabase/service-role";
import { cacheTag, cacheLife } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function getControlRoomSummary(deptId: string, today: string) {
  "use cache: remote";
  cacheTag(
    CACHE_TAGS.machineOperations,
    CACHE_TAGS.operationalDelays,
    CACHE_TAGS.hourlyLoads,
    CACHE_TAGS.machines,
  );
  cacheLife({ expire: 300 });

  const db = createServiceRoleClient();
  const [todayOperations, todayDelays, todayLoads, machines] =
    await Promise.all([
      db
        .from("machine_operations")
        .select("hours_worked, end_time")
        .eq("department_id", deptId)
        .eq("shift_date", today),
      db
        .from("operational_delays")
        .select("delay_minutes, status")
        .eq("department_id", deptId)
        .eq("delay_date", today),
      db
        .from("hourly_loads")
        .select("total_loads")
        .eq("department_id", deptId)
        .eq("load_date", today),
      db
        .from("machines")
        .select("*", { count: "exact", head: true })
        .eq("active", true),
    ]);

  return {
    todayOperations: todayOperations.data ?? [],
    todayDelays: todayDelays.data ?? [],
    todayLoads: todayLoads.data ?? [],
    machineCount: machines.count ?? 0,
  };
}

export async function getNonControlRoomSummary(deptId: string, today: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.dailyLogs, CACHE_TAGS.machines);
  cacheLife({ expire: 300 });

  const db = createServiceRoleClient();
  const [todayLogs, machines] = await Promise.all([
    db
      .from("daily_logs")
      .select("id, log_date, shift")
      .eq("department_id", deptId)
      .eq("log_date", today)
      .order("shift"),
    db
      .from("machines")
      .select("*", { count: "exact", head: true })
      .eq("active", true),
  ]);

  return {
    todayLogs: todayLogs.data ?? [],
    machineCount: machines.count ?? 0,
  };
}

export async function getShiftCoverageLogs(deptId: string, today: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.dailyLogs);
  cacheLife({ expire: 300 });

  const db = createServiceRoleClient();
  const { data: result } = await db
    .from("daily_logs")
    .select("id, log_date, shift")
    .eq("department_id", deptId)
    .eq("log_date", today)
    .order("shift");

  return result ?? [];
}
