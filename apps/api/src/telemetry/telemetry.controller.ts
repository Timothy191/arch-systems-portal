import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { TelemetryService } from "./telemetry.service";
import { EccService } from "./ecc.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("telemetry")
@Controller()
export class TelemetryController {
  constructor(
    private readonly telemetryService: TelemetryService,
    private readonly eccService: EccService,
  ) {}

  @Post("telemetry/push")
  @Public()
  @ApiOperation({ summary: "Push telemetry data (webhook or direct)" })
  async pushTelemetry(@Body() rawBody: any) {
    // 0. ECC Data Integrity Verification
    const { isValid, correctedPayload } =
      this.eccService.validateAndCorrectPayload(rawBody);
    if (!isValid) {
      throw new BadRequestException("Data payload failed ECC integrity checks");
    }
    const body = correctedPayload;
    // 1. Check if this is a Supabase Database Webhook payload
    const webhookResult =
      await this.telemetryService.processWebhookPayload(body);
    if (webhookResult) return webhookResult;

    // 2. Direct single tag value update
    if (!body.name || body.value === undefined || body.value === null) {
      throw new BadRequestException("Missing required fields: name, value");
    }

    return this.telemetryService.processDirectTelemetry(body);
  }

  @Post("plugins/rust-telemetry")
  @ApiOperation({
    summary: "Compute telemetry via Rust native plugin or JS fallback",
  })
  async rustTelemetry(
    @Body() body: { hours?: number; temp?: number; rpm?: number },
  ) {
    return this.telemetryService.computeRustTelemetry(
      body.hours ?? 150.0,
      body.temp ?? 55.0,
      body.rpm ?? 1000.0,
    );
  }
}
