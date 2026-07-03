import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";

interface CspReport {
  "document-uri": string;
  referrer: string;
  "blocked-uri": string;
  "violated-directive": string;
  "effective-directive": string;
  "original-policy": string;
  disposition: string;
  "script-sample"?: string;
  "status-code": number;
  "source-file"?: string;
  "line-number"?: number;
  "column-number"?: number;
}

@ApiTags("security")
@Controller("csp-violations")
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  @Post()
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Receive CSP violation reports" })
  report(@Body() raw: Record<string, any>) {
    try {
      const report: CspReport | null = raw["csp-report"] ?? raw.cspReport ?? null;
      if (!report) return;

      const { "violated-directive": directive, "blocked-uri": blocked, "document-uri": doc } = report;
      this.logger.warn(`CSP violation: ${directive}`, {
        directive,
        blockedUri: blocked,
        documentUri: doc,
        disposition: report.disposition,
      });
    } catch {
      // CSP spec: always return 204, even on malformed reports
    }
  }
}
