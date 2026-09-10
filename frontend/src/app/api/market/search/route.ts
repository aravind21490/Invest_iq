import { NextRequest, NextResponse } from "next/server";
import { searchAllMarkets, getAllUnifiedStocks } from "@/lib/nse-catalog";
import { fetchMultipleQuotes } from "@/lib/market-api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const market = (searchParams.get("market") as "all" | "nse" | "global" | "index") || "all";
    const sector = searchParams.get("sector") || undefined;
    const category = searchParams.get("category") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "30", 10)));
    const includeQuotes = searchParams.get("includeQuotes") === "true";

    // Perform ultra-fast multi-market search across 2,400+ equities (NSE + Global)
    const searchResult = searchAllMarkets(query, {
      market,
      sector,
      category,
      page,
      limit,
    });

    const totalCatalogCount = getAllUnifiedStocks().length;

    if (!includeQuotes) {
      return NextResponse.json({
        success: true,
        totalCatalogCount,
        total: searchResult.total,
        page: searchResult.page,
        totalPages: searchResult.totalPages,
        count: searchResult.items.length,
        stocks: searchResult.items.map((s) => ({
          ...s,
          nseSymbol: s.quoteSymbol, // backward compatibility
        })),
      });
    }

    // If requested, attach live real-time market quotes
    const symbolsToQuote = searchResult.items.slice(0, 30).map((s) => s.quoteSymbol);
    const quotes = await fetchMultipleQuotes(symbolsToQuote);
    const quoteMap = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));

    const stocksWithQuotes = searchResult.items.map((stock) => {
      const live =
        quoteMap.get(stock.quoteSymbol.toUpperCase()) ||
        quoteMap.get(stock.symbol.toUpperCase());
      return {
        ...stock,
        nseSymbol: stock.quoteSymbol, // backward compatibility
        quote: live || null,
      };
    });

    return NextResponse.json({
      success: true,
      totalCatalogCount,
      total: searchResult.total,
      page: searchResult.page,
      totalPages: searchResult.totalPages,
      count: stocksWithQuotes.length,
      stocks: stocksWithQuotes,
    });
  } catch (error) {
    console.error("Error in unified market search route:", error);
    return NextResponse.json(
      { success: false, message: "Failed to search multi-market catalog." },
      { status: 500 }
    );
  }
}
