import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/* ── GET /api/ops/ai/status ─────────────────────────────────── */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    // Return AI invocation summary counts
    const { data: logs } = await supabase
      .from("ai_usage_logs")
      .select("model, tokens_used")
      .order("created_at", { ascending: false })
      .limit(200);

    const summary: Record<string, number> = {};
    for (const log of logs ?? []) {
      const model = (log as Record<string, unknown>).model as string;
      summary[model] = (summary[model] ?? 0) + 1;
    }

    return NextResponse.json({ success: true, data: summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
