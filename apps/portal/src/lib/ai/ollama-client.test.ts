jest.mock("server-only", () => ({}));

import { isOllamaCloudUrl } from "@/lib/ai/ollama-client";

describe("isOllamaCloudUrl", () => {
  it("returns true for ollama.com", () => {
    expect(isOllamaCloudUrl("https://ollama.com")).toBe(true);
    expect(isOllamaCloudUrl("https://ollama.com/")).toBe(true);
  });

  it("returns false for local dev", () => {
    expect(isOllamaCloudUrl("http://localhost:11434")).toBe(false);
    expect(isOllamaCloudUrl("http://127.0.0.1:11434")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isOllamaCloudUrl("not-a-url")).toBe(false);
  });
});
