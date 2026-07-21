import "server-only";

import {
  buildCatalystProxyHeaders,
  isCatalystGatewayEnabled,
  toCatalystGatewayUrl,
} from "@/lib/ai/catalyst-gateway";

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaChatOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  messages: OllamaChatMessage[];
  signal?: AbortSignal;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
  error?: string;
}

function normalizeOllamaBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

export function isOllamaCloudUrl(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname;
    return host === "ollama.com" || host.endsWith(".ollama.com");
  } catch {
    return false;
  }
}

export async function ollamaChat(options: OllamaChatOptions): Promise<string> {
  const { baseUrl, apiKey, model, messages, signal } = options;

  if (isOllamaCloudUrl(baseUrl) && !apiKey) {
    throw new Error("[ollama] OLLAMA_API_KEY is required when OLLAMA_URL points to ollama.com");
  }

  const upstream = `${normalizeOllamaBaseUrl(baseUrl)}/api/chat`;
  const useGateway = isOllamaCloudUrl(baseUrl) && isCatalystGatewayEnabled();
  const url = useGateway ? toCatalystGatewayUrl(upstream) : upstream;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (useGateway) {
    Object.assign(
      headers,
      buildCatalystProxyHeaders({
        provider: "openai",
        providerApiKey: apiKey,
        providerUrl: normalizeOllamaBaseUrl(baseUrl),
      })
    );
  } else if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal,
  });

  const body = (await response.json()) as OllamaChatResponse;

  if (!response.ok) {
    const detail = body.error ?? response.statusText;
    throw new Error(`[ollama] Request failed (${response.status}): ${detail}`);
  }

  const text = body.message?.content?.trim();
  if (!text) {
    throw new Error("[ollama] Empty response from chat API");
  }

  return text;
}
