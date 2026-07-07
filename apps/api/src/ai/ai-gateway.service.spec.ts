import { AiGatewayService } from "./ai-gateway.service";
import { AiFeaturesService } from "./ai-features.service";
import { AiInvocationTelemetry } from "./ai-invocation.telemetry";

describe("AiGatewayService", () => {
  let features: AiFeaturesService;
  let telemetry: AiInvocationTelemetry;
  let gateway: AiGatewayService;

  beforeEach(() => {
    process.env = {};
    features = new AiFeaturesService({ get: (key: string) => process.env[key] } as any);
    telemetry = new AiInvocationTelemetry();
    gateway = new AiGatewayService(features, telemetry);
  });

  it("should return disabled when gateway is off", async () => {
    process.env.AI_GATEWAY_ENABLED = "false";

    const result = await gateway.invoke(
      async () => {
        throw new Error("should not call");
      },
      { task: "test", context: {} },
    );

    expect(result.status).toBe("disabled");
    expect(result.result.status).toBe("fallback");
    expect(telemetry.getRecent(1)[0]!.status).toBe("disabled");
  });

  it("should succeed and record telemetry", async () => {
    const output = { ok: true };

    const result = await gateway.invoke(
      async () => output,
      { task: "test", context: { foo: "bar" } },
    );

    expect(result.status).toBe("success");
    expect(result.result).toBe(output);
    expect(telemetry.getRecent(1)[0]!.status).toBe("success");
    expect(result.telemetry.task).toBe("test");
  });

  it("should retry then fail with fallback", async () => {
    process.env.AI_RETRY_ENABLED = "true";
    process.env.AI_RETRY_ATTEMPTS = "2";

    const result = await gateway.invoke(
      async () => {
        throw new Error("boom");
      },
      { task: "test" },
    );

    expect(result.status).toBe("fallback");
    expect(result.result.error).toBe("boom");
    expect(telemetry.getRecent(1)[0]!.status).toBe("failure");
  });

  it("should open circuit after repeated failures", async () => {
    process.env.AI_CIRCUIT_BREAKER_ENABLED = "true";
    process.env.AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD = "2";
    process.env.AI_CIRCUIT_BREAKER_RECOVERY_MS = "1000";

    await gateway.invoke(
      async () => {
        throw new Error("e1");
      },
      { task: "circuit-test" },
    );

    await gateway.invoke(
      async () => {
        throw new Error("e2");
      },
      { task: "circuit-test" },
    );

    const later = await gateway.invoke(
      async () => {
        throw new Error("e3");
      },
      { task: "circuit-test" },
    );

    expect(later.status).toBe("circuit_open");
    expect(telemetry.getRecent(1)[0]!.status).toBe("circuit_open");
  });
});
