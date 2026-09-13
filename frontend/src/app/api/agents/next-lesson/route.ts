import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";

/**
 * GET & POST /api/agents/next-lesson
 * Lesson-Sequencing Agent Endpoint.
 * Session-authenticated ONLY:
 * 1. Verifies caller's session via getCurrentUser().
 * 2. Derives userId strictly from session (never trusts client-supplied user_id).
 * 3. Bridges to Flask agent backend using shared AGENT_SERVICE_SECRET.
 */
async function handleNextLesson() {
  try {
    // 1. Mandatory Session Authentication Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized: Active user session required to get personalized lesson recommendations.",
        },
        { status: 401 }
      );
    }

    // 2. Strict Session-Derived User Identity
    const userId = user.id;

    // 3. Server-Only Shared Secret for Flask Bridge
    const agentSecret = process.env.AGENT_SERVICE_SECRET;
    const flaskBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";
    const targetUrl = `${flaskBaseUrl.replace(/\/$/, "")}/api/agents/next-lesson`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout guardrail

    try {
      const flaskRes = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Service-Key": agentSecret || "",
        },
        body: JSON.stringify({
          user_id: userId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const contentType = flaskRes.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await flaskRes.json();
      } else {
        const text = await flaskRes.text();
        data = { success: false, error: text };
      }

      return NextResponse.json(data, { status: flaskRes.status });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isTimeout = fetchErr.name === "AbortError";
      return NextResponse.json(
        {
          success: false,
          error: isTimeout
            ? "Lesson Agent request timed out after 15 seconds."
            : `Failed to connect to agent service: ${fetchErr.message}`,
        },
        { status: isTimeout ? 504 : 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return handleNextLesson();
}

export async function POST() {
  return handleNextLesson();
}
