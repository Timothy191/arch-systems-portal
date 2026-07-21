import { registerOTel } from "@vercel/otel";

export async function register() {
  registerOTel({
    serviceName: process.env.CATALYST_SERVICE_NAME ?? process.env.OTEL_SERVICE_NAME ?? "portal-ui",
  });

  // Catalyst tracing — only when token is present (does not throw if package missing at build)
  if (process.env.CATALYST_OTLP_TOKEN) {
    try {
      const { setup } = await import("@inference/tracing");
      await setup({
        autoInstrument: true,
      });
    } catch (error) {
      console.warn(
        "[catalyst] tracing setup skipped:",
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }
}
