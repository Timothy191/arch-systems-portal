import { registerOTel } from "@vercel/otel";

export async function register() {
  registerOTel({
    serviceName: process.env.CATALYST_SERVICE_NAME ?? process.env.OTEL_SERVICE_NAME ?? "portal-ui",
  });

  // Catalyst tracing — only in Node.js runtime when token is present (optional dependency)
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.CATALYST_OTLP_TOKEN) {
    try {
      // Dynamic path prevents Turbopack/Webpack from statically resolving (and warning about) the optional dep
      const tracingModule = ["@inference/tracing"].join("");
      const { setup } = await import(/* webpackIgnore: true */ tracingModule);
      await setup({
        autoInstrument: true,
      });
    } catch (_error) {
      // Module not installed or failed to load — silently skip (expected in local dev)
    }
  }
}
