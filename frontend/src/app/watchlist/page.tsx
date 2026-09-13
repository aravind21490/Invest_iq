"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowRight,
  Trash2,
  PlusCircle,
  CheckCheck,
  Bot,
} from "lucide-react";
import { TICKERS } from "@/lib/mock-data";
import { useSimulator } from "@/lib/store";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface CuratorSuggestion {
  symbol: string;
  setup_title?: string;
  reason: string;
}

export default function WatchlistPage() {
  const {
    watchlist,
    toggleWatchlist,
    currency,
    curatorSuggestions,
    isCuratorLoading,
  } = useSimulator();
  const [filter, setFilter] = useState<"ALL" | "GAINERS" | "LOSERS">("ALL");
  const [curatorPicks, setCuratorPicks] = useState<CuratorSuggestion[]>([]);

  // Sync with store's curator suggestions if available
  useEffect(() => {
    if (curatorSuggestions && curatorSuggestions.length > 0) {
      setCuratorPicks(curatorSuggestions);
    }
  }, [curatorSuggestions]);

  // CRITICAL REQUIREMENT: Pure GET read only; never triggers run_daily_curation or consumes user's quota
  useEffect(() => {
    if (curatorSuggestions && curatorSuggestions.length > 0) return;
    fetch("/api/agents/curate", { method: "GET" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.suggestions)) {
          setCuratorPicks(data.suggestions);
        }
      })
      .catch((err) => console.debug("Watchlist curator GET fetch notice:", err));
  }, [curatorSuggestions]);


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
      {/* Header */}
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
                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
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

      {/* Curator Agent Curated Opportunities Shelf (Loading Skeleton) */}
      {isCuratorLoading && curatorPicks.length === 0 && (
        <div className="fintech-card p-5 space-y-3.5 border-violet-500/20 bg-gradient-to-br from-card via-card to-violet-950/10 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Sparkles className="h-4 w-4 animate-spin text-violet-400" />
              </div>
              <div className="space-y-1">
                <div className="h-3.5 w-36 bg-violet-500/20 rounded" />
                <div className="h-2.5 w-56 bg-muted/60 rounded" />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">
              Curator AI scanning momentum setups...
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-border/60 bg-card/40 space-y-2 h-28 flex flex-col justify-between"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-3.5 w-24 bg-violet-500/10 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 w-full bg-muted/60 rounded" />
                  <div className="h-2.5 w-3/4 bg-muted/40 rounded" />
                </div>
                <div className="h-3 w-20 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Curator Agent Curated Opportunities Shelf */}
      {curatorPicks.length > 0 && (

        <div className="fintech-card p-5 space-y-3.5 border-violet-500/30 bg-gradient-to-br from-card via-card to-violet-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-violet-500/15 text-violet-400 border border-violet-500/30 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>Curator AI Daily Setups</span>
                  <span className="rounded bg-violet-500/20 text-violet-300 text-[10px] px-1.5 py-0.2 font-mono font-semibold">
                    {curatorPicks.length} Recommended
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Algorithmic setups matching your risk profile and market momentum
                </p>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
              Cached daily run • Zero quota consumed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {curatorPicks.map((pick, idx) => {
              const inWatchlist = watchlist.includes(pick.symbol);
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border/80 bg-card/80 space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground font-mono">
                        {pick.symbol}
                      </span>
                      <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                        {pick.setup_title || "Momentum Setup"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pick.reason}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <Link
                      href={`/trade?symbol=${encodeURIComponent(pick.symbol)}`}
                      className="text-primary hover:underline font-semibold text-[11px] inline-flex items-center gap-1"
                    >
                      <span>Analyze Stock</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>

                    {inWatchlist ? (
                      <span className="text-emerald-400 font-semibold text-[11px] inline-flex items-center gap-1">
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>In Watchlist</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleWatchlist(pick.symbol)}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>+ Add to Watchlist</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
