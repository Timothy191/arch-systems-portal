import { Test, TestingModule } from "@nestjs/testing";
import { ExportsService } from "./exports.service";

describe("ExportsService", () => {
  let service: ExportsService;

  const mockSupabase = {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: "dept-1" }, error: null }),
        }),
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
            }),
          }),
        }),
        order: jest.fn().mockReturnValue({
          range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        }),
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        { provide: "SUPABASE_CLIENT", useValue: mockSupabase },
      ],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should generate CSV from headers and rows", () => {
    const headers = ["id", "name"];
    const rows = [{ id: "1", name: "Test" }];
    const csv = service.toCsv(headers, rows);
    expect(csv).toContain("id,name");
    expect(csv).toContain('"1","Test"');
  });

  it("should sanitize CSV cells with dangerous characters", () => {
    const headers = ["data"];
    const rows = [{ data: "=SUM(A1)" }];
    const csv = service.toCsv(headers, rows);
    expect(csv).toContain("'=SUM(A1)");
  });
});
