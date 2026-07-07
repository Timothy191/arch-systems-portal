import { Test } from "@nestjs/testing";
import { AiBridgeService } from "./ai-bridge.service";

describe("AiBridgeService", () => {
  let originalFetch: typeof global.fetch;
  let originalAiGatewayUrl: string | undefined;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalAiGatewayUrl = process.env.AI_GATEWAY_URL;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.AI_GATEWAY_URL = originalAiGatewayUrl;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", async () => {
    const module = await Test.createTestingModule({
      providers: [AiBridgeService],
    }).compile();
    expect(module.get<AiBridgeService>(AiBridgeService)).toBeDefined();
    await module.close();
  });

  it("should invoke AI Gateway and return response", async () => {
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: "success",
        result: "Analysis complete",
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(mockResponse);

    const module = await Test.createTestingModule({
      providers: [AiBridgeService],
    }).compile();
    const service = module.get<AiBridgeService>(AiBridgeService);

    const result = await service.invokeAgent("analyze_data", {
      department: "ops",
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ai/invoke"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "analyze_data",
          context: { department: "ops" },
        }),
      }),
    );
    expect(result).toEqual({ status: "success", result: "Analysis complete" });
    await module.close();
  });

  it("should use default AI_GATEWAY_URL when env var not set", async () => {
    delete process.env.AI_GATEWAY_URL;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ status: "success", result: "ok" }),
    });

    const module = await Test.createTestingModule({
      providers: [AiBridgeService],
    }).compile();
    const service = module.get<AiBridgeService>(AiBridgeService);

    await service.invokeAgent("test");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://ai-gateway:3000/api/ai/invoke",
      expect.any(Object),
    );
    await module.close();
  });

  it("should use custom AI_GATEWAY_URL when env var is set", async () => {
    process.env.AI_GATEWAY_URL = "http://custom-gateway:8080";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ status: "success", result: "ok" }),
    });

    const module = await Test.createTestingModule({
      providers: [AiBridgeService],
    }).compile();
    const service = module.get<AiBridgeService>(AiBridgeService);

    await service.invokeAgent("test");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://custom-gateway:8080/api/ai/invoke",
      expect.any(Object),
    );
    await module.close();
  });

  it("should throw when AI Gateway returns non-ok status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const module = await Test.createTestingModule({
      providers: [AiBridgeService],
    }).compile();
    const service = module.get<AiBridgeService>(AiBridgeService);

    const result = await service.invokeAgent("test");

    expect(result).toEqual({
      status: "fallback",
      result: expect.stringContaining("unreachable"),
    });
    await module.close();
  });

  it("should return fallback response when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Connection refused"));

    const module = await Test.createTestingModule({
      providers: [AiBridgeService],
    }).compile();
    const service = module.get<AiBridgeService>(AiBridgeService);

    const result = await service.invokeAgent("test");

    expect(result).toEqual({
      status: "fallback",
      result: expect.stringContaining("unreachable"),
    });
    await module.close();
  });

  it("should invoke agent with default empty context", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ status: "success", result: "ok" }),
    });

    const module = await Test.createTestingModule({
      providers: [AiBridgeService],
    }).compile();
    const service = module.get<AiBridgeService>(AiBridgeService);

    await service.invokeAgent("simple_task");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          task: "simple_task",
          context: {},
        }),
      }),
    );
    await module.close();
  });
});
