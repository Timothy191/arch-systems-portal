import { inngest } from "@repo/utils/inngest";
import type { InngestFunction } from "inngest";

export const shiftIntegrityReportFn: InngestFunction.Any = inngest.createFunction(
  { id: "shift-integrity-report", triggers: [{ event: "report/shift-integrity" }] },
  async () => {
    return { success: true };
  }
);
