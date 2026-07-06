import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { NotFoundException } from "@nestjs/common";

describe("AdminService", () => {
  let service: AdminService;

  const mockSupabase = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: "emp-1", role: "admin" },
            error: null,
          }),
        }),
        order: jest.fn().mockReturnValue({
          range: jest
            .fn()
            .mockResolvedValue({ data: [{ id: "1" }], error: null, count: 1 }),
        }),
      }),
      update: jest
        .fn()
        .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      delete: jest
        .fn()
        .mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: "SUPABASE_CLIENT", useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should validate known tables", () => {
    expect(service.validateTable("machines")).toBe("machines");
    expect(service.validateTable("MACHINES")).toBe("machines");
  });

  it("should throw NotFoundException for unknown tables", () => {
    expect(() => service.validateTable("unknown_table")).toThrow(
      NotFoundException,
    );
  });

  it("should assert admin role", async () => {
    const result = await service.assertAdmin("user-1");
    expect(result.id).toBe("emp-1");
  });
});
