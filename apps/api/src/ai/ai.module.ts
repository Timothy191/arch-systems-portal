import { Module } from "@nestjs/common";
import { AgentTriggerService } from "./agent-trigger.service";
import { AiController } from "./ai.controller";
import { AiFeaturesService } from "./ai-features.service";
import { AiGatewayService } from "./ai-gateway.service";
import { AiInvocationTelemetry } from "./ai-invocation.telemetry";

@Module({
  controllers: [AiController],
  providers: [AgentTriggerService, AiFeaturesService, AiGatewayService, AiInvocationTelemetry],
  exports: [AgentTriggerService, AiFeaturesService, AiGatewayService, AiInvocationTelemetry],
})
export class AiModule {}
