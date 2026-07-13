import { redirect } from "next/navigation";
import { DrillingOperationsTable } from "./DrillingOperationsTable";
import { getDepartmentContext } from "~/lib/dept-context";
import { getDrillingOpsData } from "~/lib/data/drilling";
import { Suspense } from "react";
import { GlassSkeleton } from "@repo/ui/components/ui/glass-skeleton";

async function DrillingOperationsContent({ deptId }: { deptId: string }) {
  const { drills, ops, operators } = await getDrillingOpsData(deptId);

  return (
    <DrillingOperationsTable
      departmentId={deptId}
      drills={drills}
      operators={operators}
      initialOps={ops}
    />
  );
}

export default async function DrillingOperationsPage() {
  const { deptId, supabase } = await getDepartmentContext({
    department: "drilling",
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold text-[var(--text-heading)]">
          Drilling Operations
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Inline log per drill rig, per shift. Edits save on blur.
        </p>
      </header>

      <Suspense fallback={<GlassSkeleton showHeader rows={5} />}>
        <DrillingOperationsContent deptId={deptId} />
      </Suspense>
    </div>
  );
}
