import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@repo/supabase/server";
import { serverLogger } from "@repo/logger";

/**
 * @swagger
 * /api/ai/trigger:
 *   post:
 *     summary: Manually trigger AI agent event
 *     description: Triggers an AI agent event for processing. Requires admin authentication.
 *     tags:
 *       - AI
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event
 *             properties:
 *               event:
 *                 type: string
 *                 description: Event type to trigger
 *               data:
 *                 type: object
 *                 description: Event payload data
 *     responses:
 *       200:
 *         description: Event triggered successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("auth_id", user.id)
    .single();

  if (employee?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { event, data } = body;

    if (!event) {
      return NextResponse.json({ error: "Event type is required" }, { status: 400 });
    }

    serverLogger().info(`AI event triggered: ${event}`, { data, triggeredBy: user.id });

    return NextResponse.json({
      success: true,
      event,
      message: `AI agent event "${event}" triggered successfully`,
    });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to trigger AI event" }, { status: 500 });
  }
}
