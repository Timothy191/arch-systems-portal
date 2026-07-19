import { Injectable, Logger } from "@nestjs/common";
import { db } from "@repo/database";
import { cacheWrap } from "@repo/redis/cache";

type RequiredForm =
  | "machine-operations"
  | "excavator-activity"
  | "roll-over"
  | "hourly-loads";

interface MachineCoverageStatus {
  machineId: string;
  machineName: string;
  machineType: string;
  requiredForm: RequiredForm;
  formLabel: string;
  formPath: string;
  hasEntry: boolean;
  exempt: boolean;
  hoursWorked: number | null;
}

export interface ShiftCompleteness {
  complete: boolean;
  totalRequired: number;
  totalCovered: number;
  statuses: MachineCoverageStatus[];
}

const DUMPER_KEYWORDS = ["dump truck", "dumper", "haul truck"];
const DOZER_KEYWORDS = ["dozer", "bulldozer"];
const EXCAVATOR_KEYWORDS = ["excavator", "excavation"];

const FORM_META: Record<RequiredForm, { label: string; path: string }> = {
  "machine-operations": {
    label: "Machine Operations",
    path: "machine-operations",
  },
  "excavator-activity": {
    label: "Excavator Activity",
    path: "excavator-activity",
  },
  "roll-over": { label: "Roll-Over (Dozers)", path: "roll-over" },
  "hourly-loads": { label: "Hourly Loads", path: "hourly-loads" },
};

function requiredFormFor(machineType: string): RequiredForm {
  const t = machineType.toLowerCase();
  if (EXCAVATOR_KEYWORDS.some((k) => t.includes(k))) return "excavator-activity";
  if (DOZER_KEYWORDS.some((k) => t.includes(k))) return "roll-over";
  if (DUMPER_KEYWORDS.some((k) => t.includes(k))) return "hourly-loads";
  return "machine-operations";
}

@Injectable()
export class ControlRoomService {
  private readonly logger = new Logger(ControlRoomService.name);

  async getShiftCompleteness(
    deptId: string,
    departmentSlug: string,
    date: string,
    shift: "day" | "night",
  ): Promise<ShiftCompleteness> {
    return cacheWrap(
      `shift:${deptId}:${date}:${shift}`,
      () => this.computeShiftCompleteness(deptId, departmentSlug, date, shift),
      300,
    );
  }

  private async computeShiftCompleteness(
    deptId: string,
    departmentSlug: string,
    date: string,
    shift: "day" | "night",
  ): Promise<ShiftCompleteness> {
    const [
      machines,
      machineOps,
      excavatorActs,
      dozerRolls,
      hourlyLoads,
    ] = await Promise.all([
      db
        .selectFrom("machines")
        .select(["id", "name", "machine_type", "report_exempt"])
        .where("department_id", "=", deptId)
        .where("active", "=", true)
        .orderBy("name")
        .execute(),
      db
        .selectFrom("machine_operations")
        .innerJoin("machines", "machines.id", "machine_operations.machine_id")
        .select(["machine_operations.machine_id", "machine_operations.hours_operated"])
        .where("machines.department_id", "=", deptId)
        .where("machine_operations.shift_date", "=", date)
        .where("machine_operations.shift_type", "=", shift)
        .execute(),
      db
        .selectFrom("excavator_activity")
        .innerJoin("machines", "machines.id", "excavator_activity.excavator_id")
        .select(["excavator_activity.excavator_id as machine_id"])
        .where("machines.department_id", "=", deptId)
        .where("excavator_activity.activity_date", "=", date)
        .where("excavator_activity.shift_type", "=", shift)
        .execute(),
      db
        .selectFrom("dozer_rolls")
        .innerJoin("machines", "machines.id", "dozer_rolls.dozer_id")
        .select(["dozer_rolls.dozer_id", "dozer_rolls.rolls_count"])
        .where("machines.department_id", "=", deptId)
        .where("dozer_rolls.roll_date", "=", date)
        .where("dozer_rolls.shift_type", "=", shift)
        .execute(),
      db
        .selectFrom("hourly_loads")
        .select(["machine_id", "total_loads"])
        .where("department_id", "=", deptId)
        .where("load_date", "=", date)
        .where("shift_type", "=", shift)
        .execute(),
    ]);

    const rawMachines = machines;
    const rawMachineOps = machineOps;
    const rawExcavatorActs = excavatorActs;
    const rawDozerRolls = dozerRolls;
    const rawHourlyLoads = hourlyLoads;

    const machineOpIds = new Set(rawMachineOps.map((r) => r.machine_id));
    const excavatorIds = new Set(rawExcavatorActs.map((r) => r.machine_id));
    const dozerIds = new Set(rawDozerRolls.map((r) => r.dozer_id));
    const loadIds = new Set(
      rawHourlyLoads
        .filter((r) => (r.total_loads ?? 0) > 0)
        .map((r) => r.machine_id),
    );

    const machineOpHoursMap = new Map<string, number>();
    for (const r of rawMachineOps) {
      if (r.machine_id && r.hours_operated !== null) {
        machineOpHoursMap.set(
          r.machine_id,
          (machineOpHoursMap.get(r.machine_id) || 0) + Number(r.hours_operated),
        );
      }
    }

    const dozerHoursMap = new Map<string, number>();
    for (const r of rawDozerRolls) {
      if (r.dozer_id && r.rolls_count !== null) {
        dozerHoursMap.set(
          r.dozer_id,
          (dozerHoursMap.get(r.dozer_id) || 0) + Number(r.rolls_count),
        );
      }
    }

    const statuses: MachineCoverageStatus[] = rawMachines.map((m) => {
      const requiredForm = requiredFormFor(m.machine_type);
      const meta = FORM_META[requiredForm];

      let hasEntry = false;
      let hoursWorked: number | null = null;

      switch (requiredForm) {
        case "excavator-activity":
          hasEntry = excavatorIds.has(m.id);
          break;
        case "roll-over":
          hasEntry = dozerIds.has(m.id);
          hoursWorked = dozerHoursMap.get(m.id) ?? null;
          break;
        case "hourly-loads":
          hasEntry = loadIds.has(m.id);
          break;
        default:
          hasEntry = machineOpIds.has(m.id);
          hoursWorked = machineOpHoursMap.get(m.id) ?? null;
      }

      return {
        machineId: m.id,
        machineName: m.name,
        machineType: m.machine_type,
        requiredForm,
        formLabel: meta.label,
        formPath: departmentSlug
          ? `/${departmentSlug}/${meta.path}`
          : `/${meta.path}`,
        hasEntry,
        exempt: m.report_exempt ?? false,
        hoursWorked,
      };
    });

    const required = statuses.filter((s) => !s.exempt);
    const covered = statuses.filter((s) => s.hasEntry);

    return {
      complete: required.length === 0 || covered.length === required.length,
      totalRequired: required.length,
      totalCovered: covered.length,
      statuses,
    };
  }
}