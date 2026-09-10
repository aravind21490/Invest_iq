import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalChart } from "@/lib/market-api";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const range = (searchParams.get("range") || "1mo") as "1d" | "5d" | "1mo" | "1y";

    if (!symbol) {
      return NextResponse.json(
        { success: false, message: "Ticker symbol parameter is required." },
        { status: 400 }
      );
    }

    const points = await fetchHistoricalChart(symbol, range);

    return NextResponse.json(
      {
        success: true,
        symbol,
        range,
        points,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Error in market chart route:", error);
    return NextResponse.json(
      { success: false, message: "Chart service error" },
      { status: 500 }
    );
  }
}
