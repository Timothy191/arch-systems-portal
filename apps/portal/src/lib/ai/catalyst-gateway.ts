import "server-only";

import { getEnv } from "@/lib/env";

export const CATALYST_GATEWAY_BASE = "https://api.inference.net";

export interface CatalystProxyHeadersInput {
  providerApiKey?: string;
  provider: string;
  providerUrl?: string;
  taskId?: string;
  environment?: string;
}

/** True when gateway proxying is configured and enabled. */
export function isCatalystGatewayEnabled(): boolean {
  const env = getEnv();
  return env.INFERENCE_GATEWAY_ENABLED === true && Boolean(env.INFERENCE_API_KEY);
}

/**
 * Build Authorization + routing headers for Catalyst Gateway.
 * Never logs the Inference or provider API keys.
 */
export function buildCatalystProxyHeaders(
  input: CatalystProxyHeadersInput
): Record<string, string> {
  const env = getEnv();
  const inferenceKey = env.INFERENCE_API_KEY;
  if (!inferenceKey) {
    throw new Error("[catalyst] INFERENCE_API_KEY is required when gateway is enabled");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${inferenceKey}`,
    "x-inference-provider": input.provider,
    "x-inference-task-id": input.taskId ?? env.INFERENCE_TASK_ID,
    "x-inference-environment": input.environment ?? env.INFERENCE_ENVIRONMENT,
  };

  if (input.providerApiKey) {
    headers["x-inference-provider-api-key"] = input.providerApiKey;
  }

  if (input.providerUrl) {
    headers["x-inference-provider-url"] = input.providerUrl;
  }

  return headers;
}

/** Rewrite an absolute upstream URL onto the Catalyst gateway origin (path preserved). */
export function toCatalystGatewayUrl(upstreamUrl: string): string {
  const parsed = new URL(upstreamUrl);
  return `${CATALYST_GATEWAY_BASE}${parsed.pathname}${parsed.search}`;
}
