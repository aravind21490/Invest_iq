"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Trash2,
} from "lucide-react";
import { TICKERS } from "@/lib/mock-data";
import { useSimulator } from "@/lib/store";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

export default function WatchlistPage() {
  const { watchlist, toggleWatchlist, currency } = useSimulator();
  const [filter, setFilter] = useState<"ALL" | "GAINERS" | "LOSERS">("ALL");

  const watchlistTickers = Object.values(TICKERS).filter((t) =>
    watchlist.includes(t.symbol)
  );

  const filteredTickers = watchlistTickers.filter((t) => {
    if (filter === "GAINERS") return t.change >= 0;
    if (filter === "LOSERS") return t.change < 0;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Simulated Watchlist & Alerts
          </h2>
          <p className="text-xs text-muted-foreground">
            Track potential trade candidates with AI algorithmic flags
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
          {(["ALL", "GAINERS", "LOSERS"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all",
                filter === f
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Watchlist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTickers.map((ticker) => {
          const isPositive = ticker.change >= 0;

          return (
            <div
              key={ticker.symbol}
              className="fintech-card p-5 space-y-3.5 group hover:border-primary/40 transition-all"
            >
              {/* Card Top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                      ticker.logoBg
                    )}
                  >
                    {ticker.logoLetter}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {ticker.symbol}
                    </h3>
                    <span className="text-xs text-muted-foreground truncate max-w-[160px] block">
                      {ticker.name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => toggleWatchlist(ticker.symbol)}
                  className="text-muted-foreground hover:text-rose-500 p-1 rounded-md transition-colors"
                  title="Remove from watchlist"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Price & Change */}
              <div className="flex items-baseline justify-between pt-1">
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {formatCurrency(ticker.price, currency)}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md",
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {formatPercent(ticker.changePercent)}
                  </span>
                </div>
              </div>

              {/* Mini Stats Bar */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/40 text-muted-foreground">
                <div>
                  <span className="block">Market Cap</span>
                  <span className="font-semibold text-foreground">
                    {ticker.marketCap}
                  </span>
                </div>
                <div>
                  <span className="block">24h Volume</span>
                  <span className="font-semibold text-foreground">
                    {ticker.volume}
                  </span>
                </div>
              </div>

              {/* AI Flag & Trade Trigger */}
              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  <Sparkles className="h-3 w-3" />
                  {isPositive ? "Bullish Momentum" : "Support Test"}
                </span>

                <Link
                  href={`/trade?symbol=${ticker.symbol}`}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <span>Trade</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
