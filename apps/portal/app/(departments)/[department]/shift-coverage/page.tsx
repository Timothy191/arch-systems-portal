import { getDepartmentContext, requireDepartment } from "~/lib/dept-context";
import { ShiftCoverageClient } from "./ShiftCoverageClient";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ShiftCoveragePage({
  params,
}: {
  params: Promise<{ department: string }>;
}) {
  const { department: deptSlug } = await params;
  requireDepartment(deptSlug, "control-room");
  const { deptId, today } = await getDepartmentContext({
    department: deptSlug,
  });

  const currentHour = new Date().getHours();
  const initialShift: "day" | "night" =
    currentHour >= 6 && currentHour < 18 ? "day" : "night";

  return (
    <ShiftCoverageClient
      departmentId={deptId}
      departmentSlug={deptSlug}
      initialDate={today}
      initialShift={initialShift}
    />
  );
}
