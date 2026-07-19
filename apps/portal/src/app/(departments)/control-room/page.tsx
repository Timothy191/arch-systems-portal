import { DepartmentSectionShell } from "@/components/departments/DepartmentSectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Control Room | Arch OS",
  description: "SCADA systems and real-time monitoring.",
};

export default function Page() {
  return <DepartmentSectionShell title="Control Room" description="SCADA systems and real-time monitoring." />;
}
