import { Test, TestingModule } from "@nestjs/testing";
import { ControlRoomService } from "./control-room.service";

describe("ControlRoomService", () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    setEx: jest.fn(),
    del: jest.fn(),
    isOpen: true,
    multi: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  };

  function chainFor(response: { data: any; error: null }) {
    const promise = Promise.resolve(response) as any;
    promise.select = () => promise;
    promise.eq = () => promise;
    promise.order = () => promise;
    promise.range = () => promise;
    return promise;
  }

  function buildModule(
    responses: Record<string, { data: any; error: null }>,
  ): Promise<ControlRoomService> {
    const from = jest.fn().mockImplementation((table: string) => {
      return chainFor(responses[table] || { data: [], error: null });
    });

    return Test.createTestingModule({
      providers: [
        ControlRoomService,
        { provide: "SUPABASE_CLIENT", useValue: { from } },
        { provide: "REDIS_CLIENT", useValue: mockRedis },
      ],
    })
      .compile()
      .then((m: TestingModule) => m.get(ControlRoomService));
  }

  const defaultM = {
    machines: {
      data: [
        { id: "m1", name: "Excavator A", machine_type: "Excavator", report_exempt: false },
        { id: "m2", name: "Dump Truck 1", machine_type: "Dump Truck", report_exempt: false },
        { id: "m3", name: "Dozer 1", machine_type: "Bulldozer", report_exempt: false },
        { id: "m4", name: "LHD 1", machine_type: "Loader", report_exempt: false },
        { id: "m5", name: "Old Dozer", machine_type: "Bulldozer", report_exempt: true },
      ],
      error: null,
    },
    machine_operations: { data: [{ machine_id: "m4", hours_worked: 8.5 }], error: null },
    excavator_activity: { data: [{ machine_id: "m1" }], error: null },
    dozer_rolls: { data: [{ machine_id: "m3", hours_operated: 7.0 }], error: null },
    hourly_loads: { data: [{ machine_id: "m2", total_loads: 120 }], error: null },
  };

  let seq = 0;
  function nextDept() { seq++; return `dept-${seq}`; }

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it("should be defined", async () => {
    const svc = await buildModule(defaultM);
    expect(svc).toBeDefined();
  });

  describe("getShiftCompleteness", () => {
    it("should report shift as complete when all machines have entries", async () => {
      const svc = await buildModule(defaultM);
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.complete).toBe(true);
      expect(result.totalRequired).toBe(4);
      expect(result.totalCovered).toBe(4);
    });

    it("should report shift as incomplete when machines are missing entries", async () => {
      const svc = await buildModule({ ...defaultM, hourly_loads: { data: [], error: null } });
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.complete).toBe(false);
      expect(result.totalRequired).toBe(4);
      expect(result.totalCovered).toBe(3);
    });

    it("should mark exempt machines as not required", async () => {
      const svc = await buildModule(defaultM);
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      const m = result.statuses.find((s) => s.machineId === "m5");
      expect(m?.exempt).toBe(true);
      expect(m?.hasEntry).toBe(false);
      expect(result.totalRequired).toBe(4);
    });

    it("should assign correct required forms", async () => {
      const svc = await buildModule(defaultM);
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.statuses.find((s) => s.machineId === "m1")?.requiredForm).toBe("excavator-activity");
      expect(result.statuses.find((s) => s.machineId === "m2")?.requiredForm).toBe("hourly-loads");
      expect(result.statuses.find((s) => s.machineId === "m3")?.requiredForm).toBe("roll-over");
      expect(result.statuses.find((s) => s.machineId === "m4")?.requiredForm).toBe("machine-operations");
    });

    it("should report hours worked for machine operations", async () => {
      const svc = await buildModule(defaultM);
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.statuses.find((s) => s.machineId === "m4")?.hoursWorked).toBe(8.5);
    });

    it("should report hours operated for dozer rolls", async () => {
      const svc = await buildModule(defaultM);
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.statuses.find((s) => s.machineId === "m3")?.hoursWorked).toBe(7.0);
    });

    it("should build correct form paths", async () => {
      const svc = await buildModule(defaultM);
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.statuses.find((s) => s.machineId === "m4")?.formPath).toBe("/mining/machine-operations");
    });

    it("should handle empty machine list", async () => {
      const svc = await buildModule({
        machines: { data: [], error: null },
        machine_operations: { data: [], error: null },
        excavator_activity: { data: [], error: null },
        dozer_rolls: { data: [], error: null },
        hourly_loads: { data: [], error: null },
      });
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.complete).toBe(true);
      expect(result.totalRequired).toBe(0);
      expect(result.totalCovered).toBe(0);
      expect(result.statuses).toHaveLength(0);
    });

    it("should handle null data from Supabase queries", async () => {
      const svc = await buildModule({
        machines: { data: null, error: null },
        machine_operations: { data: null, error: null },
        excavator_activity: { data: null, error: null },
        dozer_rolls: { data: null, error: null },
        hourly_loads: { data: null, error: null },
      });
      const result = await svc.getShiftCompleteness(nextDept(), "mining", "2026-07-07", "day");
      expect(result.complete).toBe(true);
      expect(result.statuses).toHaveLength(0);
    });
  });
});
