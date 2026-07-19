import { DepartmentSectionShell } from "@/components/departments/DepartmentSectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Satellite Monitoring | Arch OS",
  description: "SAR/InSAR, hyperspectral and high-resolution imagery.",
};

export default function Page() {
  return <DepartmentSectionShell title="Satellite Monitoring" description="SAR/InSAR, hyperspectral and high-resolution imagery." />;
}
