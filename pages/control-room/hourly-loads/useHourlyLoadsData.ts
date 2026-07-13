import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Machine, HourlyLoad } from "./HourlyLoadsGrid";

export const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);

const DAY_HOUR_LABELS = [
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
];
const NIGHT_HOUR_LABELS = [
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
];

export function useHourlyLoadsData({
  machines,
  hourlyLoads,
}: {
  machines: Machine[];
  hourlyLoads: HourlyLoad[];
}) {
  const [selectedShift, setSelectedShift] = useState<"day" | "night">("day");

  // ResizeObserver for dynamic layout sizing
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContainerWidth(entries[0].contentRect.width - 2);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize shift based on current time
  useEffect(() => {
    setSelectedShift(
      new Date().getHours() >= 6 && new Date().getHours() < 18
        ? "day"
        : "night",
    );
  }, []);

  const loadsByMachine = useMemo(() => {
    const map = new Map<string, { day?: HourlyLoad; night?: HourlyLoad }>();
    hourlyLoads.forEach((load) => {
      const entry = map.get(load.machine_id) || {};
      entry[load.shift_type] = load;
      map.set(load.machine_id, entry);
    });
    return map;
  }, [hourlyLoads]);

  const hourLabels =
    selectedShift === "day" ? DAY_HOUR_LABELS : NIGHT_HOUR_LABELS;

  const getHourValue = useCallback(
    (machineId: string, hourIndex: number): number => {
      const machineLoads = loadsByMachine.get(machineId);
      const load = machineLoads ? machineLoads[selectedShift] : undefined;
      if (!load) return 0;
      const field =
        `hour_${(hourIndex + 1).toString().padStart(2, "0")}` as keyof HourlyLoad;
      return (load[field] as number) || 0;
    },
    [loadsByMachine, selectedShift],
  );

  const getMachineTotal = useCallback(
    (machineId: string): number => {
      const machineLoads = loadsByMachine.get(machineId);
      const load = machineLoads ? machineLoads[selectedShift] : undefined;
      return load ? load.total_loads || 0 : 0;
    },
    [loadsByMachine, selectedShift],
  );

  const getMaterialType = useCallback(
    (machineId: string): "Waste" | "Coal" => {
      const machineLoads = loadsByMachine.get(machineId);
      const load = machineLoads ? machineLoads[selectedShift] : undefined;
      return load?.material_type || "Waste";
    },
    [loadsByMachine, selectedShift],
  );

  const hasBinFactors = useMemo(() => {
    return machines.some((m) => m.bin_factor != null && m.bin_factor > 0);
  }, [machines]);

  // Build grid source rows
  const source = useMemo(() => {
    return machines.map((machine) => {
      const totalLoads = getMachineTotal(machine.id);
      const binFactor = machine.bin_factor ?? 0;
      const sites = machine.sites;
      const siteName =
        (Array.isArray(sites)
          ? sites[0]?.name
          : (sites as { name?: string } | null)?.name) ?? "No Site";
      const row: Record<string, string | number> = {
        machineName: machine.name,
        siteName,
        machineType: machine.machine_type,
        materialType: getMaterialType(machine.id),
      };
      HOURS_12.forEach((_, index) => {
        row[`hour_${(index + 1).toString().padStart(2, "0")}`] = getHourValue(
          machine.id,
          index,
        );
      });
      row.total = totalLoads;
      if (hasBinFactors) {
        row.binFactor = binFactor > 0 ? binFactor : "-";
        row.totalMaterial =
          binFactor > 0 ? Math.round(totalLoads * binFactor * 10) / 10 : "-";
      }
      return row;
    });
  }, [machines, getHourValue, getMachineTotal, hasBinFactors, getMaterialType]);

  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  );
}
