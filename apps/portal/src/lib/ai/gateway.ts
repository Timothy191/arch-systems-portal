import "server-only";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { getEnv } from "@/lib/env";
import { ollamaChat, type OllamaChatMessage } from "@/lib/ai/ollama-client";
import {
  buildCatalystProxyHeaders,
  isCatalystGatewayEnabled,
  toCatalystGatewayUrl,
} from "@/lib/ai/catalyst-gateway";
import { withAiAgentSpan } from "@/lib/ai/catalyst-tracing";
import { serverLogger } from "@repo/logger";

export type AiBackendStrategy = "ollama" | "gemini" | "router" | "omni";

export interface AiDisplayConfig {
  provider: string;
  model: string;
}

export interface AiBackendConfig {
  strategy: AiBackendStrategy;
  provider: string;
  model: string;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Client-safe metadata — never exposes the real backend provider. */
export interface AiPublicMetadata {
  provider: string;
  model: string;
}

export interface AiInvokeResult {
  text: string;
  public: AiPublicMetadata;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export function getAiDisplayConfig(): AiDisplayConfig {
  const env = getEnv();
  return {
    provider: env.AI_DISPLAY_PROVIDER,
    model: env.AI_DISPLAY_MODEL,
  };
}

export function getAiBackendConfig(): AiBackendConfig {
  const env = getEnv();

  if (env.AI_BACKEND_STRATEGY === "gemini") {
    return {
      strategy: "gemini",
      provider: "google-gemini",
      model: env.GEMINI_FREE_MODEL ?? "gemini-2.0-flash-exp",
    };
  }

  if (env.AI_BACKEND_STRATEGY === "router" || env.AI_BACKEND_STRATEGY === "omni") {
    const isOmni = env.AI_BACKEND_STRATEGY === "omni";
    return {
      strategy: isOmni ? "omni" : "router",
      provider: isOmni ? "omni-router" : "provider-router",
      model: env.AI_DISPLAY_MODEL,
    };
  }

  return {
    strategy: "ollama",
    provider: "ollama",
    model: env.OLLAMA_DEFAULT_MODEL,
  };
}

export function toPublicAiMetadata(
  display: AiDisplayConfig = getAiDisplayConfig()
): AiPublicMetadata {
  return {
    provider: display.provider,
    model: display.model,
  };
}

async function invokeGemini(
  messages: AiChatMessage[],
  model: string,
  apiKey: string
): Promise<string> {
  const prompt = messages.map((message) => `${message.role}: ${message.content}`).join("\n");

  const upstream = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
  const useGateway = isCatalystGatewayEnabled();
  const url = useGateway ? toCatalystGatewayUrl(upstream) : `${upstream}?key=${apiKey}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(useGateway
      ? buildCatalystProxyHeaders({
          provider: "gemini",
          providerApiKey: apiKey,
          providerUrl: "https://generativelanguage.googleapis.com",
        })
      : {}),
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048 },
    }),
  });

  const body = (await response.json()) as GeminiGenerateResponse;

  if (!response.ok) {
    const detail = body.error?.message ?? response.statusText;
    throw new Error(`[gemini] Request failed (${response.status}): ${detail}`);
  }

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("[gemini] Empty response from generateContent");
  }

  return text;
}

async function invokeRouter(messages: AiChatMessage[]): Promise<string> {
  const prompt = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");

  if (!prompt.trim()) {
    throw new Error("[ai-gateway] Router strategy requires at least one user message");
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  let repoRoot = process.cwd();
  for (let depth = 0; depth < 6; depth++) {
    if (existsSync(join(repoRoot, "pnpm-workspace.yaml"))) break;
    repoRoot = join(repoRoot, "..");
  }

  const { stdout } = await execFileAsync("pnpm", ["provider:route", "--execute", prompt], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  const text = stdout.trim();
  if (!text || text.includes("All providers exhausted")) {
    throw new Error("[ai-gateway] Provider router returned no usable response");
  }

  if (getEnv().NODE_ENV === "development") {
    serverLogger().warn("[ai-gateway] Routed via provider-router shell (display model masked)");
  }

  return text;
}

async function invokeOmni(messages: AiChatMessage[]): Promise<string> {
  const prompt = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n\n");

  if (!prompt.trim()) {
    throw new Error("[ai-gateway] Omni strategy requires at least one user message");
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);

  let repoRoot = process.cwd();
  for (let depth = 0; depth < 6; depth++) {
    if (existsSync(join(repoRoot, "pnpm-workspace.yaml"))) break;
    repoRoot = join(repoRoot, "..");
  }

  const { stdout } = await execFileAsync("pnpm", ["provider:route", "--omni", prompt], {
    cwd: repoRoot,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  const text = stdout.trim();
  if (!text || text.includes("All providers timed out")) {
    throw new Error("[ai-gateway] Omni router returned no usable response");
  }

  if (getEnv().NODE_ENV === "development") {
    serverLogger().warn("[ai-gateway] Routed via omni-router shell (parallel, fastest wins)");
  }

  return text;
}

/**
 * Invoke chat with backend routing while exposing only display metadata to callers.
 * Use this from API routes and server jobs — never from Client Components.
 */
export async function invokeAiChat(messages: AiChatMessage[]): Promise<AiInvokeResult> {
  return withAiAgentSpan("portal-ai-gateway", async () => {
    const env = getEnv();
    const display = getAiDisplayConfig();
    const backend = getAiBackendConfig();

    let text: string;

    switch (backend.strategy) {
      case "gemini": {
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error("[ai-gateway] GEMINI_API_KEY is required for gemini backend");
        }
        text = await invokeGemini(messages, backend.model, apiKey);
        break;
      }
      case "router":
        text = await invokeRouter(messages);
        break;
      case "omni":
        text = await invokeOmni(messages);
        break;
      case "ollama":
        text = await ollamaChat({
          baseUrl: env.OLLAMA_URL,
          apiKey: env.OLLAMA_API_KEY,
          model: backend.model,
          messages: messages as OllamaChatMessage[],
        });
        break;
      default: {
        const exhaustive: never = backend.strategy;
        throw new Error(`[ai-gateway] Unsupported backend strategy: ${exhaustive}`);
      }
    }

    return {
      text,
      public: toPublicAiMetadata(display),
    };
  });
}
