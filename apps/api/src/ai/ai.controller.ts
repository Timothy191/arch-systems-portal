import { Controller, Get, Post, Body } from "@nestjs/common";
import { AgentTriggerService } from "./agent-trigger.service";

@Controller("ai")
export class AiController {
  constructor(private readonly agentTriggerService: AgentTriggerService) {}

  @Post("trigger")
  async manualTrigger(@Body() payload: any) {
    await this.agentTriggerService.emitEvent(payload);
    return { success: true };
  }
}
