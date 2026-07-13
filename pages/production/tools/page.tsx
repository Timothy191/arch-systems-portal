import { getDepartmentContext } from "~/lib/dept-context";
import { EXTERNAL_TOOLS } from "~/lib/tools";
import ToolsPageClient from "~/features/departments/components/tools/ToolsPageClient";

export default async function ToolsPage({
  params: _params,
}: {
  params: Promise<{}>;
}) {
  const department = "production";
  const _deptSlug = department;
  const { dept } = await getDepartmentContext({ department });

  const initialTools = EXTERNAL_TOOLS.map((tool) => ({
    ...tool,
    status: "unknown" as const,
  }));

  return (
    <ToolsPageClient departmentName={dept.name} initialTools={initialTools} />
  );
}
