import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";
import { TaskWorker } from "./task.worker";

import { SupabaseModule } from "../supabase/supabase.module";

@Module({
  imports: [
    SupabaseModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue({
      name: "background-tasks",
    }),
  ],
  providers: [QueueService, TaskWorker],
  exports: [QueueService],
})
export class QueueModule {}
