/**
 * @repo/supabase — re-exports for convenience
 * For tree-shaking prefer the sub-path imports:
 *   import { createClient } from "@repo/supabase/client";
 *   import { createAdminClient } from "@repo/supabase/server";
 */
export { createClient, createBrowserSupabaseClient } from "./client";
export { createAdminClient, createServerSupabaseClient, getUserSafely } from "./server";

// Legacy type exports for compatibility
export type PersonnelRow = any;
export type BadgesRow = any;
export type IssuedCardsRow = any;
export type PersonnelDetail = any;
export type ExpiringCard = any;
export type Department = any;
