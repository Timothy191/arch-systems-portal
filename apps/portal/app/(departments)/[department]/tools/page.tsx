import { getDepartmentContext } from "~/lib/dept-context";
import { EXTERNAL_TOOLS } from "~/lib/tools";
import ToolsPageClient from "~/features/departments/components/tools/ToolsPageClient";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ department: string }>;
}) {
  const { department } = await params;
  const { dept } = await getDepartmentContext({ department });

  const initialTools = EXTERNAL_TOOLS.map((tool) => ({
    ...tool,
    status: "unknown" as const,
  }));

  return (
    <ToolsPageClient departmentName={dept.name} initialTools={initialTools} />
  );
}
