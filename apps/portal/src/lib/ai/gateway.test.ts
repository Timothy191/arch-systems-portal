jest.mock("server-only", () => ({}));

jest.mock("@/lib/env", () => ({
  getEnv: jest.fn(() => ({
    AI_DISPLAY_PROVIDER: "google",
    AI_DISPLAY_MODEL: "gemini-2.0-flash-exp",
    AI_BACKEND_STRATEGY: "ollama",
    OLLAMA_URL: "https://ollama.com",
    OLLAMA_API_KEY: "test-key",
    OLLAMA_DEFAULT_MODEL: "gemma4:latest",
    GEMINI_API_KEY: "gemini-key",
    GEMINI_FREE_MODEL: "gemini-2.0-flash-exp",
    NODE_ENV: "test",
  })),
}));

import { getAiBackendConfig, getAiDisplayConfig, toPublicAiMetadata } from "@/lib/ai/gateway";
import { isOllamaCloudUrl } from "@/lib/ai/ollama-client";

describe("ai gateway display/backend split", () => {
  it("returns display config independent of backend", () => {
    expect(getAiDisplayConfig()).toEqual({
      provider: "google",
      model: "gemini-2.0-flash-exp",
    });
  });

  it("defaults backend to ollama when strategy is ollama", () => {
    expect(getAiBackendConfig()).toEqual({
      strategy: "ollama",
      provider: "ollama",
      model: "gemma4:latest",
    });
  });

  it("masks backend in public metadata", () => {
    expect(toPublicAiMetadata()).toEqual({
      provider: "google",
      model: "gemini-2.0-flash-exp",
    });
  });
});

describe("ollama cloud detection", () => {
  it("detects ollama.com cloud host", () => {
    expect(isOllamaCloudUrl("https://ollama.com")).toBe(true);
    expect(isOllamaCloudUrl("http://localhost:11434")).toBe(false);
  });
});
