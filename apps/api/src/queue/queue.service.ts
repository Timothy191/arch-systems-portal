import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue("background-tasks") private backgroundQueue: Queue,
  ) {}

  async dispatchTelemetrySync(payload: any) {
    this.logger.log("Dispatching offline-first telemetry sync task");
    await this.backgroundQueue.add("telemetry-sync", payload, {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    });
  }

  async dispatchReportGeneration(payload: any) {
    this.logger.log("Dispatching report generation task");
    await this.backgroundQueue.add("generate-report", payload, {
      removeOnComplete: true,
    });
  }
}
