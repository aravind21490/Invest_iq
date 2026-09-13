import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { recordTrade } from "@/lib/db";
import { fetchLiveQuote } from "@/lib/market-api";
import { getNseStock, getUnifiedStock } from "@/lib/nse-catalog";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Permission denied. Authentication required to execute paper trades. Please sign in or create an account." },
        { status: 401 }
      );
    }
    const userId = user.id;

    const body = await req.json();
    const { symbol, type, shares } = body;

    if (!symbol || !type || !shares || shares <= 0) {
      return NextResponse.json(
        { success: false, message: "Valid symbol, type (BUY/SELL), and positive share quantity are required." },
        { status: 400 }
      );
    }

    if (type !== "BUY" && type !== "SELL") {
      return NextResponse.json(
        { success: false, message: "Trade type must be BUY or SELL." },
        { status: 400 }
      );
    }

    // Always fetch REAL LIVE MARKET PRICE from the server-side provider
    const quote = await fetchLiveQuote(symbol);
    if (!quote || !quote.price) {
      return NextResponse.json(
        {
          success: false,
          message: `Unable to fetch live quote for ${symbol}. Trade halted to ensure execution accuracy.`,
        },
        { status: 503 }
      );
    }

    const stockInfo = getUnifiedStock(symbol) || getNseStock(symbol);
    const name = quote.name || stockInfo?.name || symbol;
    const sector = stockInfo?.sector || "General";

    // Synchronous Watchdog Pre-Trade Behavioral Guardrail Check
    const agentSecret = process.env.AGENT_SERVICE_SECRET;
    const flaskOrigin = process.env.FLASK_ORIGIN || "http://127.0.0.1:5000";

    if (agentSecret) {
      try {
        const watchdogRes = await fetch(`${flaskOrigin}/api/agents/watchdog-check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Agent-Service-Key": agentSecret,
          },
          body: JSON.stringify({
            userId,
            symbol,
            shares: Number(shares),
            type,
            price: quote.price,
          }),
        });

        if (watchdogRes.ok) {
          const watchdogData = await watchdogRes.json();
          if (watchdogData && watchdogData.flagged) {
            // Block severity: completely reject execution with HTTP 403 Forbidden
            if (watchdogData.severity === "block") {
              return NextResponse.json(
                {
                  success: false,
                  blocked: true,
                  message: watchdogData.reason,
                  lockState: watchdogData.lock_state,
                },
                { status: 403 }
              );
            }

            // Warning severity: prompt for explicit confirmation if not yet confirmed
            if (watchdogData.severity === "warning" && !body.confirmedWarning) {
              return NextResponse.json(
                {
                  success: false,
                  warning: true,
                  message: watchdogData.reason,
                  requiresConfirmation: true,
                },
                { status: 200 }
              );
            }
          }
        }
      } catch (agentErr) {
        console.warn("Watchdog check bypassed due to bridge connection warning:", agentErr);
      }
    }

    const result = await recordTrade(userId, {
      symbol: symbol.toUpperCase(),
      name,
      type,
      shares: Number(shares),
      price: quote.price,
      sector,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        trade: result.trade,
        livePrice: quote.price,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in trade execution route:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error during trade execution." },
      { status: 500 }
    );
  }
}
