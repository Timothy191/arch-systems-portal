import { Module } from "@nestjs/common";
import { OpsController } from "./ops.controller";
import { OpsService } from "./ops.service";
import { DbAuditService } from "./db-audit.service";

@Module({
  controllers: [OpsController],
  providers: [OpsService, DbAuditService],
  exports: [OpsService, DbAuditService],
})
export class OpsModule {}
