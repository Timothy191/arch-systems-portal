import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AiFeaturesService } from "./ai-features.service";

function createModule(envOverrides: Record<string, any> = {}) {
  Object.assign(process.env, envOverrides);
  return Test.createTestingModule({
    providers: [ConfigService, AiFeaturesService],
  }).compile();
}

describe("AiFeaturesService", () => {
  it("should return default flags", async () => {
    const module = await createModule();
    const service = module.get<AiFeaturesService>(AiFeaturesService);

    const config = service.getConfig();
    expect(config.flags.ai_gateway_enabled).toBe(true);
    expect(config.retryAttempts).toBe(2);
    expect(config.requestTimeoutMs).toBe(10_000);
  });

  it("should read env overrides", async () => {
    const module = await createModule({
      AI_RETRY_ATTEMPTS: "4",
      AI_FALLBACK_ENABLED: "false",
    });
    const service = module.get<AiFeaturesService>(AiFeaturesService);

    const config = service.getConfig();
    expect(config.retryAttempts).toBe(4);
    expect(config.flags.ai_fallback_enabled).toBe(false);
  });

  it("should ignore invalid boolean strings", async () => {
    const module = await createModule({
      AI_CIRCUIT_BREAKER_ENABLED: "definitely-true",
    });
    const service = module.get<AiFeaturesService>(AiFeaturesService);

    expect(service.isEnabled("ai_circuit_breaker_enabled")).toBe(false);
  });

  it("should warn on runtime setFlag without persistence", async () => {
    const module = await createModule();
    const service = module.get<AiFeaturesService>(AiFeaturesService);
    const warnSpy = jest.spyOn(service["logger"], "warn").mockImplementation(() => {});

    service.setFlag("ai_gateway_enabled", false);

    expect(warnSpy).toHaveBeenCalled();
  });
});
