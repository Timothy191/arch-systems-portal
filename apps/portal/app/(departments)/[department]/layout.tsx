import { ViewTransition } from "react";
import { DepartmentLayout } from "@repo/ui/DepartmentLayout";
import { DEPARTMENTS, getDepartmentTabs } from "~/lib/departments";
import { notFound } from "next/navigation";
import { ActiveDepartmentSetter } from "@/components/nav/ActiveDepartmentSetter";
import { AIAssistantWrapper } from "@/components/ai/AIAssistantWrapper";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function DepartmentRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ department: string }>;
}) {
  const { department } = await params;
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
          {children}
        </ViewTransition>
        <AIAssistantWrapper context={`${dept.displayName} Department`} />
      </DepartmentLayout>
    </>
  );
}
