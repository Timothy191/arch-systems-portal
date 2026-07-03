import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ToolsService } from "./tools.service";

@ApiTags("tools")
@Controller("tools")
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get("status")
  @ApiOperation({ summary: "Check external tools health status" })
  async getStatus() {
    const tools = await this.toolsService.checkAllTools();
    return { tools };
  }
}
