/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { useHourlyLoadsMutations } from "./useHourlyLoadsMutations";
import type { Machine, HourlyLoad } from "./HourlyLoadsGrid";

jest.mock("@/lib/errors/error-logger", () => ({
  logError: jest.fn(),
}));

jest.mock("./actions", () => ({
  updateMachineSite: jest.fn().mockResolvedValue({ success: true }),
}));

const machines: Machine[] = [
  { id: "m1", name: "Excavator 1", machine_type: "EX", sites: null },
  { id: "m2", name: "Truck 2", machine_type: "TK", sites: null },
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

function createMockSupabase() {
  const mockEq = jest.fn().mockResolvedValue({ error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
  const mockInsert = jest.fn().mockResolvedValue({ error: null });
  const mockFrom = jest.fn().mockReturnValue({
    update: mockUpdate,
    insert: mockInsert,
  });
  return {
    mockFrom,
    mockUpdate,
    mockInsert,
    mockEq,
    supabase: { from: mockFrom },
  };
}

function createBaseOptions(
  overrides: Partial<Parameters<typeof useHourlyLoadsMutations>[0]> = {},
) {
  const sb = createMockSupabase();
  const router = { refresh: jest.fn() };
  const setSaving = jest.fn();
  const getHourValue = jest.fn().mockReturnValue(5);
  const getMaterialType = jest.fn().mockReturnValue("Coal" as const);

  return {
    sb,
    router,
    setSaving,
    opts: {
      machines,
      hourlyLoads: [makeLoad()],
      selectedShift: "day" as const,
      departmentId: "dept-1",
      today: "2026-07-06",
      supabase: sb.supabase,
      router,
      getHourValue,
      getMaterialType,
      setSaving,
      ...overrides,
    },
  };
}

describe("useHourlyLoadsMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleCellChange (via handleGridClick)", () => {
    it("updates existing load when hour value changes", async () => {
      const { opts, sb, router } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: (selector: string) => {
            if (selector.includes("up")) {
              return { dataset: { action: "up", row: "0", hour: "hour_01" } };
            }
            return null;
          },
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(opts.setSaving).toHaveBeenCalledWith(true);
      expect(sb.mockFrom).toHaveBeenCalledWith("hourly_loads");
      expect(sb.mockUpdate).toHaveBeenCalledWith({ hour_01: 6 });
      expect(router.refresh).toHaveBeenCalled();
      expect(opts.setSaving).toHaveBeenCalledWith(false);
    });

    it("inserts new load when no existing record", async () => {
      const { opts, sb, router } = createBaseOptions({
        hourlyLoads: [],
        getHourValue: jest.fn().mockReturnValue(0),
      });
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: (selector: string) => {
            if (selector.includes("up")) {
              return { dataset: { action: "up", row: "0", hour: "hour_01" } };
            }
            return null;
          },
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(sb.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          department_id: "dept-1",
          machine_id: "m1",
          load_date: "2026-07-06",
          shift_type: "day",
          hour_01: 1,
        }),
      );
      expect(router.refresh).toHaveBeenCalled();
    });

    it("clamps value to 0-100 range", async () => {
      const getHourValue = jest.fn().mockReturnValue(100);
      const { opts, sb } = createBaseOptions({ getHourValue });
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: (selector: string) => {
            if (selector.includes("up")) {
              return { dataset: { action: "up", row: "0", hour: "hour_01" } };
            }
            return null;
          },
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(sb.mockUpdate).not.toHaveBeenCalled();
    });

    it("does nothing when value is already at boundary", async () => {
      const getHourValue = jest.fn().mockReturnValue(0);
      const { opts, sb } = createBaseOptions({ getHourValue });
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: (selector: string) => {
            if (selector.includes("down")) {
              return { dataset: { action: "down", row: "0", hour: "hour_01" } };
            }
            return null;
          },
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(opts.setSaving).not.toHaveBeenCalled();
      expect(sb.mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleMaterialToggle (via handleGridClick)", () => {
    it("toggles material from Coal to Waste", async () => {
      const { opts, sb, router } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: (selector: string) => {
            if (selector.includes("toggle-material")) {
              return { dataset: { row: "0" } };
            }
            return null;
          },
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(sb.mockUpdate).toHaveBeenCalledWith({ material_type: "Waste" });
      expect(router.refresh).toHaveBeenCalled();
    });

    it("toggles material from Waste to Coal", async () => {
      const getMaterialType = jest.fn().mockReturnValue("Waste" as const);
      const { opts, sb } = createBaseOptions({ getMaterialType });
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: (selector: string) => {
            if (selector.includes("toggle-material")) {
              return { dataset: { row: "0" } };
            }
            return null;
          },
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(sb.mockUpdate).toHaveBeenCalledWith({ material_type: "Coal" });
    });
  });

  describe("handleGridClick - no action", () => {
    it("does nothing when click target has no matching action", async () => {
      const { opts, sb } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: () => null,
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(opts.setSaving).not.toHaveBeenCalled();
      expect(sb.mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("handleGridChange (site selection)", () => {
    it("calls updateMachineSite and refreshes", async () => {
      const { updateMachineSite } = jest.requireMock("./actions");
      const { opts, router } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          dataset: { action: "select-site", row: "0" },
          value: "site-2",
        },
      } as unknown as React.Formevent;

      await result.current.handleGridChange(event);

      expect(updateMachineSite).toHaveBeenCalledWith("m1", "site-2");
      expect(router.refresh).toHaveBeenCalled();
    });

    it("ignores events without select-site action", async () => {
      const { updateMachineSite } = jest.requireMock("./actions");
      const { opts } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          dataset: { action: "other" },
          value: "site-2",
        },
      } as unknown as React.Formevent;

      await result.current.handleGridChange(event);

      expect(updateMachineSite).not.toHaveBeenCalled();
    });
  });

  describe("handleAfterEdit", () => {
    it("updates hour value from direct edit", async () => {
      const { opts, sb, router } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      await result.current.handleAfterEdit({
        detail: { prop: "hour_03", rowIndex: 0, val: 25 },
      });

      expect(sb.mockUpdate).toHaveBeenCalledWith({ hour_03: 25 });
      expect(router.refresh).toHaveBeenCalled();
    });

    it("rejects values outside 0-100 range", async () => {
      const { opts, sb, router } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

      await result.current.handleAfterEdit({
        detail: { prop: "hour_01", rowIndex: 0, val: 150 },
      });

      expect(alertSpy).toHaveBeenCalledWith(
        "Please enter a value between 0 and 100",
      );
      expect(sb.mockUpdate).not.toHaveBeenCalled();
      expect(router.refresh).toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it("ignores non-hour props", async () => {
      const { opts, sb } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      await result.current.handleAfterEdit({
        detail: { prop: "total", rowIndex: 0, val: 50 },
      });

      expect(sb.mockUpdate).not.toHaveBeenCalled();
    });

    it("handles plain object without detail wrapper", async () => {
      const { opts, sb } = createBaseOptions();
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      await result.current.handleAfterEdit({
        prop: "hour_02",
        rowIndex: 0,
        val: 8,
      });

      expect(sb.mockUpdate).toHaveBeenCalledWith({ hour_02: 8 });
    });
  });

  describe("error handling", () => {
    it("shows alert and logs error when update fails", async () => {
      const { logError } = jest.requireMock("@/lib/errors/error-logger");
      const dbError = new Error("DB failure");
      const mockEq = jest.fn().mockResolvedValue({ error: dbError });
      const mockUpdate = jest.fn().mockReturnValue({ eq: mockEq });
      const supabase = {
        from: jest
          .fn()
          .mockReturnValue({ update: mockUpdate, insert: jest.fn() }),
      };
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

      const { opts } = createBaseOptions({ supabase });
      const { result } = renderHook(() => useHourlyLoadsMutations(opts));

      const event = {
        target: {
          closest: (selector: string) => {
            if (selector.includes("up")) {
              return { dataset: { action: "up", row: "0", hour: "hour_01" } };
            }
            return null;
          },
        },
      } as unknown as React.Mouseevent;

      await result.current.handleGridClick(event);

      expect(alertSpy).toHaveBeenCalledWith(
        "Failed to update. Please try again.",
      );
      expect(logError).toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });
});
