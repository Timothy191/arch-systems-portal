import { getDepartmentContext, requireDepartment } from "~/lib/dept-context";
import { ShiftCoverageClient } from "./ShiftCoverageClient";
import { getShiftCoverage } from "./actions";

export default async function ShiftCoveragePage({
  params: _params,
}: {
  params: Promise<{}>;
}) {
  const department = "control-room";
  const deptSlug = department;
  requireDepartment(deptSlug, "control-room");
  const { deptId, today } = await getDepartmentContext({
    department: deptSlug,
  });

  const currentHour = new Date().getHours();
  const initialShift: "day" | "night" =
    currentHour >= 6 && currentHour < 18 ? "day" : "night";

  // Server-render the initial coverage so the client never fetches on mount.
  const { data: initialData } = await getShiftCoverage(
    deptId,
    today,
    initialShift,
  );

  return (
    <ShiftCoverageClient
      departmentId={deptId}
      departmentSlug={deptSlug}
      initialDate={today}
      initialShift={initialShift}
      initialData={initialData ?? undefined}
    />
  );
}
