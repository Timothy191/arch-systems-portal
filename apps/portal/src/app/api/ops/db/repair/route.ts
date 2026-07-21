import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/* ── POST /api/ops/db/repair ────────────────────────────────── */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const { tableName, issueCategory } = await request.json();
    if (!tableName || !issueCategory) {
      return NextResponse.json(
        { error: "tableName and issueCategory are required" },
        { status: 400 }
      );
    }

    // Execute repair via Supabase RPC (safe — only predefined repair SQL)
    const { data, error } = await supabase.rpc("repair_table" as never, {
      p_table_name: tableName,
      p_issue_category: issueCategory,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      data: data ?? { affectedRows: 0 },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
