import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { getUserPortfolio } from "@/lib/db";
import { fetchLiveQuote } from "@/lib/market-api";
import { getNseStock } from "@/lib/nse-catalog";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated" },
      { status: 401 }
    );
  }

  const { portfolio, positions, trades, learn } = getUserPortfolio(user.id);

  // Fetch live prices for all positions to calculate accurate real equity and P&L
  let positionsTotalValue = 0;
  let totalUnrealizedPnL = 0;
  let totalCostBasis = 0;

  const enrichedPositions = await Promise.all(
    positions.map(async (pos) => {
      const quote = await fetchLiveQuote(pos.symbol);
      const currentPrice = quote ? quote.price : pos.avgBuyPrice;
      const dayChangePercent = quote ? quote.changePercent : 0;
      const totalValue = Number((pos.shares * currentPrice).toFixed(2));
      const costBasis = pos.shares * pos.avgBuyPrice;
      const unrealizedPnL = Number((totalValue - costBasis).toFixed(2));
      const unrealizedPnLPercent = costBasis
        ? Number(((unrealizedPnL / costBasis) * 100).toFixed(2))
        : 0;

      positionsTotalValue += totalValue;
      totalUnrealizedPnL += unrealizedPnL;
      totalCostBasis += costBasis;

      const nseInfo = getNseStock(pos.symbol);

      return {
        id: pos.id,
        symbol: pos.symbol,
        name: pos.name || nseInfo?.name || pos.symbol,
        shares: pos.shares,
        avgBuyPrice: Number(pos.avgBuyPrice.toFixed(2)),
        currentPrice: Number(currentPrice.toFixed(2)),
        dayChangePercent,
        totalValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        sector: pos.sector || nseInfo?.sector || "Equities",
        updatedAt: pos.updatedAt,
      };
    })
  );

  const totalPortfolioValue = Number((portfolio.cashBalance + positionsTotalValue).toFixed(2));
  const totalReturn = Number((totalPortfolioValue - portfolio.initialBalance).toFixed(2));
  const totalReturnPercent = Number(
    ((totalReturn / portfolio.initialBalance) * 100).toFixed(2)
  );

  return NextResponse.json(
    {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        authProvider: user.authProvider,
      },
      portfolio: {
        cashBalance: Number(portfolio.cashBalance.toFixed(2)),
        initialBalance: portfolio.initialBalance,
        positionsTotalValue: Number(positionsTotalValue.toFixed(2)),
        totalPortfolioValue,
        totalCostBasis: Number(totalCostBasis.toFixed(2)),
        totalReturn,
        totalReturnPercent,
        unrealizedPnL: Number(totalUnrealizedPnL.toFixed(2)),
        updatedAt: portfolio.updatedAt,
      },
      positions: enrichedPositions,
      trades,
      learn,
    },
    { status: 200 }
  );
}
