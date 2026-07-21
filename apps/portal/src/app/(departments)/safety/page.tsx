import { DepartmentSectionShell } from "@/components/departments/DepartmentSectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety | Arch OS",
  description: "Incident logs, compliance and inspections.",
};

export default function Page() {
  return (
    <DepartmentSectionShell
      title="Safety"
      description="Incident logs, compliance and inspections."
    />
  );
}
