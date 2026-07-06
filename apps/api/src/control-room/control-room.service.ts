import { Injectable, Inject, Logger } from "@nestjs/common";
import { SUPABASE_CLIENT } from "../supabase/supabase.constants";
import { REDIS_CLIENT } from "../redis/redis.constants";
import { cacheWrap } from "@repo/redis/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RedisClientType } from "redis";

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

/** @public */
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
  if (EXCAVATOR_KEYWORDS.some((k) => t.includes(k)))
    return "excavator-activity";
  if (DOZER_KEYWORDS.some((k) => t.includes(k))) return "roll-over";
  if (DUMPER_KEYWORDS.some((k) => t.includes(k))) return "hourly-loads";
  return "machine-operations";
}

@Injectable()
export class ControlRoomService {
  private readonly logger = new Logger(ControlRoomService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {}

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
    const [machines, machineOps, excavatorActs, dozerRolls, hourlyLoads] =
      await Promise.all([
        this.supabase
          .from("machines")
          .select("id, name, machine_type, report_exempt")
          .eq("department_id", deptId)
          .eq("active", true)
          .order("name"),
        this.supabase
          .from("machine_operations")
          .select("machine_id, hours_worked")
          .eq("department_id", deptId)
          .eq("shift_date", date)
          .eq("shift_type", shift),
        this.supabase
          .from("excavator_activity")
          .select("machine_id")
          .eq("department_id", deptId)
          .eq("activity_date", date)
          .eq("shift_type", shift),
        this.supabase
          .from("dozer_rolls")
          .select("machine_id, hours_operated")
          .eq("department_id", deptId)
          .eq("roll_date", date)
          .eq("shift_type", shift),
        this.supabase
          .from("hourly_loads")
          .select("machine_id, total_loads")
          .eq("department_id", deptId)
          .eq("load_date", date)
          .eq("shift_type", shift),
      ]);

    const rawMachines = machines.data ?? [];
    const rawMachineOps = machineOps.data ?? [];
    const rawExcavatorActs = excavatorActs.data ?? [];
    const rawDozerRolls = dozerRolls.data ?? [];
    const rawHourlyLoads = hourlyLoads.data ?? [];

    const machineOpIds = new Set(rawMachineOps.map((r) => r.machine_id));
    const excavatorIds = new Set(rawExcavatorActs.map((r) => r.machine_id));
    const dozerIds = new Set(rawDozerRolls.map((r) => r.machine_id));
    const loadIds = new Set(
      rawHourlyLoads
        .filter((r) => (r.total_loads ?? 0) > 0)
        .map((r) => r.machine_id),
    );

    const machineOpHoursMap = new Map<string, number>();
    for (const r of rawMachineOps) {
      if (r.machine_id && r.hours_worked !== null) {
        machineOpHoursMap.set(
          r.machine_id,
          (machineOpHoursMap.get(r.machine_id) || 0) + Number(r.hours_worked),
        );
      }
    }

    const dozerHoursMap = new Map<string, number>();
    for (const r of rawDozerRolls) {
      if (r.machine_id && r.hours_operated !== null) {
        dozerHoursMap.set(
          r.machine_id,
          (dozerHoursMap.get(r.machine_id) || 0) + Number(r.hours_operated),
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
    const covered = required.filter((s) => s.hasEntry);

    return {
      complete: required.length === 0 || covered.length === required.length,
      totalRequired: required.length,
      totalCovered: covered.length,
      statuses,
    };
  }
}
