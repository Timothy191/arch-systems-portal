import { z } from "zod";

/**
 * Shared mutation schemas for portal write operations.
 *
 * These live in a plain (non-"use client"/"use server") module so they can be
 * imported by both the client form (for instant UX validation) and the Server
 * Action (for authoritative validation under the RLS context). Types are
 * inferred from the schemas — no `any`.
 */

export const INCIDENT_TYPES = [
  "near-miss",
  "incident",
  "lost-time",
  "equipment-damage",
] as const;

export const INCIDENT_STATUSES = [
  "open",
  "under-investigation",
  "resolved",
  "closed",
] as const;

export const safetyIncidentInputSchema = z.object({
  departmentId: z.string().uuid("Invalid department ID"),
  incidentType: z.enum(INCIDENT_TYPES, {
    message: "Select incident type",
  }),
  categoryId: z.string().uuid().nullable().optional(),
  severityId: z.string().uuid("Select severity"),
  shiftType: z.enum(["day", "night"]),
  description: z
    .string()
    .trim()
    .min(1, "Enter description")
    .max(500, "Description too long"),
  location: z.string().max(255).nullable().optional(),
  injuredParties: z
    .number()
    .int()
    .min(0, "Invalid number")
    .max(100, "Invalid number"),
  rootCause: z.string().max(2000).nullable().optional(),
  correctiveAction: z.string().max(2000).nullable().optional(),
  status: z.enum(INCIDENT_STATUSES).default("open"),
});

export type SafetyIncidentInput = z.infer<typeof safetyIncidentInputSchema>;

export const dozerRollInputSchema = z.object({
  departmentId: z.string().uuid("Invalid department ID"),
  machineId: z.string().uuid("Please select a dozer"),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  shiftType: z.enum(["day", "night"]),
  bladePasses: z
    .number()
    .int()
    .min(0, "Blade passes must be a positive integer"),
  pushCount: z.number().int().min(0, "Push count must be a positive integer"),
  hoursOperated: z
    .number()
    .min(0, "Hours operated must be positive")
    .max(24, "Hours operated cannot exceed 24"),
  area: z.number().min(0, "Area must be positive"),
  notes: z.string().max(500).optional(),
});

export type DozerRollInput = z.infer<typeof dozerRollInputSchema>;
