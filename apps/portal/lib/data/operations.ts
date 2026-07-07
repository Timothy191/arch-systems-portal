import "server-only";

import { createReadReplicaClient } from "@repo/supabase/read-replica";
import { cachedRSC } from "@/lib/server-cache";
import { withCache } from "@/lib/cache-utils";
import { CacheCategory } from "@repo/redis";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function getControlRoomSummary(
  deptId: string,
  today: string,
  cookieList: Array<{ name: string; value: string }>,
) {
  return cachedRSC(
    ["dept", deptId, "summary", today],
    async () =>
      withCache(
        async () => {
          const db = await createReadReplicaClient(cookieList);
          const [todayOperations, todayDelays, todayLoads, machines] = await Promise.all([
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
        },
        {
          category: CacheCategory.DEPARTMENT,
          keyParts: ["control-room-summary", deptId, today],
          tags: [
            CACHE_TAGS.machineOperations,
            CACHE_TAGS.operationalDelays,
            CACHE_TAGS.hourlyLoads,
            CACHE_TAGS.machines,
          ],
        },
      ),
    {
      tags: [
        CACHE_TAGS.machineOperations,
        CACHE_TAGS.operationalDelays,
        CACHE_TAGS.hourlyLoads,
        CACHE_TAGS.machines,
      ],
    },
  );
}

export async function getNonControlRoomSummary(
  deptId: string,
  today: string,
  cookieList: Array<{ name: string; value: string }>,
) {
  return cachedRSC(
    ["dept", deptId, "non-cr-summary", today],
    async () =>
      withCache(
        async () => {
          const db = await createReadReplicaClient(cookieList);
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
        },
        {
          category: CacheCategory.DEPARTMENT,
          keyParts: ["non-control-room-summary", deptId, today],
          tags: [CACHE_TAGS.dailyLogs, CACHE_TAGS.machines],
        },
      ),
    { tags: [CACHE_TAGS.dailyLogs, CACHE_TAGS.machines] },
  );
}

export async function getShiftCoverageLogs(
  deptId: string,
  today: string,
  cookieList: Array<{ name: string; value: string }>,
) {
  return cachedRSC(
    ["dept", deptId, "shift-coverage", today],
    async () => {
      return withCache(
        async () => {
          const db = await createReadReplicaClient(cookieList);
          const { data: result } = await db
            .from("daily_logs")
            .select("id, log_date, shift")
            .eq("department_id", deptId)
            .eq("log_date", today)
            .order("shift");
          return result ?? [];
        },
        {
          category: CacheCategory.DEPARTMENT,
          keyParts: ["shift-coverage", deptId, today],
          tags: [CACHE_TAGS.dailyLogs],
        },
      );
    },
    { tags: [CACHE_TAGS.dailyLogs] },
  );
}
