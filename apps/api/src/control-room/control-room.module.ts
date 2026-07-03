import { Module } from "@nestjs/common";
import { ControlRoomController } from "./control-room.controller";
import { ControlRoomService } from "./control-room.service";

@Module({
  controllers: [ControlRoomController],
  providers: [ControlRoomService],
})
export class ControlRoomModule {}
