import type { User, SupabaseClient } from "@supabase/supabase-js";

export function isTokenExpiredError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }
  const msg = String((error as { message: unknown }).message);
  return (
    msg.includes("Invalid Refresh Token") ||
    msg.includes("Refresh Token Not Found")
  );
}

/**
 * Safely gets the current user and determines if a sign-out is required due to token expiration.
 */
export async function getSessionUser(
  supabase: SupabaseClient,
): Promise<{ user: User | null; shouldSignOut: boolean }> {
  try {
    const { data, error } = await supabase.auth.getUser();
    const shouldSignOut = error !== null && isTokenExpiredError(error);
    return { user: data.user ?? null, shouldSignOut };
  } catch (error) {
    return { user: null, shouldSignOut: isTokenExpiredError(error) };
  }
}

/**
 * Legacy helper for simple user retrieval.
 */
export async function getUserSafely(
  supabase: SupabaseClient,
): Promise<User | null> {
  const { user } = await getSessionUser(supabase);
  return user;
}

/**
 * Validates if the user has a valid session.
 */
export async function isAuthenticated(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { user } = await getSessionUser(supabase);
  return !!user;
}
