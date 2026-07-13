import { getDepartmentContext, requireDepartment } from "~/lib/dept-context";
import { KPIGrid, KPICard } from "@repo/ui/KPI";
import { PageHeader } from "@repo/ui/PageHeader";
import { OperationalDelaysForm } from "./OperationalDelaysForm";
import { OperationalDelaysList } from "./OperationalDelaysList";

export default async function OperationalDelaysPage({
  params: _params,
}: {
  params: Promise<{}>;
}) {
  const department = "control-room";
  const _deptSlug = department;
  requireDepartment(department, "control-room");

  const { deptId, supabase, today } = await getDepartmentContext({
    department,
  });

  // Fetch all data in parallel
  const [{ data: machines }, { data: categories }, { data: todayDelays }] =
    await Promise.all([
      supabase
        .from("machines")
        .select("id, name, site_id, sites(name)")
        .eq("active", true)
        .order("name"),
      supabase.from("delay_categories").select("*").order("sort_order"),
      supabase
        .from("operational_delays")
        .select(
          "*, category:delay_categories(name, color, icon), machine:machines(name, sites(name))",
        )
        .eq("department_id", deptId)
        .eq("delay_date", today)
        .order("created_at", { ascending: false }),
    ]);

  // Calculate statistics
  const totalDelayMinutes =
    todayDelays?.reduce((sum, d) => sum + (d.delay_minutes || 0), 0) || 0;
  const activeCount =
    todayDelays?.filter((d) => d.status === "active").length || 0;
  const recoveredCount =
    todayDelays?.filter((d) => d.status === "recovered").length || 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Operational Delays" />

      <KPIGrid cols={4}>
        <KPICard label="Total Delays" value={todayDelays?.length ?? 0} />
        <KPICard label="Active" value={activeCount} color="blue" />
        <KPICard label="Recovered" value={recoveredCount} color="green" />
        <KPICard label="Total Minutes" value={totalDelayMinutes} color="red" />
      </KPIGrid>

      <OperationalDelaysForm
        departmentId={deptId}
        machines={machines || []}
        categories={categories || []}
      />

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-[var(--text-heading)]">
          Today&apos;s Delays
        </h3>
        <OperationalDelaysList delays={todayDelays || []} />
      </div>
    </div>
  );
}
