"use server";

import { createServerSupabaseClient } from "@repo/supabase/server";

export async function loginAction(credentials: {
  email: string;
  password: string;
}) {
  if (!credentials.email || !credentials.password) {
    return { success: false, error: "Email and password are required" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      const isRateLimitError = error.message
        .toLowerCase()
        .includes("rate limit");
      return {
        success: false,
        error: isRateLimitError
          ? "Too many attempts. Please wait a moment and try again."
          : "Invalid credentials",
      };
    }

    return { success: true, user: data.user };
  } catch (err) {
    return {
      success: false,
      error: "Authentication service error. Please try again.",
    };
  }
}
