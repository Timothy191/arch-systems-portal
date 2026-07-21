import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/* ── GET /api/ops/db/audit/status ───────────────────────────── */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const { data, error } = await supabase
      .from("audit_logs" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      data: data?.[0] ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
