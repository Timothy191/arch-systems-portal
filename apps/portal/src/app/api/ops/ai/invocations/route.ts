import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/* ── GET /api/ops/ai/invocations ────────────────────────────── */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase
      .from("ai_usage_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
