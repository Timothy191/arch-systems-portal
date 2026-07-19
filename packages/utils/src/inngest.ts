import { Inngest } from "inngest";

/**
 * Typed event schemas for Inngest job processing.
 * These define the event data shape for each event type,
 * enabling type-safe access to event.data properties.
 */
export type EventSchemas = {
  "sync/playback": {
    data: {
      idempotencyKey: string;
      actionType: string;
      payload: Record<string, unknown>;
      departmentId: string;
    };
  };
  "report/generate": {
    data: {
      departmentId: string;
      dateFrom: string;
      dateTo: string;
    };
  };
  "report/shift-integrity": {
    data: Record<string, never>;
  };
  "ai/generate-embedding": {
    data: {
      text?: string;
      texts?: string[];
      userId: string;
    };
  };
  "ai/memory-persist": {
    data: {
      sessionId: string;
      userId: string;
      assistantResponseStored: boolean;
    };
  };
};

export const inngest = new Inngest({
  id: "portal",
  Schemas: EventSchemas,
});

// Event names as string constants for use in trigger definitions
export const syncPlaybackEvent = "sync/playback" as const;
export const generateReportEvent = "report/generate" as const;
export const aiGenerateEmbeddingEvent = "ai/generate-embedding" as const;
export const aiMemoryPersistEvent = "ai/memory-persist" as const;
