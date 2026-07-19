// @repo/contract — shared Zod schemas and types
import { z } from "zod";

export type { ZodSchema } from "zod";

export const riskAssessmentSchema = z.object({});
export const complianceResultSchema = z.object({});
export const createWebhookSchema = z.object({});
export const updateWebhookSchema = z.object({});
export const telemetryPushSchema = z.object({});
export const syncPlaybackSchema = z.object({});
export const safetyExportQuerySchema = z.object({});
export const exportQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  dept: z.string().optional(),
  limit: z.coerce.number().optional().default(100),
  offset: z.coerce.number().optional().default(0),
});

export const scannerBadgeSchema = z.object({
  code: z.string().optional(),
  barcode: z.string().optional(),
  barcodeData: z.string().optional(),
  data: z.string().optional(),
  qr_code: z.string().optional(),
});
