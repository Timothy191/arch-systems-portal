/**
 * @repo/supabase/server
 * Server-only Supabase admin client.
 * Never import this in Client Components.
 */
import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `[supabase/server] Missing environment variable: ${key}. ` +
        "Check your apps/portal/.env.local file."
    );
  }
  return val;
}

/** Service-role admin client — full bypass of RLS. Use with care. */
export function createAdminClient() {
  return createSupabaseClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/** Server client with cookie-based auth. */
export function createServerSupabaseClient() {
  return createSupabaseClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/** Get current user safely, returns null if not authenticated. */
export async function getUserSafely(supabase: ReturnType<typeof createServerSupabaseClient>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
