// Placeholder for server proxy
import { createServerSupabaseClient } from "@repo/supabase/server";
import { cacheGet, cacheSet, cacheEvictL1ByPrefix } from "@repo/redis";

export { createServerSupabaseClient, cacheGet, cacheSet, cacheEvictL1ByPrefix };