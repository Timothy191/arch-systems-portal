import { Module } from "@nestjs/common";
import { AiBridgeService } from "./ai-bridge.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  providers: [AiBridgeService],
  exports: [AiBridgeService],
})
export class AiBridgeModule {}
