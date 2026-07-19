/**
 * Resolve department slugs the employee may open (hub + BottomNav).
 * AGENT-TRACE: Union of home department_id + accessible_departments UUIDs → names.
 * Never invent a full catalog when access is empty — callers show empty state.
 */
import "server-only";

import { createReadReplicaClient } from "@repo/supabase/read-replica";
import { filterDepartmentsByRole } from "@/lib/dept-access";
import { DEPARTMENTS } from "@/lib/departments";
import type { Department } from "@/lib/departments";

export async function resolveAccessibleDepartmentNames(
  userId: string
): Promise<{ role: string; names: string[] }> {
  const db = await createReadReplicaClient();

  const { data: empData } = await db
    .from("employees")
    .select("role, department_id, accessible_departments")
    .eq("auth_id", userId)
    .single();

  const role =
    typeof empData?.role === "string" && empData.role.length > 0 ? empData.role : "operator";

  const uuidSet = new Set<string>();
  if (empData?.department_id) {
    uuidSet.add(empData.department_id);
  }
  for (const id of empData?.accessible_departments ?? []) {
    if (typeof id === "string" && id.length > 0) {
      uuidSet.add(id);
    }
  }

  if (uuidSet.size === 0) {
    return { role, names: [] };
  }

  const { data: deptData } = await db
    .from("departments")
    .select("name")
    .in("id", [...uuidSet]);

  const names = (deptData ?? [])
    .map((d) => d.name)
    .filter((n): n is string => typeof n === "string" && n.length > 0);

  return { role, names };
}

/** Hub cards: ACL names ∩ role gates. Empty ACL → empty list (no full catalog). */
export function departmentsForHub(accessibleNames: string[], role: string): Department[] {
  if (accessibleNames.length === 0) {
    return [];
  }
  const byAcl = DEPARTMENTS.filter((d) => accessibleNames.includes(d.name));
  return filterDepartmentsByRole(byAcl, role);
}
