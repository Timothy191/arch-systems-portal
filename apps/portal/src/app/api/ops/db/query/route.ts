import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@repo/supabase/server";

export const dynamic = "force-dynamic";

const SAFE_QUERY_MAX_ROWS = 500;
/** Reject SELECT with semicolons or UNION to prevent stacked/union injection */
const ALLOWED_QUERY_PATTERN = /^\s*SELECT\s+(?!.*(?:;|\bUNION\b))/i;

/* ── POST /api/ops/db/query ─────────────────────────────────── */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("auth_id", user.id)
    .single();
  if (employee?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { sql } = await request.json();
    if (!sql || typeof sql !== "string") {
      return NextResponse.json({ error: "sql string is required" }, { status: 400 });
    }

    if (!ALLOWED_QUERY_PATTERN.test(sql)) {
      return NextResponse.json({ error: "Only SELECT queries are allowed" }, { status: 400 });
    }

    // Execute safe read-only query via Supabase RPC
    const limitedSql = `SELECT * FROM (${sql}) AS _sub LIMIT ${SAFE_QUERY_MAX_ROWS + 1};`;
    const { data, error } = await supabase.rpc("exec_sql" as never, { sql: limitedSql });

    if (error) throw new Error(error.message);

    const rows = (data as Record<string, unknown>[]) ?? [];
    const truncated = rows.length > SAFE_QUERY_MAX_ROWS;
    if (truncated) rows.length = SAFE_QUERY_MAX_ROWS;
    const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];

    return NextResponse.json({
      success: true,
      data: { columns, rows, rowCount: rows.length, truncated },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
