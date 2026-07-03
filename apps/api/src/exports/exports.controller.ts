import { Controller, Get, Query, Req, Res, Header, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ExportsService } from "./exports.service";
import { exportQuerySchema, safetyExportQuerySchema } from "../common/schemas";
import type { FastifyRequest, FastifyReply } from "fastify";

@ApiTags("export")
@Controller("export")
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get("fuel-logs")
  @ApiOperation({ summary: "Export fuel logs as CSV or JSON" })
  async exportFuelLogs(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("dept") dept?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Req() req?: FastifyRequest,
    @Res() res?: FastifyReply,
  ) {
    const parsed = exportQuerySchema.safeParse({ from, to, dept, limit, offset });
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const result = await this.exportsService.exportFuelLogs(parsed.data);
    const isCsv = req?.headers.accept?.includes("text/csv");

    if (isCsv) {
      const headers = ["id", "log_date", "shift", "department_id", "machine_id", "machine_name", "machine_type", "diesel_litres"];
      const csv = this.exportsService.toCsv(headers, result.rows);
      res?.header("Content-Type", "text/csv");
      res?.header("Content-Disposition", `attachment; filename="fuel-logs-${result.fromDate}-${result.toDate}.csv"`);
      return res?.send(csv);
    }

    return result;
  }

  @Get("machines")
  @ApiOperation({ summary: "Export machines as CSV or JSON" })
  async exportMachines(
    @Query("dept") dept?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Req() req?: FastifyRequest,
    @Res() res?: FastifyReply,
  ) {
    const parsed = exportQuerySchema.safeParse({ dept, limit, offset });
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const result = await this.exportsService.exportMachines(parsed.data);
    const isCsv = req?.headers.accept?.includes("text/csv");

    if (isCsv) {
      const keys = ["id", "name", "machine_type", "serial_number", "bin_factor", "active", "department_id", "site_id", "created_at"];
      const csv = this.exportsService.toCsv(keys, result.data);
      res?.header("Content-Type", "text/csv");
      res?.header("Content-Disposition", 'attachment; filename="machines.csv"');
      return res?.send(csv);
    }

    return result;
  }

  @Get("production")
  @ApiOperation({ summary: "Export production logs as CSV or JSON" })
  async exportProduction(
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("dept") dept?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Req() req?: FastifyRequest,
    @Res() res?: FastifyReply,
  ) {
    const parsed = exportQuerySchema.safeParse({ from, to, dept, limit, offset });
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const result = await this.exportsService.exportProduction(parsed.data);
    const isCsv = req?.headers.accept?.includes("text/csv");

    if (isCsv) {
      const headers = ["log_date", "shift", "department_id", "coal_tonnes", "waste_tonnes", "total_tonnes"];
      const csv = this.exportsService.toCsv(headers, result.rows);
      res?.header("Content-Type", "text/csv");
      res?.header("Content-Disposition", `attachment; filename="production-${result.fromDate}-${result.toDate}.csv"`);
      return res?.send(csv);
    }

    return result;
  }

  @Get("safety-incidents")
  @ApiOperation({ summary: "Export safety incidents as CSV or JSON" })
  async exportSafetyIncidents(
    @Query("month") month?: string,
    @Query("dept") dept?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Req() req?: FastifyRequest,
    @Res() res?: FastifyReply,
  ) {
    const parsed = safetyExportQuerySchema.safeParse({ month, dept, limit, offset });
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());

    const result = await this.exportsService.exportSafetyIncidents(parsed.data);
    const isCsv = req?.headers.accept?.includes("text/csv");

    if (isCsv) {
      const keys = ["id", "incident_date", "incident_type", "severity", "status", "department_id", "description"];
      const csv = this.exportsService.toCsv(keys, result.data);
      res?.header("Content-Type", "text/csv");
      res?.header("Content-Disposition", `attachment; filename="safety-incidents-${result.from}-${result.to}.csv"`);
      return res?.send(csv);
    }

    return result;
  }
}
