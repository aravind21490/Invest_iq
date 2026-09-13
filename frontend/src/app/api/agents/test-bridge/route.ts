import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";

/**
 * Server-side route handler testing the Next.js -> Flask Agent Bridge.
 * Authenticates user session first, then uses AGENT_SERVICE_SECRET to reach Flask.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Permission denied. Authentication required to access agent services.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const testInvalid = searchParams.get("test_invalid") === "true";

    // Server-only environment variable
    const agentSecret = testInvalid
      ? "invalid_secret_key_for_testing_401"
      : process.env.AGENT_SERVICE_SECRET;

    const flaskBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

    const targetUrl = `${flaskBaseUrl.replace(/\/$/, "")}/api/agents/health`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (agentSecret) {
      headers["X-Agent-Service-Key"] = agentSecret;
    }

    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({ raw: "non-json response" }));

    return NextResponse.json(
      {
        bridgeStatus: res.status,
        flaskUrl: targetUrl,
        sentSecret: testInvalid ? "[INVALID_SECRET_TEST]" : "[REDACTED_VALID_SECRET]",
        hasSecretConfigured: Boolean(process.env.AGENT_SERVICE_SECRET),
        flaskResponse: data,
      },
      { status: res.status }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to reach Flask agent service: ${error?.message || String(error)}`,
      },
      { status: 502 }
    );
  }
}
