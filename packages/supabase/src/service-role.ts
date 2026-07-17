import "server-only";
import { createAdminClient } from "./server";

// Re-export for compatibility
export { createAdminClient as createServiceRoleClient } from "./server";