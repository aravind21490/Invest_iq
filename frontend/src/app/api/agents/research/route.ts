import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";

/**
 * POST /api/agents/research
 * Interactive Research Agent Endpoint.
 * Session-authenticated ONLY (no machine/dual-auth):
 * 1. Verifies caller's session via getCurrentUser().
 * 2. Derives userId strictly from session (never trusts client-supplied user_id).
 * 3. Bridges to Flask agent backend using shared AGENT_SERVICE_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Mandatory Session Authentication Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Active user session required to query Research Agent.",
        },
        { status: 401 }
      );
    }

    // 2. Strict Session-Derived User Identity
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const question = (body.question || "").toString().trim();

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid question is required.",
        },
        { status: 400 }
      );
    }

    // 3. Server-Only Shared Secret for Flask Bridge
    const agentSecret = process.env.AGENT_SERVICE_SECRET;
    const flaskBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
    const targetUrl = `${flaskBaseUrl.replace(/\/$/, "")}/api/agents/research`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout guardrail

    try {
      const flaskRes = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Service-Key": agentSecret || "",
        },
        body: JSON.stringify({
          user_id: userId,
          question: question,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);
      const data = await flaskRes.json().catch(() => ({}));
      return NextResponse.json(data, { status: flaskRes.status });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            message: "Research Agent query timed out after 45 seconds.",
          },
          { status: 504 }
        );
      }
      throw fetchErr;
    }
  } catch (err: any) {
    console.error("Research Agent bridge error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error while communicating with Research Agent.",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
