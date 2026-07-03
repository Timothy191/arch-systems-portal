import { BadRequestException, Body, Controller, Post, Req, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { aiChatSchema, aiHandoffSchema, aiPredictSchema, aiSafetySchema } from "../common/schemas";
import { AiService } from "./ai.service";

@ApiTags("ai")
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("chat")
  @ApiOperation({ summary: "Run AI assistant chat with streaming response" })
  async chat(
    @Body() body: unknown,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @CurrentUser("id") _userId: string,
  ) {
    const parsed = aiChatSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({ error: "Invalid request", details: parsed.error.issues });
    }

    const sessionId = parsed.data.sessionId ?? this.aiService.generateSessionId();
    const stream = this.aiService.streamChat({ ...parsed.data, sessionId });

    reply.raw.statusCode = 200;
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("x-arch-session-id", sessionId);

    try {
      for await (const chunk of stream) {
        reply.raw.write(`0: ${chunk}\n`);
      }
      reply.raw.end();
    } catch (error) {
      if (!reply.raw.headersSent) {
        reply.raw.statusCode = 500;
      }
      reply.raw.write(`3: ${JSON.stringify({ error: "Failed to generate response" })}\n`);
      reply.raw.end();
    }
  }

  @Post("handoff")
  @ApiOperation({ summary: "Generate a shift handoff report" })
  async handoff(@Body() body: unknown) {
    const parsed = aiHandoffSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.aiService.generateHandoff(parsed.data.shiftData);
  }

  @Post("predict")
  @ApiOperation({ summary: "Generate predictive maintenance risk assessment" })
  async predict(@Body() body: unknown) {
    const parsed = aiPredictSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.aiService.predictMaintenance(parsed.data.machineData);
  }

  @Post("safety")
  @ApiOperation({ summary: "Analyze shift logs for safety compliance" })
  async safety(@Body() body: unknown) {
    const parsed = aiSafetySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.aiService.analyzeSafety(parsed.data.logData);
  }
}
