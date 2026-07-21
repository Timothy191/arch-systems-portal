jest.mock("server-only", () => ({}));

const getEnv = jest.fn();

jest.mock("@/lib/env", () => ({
  getEnv: () => getEnv(),
}));

import {
  buildCatalystProxyHeaders,
  isCatalystGatewayEnabled,
  toCatalystGatewayUrl,
} from "@/lib/ai/catalyst-gateway";

describe("catalyst-gateway", () => {
  beforeEach(() => {
    getEnv.mockReset();
  });

  it("is disabled without flag or key", () => {
    getEnv.mockReturnValue({
      INFERENCE_GATEWAY_ENABLED: false,
      INFERENCE_API_KEY: undefined,
      INFERENCE_TASK_ID: "arch-portal",
      INFERENCE_ENVIRONMENT: "development",
    });
    expect(isCatalystGatewayEnabled()).toBe(false);
  });

  it("is enabled when flag and key are set", () => {
    getEnv.mockReturnValue({
      INFERENCE_GATEWAY_ENABLED: true,
      INFERENCE_API_KEY: "sk-inference-test",
      INFERENCE_TASK_ID: "arch-portal",
      INFERENCE_ENVIRONMENT: "development",
    });
    expect(isCatalystGatewayEnabled()).toBe(true);
  });

  it("builds proxy headers with task id", () => {
    getEnv.mockReturnValue({
      INFERENCE_GATEWAY_ENABLED: true,
      INFERENCE_API_KEY: "sk-inference-test",
      INFERENCE_TASK_ID: "arch-portal",
      INFERENCE_ENVIRONMENT: "development",
    });
    const headers = buildCatalystProxyHeaders({
      provider: "gemini",
      providerApiKey: "gemini-key",
    });
    expect(headers.Authorization).toBe("Bearer sk-inference-test");
    expect(headers["x-inference-provider"]).toBe("gemini");
    expect(headers["x-inference-provider-api-key"]).toBe("gemini-key");
    expect(headers["x-inference-task-id"]).toBe("arch-portal");
  });

  it("rewrites upstream URL onto gateway origin", () => {
    expect(
      toCatalystGatewayUrl(
        "https://generativelanguage.googleapis.com/v1/models/gemini:generateContent?key=x"
      )
    ).toBe("https://api.inference.net/v1/models/gemini:generateContent?key=x");
  });
});
