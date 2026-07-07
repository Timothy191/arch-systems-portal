import "server-only";

import { createReadReplicaClient } from "@repo/supabase/read-replica";
import { cachedRSC } from "@/lib/server-cache";
import { withCache } from "@/lib/cache-utils";
import { CacheCategory } from "@repo/redis";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function getAccessLogsForDepartment(
  deptId: string,
  cookieList: Array<{ name: string; value: string }>,
  limit = 100,
) {
  return cachedRSC(
    ["access-control", "logs", deptId, String(limit)],
    async () => {
      return withCache(
        async () => {
          const db = await createReadReplicaClient(cookieList);
          const { data: logs } = await db
            .from("access_logs")
            .select(
              `
              id,
              scanned_at,
              gate_location,
              access_granted,
              denial_reason,
              access_type,
              direction,
              badge:badges!inner(
                qr_code, 
                entity_type, 
                personnel:personnel_id(first_name, surname), 
                visitor:visitor_id(first_name, surname)
              )
            `,
            )
            .eq("department_id", deptId)
            .order("scanned_at", { ascending: false })
            .limit(limit);

          return logs ?? [];
        },
        {
          category: CacheCategory.METRICS,
          keyParts: ["access-control", "logs", deptId, String(limit)],
          tags: [CACHE_TAGS.accessLogs],
        },
      );
    },
    {
      revalidate: 300,
      tags: [CACHE_TAGS.accessLogs],
    },
  );
}

export async function getBadgesForDepartment(
  deptId: string,
  cookieList: Array<{ name: string; value: string }>,
) {
  return cachedRSC(
    ["access-control", "badges", deptId],
    async () => {
      return withCache(
        async () => {
          const db = await createReadReplicaClient(cookieList);
          const { data: badges } = await db
            .from("badges")
            .select(
              `
              id,
              qr_code,
              entity_type,
              is_active,
              issued_at,
              expires_at,
              personnel:personnel_id(first_name, surname),
              visitor:visitor_id(first_name, surname),
              fleet:fleet_id(fleet_code, vehicle_type),
              equipment:equipment_id(equip_code, equipment_type)
            `,
            )
            .eq("department_id", deptId)
            .order("issued_at", { ascending: false });

          return badges ?? [];
        },
        {
          category: CacheCategory.METRICS,
          keyParts: ["access-control", "badges", deptId],
          tags: [CACHE_TAGS.badges],
        },
      );
    },
    {
      revalidate: 300,
      tags: [CACHE_TAGS.badges],
    },
  );
}

export async function getVisitorsForDepartment(
  deptId: string,
  cookieList: Array<{ name: string; value: string }>,
) {
  return cachedRSC(
    ["access-control", "visitors", deptId],
    async () => {
      return withCache(
        async () => {
          const db = await createReadReplicaClient(cookieList);
          const { data: visitors } = await db
            .from("visitors")
            .select(
              `
              id,
              first_name,
              surname,
              id_number,
              company,
              visiting,
              reason_for_entry,
              check_in_time,
              check_out_time,
              status
            `,
            )
            .eq("department_id", deptId)
            .order("check_in_time", { ascending: false });

          return visitors ?? [];
        },
        {
          category: CacheCategory.METRICS,
          keyParts: ["access-control", "visitors", deptId],
          tags: [CACHE_TAGS.visitors],
        },
      );
    },
    {
      revalidate: 300,
      tags: [CACHE_TAGS.visitors],
    },
  );
}
