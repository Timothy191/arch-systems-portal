import { Module } from "@nestjs/common";
import { InngestController } from "./inngest.controller";
import { JobsQueueController } from "./jobs-queue.controller";
import { InngestService } from "./inngest.service";

@Module({
  controllers: [InngestController, JobsQueueController],
  providers: [InngestService],
  exports: [InngestService],
})
export class JobsModule {}
