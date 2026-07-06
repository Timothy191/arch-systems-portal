import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("admin")
@Controller("admin/data/:table")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: "Get paginated data from an operational table" })
  async getData(
    @Param("table") table: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("order_by") orderBy?: string,
    @Query("order_dir") orderDir?: string,
    @CurrentUser("id") userId?: string,
  ) {
    const validatedTable = this.adminService.validateTable(table);
    await this.adminService.assertAdmin(userId!);

    return this.adminService.getData(
      validatedTable,
      Math.min(parseInt(limit ?? "50") || 50, 200),
      parseInt(offset ?? "0") || 0,
      orderBy ?? "created_at",
      orderDir === "asc" ? "asc" : "desc",
    );
  }

  @Put()
  @ApiOperation({ summary: "Update a record in an operational table" })
  async updateData(
    @Param("table") table: string,
    @Body() body: { id: string; data: Record<string, unknown> },
    @CurrentUser("id") userId?: string,
  ) {
    const validatedTable = this.adminService.validateTable(table);
    const employee = await this.adminService.assertAdmin(userId!);
    return this.adminService.updateData(validatedTable, body, employee.id);
  }

  @Delete()
  @ApiOperation({ summary: "Delete a record from an operational table" })
  @ApiQuery({ name: "id", required: true, description: "Record ID to delete" })
  async deleteData(
    @Param("table") table: string,
    @Query("id") id: string,
    @CurrentUser("id") userId?: string,
  ) {
    const validatedTable = this.adminService.validateTable(table);
    const employee = await this.adminService.assertAdmin(userId!);
    return this.adminService.deleteData(validatedTable, id, employee.id);
  }
}
