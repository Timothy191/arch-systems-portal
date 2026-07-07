import "server-only";

import { createServiceRoleClient } from "@repo/supabase/service-role";
import { cacheTag, cacheLife } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";

export async function getAccessLogsForDepartment(deptId: string, limit = 100) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.accessLogs);
  cacheLife({ expire: 300 });

  const db = createServiceRoleClient();
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
}

export async function getBadgesForDepartment(deptId: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.badges);
  cacheLife({ expire: 300 });

  const db = createServiceRoleClient();
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
}

export async function getVisitorsForDepartment(deptId: string) {
  "use cache: remote";
  cacheTag(CACHE_TAGS.visitors);
  cacheLife({ expire: 300 });

  const db = createServiceRoleClient();
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
}
