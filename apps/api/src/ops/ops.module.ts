import { Module } from "@nestjs/common";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";
import { DbAuditService } from "./db-audit.service";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [AiModule],
  controllers: [OpsController],
  providers: [OpsService, DbAuditService],
  exports: [OpsService, DbAuditService],
})
export class OpsModule {}
