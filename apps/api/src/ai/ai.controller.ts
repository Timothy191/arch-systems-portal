import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  aiHandoffSchema,
  aiPredictSchema,
  aiSafetySchema,
} from "../common/schemas";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AiService } from "./ai.service";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("handoff")
  @ApiOperation({ summary: "Generate a shift handoff report" })
  async handoff(@Body(new ZodValidationPipe(aiHandoffSchema)) { shiftData }: { shiftData: string }) {
    return this.aiService.generateHandoff(shiftData);
  }

  @Post("predict")
  @ApiOperation({ summary: "Generate predictive maintenance risk assessment" })
  async predict(@Body(new ZodValidationPipe(aiPredictSchema)) { machineData }: { machineData: string }) {
    return this.aiService.predictMaintenance(machineData);
  }

  @Post("safety")
  @ApiOperation({ summary: "Analyze shift logs for safety compliance" })
  async safety(@Body(new ZodValidationPipe(aiSafetySchema)) { logData }: { logData: string }) {
    return this.aiService.analyzeSafety(logData);
  }
}
