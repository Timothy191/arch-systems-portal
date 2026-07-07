import { Test, TestingModule } from "@nestjs/testing";
import { ToolsService } from "./tools.service";
import { ConfigService } from "@nestjs/config";

const mockFetch = jest.fn();
jest.mock("@repo/redis/cache", () => ({
  cacheWrap: jest.fn((_key: string, fn: () => any, _ttl: number) => fn()),
}));

describe("ToolsService", () => {
  let service: ToolsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = mockFetch;

    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ToolsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "N8N_URL") return "http://n8n.internal:5678";
              return undefined;
            }),
          },
        },
        {
          provide: "REDIS_CLIENT",
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    service = mod.get(ToolsService);
  });

  it("returns n8n as online when health check succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    const results = await service.checkAllTools();

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "n8n",
      status: "online",
    });
    expect(results[0].responseTime).toBeGreaterThanOrEqual(0);
  });

  it("returns n8n as offline when health check fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const results = await service.checkAllTools();

    expect(results[0].status).toBe("offline");
  });

  it("returns n8n as offline when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const results = await service.checkAllTools();

    expect(results[0].status).toBe("offline");
  });

  it("uses HEAD method for health checks", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await service.checkAllTools();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://n8n.internal:5678",
      expect.objectContaining({
        method: "HEAD",
      }),
    );
  });

  it("aborts requests that exceed timeout", async () => {
    // Simulate a slow request that gets aborted
    mockFetch.mockImplementationOnce(
      (_url: string, options: { signal?: AbortSignal }) => {
        return new Promise((_, reject) => {
          options.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
    );

    const results = await service.checkAllTools();

    expect(results[0].status).toBe("offline");
  }, 10000);
});
