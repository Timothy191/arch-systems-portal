"use server";

import { createServerSupabaseClient } from "@repo/supabase/server";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { logError } from "@/lib/errors/error-logger";
import { env } from "@/lib/env";
import {
  AuthError,
  ForbiddenError,
  ValidationError,
  APIError,
} from "@repo/errors";

function getApiUrl(): string {
  return (env.NEXT_PUBLIC_API_URL ?? env.API_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

async function getAccessToken(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new AuthError("Unauthorized");
  }

  return session.access_token;
}

async function postApi<T>(
  path: string,
  token: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new APIError(
      payload.message ||
        payload.error ||
        `API request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function speculativeEmbedShiftLog(text: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("Unauthorized");
  }

  if (!text || text.trim() === "") return;

  try {
    const token = await getAccessToken(supabase);
    await postApi("/api/jobs/embeddings", token, { text });
  } catch (err) {
    // Log error but do not fail the user's critical operation path
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "speculative_embed_queue_failed",
    });
  }
}

export async function revalidateRSC(tags: string[]) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("Unauthorized");
  }

  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
  return { success: true };
}

export async function generateMonthlyReport(
  reportData: any,
  departmentId?: string,
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("Unauthorized");
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("role, department_id")
    .eq("auth_id", user.id)
    .single();

  if (employee?.role !== "admin" && employee?.role !== "manager") {
    throw new AuthError("Unauthorized");
  }

  if (
    employee?.role === "manager" &&
    departmentId &&
    departmentId !== employee.department_id
  ) {
    throw new ForbiddenError(
      "Forbidden: Managers cannot generate reports for other departments",
    );
  }

  const deptId = departmentId || employee.department_id;
  if (!deptId) {
    throw new ValidationError(
      "Department ID is required to determine storage permissions",
    );
  }

  try {
    const token = await getAccessToken(supabase);
    return await postApi<{ success: true; url: string }>(
      "/api/export/monthly-report",
      token,
      {
        reportData,
        departmentId: deptId,
      },
    );
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), {
      context: "generate_monthly_report",
    });
    throw err;
  }
}
