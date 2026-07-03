import { Test, TestingModule } from "@nestjs/testing";
import { TelemetryService } from "./telemetry.service";
import { ConfigService } from "@nestjs/config";

describe("TelemetryService", () => {
  let service: TelemetryService;

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    isOpen: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        { provide: "REDIS_CLIENT", useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                NEXT_PUBLIC_FUXA_URL: "http://localhost:1881",
                FUXA_API_KEY: "test-key",
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should process webhook payloads for machine_telemetry", async () => {
    const result = await service.processWebhookPayload({
      table: "machine_telemetry",
      record: {
        machine_id: "m1",
        department_id: "d1",
        engine_rpm: 1000,
      },
    });
    expect(result).toBeDefined();
    expect(result?.webhook).toBe(true);
  });

  it("should return null for non-webhook payloads", async () => {
    const result = await service.processWebhookPayload({ foo: "bar" });
    expect(result).toBeNull();
  });
});
