import { NextRequest, NextResponse } from "next/server";
import { fetchMultipleQuotes, TOP_INDIAN_STOCKS } from "@/lib/market-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get("symbols");

    let symbols: string[];
    if (symbolsParam) {
      symbols = symbolsParam.split(",").map((s) => s.trim().toUpperCase());
    } else {
      // Default: Top benchmarks (India & Global) + premier Indian & Global equities
      symbols = [
        "^NSEI",
        "^BSESN",
        "^GSPC",
        "^IXIC",
        "NVDA",
        "AAPL",
        "MSFT",
        "TSLA",
        "AMZN",
        "META",
        ...TOP_INDIAN_STOCKS.slice(0, 30),
      ];
    }

    const quotes = await fetchMultipleQuotes(symbols);

    if (quotes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to retrieve live market data. Upstream market feed is unavailable.",
          quotes: [],
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        count: quotes.length,
        quotes,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=2, stale-while-revalidate=5",
        },
      }
    );
  } catch (error) {
    console.error("Error in market quotes route:", error);
    return NextResponse.json(
      { success: false, message: "Market quotes service error" },
      { status: 500 }
    );
  }
}
