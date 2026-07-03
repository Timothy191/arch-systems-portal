import { Module } from "@nestjs/common";
import { TelemetryController } from "./telemetry.controller";
import { SyncController } from "./sync.controller";
import { TelemetryService } from "./telemetry.service";

@Module({
  controllers: [TelemetryController, SyncController],
  providers: [TelemetryService],
})
export class TelemetryModule {}
