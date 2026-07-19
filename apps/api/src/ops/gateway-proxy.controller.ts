import { Controller, All, Req, Res, UseGuards, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { FastifyRequest, FastifyReply } from "fastify";
import { OpsInternalGuard } from "./guards/ops-internal.guard";

@Controller("ops/gateway")
@UseGuards(OpsInternalGuard)
export class GatewayProxyController {
  private readonly logger = new Logger(GatewayProxyController.name);
  private readonly opsGatewayUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.opsGatewayUrl =
      this.configService.get<string>("OPS_GATEWAY_URL") ?? "http://ops-gateway:3100";
  }

  @All("*")
  async proxy(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const targetUrl = `${this.opsGatewayUrl}${req.url.replace("/api/ops/gateway", "")}`;
    const secret = this.configService.get<string>("OPS_INTERNAL_SECRET");

    this.logger.log(`Proxying ${req.method} ${req.url} to ${targetUrl}`);

    try {
      // Build headers for the proxy request, properly filtering Fastify-specific properties
      const outgoingHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers ?? {})) {
        // Skip Hop-by-hop headers and internal headers
        if (
          value &&
          typeof value === "string" &&
          ![
            "host",
            "connection",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailers",
            "transfer-encoding",
            "upgrade",
          ].includes(key)
        ) {
          outgoingHeaders[key] = value;
        }
      }

      const response = await fetch(targetUrl, {
        method: req.method,
        headers: {
          ...outgoingHeaders,
          "x-ops-secret": secret ?? "",
          host: "ops-gateway:3100",
        },
        body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
      });

      res.status(response.status).send(await response.json());
    } catch (error) {
      this.logger.error(`Proxy failed: ${error}`);
      res.status(500).send({ error: "Proxy failed" });
    }
  }
}
