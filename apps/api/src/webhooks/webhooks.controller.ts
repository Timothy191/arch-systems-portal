import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { WebhooksService } from "./webhooks.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@ApiTags("webhooks")
@Controller("webhooks")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: "List all webhook endpoints" })
  async listWebhooks(@CurrentUser("id") userId: string) {
    const employee = await this.webhooksService.getEmployee(userId);
    return this.webhooksService.listWebhooks(employee);
  }

  @Post()
  @ApiOperation({ summary: "Create a new webhook endpoint" })
  async createWebhook(@Body() body: any, @CurrentUser("id") userId: string) {
    const employee = await this.webhooksService.getEmployee(userId);
    return this.webhooksService.createWebhook(employee, body);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a webhook endpoint" })
  async updateWebhook(
    @Param("id") id: string,
    @Body() body: any,
    @CurrentUser("id") userId: string,
  ) {
    const employee = await this.webhooksService.getEmployee(userId);
    return this.webhooksService.updateWebhook(id, employee, body);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a webhook endpoint (soft delete)" })
  async deleteWebhook(
    @Param("id") id: string,
    @CurrentUser("id") userId: string,
  ) {
    const employee = await this.webhooksService.getEmployee(userId);
    return this.webhooksService.deleteWebhook(id, employee);
  }

  @Get(":id/logs")
  @ApiOperation({ summary: "Get delivery logs for a webhook" })
  async getLogs(@Param("id") id: string, @CurrentUser("id") userId: string) {
    const employee = await this.webhooksService.getEmployee(userId);
    return this.webhooksService.getLogs(id, employee);
  }
}
