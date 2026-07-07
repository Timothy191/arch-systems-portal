/**
 * Shared Zod Validation Schemas for API Endpoints
 *
 * All POST/PUT endpoints validate against these schemas.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid("Must be a valid UUID");
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format");
const nonEmptyString = z.string().min(1, "Must not be empty");

// ---------------------------------------------------------------------------
// Telemetry Push
// ---------------------------------------------------------------------------

export const telemetryPushSchema = z.object({
  name: nonEmptyString.max(200),
  value: z.union([z.number(), z.string()]),
  timestamp: z.string().datetime().optional(),
  machine_id: uuidSchema.optional(),
  department_id: uuidSchema.optional(),
  tags: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Sync Playback
// ---------------------------------------------------------------------------

export const syncPlaybackSchema = z.object({
  idempotencyKey: z.string().min(1),
  actionType: z.enum([
    "ADD_BREAKDOWN",
    "CREATE_BREAKDOWN",
    "RESOLVE_BREAKDOWN",
    "ADD_SAFETY_INCIDENT",
    "CREATE_SAFETY_INCIDENT",
    "ADD_DAILY_LOG",
    "create_breakdown",
    "update_breakdown",
    "create_safety_incident",
    "update_safety_incident",
    "create_daily_log",
    "update_daily_log",
  ]),
  payload: z.record(z.string(), z.unknown()),
  departmentId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Webhook Endpoints
// ---------------------------------------------------------------------------

export const createWebhookSchema = z.object({
  url: z.string().url("Must be a valid URL").max(2048, "URL too long"),
  description: z.string().max(500).optional(),
  event_types: z
    .array(z.string().min(1))
    .min(1, "At least one event type required")
    .max(20, "Too many event types"),
  department_id: uuidSchema,
  secret: z.string().min(16, "Secret must be at least 16 chars").optional(),
  active: z.boolean().optional().default(true),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  description: z.string().max(500).optional(),
  event_types: z.array(z.string().min(1)).min(1).max(20).optional(),
  active: z.boolean().optional(),
  secret: z.string().min(16).optional(),
});

// ---------------------------------------------------------------------------
// Scanner (c66)
// ---------------------------------------------------------------------------

export const scannerBadgeSchema = z.object({
  code: z.string().min(1).max(256).optional(),
  barcode: z.string().min(1).max(256).optional(),
  barcodeData: z.string().min(1).max(256).optional(),
  data: z.string().min(1).max(256).optional(),
  qr_code: z.string().min(1).max(256).optional(),
  access_type: z.enum(["gate_entry", "gate_exit", "boom_entry"]).optional(),
  gate_location: z.string().max(100).optional(),
  operator: z.string().max(100).optional(),
  alcohol_tested: z.enum(["Approved", "Failed", "Not Tested"]).optional(),
  device_id: z.string().max(100).optional(),
  direction: z.enum(["IN", "OUT"]).optional(),
});

// ---------------------------------------------------------------------------
// Control Room
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Export Endpoints
// ---------------------------------------------------------------------------

export const exportQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  dept: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const safetyExportQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format")
    .optional(),
  dept: z.string().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ---------------------------------------------------------------------------
// Admin Data
// ---------------------------------------------------------------------------

export const adminDataUpdateSchema = z.object({
  id: z.string().min(1, "Record id is required"),
  data: z.record(z.string(), z.unknown()),
});
