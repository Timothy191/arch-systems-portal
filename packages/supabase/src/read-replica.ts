import "server-only";
import { createServerSupabaseClient } from "./server";

// Re-export for compatibility
export { createServerSupabaseClient as createReadReplicaClient } from "./server";