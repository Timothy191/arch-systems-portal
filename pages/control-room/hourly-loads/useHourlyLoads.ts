import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@repo/supabase/client";
import { Machine, HourlyLoad } from "./HourlyLoadsGrid";
import { useHourlyLoadsData, HOURS_12 } from "./useHourlyLoadsData";
import { useHourlyLoadsMutations } from "./useHourlyLoadsMutations";
import { useHourlyLoadsExcel } from "./useHourlyLoadsExcel";

interface UseHourlyLoadsOptions {
  departmentId: string;
  machines: Machine[];
  hourlyLoads: HourlyLoad[];
}

export function useHourlyLoads({
  departmentId,
  machines,
  hourlyLoads,
}: UseHourlyLoadsOptions) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const today = new Date().toISOString().split("T")[0] as string;

  const [saving, setSaving] = useState(false);

  const {
    selectedShift,
    setSelectedShift,
    containerRef,
    containerWidth,
    source,
    hourLabels,
    hasBinFactors,
    getHourValue,
    getMaterialType,
    getMachineTotal,
  } = useHourlyLoadsData({ machines, hourlyLoads });

  const { handleGridClick, handleGridChange, handleAfterEdit } =
    useHourlyLoadsMutations({
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
    });

  const { handleExport, handleImport } = useHourlyLoadsExcel({
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
  });

  return {
    selectedShift,
    setSelectedShift,
    saving,
    containerRef,
    containerWidth,
    source,
    handleGridClick,
    handleGridChange,
    handleAfterEdit,
    handleExport,
    handleImport,
    hourLabels,
    hasBinFactors,
  };
}
