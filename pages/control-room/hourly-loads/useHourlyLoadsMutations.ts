import { useCallback } from "react";
import { logError } from "@/lib/errors/error-logger";
import { updateMachineSite } from "./actions";
import { Machine, HourlyLoad } from "./HourlyLoadsGrid";

interface MutationOptions {
  machines: Machine[];
  hourlyLoads: HourlyLoad[];
  selectedShift: "day" | "night";
  departmentId: string;
  today: string;
  supabase: any;
  router: any;
  getHourValue: (_machineId: string, _hourIndex: number) => number;
  getMaterialType: (_machineId: string) => "Waste" | "Coal";
  setSaving: (_saving: boolean) => void;
}

async function upsertHourlyLoad(
  supabase: any,
  router: any,
  existingLoad: HourlyLoad | undefined,
  baseFields: Record<string, any>,
  updateFields: Record<string, any>,
  _errorContext: string,
  _errorMessage: string,
) {
  if (existingLoad) {
    const { error } = await supabase
      .from("hourly_loads")
      .update(updateFields)
      .eq("id", existingLoad.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("hourly_loads").insert({
      ...baseFields,
      ...updateFields,
    });
    if (error) throw error;
  }
  router.refresh();
}

function findLoadForMachine(
  hourlyLoads: HourlyLoad[],
  machineId: string,
  shift: string,
) {
  return hourlyLoads.find(
    (l) => l.machine_id === machineId && l.shift_type === shift,
  );
}

export function useHourlyLoadsMutations({
  machines,
  hourlyLoads,
  selectedShift,
  departmentId,
  today,
  supabase,
  router,
  getHourValue,
  getMaterialType,
  setSaving,
}: MutationOptions) {
  const handleCellChange = useCallback(
    async (rowIndex: number, hourProp: string, delta: number) => {
      const machine = machines[rowIndex];
      if (!machine) return;

      const hourIndex = parseInt(hourProp.split("_")[1] ?? "0", 10) - 1;
      const currentValue = getHourValue(machine.id, hourIndex);
      const newValue = Math.max(0, Math.min(100, currentValue + delta));
      if (newValue === currentValue) return;

      setSaving(true);
      try {
        const existingLoad = findLoadForMachine(
          hourlyLoads,
          machine.id,
          selectedShift,
        );
        await upsertHourlyLoad(
          supabase,
          router,
          existingLoad,
          {
            department_id: departmentId,
            machine_id: machine.id,
            load_date: today,
            shift_type: selectedShift,
          },
          { [hourProp]: newValue },
          "hourly_loads_adjust",
          "Failed to update. Please try again.",
        );
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          context: "hourly_loads_adjust",
        });
        alert("Failed to update. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [
      machines,
      hourlyLoads,
      selectedShift,
      departmentId,
      today,
      supabase,
      router,
      getHourValue,
      setSaving,
    ],
  );

  const handleMaterialToggle = useCallback(
    async (rowIndex: number) => {
      const machine = machines[rowIndex];
      if (!machine) return;

      const currentMaterial = getMaterialType(machine.id);
      const newMaterial = currentMaterial === "Waste" ? "Coal" : "Waste";

      setSaving(true);
      try {
        const existingLoad = findLoadForMachine(
          hourlyLoads,
          machine.id,
          selectedShift,
        );
        await upsertHourlyLoad(
          supabase,
          router,
          existingLoad,
          {
            department_id: departmentId,
            machine_id: machine.id,
            load_date: today,
            shift_type: selectedShift,
          },
          { material_type: newMaterial },
          "hourly_loads_material_toggle",
          "Failed to update material. Please try again.",
        );
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          context: "hourly_loads_material_toggle",
        });
        alert("Failed to update material. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [
      machines,
      hourlyLoads,
      selectedShift,
      departmentId,
      today,
      supabase,
      router,
      getMaterialType,
      setSaving,
    ],
  );

  const handleGridClick = useCallback(
    async (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      const toggleBtn = target.closest(
        '[data-action="toggle-material"]',
      ) as HTMLElement | null;
      if (toggleBtn) {
        const rowIndex = parseInt(toggleBtn.dataset.row || "0", 10);
        await handleMaterialToggle(rowIndex);
        return;
      }

      const button = target.closest(
        '[data-action="up"], [data-action="down"]',
      ) as HTMLElement | null;
      if (!button) return;

      const rowIndex = parseInt(button.dataset.row || "0", 10);
      const hourProp = button.dataset.hour;
      const action = button.dataset.action;

      if (!hourProp || !action) return;

      const delta = action === "up" ? 1 : -1;
      await handleCellChange(rowIndex, hourProp, delta);
    },
    [handleCellChange, handleMaterialToggle],
  );

  const handleGridChange = useCallback(
    async (e: React.FormEvent) => {
      const target = e.target as HTMLSelectElement;
      if (target.dataset.action !== "select-site") return;

      const rowIndex = parseInt(target.dataset.row || "0", 10);
      const newSiteId = target.value || null;

      const machine = machines[rowIndex];
      if (!machine) return;

      setSaving(true);
      try {
        await updateMachineSite(machine.id, newSiteId);
        router.refresh();
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          context: "hourly_loads_site_change",
        });
        alert("Failed to update site. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [machines, router, setSaving],
  );

  const handleAfterEdit = useCallback(
    async (e: any) => {
      const detail = e?.detail ?? e;
      const prop: string = detail?.prop;
      const rowIndex: number = detail?.rowIndex ?? detail?.row?.index;
      const val = detail?.val;

      if (
        typeof rowIndex !== "number" ||
        !prop?.startsWith("hour_") ||
        val === undefined
      )
        return;

      const value = parseInt(String(val), 10) || 0;
      if (value < 0 || value > 100) {
        alert("Please enter a value between 0 and 100");
        router.refresh();
        return;
      }

      const machine = machines[rowIndex];
      if (!machine) return;

      setSaving(true);
      try {
        const existingLoad = findLoadForMachine(
          hourlyLoads,
          machine.id,
          selectedShift,
        );
        await upsertHourlyLoad(
          supabase,
          router,
          existingLoad,
          {
            department_id: departmentId,
            machine_id: machine.id,
            load_date: today,
            shift_type: selectedShift,
          },
          { [prop]: value },
          "hourly_loads_save",
          "Failed to save. Please try again.",
        );
      } catch (err) {
        logError(err instanceof Error ? err : new Error(String(err)), {
          context: "hourly_loads_save",
        });
        alert("Failed to save. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [
      machines,
      hourlyLoads,
      selectedShift,
      departmentId,
      today,
      supabase,
      router,
      setSaving,
    ],
  );

  return {
    handleGridClick,
    handleGridChange,
    handleAfterEdit,
  };
}
