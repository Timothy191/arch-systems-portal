import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Used by dev.sh smoke tests and load-balancer health checks.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "portal",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
