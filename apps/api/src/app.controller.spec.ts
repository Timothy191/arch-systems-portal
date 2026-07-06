import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health/health.controller";
import { HealthCheckService } from "@nestjs/terminus";
import { SupabaseHealthIndicator } from "./health/indicators/supabase.health";
import { RedisHealthIndicator } from "./health/indicators/redis.health";

describe("HealthController", () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn().mockResolvedValue({ status: "ok" }),
  };
  const mockSupabaseHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ supabase: { status: "up" } }),
  };
  const mockRedisHealthIndicator = {
    isHealthy: jest.fn().mockResolvedValue({ redis: { status: "up" } }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        {
          provide: SupabaseHealthIndicator,
          useValue: mockSupabaseHealthIndicator,
        },
        { provide: RedisHealthIndicator, useValue: mockRedisHealthIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return health status", async () => {
    const result = await controller.check();
    expect(result).toHaveProperty("status");
  });
});
