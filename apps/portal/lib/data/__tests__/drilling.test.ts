/**
 * @jest-environment node
 */

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockServiceRoleClient = { from: mockFrom, rpc: mockRpc };

jest.mock("@repo/supabase/service-role", () => ({
  createServiceRoleClient: jest.fn(() => mockServiceRoleClient),
}));

jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock("@repo/utils", () => ({
  getOperationalToday: jest.fn(() => "2026-07-07"),
}));

function makeChain(response: any) {
  const chain: any = {
    then(resolve: Function) {
      return resolve(response);
    },
  };
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.limit = () => chain;
  chain.single = () => chain;
  chain.is = () => chain;
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("portal lib/data/drilling", () => {
  describe("getDrillingOpsData", () => {
    it("returns drills, ops, and operators for the department", async () => {
      const mockDrills = {
        data: [{ id: "drill-1", name: "Rig A" }],
        error: null,
      };
      const mockOps = {
        data: [{ id: "op-1", machine_id: "drill-1" }],
        error: null,
      };
      const mockOperators = {
        data: [{ id: "emp-1", full_name: "John" }],
        error: null,
      };

      const responses = [mockDrills, mockOps, mockOperators];
      let callCount = 0;
      mockFrom.mockImplementation(() => makeChain(responses[callCount++]));

      const { getDrillingOpsData } = require("../drilling");
      const result = await getDrillingOpsData("dept-1");

      expect(result).toEqual({
        drills: mockDrills.data,
        ops: mockOps.data,
        operators: mockOperators.data,
        deptId: "dept-1",
      });
    });

    it("handles null data gracefully", async () => {
      const emptyResp = { data: null, error: null };
      mockFrom.mockImplementation(() => makeChain(emptyResp));

      const { getDrillingOpsData } = require("../drilling");
      const result = await getDrillingOpsData("dept-1");

      expect(result.drills).toEqual([]);
      expect(result.ops).toEqual([]);
      expect(result.operators).toEqual([]);
    });
  });

  describe("getMachineTelemetryData", () => {
    it("returns telemetry, archives, drills, and monthly summary", async () => {
      const mockDrills = {
        data: [{ id: "drill-1", name: "Rig A" }],
        error: null,
      };
      const mockTelemetry = {
        data: [
          { period: "2026-07-07", machine_id: "drill-1", total_alerts: 2 },
        ],
        error: null,
      };
      const mockArchives = {
        data: [
          {
            id: "arch-1",
            year_month: "2026-06",
            machine_id: "drill-1",
            archived_at: "2026-07-01T00:00:00Z",
            record_count: 100,
          },
        ],
        error: null,
      };
      const mockAllMachines = {
        data: [{ id: "drill-1", name: "Rig A" }],
        error: null,
      };
      const mockMonthlySummary = {
        data: [{ machine_id: "drill-1", availability_pct: 95 }],
        error: null,
      };

      const responses = [
        mockDrills,
        mockTelemetry,
        mockArchives,
        mockAllMachines,
        mockMonthlySummary,
      ];
      let fromCallCount = 0;
      let rpcCallCount = 0;

      // getMachineTelemetryData uses `from()` for drills, archives, allMachines
      // and `rpc()` for telemetry and monthlySummary
      mockFrom.mockImplementation(() => {
        const response = responses[fromCallCount];
        fromCallCount++;
        return makeChain(response);
      });

      mockRpc.mockImplementation(() => {
        const idx = rpcCallCount++;
        if (idx === 0) return Promise.resolve(mockTelemetry);
        if (idx === 1) return Promise.resolve(mockMonthlySummary);
        return Promise.resolve({ data: null, error: null });
      });

      const { getMachineTelemetryData } = require("../drilling");
      const result = await getMachineTelemetryData("dept-1");

      expect(result.currentMonth).toBeDefined();
      expect(result.telemetry).toEqual(mockTelemetry.data);
      expect(result.drills).toEqual(mockDrills.data);
      expect(result.monthlySummary).toEqual(mockMonthlySummary.data);
    });
  });
});
