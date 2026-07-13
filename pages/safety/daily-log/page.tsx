import { getDepartmentContext } from "~/lib/dept-context";
import { SafetyIncidentForm } from "@/features/departments/components/safety/SafetyIncidentForm";
import { SafetyIncidentsList } from "@/features/departments/components/safety/SafetyIncidentsList";
import { GlassCard } from "@repo/ui/GlassCard";

export default async function DailyLogPage({
  params: _params,
}: {
  params: Promise<{}>;
}) {
  const department = "safety";
  const _deptSlug = department;
  const { deptId, supabase, today } = await getDepartmentContext({
    department,
  });

  // Parallel fetch of independent safety reference data and incidents
  const [{ data: categories }, { data: severities }, { data: todayIncidents }] =
    await Promise.all([
      supabase
        .from("safety_incident_categories")
        .select("id, name, color, icon")
        .order("sort_order"),
      supabase
        .from("safety_severities")
        .select("id, level, color")
        .order("sort_order"),
      supabase
        .from("safety_incidents")
        .select(
          "id, incident_type, severity_id, severity:safety_severities(color), category:safety_incident_categories(name), description, location, injured_parties, status, shift_type, created_at",
        )
        .eq("department_id", deptId)
        .eq("incident_date", today)
        .order("created_at", { ascending: false }),
    ]);

  const formattedIncidents = (todayIncidents || []).map((inc: any) => ({
    ...inc,
    severity_color: Array.isArray(inc.severity)
      ? inc.severity[0]?.color
      : inc.severity?.color,
    category_name: Array.isArray(inc.category)
      ? inc.category[0]?.name
      : inc.category?.name,
  }));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-medium text-[var(--text-heading)]">
        Safety Daily Log
      </h2>

      {formattedIncidents.length > 0 && (
        <GlassCard className="border-accent-blue/20">
          <p className="text-accent-blue text-sm font-medium">
            {formattedIncidents.length} incident
            {formattedIncidents.length > 1 ? "s" : ""} logged today
          </p>
        </GlassCard>
      )}

      <SafetyIncidentForm
        departmentId={deptId}
        categories={categories || []}
        severities={severities || []}
      />

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[var(--text-heading)]">
          Today&apos;s Incidents
        </h3>
        <SafetyIncidentsList incidents={formattedIncidents} />
      </div>
    </div>
  );
}
