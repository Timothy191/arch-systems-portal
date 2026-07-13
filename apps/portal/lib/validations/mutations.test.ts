import {
  safetyIncidentInputSchema,
  dozerRollInputSchema,
  INCIDENT_TYPES,
  INCIDENT_STATUSES,
} from "@/lib/validations/mutations";

describe("safetyIncidentInputSchema", () => {
  const base = {
    departmentId: "123e4567-e89b-12d3-a456-426614174000",
    incidentType: "incident" as const,
    categoryId: null,
    severityId: "123e4567-e89b-12d3-a456-426614174001",
    shiftType: "day" as const,
    description: "Conveyor belt guard missing",
    location: "Main Pit",
    injuredParties: 0,
    rootCause: null,
    correctiveAction: null,
    status: "open" as const,
  };

  it("accepts a valid payload", () => {
    const result = safetyIncidentInputSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("defaults status to 'open'", () => {
    const { status: _status, ...rest } = base;
    void _status;
    const result = safetyIncidentInputSchema.safeParse(rest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("open");
  });

  it("rejects an unknown incident type", () => {
    const result = safetyIncidentInputSchema.safeParse({
      ...base,
      incidentType: "earthquake",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative injured parties", () => {
    const result = safetyIncidentInputSchema.safeParse({
      ...base,
      injuredParties: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty/whitespace description", () => {
    const result = safetyIncidentInputSchema.safeParse({
      ...base,
      description: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("enumerates the four incident types and four statuses", () => {
    expect(INCIDENT_TYPES).toEqual([
      "near-miss",
      "incident",
      "lost-time",
      "equipment-damage",
    ]);
    expect(INCIDENT_STATUSES).toEqual([
      "open",
      "under-investigation",
      "resolved",
      "closed",
    ]);
  });
});

describe("dozerRollInputSchema", () => {
  const base = {
    departmentId: "123e4567-e89b-12d3-a456-426614174000",
    machineId: "123e4567-e89b-12d3-a456-426614174002",
    today: "2026-07-10",
    shiftType: "night" as const,
    bladePasses: 12,
    pushCount: 8,
    hoursOperated: 8.5,
    area: 240,
    notes: "Length: 20m, Width: 12m",
  };

  it("accepts a valid payload", () => {
    const result = dozerRollInputSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejects a malformed date", () => {
    const result = dozerRollInputSchema.safeParse({
      ...base,
      today: "10-07-2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects hours operated over 24", () => {
    const result = dozerRollInputSchema.safeParse({
      ...base,
      hoursOperated: 25,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative area", () => {
    const result = dozerRollInputSchema.safeParse({
      ...base,
      area: -5,
    });
    expect(result.success).toBe(false);
  });
});
