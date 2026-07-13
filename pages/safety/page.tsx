import { getDepartmentContext } from "~/lib/dept-context";
import { SafetyDashboard } from "@/features/departments/components/safety/SafetyDashboard";

// AGENT-TRACE: Cleaned up duplicate/dead code from legacy control-room dashboard template copy-paste.
// Safety department page directly imports and renders the SafetyDashboard Server Component.
export default async function SafetyDashboardPage() {
  const { deptId } = await getDepartmentContext({
    department: "safety",
  });

  return <SafetyDashboard deptId={deptId} />;
}
