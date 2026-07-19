import { DepartmentSectionShell } from "@/components/departments/DepartmentSectionShell";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Production | Arch OS",
  description: "Coal yield, tonnage and extraction tracking.",
};

export default function Page() {
  return <DepartmentSectionShell title="Production" description="Coal yield, tonnage and extraction tracking." />;
}
