import { exportToExcel, parseExcel } from "@repo/utils/client";
import { logError } from "@/lib/errors/error-logger";
import { Machine } from "./HourlyLoadsGrid";

interface ExcelOptions {
  machines: Machine[];
  selectedShift: "day" | "night";
  departmentId: string;
  today: string;
  supabase: any;
  router: any;
  getHourValue: (_machineId: string, _hourIndex: number) => number;
  getMachineTotal: (_machineId: string) => number;
  getMaterialType: (_machineId: string) => "Waste" | "Coal";
  hourLabels: string[];
  setSaving: (_saving: boolean) => void;
  HOURS_12: number[];
}

export function useHourlyLoadsExcel({
  machines,
  selectedShift,
  departmentId,
  today,
  supabase,
  router,
  getHourValue,
  getMachineTotal,
  getMaterialType,
  hourLabels,
  setSaving,
  HOURS_12,
}: ExcelOptions) {
  const handleExport = async () => {
    const exportData = machines.map((machine) => {
      const sites = machine.sites;
      const siteName =
        (Array.isArray(sites)
          ? sites[0]?.name
          : (sites as { name?: string } | null)?.name) ?? "No Site";
      const data: any = {
        Machine: machine.name,
        Site: siteName,
        Type: machine.machine_type,
        Material: getMaterialType(machine.id),
      };
      HOURS_12.forEach((_, index) => {
        const label = `${hourLabels[index]}:00`;
        data[label] = getHourValue(machine.id, index);
      });
      data.Total = getMachineTotal(machine.id);
      return data;
    });

    await exportToExcel(
      exportData,
      `hourly-loads-${selectedShift}-${today}`,
      "Hourly Loads",
    );
  };

  const handleImport = async (e: React.Changeevent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const data = await parseExcel(file);

      for (const row of data) {
        const machineName = row.Machine;
        const machine = machines.find((m) => m.name === machineName);
        if (!machine) continue;

        const updateData: any = {
          department_id: departmentId,
          machine_id: machine.id,
          load_date: today,
          shift_type: selectedShift,
        };

        if (row.Material !== undefined) {
          updateData.material_type = row.Material === "Coal" ? "Coal" : "Waste";
        }

        let hasData = false;
        HOURS_12.forEach((_, index) => {
          const label = `${hourLabels[index]}:00`;
          if (row[label] !== undefined) {
            updateData[`hour_${(index + 1).toString().padStart(2, "0")}`] =
              parseInt(row[label], 10) || 0;
            hasData = true;
          }
        });

        if (row.Material !== undefined) {
          hasData = true;
        }

        if (hasData) {
          const { error } = await supabase
            .from("hourly_loads")
            .upsert(updateData, {
              onConflict: "machine_id,load_date,shift_type",
            });

          if (error)
            logError(new Error(error.message), {
              context: "hourly_loads_import",
              machineName,
            });
        }
      }

      router.refresh();
      alert("Import completed successfully!");
    } catch (err) {
      logError(err instanceof Error ? err : new Error(String(err)), {
        context: "hourly_loads_import_failed",
      });
      alert(
        "Failed to parse Excel file. Please ensure it follows the exported template.",
      );
    } finally {
      setSaving(false);
      if (e.target) e.target.value = "";
    }
  };

  return {
    handleExport,
    handleImport,
  };
}
