import { Module, OnModuleInit, Logger } from "@nestjs/common";

/**
 * OpenTelemetry SDK setup for NestJS.
 * Initializes tracing when OTEL_ENDPOINT is configured.
 * Uses dynamic imports to avoid hard dependency when OTEL packages aren't installed.
 */
@Module({})
export class ObservabilitySdkModule implements OnModuleInit {
  private readonly logger = new Logger(ObservabilitySdkModule.name);

  async onModuleInit() {
    const endpoint = process.env.OTEL_ENDPOINT;
    if (!endpoint) {
      this.logger.log("OTEL_ENDPOINT not configured — OpenTelemetry disabled");
      return;
    }

    try {
      const { NodeSDK } = await import("@opentelemetry/sdk-node");
      const { OTLPTraceExporter } = await import(
        "@opentelemetry/exporter-trace-otlp-http"
      );

      let resource: any;
      try {
        const resourcesMod = await import("@opentelemetry/resources");
        if (
          typeof (resourcesMod as any).resourceFromAttributes === "function"
        ) {
          resource = (resourcesMod as any).resourceFromAttributes({
            "service.name": "arch-api",
            "service.version": process.env.npm_package_version ?? "1.0.0",
          });
        } else {
          // Fallback: pass attributes directly
          resource = { attributes: { "service.name": "arch-api" } };
        }
      } catch {
        resource = undefined;
      }

      const sdk = new NodeSDK({
        ...(resource ? { resource } : {}),
        traceExporter: new OTLPTraceExporter({ url: endpoint }),
      });

      sdk.start();
      this.logger.log("OpenTelemetry SDK initialized");

      process.on("SIGTERM", () => {
        sdk.shutdown().catch(() => {});
      });
    } catch {
      this.logger.warn(
        "@opentelemetry packages not installed — tracing disabled",
      );
    }
  }
}
