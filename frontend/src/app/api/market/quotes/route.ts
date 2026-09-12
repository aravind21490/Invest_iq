import { NextRequest, NextResponse } from "next/server";
import { fetchMultipleQuotes, generateFallbackQuote, TOP_INDIAN_STOCKS } from "@/lib/market-api";
import { getUnifiedStock } from "@/lib/nse-catalog";

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

    let quotes = await fetchMultipleQuotes(symbols);

    if (quotes.length === 0) {
      quotes = symbols.map((sym) => {
        const u = getUnifiedStock(sym);
        return generateFallbackQuote(
          sym,
          u?.name || sym,
          u?.sector || "Equities",
          u?.category || "large-cap",
          u?.market || "NSE",
          u?.currency || "INR"
        );
      });
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
