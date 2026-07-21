import "server-only";

/**
 * Optional Catalyst agent span wrapper.
 * No-ops when tracing is not initialized (missing CATALYST_OTLP_TOKEN).
 */
export async function withAiAgentSpan<T>(agentId: string, fn: () => Promise<T>): Promise<T> {
  try {
    const tracing = await import("@inference/tracing");
    if (typeof tracing.agentSpan !== "function") {
      return fn();
    }
    return tracing.agentSpan({ agentId, agentName: "Portal AI Gateway" }, async () => fn());
  } catch {
    return fn();
  }
}
