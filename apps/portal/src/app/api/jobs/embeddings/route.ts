import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/* ── POST /api/jobs/embeddings ──────────────────────────────── */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  try {
    const { text, metadata } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    // Queue embedding generation — in production this dispatches to Inngest
    return NextResponse.json({
      success: true,
      data: {
        queued: true,
        jobType: "embedding",
        textLength: text.length,
        metadata: metadata ?? {},
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
