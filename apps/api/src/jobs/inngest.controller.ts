import { All, Controller, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { serve } from "inngest/fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { InngestService } from "./inngest.service";
import { Public } from "../auth/decorators/public.decorator";

@ApiTags("jobs")
@Controller("inngest")
export class InngestController {
  private readonly handler: ReturnType<typeof serve>;

  constructor(private readonly inngestService: InngestService) {
    this.handler = serve({
      client: this.inngestService.getClient(),
      functions: this.inngestService.getFunctions(),
    });
  }

  @All("*path")
  @Public()
  async handle(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    await this.handler(request as any, reply as any);
  }
}
