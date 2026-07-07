import { Test, TestingModule } from "@nestjs/testing";
import { AgentTriggerService } from "./agent-trigger.service";

// Mock ioredis named export { Redis }
jest.mock("ioredis", () => {
  const mockXadd = jest.fn();
  (globalThis as any).__mockRedisXadd = mockXadd;

  class MockRedis {
    xadd = mockXadd;
  }

  return { Redis: MockRedis };
});

describe("AgentTriggerService", () => {
  let service: AgentTriggerService;

  beforeEach(async () => {
    (globalThis as any).__mockRedisXadd?.mockReset?.();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentTriggerService],
    }).compile();

    service = module.get<AgentTriggerService>(AgentTriggerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should emit event to Redis stream", async () => {
    const mockXadd = (globalThis as any).__mockRedisXadd;
    mockXadd.mockResolvedValue("ok");
    const payload = { type: "test", data: { value: 42 } };

    await service.emitEvent(payload);

    expect(mockXadd).toHaveBeenCalledWith(
      "ai:triggers:stream",
      "*",
      "payload",
      JSON.stringify(payload),
    );
  });

  it("should handle Redis errors gracefully without throwing", async () => {
    const mockXadd = (globalThis as any).__mockRedisXadd;
    mockXadd.mockRejectedValue(new Error("Redis connection refused"));
    const payload = { type: "test" };

    await expect(service.emitEvent(payload)).resolves.toBeUndefined();
    expect(mockXadd).toHaveBeenCalledTimes(1);
  });

  it("should handle non-Error rejections", async () => {
    const mockXadd = (globalThis as any).__mockRedisXadd;
    mockXadd.mockRejectedValue("string error");
    const payload = { type: "test" };

    await expect(service.emitEvent(payload)).resolves.toBeUndefined();
  });
});
