import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { recordTrade } from "@/lib/db";
import { fetchLiveQuote } from "@/lib/market-api";
import { getNseStock } from "@/lib/nse-catalog";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthenticated. Please sign in to trade." },
        { status: 401 }
      );
    }

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

    const nseInfo = getNseStock(symbol);
    const name = quote.name || nseInfo?.name || symbol;
    const sector = nseInfo?.sector || "General";

    const result = recordTrade(user.id, {
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
