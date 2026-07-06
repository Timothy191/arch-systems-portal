/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useHourlyLoadsData, HOURS_12 } from "./useHourlyLoadsData";
import type { Machine, HourlyLoad } from "./HourlyLoadsGrid";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

const machines: Machine[] = [
  {
    id: "m1",
    name: "Excavator 1",
    machine_type: "EX",
    bin_factor: 1.5,
    sites: [{ name: "Site A" }],
  },
  {
    id: "m2",
    name: "Truck 2",
    machine_type: "TK",
    bin_factor: null,
    sites: null,
  },
];

function makeLoad(overrides: Partial<HourlyLoad> = {}): HourlyLoad {
  return {
    id: "load-1",
    machine_id: "m1",
    shift_type: "day",
    hour_01: 5,
    hour_02: 10,
    hour_03: 0,
    hour_04: 0,
    hour_05: 0,
    hour_06: 0,
    hour_07: 0,
    hour_08: 0,
    hour_09: 0,
    hour_10: 0,
    hour_11: 0,
    hour_12: 0,
    total_loads: 15,
    material_type: "Coal",
    ...overrides,
  };
}

describe("HOURS_12", () => {
  it("contains 12 hours numbered 1-12", () => {
    expect(HOURS_12).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe("useHourlyLoadsData", () => {
  const baseArgs = { machines, hourlyLoads: [] };

  it("defaults to day shift labels", () => {
    const { result } = renderHook(() => useHourlyLoadsData(baseArgs));
    expect(result.current.hourLabels[0]).toBe("06");
    expect(result.current.hourLabels[11]).toBe("17");
  });

  it("returns 0 for getHourValue when no loads exist", () => {
    const { result } = renderHook(() => useHourlyLoadsData(baseArgs));
    expect(result.current.getHourValue("m1", 0)).toBe(0);
  });

  it("returns correct hour value for matching shift", () => {
    const loads = [makeLoad({ hour_01: 7, hour_02: 12 })];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines, hourlyLoads: loads }),
    );
    expect(result.current.getHourValue("m1", 0)).toBe(7);
    expect(result.current.getHourValue("m1", 1)).toBe(12);
  });

  it("returns 0 for getHourValue when shift does not match", () => {
    const loads = [makeLoad({ shift_type: "night", hour_01: 9 })];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines, hourlyLoads: loads }),
    );
    result.current.setSelectedShift("day");
    expect(result.current.getHourValue("m1", 0)).toBe(0);
  });

  it("returns correct machine total", () => {
    const loads = [makeLoad({ total_loads: 42 })];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines, hourlyLoads: loads }),
    );
    expect(result.current.getMachineTotal("m1")).toBe(42);
  });

  it("returns 0 for getMachineTotal when no load matches", () => {
    const { result } = renderHook(() => useHourlyLoadsData(baseArgs));
    expect(result.current.getMachineTotal("m1")).toBe(0);
    expect(result.current.getMachineTotal("nonexistent")).toBe(0);
  });

  it("returns material type from load data", () => {
    const loads = [makeLoad({ material_type: "Coal" })];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines, hourlyLoads: loads }),
    );
    expect(result.current.getMaterialType("m1")).toBe("Coal");
  });

  it("defaults material type to Waste when no load", () => {
    const { result } = renderHook(() => useHourlyLoadsData(baseArgs));
    expect(result.current.getMaterialType("m1")).toBe("Waste");
  });

  it("detects hasBinFactors when any machine has bin_factor > 0", () => {
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines, hourlyLoads: [] }),
    );
    expect(result.current.hasBinFactors).toBe(true);
  });

  it("hasBinFactors is false when no machines have bin_factor", () => {
    const noBinMachines: Machine[] = [
      { id: "m1", name: "M1", machine_type: "EX", bin_factor: null },
      { id: "m2", name: "M2", machine_type: "TK", bin_factor: 0 },
    ];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines: noBinMachines, hourlyLoads: [] }),
    );
    expect(result.current.hasBinFactors).toBe(false);
  });

  it("builds source rows with correct machine info", () => {
    const loads = [makeLoad({ total_loads: 10, material_type: "Coal" })];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines, hourlyLoads: loads }),
    );
    const { source } = result.current;

    expect(source).toHaveLength(2);
    expect(source[0]!.machineName).toBe("Excavator 1");
    expect(source[0]!.siteName).toBe("Site A");
    expect(source[0]!.machineType).toBe("EX");
    expect(source[0]!.materialType).toBe("Coal");
    expect(source[0]!.total).toBe(10);
  });

  it("uses 'No Site' when machine has no sites", () => {
    const { result } = renderHook(() => useHourlyLoadsData(baseArgs));
    expect(result.current.source[1]!.siteName).toBe("No Site");
  });

  it("computes totalMaterial when bin_factor is present", () => {
    const loads = [makeLoad({ total_loads: 10 })];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines, hourlyLoads: loads }),
    );
    expect(result.current.source[0]!.totalMaterial).toBe(15);
  });

  it("shows '-' for binFactor/totalMaterial when a machine has bin_factor 0 but others have > 0", () => {
    const mixedMachines: Machine[] = [
      { id: "m1", name: "M1", machine_type: "EX", bin_factor: 1.5 },
      { id: "m2", name: "M2", machine_type: "TK", bin_factor: 0 },
    ];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines: mixedMachines, hourlyLoads: [] }),
    );
    expect(result.current.hasBinFactors).toBe(true);
    expect(result.current.source[1]!.binFactor).toBe("-");
    expect(result.current.source[1]!.totalMaterial).toBe("-");
  });

  it("omits binFactor/totalMaterial when no machines have bin_factor", () => {
    const noBinMachines: Machine[] = [
      { id: "m1", name: "M1", machine_type: "EX", bin_factor: 0 },
    ];
    const { result } = renderHook(() =>
      useHourlyLoadsData({ machines: noBinMachines, hourlyLoads: [] }),
    );
    expect(result.current.source[0]!.binFactor).toBeUndefined();
  });

  it("allows toggling shift via setSelectedShift", () => {
    const { result } = renderHook(() => useHourlyLoadsData(baseArgs));
    act(() => {
      result.current.setSelectedShift("night");
    });
    expect(result.current.selectedShift).toBe("night");
    expect(result.current.hourLabels[0]).toBe("18");
  });
});
