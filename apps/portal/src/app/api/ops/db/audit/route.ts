import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/* ── POST /api/ops/db/audit ─────────────────────────────────── */
export async function POST() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    // Run database integrity audit via Supabase RPC
    const { data, error } = await supabase.rpc("run_db_audit" as never);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, data: data ?? {} });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
