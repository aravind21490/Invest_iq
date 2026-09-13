import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/agents/debrief
 * Server-side route handler for Post-Trade Debrief Agent.
 * Enforces mandatory session authentication:
 * 1. Independently verifies caller's session via getCurrentUser().
 * 2. Derives userId strictly from authenticated session (never trusts client body).
 * 3. Authenticates against Flask using server-only AGENT_SERVICE_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Mandatory Session Authentication Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Permission denied. Authentication required to access post-trade debrief.",
        },
        { status: 401 }
      );
    }

    // 2. Strict Session-Derived User Identity
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const tradeId = body.tradeId || body.trade_id;

    if (!tradeId) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid tradeId is required.",
        },
        { status: 400 }
      );
    }

    // 3. Server-Only Shared Secret for Flask Bridge
    const agentSecret = process.env.AGENT_SERVICE_SECRET;
    if (!agentSecret) {
      console.error("CRITICAL: AGENT_SERVICE_SECRET is missing from server environment.");
      return NextResponse.json(
        {
          success: false,
          message: "Agent service configuration error.",
        },
        { status: 500 }
      );
    }

    const flaskBaseUrl =
      process.env.FLASK_API_URL ||
      process.env.FLASK_ORIGIN ||
      process.env.API_URL ||
      "http://127.0.0.1:5000";
    const targetUrl = `${flaskBaseUrl.replace(/\/$/, "")}/api/agents/debrief`;

    const flaskRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Service-Key": agentSecret,
      },
      body: JSON.stringify({
        user_id: userId,
        trade_id: String(tradeId),
      }),
      cache: "no-store",
    });

    const data = await flaskRes.json().catch(() => ({
      success: false,
      error: "Non-JSON response received from agent engine.",
    }));

    return NextResponse.json(data, { status: flaskRes.status });
  } catch (error: any) {
    console.error("Error in agent debrief route handler:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Internal server error during debrief generation: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/debrief?tradeId=ORD-12345
 * Pure read-only retrieval of a pre-computed post-trade debrief from the agent_runs store.
 * Strictly queries the persisted audit log. Never calls the LLM agent or triggers generation.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const tradeId = searchParams.get("tradeId") || searchParams.get("trade_id");
    if (!tradeId) {
      return NextResponse.json(
        { success: false, message: "A valid tradeId query parameter is required." },
        { status: 400 }
      );
    }

    // Pure read from Supabase agent_runs table
    try {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("output, created_at")
        .eq("user_id", user.id)
        .eq("trade_id", String(tradeId))
        .eq("agent_name", "post_trade_debrief")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.output) {
        const debrief = typeof data.output === "string" ? JSON.parse(data.output) : data.output;
        return NextResponse.json({
          success: true,
          ...debrief,
          created_at: data.created_at,
          is_cached: true,
          is_stored: true,
        });
      }
    } catch (dbErr: any) {
      console.warn("Direct Supabase agent_runs lookup error:", dbErr?.message || dbErr);
    }

    return NextResponse.json(
      {
        success: false,
        message: "No stored debrief found for this trade.",
        is_stored: false,
      },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Failed to retrieve stored debrief." },
      { status: 500 }
    );
  }
}
