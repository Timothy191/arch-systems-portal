import { Module } from "@nestjs/common";
import { AgentTriggerService } from "./agent-trigger.service";
import { AiController } from "./ai.controller";

@Module({
  controllers: [AiController],
  providers: [AgentTriggerService],
  exports: [AgentTriggerService],
})
export class AiModule {}
