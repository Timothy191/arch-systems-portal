import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { inngest, syncPlaybackEvent } from "@repo/utils/inngest";
import { syncPlaybackSchema } from "../common/schemas";

@ApiTags("sync")
@Controller("sync")
export class SyncController {
  @Post("playback")
  @ApiOperation({ summary: "Queue a sync playback action" })
  async playback(@Body() body: any) {
    const parsed = syncPlaybackSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    await inngest.send({
      name: syncPlaybackEvent,
      data: {
        idempotencyKey: parsed.data.idempotencyKey,
        actionType: parsed.data.actionType,
        payload: parsed.data.payload,
        departmentId: parsed.data.departmentId,
      },
    });

    return { success: true, queued: true };
  }
}
