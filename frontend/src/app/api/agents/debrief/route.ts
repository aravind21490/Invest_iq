import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";

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

    const flaskBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
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
