import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "portal" });

export const syncPlaybackEvent = "sync/playback";
export const aiGenerateEmbeddingEvent = "ai/generate-embedding";
export const aiMemoryPersistEvent = "ai/memory-persist";
