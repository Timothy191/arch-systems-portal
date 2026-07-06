import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { InngestService } from "./inngest.service";

@ApiTags("jobs")
@Controller("jobs")
export class JobsQueueController {
  constructor(private readonly inngestService: InngestService) {}

  @Post("embeddings")
  @ApiOperation({
    summary: "Queue embedding generation for authenticated user text",
  })
  async queueEmbedding(
    @Body() body: { text?: string; texts?: string[] },
    @CurrentUser("id") userId: string,
  ) {
    return this.inngestService.queueEmbedding({
      text: body.text,
      texts: body.texts,
      userId,
    });
  }
}
