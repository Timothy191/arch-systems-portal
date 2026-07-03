import { Controller, Post, Body, Headers } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { AccessControlService } from "./access-control.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("access-control")
@Controller("c66")
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: "C66 hardware badge scanner access control" })
  @ApiHeader({ name: "x-scanner-source", required: false })
  @ApiHeader({ name: "x-scanner-token", required: true })
  async post(
    @Body() body: any,
    @Headers("x-scanner-source") source: string | null,
    @Headers("x-scanner-token") token: string | null,
  ) {
    this.accessControlService.validateScannerAuth(source, token);
    return this.accessControlService.processBadgeScan(body, source ?? "unknown");
  }
}
