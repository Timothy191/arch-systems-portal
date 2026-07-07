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
  (chain as any).or = () => chain;
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("portal lib/data/operations", () => {
  describe("getControlRoomSummary", () => {
    it("returns aggregated summary data", async () => {
      const mockOps = { data: [{ hours_worked: 8 }], error: null };
      const mockDelays = { data: [{ delay_minutes: 15 }], error: null };
      const mockLoads = { data: [{ total_loads: 120 }], error: null };
      const mockMachines = { data: null, count: 5, error: null };

      const responses = [mockOps, mockDelays, mockLoads, mockMachines];
      let callCount = 0;
      mockFrom.mockImplementation(() => makeChain(responses[callCount++]));

      const { getControlRoomSummary } = require("../operations");
      const result = await getControlRoomSummary("dept-1", "2026-07-07");

      expect(result).toEqual({
        todayOperations: mockOps.data,
        todayDelays: mockDelays.data,
        todayLoads: mockLoads.data,
        machineCount: 5,
      });
    });

    it("handles empty data gracefully", async () => {
      const emptyResp = { data: null, error: null };
      mockFrom.mockImplementation(() => makeChain(emptyResp));

      const { getControlRoomSummary } = require("../operations");
      const result = await getControlRoomSummary("dept-1", "2026-07-07");

      expect(result).toEqual({
        todayOperations: [],
        todayDelays: [],
        todayLoads: [],
        machineCount: 0,
      });
    });
  });

  describe("getNonControlRoomSummary", () => {
    it("returns logs and machine count", async () => {
      const mockLogs = {
        data: [{ id: "log-1", log_date: "2026-07-07", shift: "day" }],
        error: null,
      };
      const mockMachines = { data: null, count: 3, error: null };

      const responses = [mockLogs, mockMachines];
      let callCount = 0;
      mockFrom.mockImplementation(() => makeChain(responses[callCount++]));

      const { getNonControlRoomSummary } = require("../operations");
      const result = await getNonControlRoomSummary("dept-1", "2026-07-07");

      expect(result).toEqual({
        todayLogs: mockLogs.data,
        machineCount: 3,
      });
    });
  });

  describe("getShiftCoverageLogs", () => {
    it("returns shift logs for the given date", async () => {
      const logs = [{ id: "log-1", log_date: "2026-07-07", shift: "day" }];
      mockFrom.mockImplementation(() => makeChain({ data: logs, error: null }));

      const { getShiftCoverageLogs } = require("../operations");
      const result = await getShiftCoverageLogs("dept-1", "2026-07-07");

      expect(result).toEqual(logs);
    });

    it("returns empty array when no logs", async () => {
      mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));

      const { getShiftCoverageLogs } = require("../operations");
      const result = await getShiftCoverageLogs("dept-1", "2026-07-07");

      expect(result).toEqual([]);
    });
  });
});
