import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";

/**
 * Dual-Auth Handler for Watchlist Curator Agent:
 * 
 * 1. Machine / Scheduler Mode:
 *    - Authenticates via `X-Agent-Service-Key` header matching `AGENT_SERVICE_SECRET`.
 *    - Permits batch curation (batch: true) or targeting specific users.
 * 
 * 2. Interactive Session Mode:
 *    - Authenticates via `getCurrentUser()` reading the secure `investiq_session` cookie.
 *    - Strictly derives `userId` from session (ignores client-supplied user_id to prevent impersonation).
 *    - Disallows force_refresh (cannot bypass daily 3-suggestion cap).
 * 
 * 3. Unauthenticated Access:
 *    - Any request lacking both a valid session and the service key is rejected with HTTP 401.
 */
export async function POST(req: NextRequest) {
  try {
    const agentSecret = process.env.AGENT_SERVICE_SECRET;
    const incomingKey = req.headers.get("x-agent-service-key");
    const isMachineAuth = Boolean(agentSecret && incomingKey && incomingKey === agentSecret);

    let targetUserId: string | null = null;
    let isBatch = false;
    let allowForceRefresh = false;

    const body = await req.json().catch(() => ({}));

    if (isMachineAuth) {
      // 1. Trusted Machine / Scheduler Call
      isBatch = Boolean(body.batch);
      targetUserId = body.user_id || body.userId || null;
      allowForceRefresh = Boolean(body.force_refresh);
    } else {
      // 2. Interactive User Session Call
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            message: "Unauthorized: Valid session or agent service key required.",
          },
          { status: 401 }
        );
      }
      // Strictly session-pinned user identity
      targetUserId = user.id;
      isBatch = false;
      allowForceRefresh = false; // Never permit interactive sessions to force bypass daily cap
    }

    if (!isBatch && !targetUserId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required when batch mode is false.",
        },
        { status: 400 }
      );
    }

    // Forward to Flask agent backend with shared secret
    const flaskBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
    const targetUrl = `${flaskBaseUrl.replace(/\/$/, "")}/api/agents/curate`;

    const flaskRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Service-Key": agentSecret || "",
      },
      body: JSON.stringify({
        user_id: targetUserId,
        batch: isBatch,
        force_refresh: allowForceRefresh,
      }),
      cache: "no-store",
    });

    const data = await flaskRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: flaskRes.status });
  } catch (err: any) {
    console.error("Watchlist Curator bridge error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error during watchlist curation.",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/curate
 * Retrieve today's active curator suggestions for the authenticated user.
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

    // Call Flask with service secret to query today's curator suggestions for this user
    const agentSecret = process.env.AGENT_SERVICE_SECRET;
    const flaskBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
    const targetUrl = `${flaskBaseUrl.replace(/\/$/, "")}/api/agents/curate`;

    const flaskRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Service-Key": agentSecret || "",
      },
      body: JSON.stringify({
        user_id: user.id,
        force_refresh: false, // Reads cached suggestions if already at cap
      }),
      cache: "no-store",
    });

    const data = await flaskRes.json().catch(() => ({}));
    return NextResponse.json(data, { status: flaskRes.status });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch curator suggestions." },
      { status: 500 }
    );
  }
}
