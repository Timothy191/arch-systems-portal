import { Test, TestingModule } from "@nestjs/testing";
import { ControlRoomService } from "./control-room.service";

describe("ControlRoomService", () => {
  let service: ControlRoomService;

  // Mock Supabase that returns realistic data
  const mockMachines = {
    data: [
      { id: "m1", name: "Excavator A", machine_type: "Excavator", report_exempt: false },
      { id: "m2", name: "Dump Truck 1", machine_type: "Dump Truck", report_exempt: false },
      { id: "m3", name: "Dozer 1", machine_type: "Bulldozer", report_exempt: false },
      { id: "m4", name: "LHD 1", machine_type: "Loader", report_exempt: false },
      { id: "m5", name: "Old Dozer", machine_type: "Bulldozer", report_exempt: true },
    ],
    error: null,
  };

  const mockMachineOps = {
    data: [
      { machine_id: "m4", hours_worked: 8.5 },
    ],
    error: null,
  };

  const mockExcavatorActs = {
    data: [{ machine_id: "m1" }],
    error: null,
  };

  const mockDozerRolls = {
    data: [
      { machine_id: "m3", hours_operated: 7.0 },
    ],
    error: null,
  };

  const mockHourlyLoads = {
    data: [
      { machine_id: "m2", total_loads: 120 },
    ],
    error: null,
  };

  // Track calls to build chained Supabase queries
  let queryChain: any;
  let supabaseFromSpy: jest.Mock;

  function buildSupabaseMock(responses: Record<string, any>) {
    // Each call to .from(table) returns a chain that ends with .eq().eq()... mockResolvedValue
    const tableResponses: Record<string, any> = responses;

    // Builder: tracks the table being queried and returns the appropriate response
    const builder: any = new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (prop === "then") return undefined; // not a promise
          return (...args: any[]) => {
            if (prop === "select") {
              // select returns another chain that eventually resolves
              const selectBuilder: any = new Proxy(
                {},
                {
                  get(_t2, p2: string) {
                    if (p2 === "then") return undefined;
                    return (...args2: any[]) => {
                      if (p2 === "eq") {
                        // eq returns itself for further chaining
                        return selectBuilder;
                      }
                      if (p2 === "order") {
                        return selectBuilder;
                      }
                      return undefined;
                    };
                  },
                },
              );

              // Make it resolvable by attaching a .eq().eq() pattern that resolves
              // We need the chain: .eq("department_id", x).eq("shift_date", d).eq("shift_type", s)
              // Or: .eq("department_id", x).eq("active", true).order("name")
              const chainFn = () => Promise.resolve(tableResponses[builder._lastTable] || { data: [], error: null });

              // Build chain by returning a Proxy that intercepts .eq and .order
              const chain: any = new Proxy(
                async () => chainFn(),
                {
                  get(_t2, p2: string) {
                    if (p2 === "then") return undefined;
                    if (p2 === "eq" || p2 === "order") {
                      return () => chain;
                    }
                    return undefined;
                  },
                  apply(_target, _thisArg, _args) {
                    return chainFn();
                  },
                },
              );

              return chain;
            }
            return undefined;
          };
        },
      },
    );

    const fromSpy = jest.fn().mockImplementation((table: string) => {
      builder._lastTable = table;
      return builder;
    });

    return fromSpy;
  }

  const mockRedis = {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    isOpen: true,
    multi: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create a fresh supabase mock each time
    const tableData: Record<string, any> = {
      machines: mockMachines,
      machine_operations: mockMachineOps,
      excavator_activity: mockExcavatorActs,
      dozer_rolls: mockDozerRolls,
      hourly_loads: mockHourlyLoads,
    };

    supabaseFromSpy = buildSupabaseMock(tableData);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControlRoomService,
        { provide: "SUPABASE_CLIENT", useValue: { from: supabaseFromSpy } },
        { provide: "REDIS_CLIENT", useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ControlRoomService>(ControlRoomService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getShiftCompleteness", () => {
    it("should report shift as complete when all machines have entries", async () => {
      // All 4 non-exempt machines have entries (m1 excavator, m2 dumper, m3 dozer, m4 loader)
      const result = await service.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      expect(result.complete).toBe(true);
      expect(result.totalRequired).toBe(4);
      expect(result.totalCovered).toBe(4);
    });

    it("should report shift as incomplete when machines are missing entries", async () => {
      // Override hourly_loads to be empty (m2 dumper missing)
      const tableData: Record<string, any> = {
        machines: mockMachines,
        machine_operations: mockMachineOps,
        excavator_activity: mockExcavatorActs,
        dozer_rolls: mockDozerRolls,
        hourly_loads: { data: [], error: null },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ControlRoomService,
          { provide: "SUPABASE_CLIENT", useValue: { from: buildSupabaseMock(tableData) } },
          { provide: "REDIS_CLIENT", useValue: mockRedis },
        ],
      }).compile();

      const svc = module.get<ControlRoomService>(ControlRoomService);
      const result = await svc.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      expect(result.complete).toBe(false);
      expect(result.totalRequired).toBe(4);
      expect(result.totalCovered).toBe(3);
    });

    it("should mark exempt machines as not required", async () => {
      const result = await service.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      // m5 is exempt
      const exemptMachine = result.statuses.find((s) => s.machineId === "m5");
      expect(exemptMachine?.exempt).toBe(true);
      expect(exemptMachine?.hasEntry).toBe(false);

      // Exempt machines are excluded from totalRequired
      expect(result.totalRequired).toBe(4); // 5 total - 1 exempt = 4 required
    });

    it("should assign correct required forms based on machine type", async () => {
      const result = await service.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      const excavator = result.statuses.find((s) => s.machineId === "m1");
      expect(excavator?.requiredForm).toBe("excavator-activity");

      const dumper = result.statuses.find((s) => s.machineId === "m2");
      expect(dumper?.requiredForm).toBe("hourly-loads");

      const dozer = result.statuses.find((s) => s.machineId === "m3");
      expect(dozer?.requiredForm).toBe("roll-over");

      const loader = result.statuses.find((s) => s.machineId === "m4");
      expect(loader?.requiredForm).toBe("machine-operations");
    });

    it("should report hours worked for machine operations", async () => {
      const result = await service.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      const lhd = result.statuses.find((s) => s.machineId === "m4");
      expect(lhd?.hoursWorked).toBe(8.5);
    });

    it("should report hours operated for dozer rolls", async () => {
      const result = await service.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      const dozer = result.statuses.find((s) => s.machineId === "m3");
      expect(dozer?.hoursWorked).toBe(7.0);
    });

    it("should build correct form paths", async () => {
      const result = await service.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      const loader = result.statuses.find((s) => s.machineId === "m4");
      expect(loader?.formPath).toBe("/mining/machine-operations");
    });

    it("should handle empty machine list", async () => {
      const tableData: Record<string, any> = {
        machines: { data: [], error: null },
        machine_operations: { data: [], error: null },
        excavator_activity: { data: [], error: null },
        dozer_rolls: { data: [], error: null },
        hourly_loads: { data: [], error: null },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ControlRoomService,
          { provide: "SUPABASE_CLIENT", useValue: { from: buildSupabaseMock(tableData) } },
          { provide: "REDIS_CLIENT", useValue: mockRedis },
        ],
      }).compile();

      const svc = module.get<ControlRoomService>(ControlRoomService);
      const result = await svc.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      expect(result.complete).toBe(true);
      expect(result.totalRequired).toBe(0);
      expect(result.totalCovered).toBe(0);
      expect(result.statuses).toHaveLength(0);
    });

    it("should handle null data from Supabase queries", async () => {
      const tableData: Record<string, any> = {
        machines: { data: null, error: null },
        machine_operations: { data: null, error: null },
        excavator_activity: { data: null, error: null },
        dozer_rolls: { data: null, error: null },
        hourly_loads: { data: null, error: null },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ControlRoomService,
          { provide: "SUPABASE_CLIENT", useValue: { from: buildSupabaseMock(tableData) } },
          { provide: "REDIS_CLIENT", useValue: mockRedis },
        ],
      }).compile();

      const svc = module.get<ControlRoomService>(ControlRoomService);
      const result = await svc.getShiftCompleteness(
        "dept-1",
        "mining",
        "2026-07-07",
        "day",
      );

      expect(result.complete).toBe(true);
      expect(result.statuses).toHaveLength(0);
    });
  });
});
