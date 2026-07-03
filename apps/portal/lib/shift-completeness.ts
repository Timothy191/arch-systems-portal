import type { createServerSupabaseClient } from "@repo/supabase/server";
import { withCache } from "@/lib/cache-utils";
import { CacheCategory } from "@repo/redis";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type RequiredForm =
  | "machine-operations"
  | "excavator-activity"
  | "roll-over"
  | "hourly-loads";

export interface MachineCoverageStatus {
  machineId: string;
  machineName: string;
  machineType: string;
  requiredForm: RequiredForm;
  formLabel: string;
  formPath: string;
  hasEntry: boolean;
  exempt: boolean;
  hoursWorked?: number | null;
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

function machineTypeLC(t: string) {
  return t.toLowerCase();
}

function requiredFormFor(machineType: string): RequiredForm {
  const t = machineTypeLC(machineType);
  if (EXCAVATOR_KEYWORDS.some((k) => t.includes(k)))
    return "excavator-activity";
  if (DOZER_KEYWORDS.some((k) => t.includes(k))) return "roll-over";
  if (DUMPER_KEYWORDS.some((k) => t.includes(k))) return "hourly-loads";
  return "machine-operations";
}

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

interface RawMachine {
  id: string;
  name: string;
  machine_type: string;
  report_exempt: boolean | null;
}

interface RawMachineOp {
  machine_id: string;
  hours_worked: number | null;
}

interface RawDozerRoll {
  machine_id: string;
  hours_operated: number | null;
}

interface RawHourlyLoad {
  machine_id: string;
  total_loads: number | null;
}

interface ShiftFormData {
  machineOpIds: Set<string>;
  excavatorIds: Set<string>;
  dozerIds: Set<string>;
  loadIds: Set<string>;
  machineOpHoursMap: Map<string, number>;
  dozerHoursMap: Map<string, number>;
}

// AGENT-TRACE: Keep DB column selection minimal and strongly typed. Each helper
// isolates one form table so the main orchestrator stays readable.

async function fetchMachines(
  supabase: SupabaseClient,
  deptId: string,
): Promise<RawMachine[]> {
  const { data } = await supabase
    .from("machines")
    .select("id, name, machine_type, report_exempt")
    .eq("department_id", deptId)
    .eq("active", true)
    .order("name");
  return data ?? [];
}

async function fetchMachineOperations(
  supabase: SupabaseClient,
  deptId: string,
  date: string,
  shift: "day" | "night",
): Promise<RawMachineOp[]> {
  const { data } = await supabase
    .from("machine_operations")
    .select("machine_id, hours_worked")
    .eq("department_id", deptId)
    .eq("shift_date", date)
    .eq("shift_type", shift);
  return data ?? [];
}

async function fetchExcavatorActivity(
  supabase: SupabaseClient,
  deptId: string,
  date: string,
  shift: "day" | "night",
): Promise<{ machine_id: string }[]> {
  const { data } = await supabase
    .from("excavator_activity")
    .select("machine_id")
    .eq("department_id", deptId)
    .eq("activity_date", date)
    .eq("shift_type", shift);
  return data ?? [];
}

async function fetchDozerRolls(
  supabase: SupabaseClient,
  deptId: string,
  date: string,
  shift: "day" | "night",
): Promise<RawDozerRoll[]> {
  const { data } = await supabase
    .from("dozer_rolls")
    .select("machine_id, hours_operated")
    .eq("department_id", deptId)
    .eq("roll_date", date)
    .eq("shift_type", shift);
  return data ?? [];
}

async function fetchHourlyLoads(
  supabase: SupabaseClient,
  deptId: string,
  date: string,
  shift: "day" | "night",
): Promise<RawHourlyLoad[]> {
  const { data } = await supabase
    .from("hourly_loads")
    .select("machine_id, total_loads")
    .eq("department_id", deptId)
    .eq("load_date", date)
    .eq("shift_type", shift);
  return data ?? [];
}

function toIdSet(rows: { machine_id: string }[]): Set<string> {
  return new Set(rows.map((r) => r.machine_id));
}

function sumHoursByMachineId(
  rows: { machine_id: string; hours: number | null }[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const { machine_id, hours } of rows) {
    if (machine_id && hours !== null) {
      map.set(machine_id, (map.get(machine_id) || 0) + Number(hours));
    }
  }
  return map;
}

function buildFormData(
  machineOps: RawMachineOp[],
  excavatorActs: { machine_id: string }[],
  dozerRolls: RawDozerRoll[],
  hourlyLoads: RawHourlyLoad[],
): ShiftFormData {
  return {
    machineOpIds: toIdSet(machineOps),
    excavatorIds: toIdSet(excavatorActs),
    dozerIds: toIdSet(dozerRolls),
    loadIds: new Set(
      hourlyLoads
        .filter((r) => (r.total_loads ?? 0) > 0)
        .map((r) => r.machine_id),
    ),
    machineOpHoursMap: sumHoursByMachineId(
      machineOps.map((r) => ({ machine_id: r.machine_id, hours: r.hours_worked })),
    ),
    dozerHoursMap: sumHoursByMachineId(
      dozerRolls.map((r) => ({
        machine_id: r.machine_id,
        hours: r.hours_operated,
      })),
    ),
  };
}

function resolveHasEntry(requiredForm: RequiredForm, data: ShiftFormData, machineId: string): boolean {
  switch (requiredForm) {
    case "excavator-activity":
      return data.excavatorIds.has(machineId);
    case "roll-over":
      return data.dozerIds.has(machineId);
    case "hourly-loads":
      return data.loadIds.has(machineId);
    default:
      return data.machineOpIds.has(machineId);
  }
}

function resolveHoursWorked(
  requiredForm: RequiredForm,
  data: ShiftFormData,
  machineId: string,
): number | null {
  if (requiredForm === "machine-operations") {
    return data.machineOpHoursMap.get(machineId) ?? null;
  }
  if (requiredForm === "roll-over") {
    return data.dozerHoursMap.get(machineId) ?? null;
  }
  return null;
}

function buildMachineStatuses(
  machines: RawMachine[],
  formData: ShiftFormData,
  departmentSlug: string | null,
): MachineCoverageStatus[] {
  return machines.map((m) => {
    const requiredForm = requiredFormFor(m.machine_type);
    const meta = FORM_META[requiredForm];

    return {
      machineId: m.id,
      machineName: m.name,
      machineType: m.machine_type,
      requiredForm,
      formLabel: meta.label,
      formPath: departmentSlug
        ? `/${departmentSlug}/${meta.path}`
        : `/${meta.path}`,
      hasEntry: resolveHasEntry(requiredForm, formData, m.id),
      exempt: m.report_exempt ?? false,
      hoursWorked: resolveHoursWorked(requiredForm, formData, m.id),
    };
  });
}

function summarize(statuses: MachineCoverageStatus[]): ShiftCompleteness {
  const required = statuses.filter((s) => !s.exempt);
  const covered = required.filter((s) => s.hasEntry);

  return {
    complete: required.length === 0 || covered.length === required.length,
    totalRequired: required.length,
    totalCovered: covered.length,
    statuses,
  };
}

export async function getShiftCompleteness(
  supabase: SupabaseClient,
  deptId: string,
  departmentSlug: string | null,
  date: string,
  shift: "day" | "night",
): Promise<ShiftCompleteness> {
  return withCache(
    async () => {
      const [machines, machineOps, excavatorActs, dozerRolls, hourlyLoads] =
        await Promise.all([
          fetchMachines(supabase, deptId),
          fetchMachineOperations(supabase, deptId, date, shift),
          fetchExcavatorActivity(supabase, deptId, date, shift),
          fetchDozerRolls(supabase, deptId, date, shift),
          fetchHourlyLoads(supabase, deptId, date, shift),
        ]);

      const formData = buildFormData(
        machineOps,
        excavatorActs,
        dozerRolls,
        hourlyLoads,
      );
      const statuses = buildMachineStatuses(
        machines,
        formData,
        departmentSlug,
      );
      return summarize(statuses);
    },
    {
      category: CacheCategory.SHIFT,
      keyParts: [deptId, date, shift],
      tags: [
        `dept:${deptId}`,
        "table:machines",
        "table:machine_operations",
        "table:excavator_activity",
        "table:dozer_rolls",
        "table:hourly_loads",
      ],
    },
  );
}
