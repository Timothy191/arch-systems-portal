import { Controller, Get, Query, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { ControlRoomService } from "./control-room.service";

@ApiTags("control-room")
@Controller("control-room")
export class ControlRoomController {
  constructor(private readonly controlRoomService: ControlRoomService) {}

  @Get("shift-completeness")
  @ApiOperation({ summary: "Get shift completeness for a department" })
  @ApiQuery({ name: "deptId", required: true })
  @ApiQuery({ name: "deptSlug", required: true })
  @ApiQuery({ name: "date", required: true, description: "YYYY-MM-DD" })
  @ApiQuery({ name: "shift", required: true, enum: ["day", "night"] })
  async getShiftCompleteness(
    @Query("deptId") deptId: string,
    @Query("deptSlug") deptSlug: string,
    @Query("date") date: string,
    @Query("shift") shift: string,
  ) {
    if (!deptId || !deptSlug || !date || !shift) {
      throw new BadRequestException("Missing required params: deptId, deptSlug, date, shift");
    }

    if (shift !== "day" && shift !== "night") {
      throw new BadRequestException("Shift must be 'day' or 'night'");
    }

    return this.controlRoomService.getShiftCompleteness(deptId, deptSlug, date, shift);
  }
}
