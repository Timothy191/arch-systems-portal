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
  const department = "training";
  const dept = DEPARTMENTS.find((d) => d.name === department);
  if (!dept) notFound();

  const tabs = getDepartmentTabs(department);

  return (
    <>
      <ActiveDepartmentSetter department={department} />
      <DepartmentLayout department={dept} tabs={tabs}>
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
