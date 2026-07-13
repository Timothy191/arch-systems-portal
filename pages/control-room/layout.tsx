import { ViewTransition } from "react";
import { DepartmentLayout } from "@repo/ui/DepartmentLayout";
import { ErrorBoundary } from "@repo/ui/ErrorBoundary";
import { DEPARTMENTS, getDepartmentTabs } from "~/lib/departments";
import { notFound } from "next/navigation";
import { ActiveDepartmentSetter } from "@/components/nav/ActiveDepartmentSetter";

export default async function DepartmentRootLayout({
  children,
  params: _params,
}: {
  children: React.ReactNode;
  params: Promise<{}>;
}) {
  const department = "control-room";
  const _deptSlug = department;
  const dept = DEPARTMENTS.find((d) => d.name === department);
  if (!dept) notFound();

  const tabs = getDepartmentTabs(department);

  return (
    <>
      <ActiveDepartmentSetter department={department} />
      <DepartmentLayout department={dept} tabs={tabs}>
        {/* AGENT-TRACE: ViewTransition wraps only the page content so it
            crossfades/slides on every navigation while the department tab
            chrome (outside this boundary) stays put. default="none" ensures
            the animation only fires on route transitions, not local state
            changes. Requires experimental.viewTransition in next.config.mjs. */}
        <ViewTransition
          enter="nav-slide-up"
          exit="nav-slide-down"
          default="none"
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </ViewTransition>
      </DepartmentLayout>
    </>
  );
}
