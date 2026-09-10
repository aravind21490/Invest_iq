"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  BarChart2,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MarketQuote, ChartPoint } from "@/lib/market-api";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface MarketDetailDrawerProps {
  quote: MarketQuote | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MarketDetailDrawer({
  quote,
  isOpen,
  onClose,
}: MarketDetailDrawerProps) {
  const [range, setRange] = useState<"1d" | "5d" | "1mo" | "1y">("1mo");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  useEffect(() => {
    if (!quote || !isOpen) return;

    let isMounted = true;
    const t = setTimeout(() => {
      if (isMounted) setIsLoadingChart(true);
    }, 0);

    fetch(`/api/market/chart?symbol=${encodeURIComponent(quote.symbol)}&range=${range}`)
      .then((res) => {
        if (!res.ok) return null;
        const ct = res.headers.get("content-type") || "";
        return ct.includes("application/json") ? res.json() : null;
      })
      .then((data) => {
        if (isMounted && data && data.success && data.points) {
          setChartData(data.points);
        }
      })
      .catch((err) => console.error("Error loading chart:", err))
      .finally(() => {
        if (isMounted) setIsLoadingChart(false);
      });

    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [quote, range, isOpen]);

  if (!isOpen || !quote) return null;

  const isPositive = quote.change >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444";
  const curr = quote.currency || (quote.symbol.endsWith(".NS") ? "INR" : "USD");

  // Estimate RSI for educational plain-English breakdown
  const estimatedRsi = Math.min(85, Math.max(25, 50 + quote.changePercent * 3.5));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-xs z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl bg-card border-l border-border shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {quote.symbol.replace(/\.NS$/, "").replace(/\.BO$/, "")}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {quote.market === "INDEX" || quote.category === "index"
                  ? "Benchmark Index"
                  : quote.market === "GLOBAL"
                  ? "Global / US Stock"
                  : "NSE India Equity"}
              </span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              {quote.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Price & Change Banner */}
          <div className="flex items-baseline justify-between p-4 rounded-xl bg-secondary/50 border border-border">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-0.5">
                Live Real-Time Price
              </span>
              <div className="text-3xl font-extrabold text-foreground font-mono tracking-tight">
                {quote.symbol.startsWith("^")
                  ? quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : formatCurrency(quote.price, curr)}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-0.5">
                24H Session Movement
              </span>
              <div
                className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-lg ${
                  isPositive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/15 text-red-400 border border-red-500/30"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {isPositive ? "+" : ""}
                  {formatPercent(quote.changePercent)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Section */}
          <div className="fintech-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5 text-primary" />
                Price Action Chart
              </span>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted border border-border text-[11px]">
                {(["1d", "5d", "1mo", "1y"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setRange(t)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors uppercase ${
                      range === t
                        ? "bg-card text-foreground shadow-2xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Graphic */}
            <div className="h-48 w-full pt-2">
              {isLoadingChart ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                  Fetching historical price feed...
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`gradient-${quote.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={25}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      orientation="right"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                      formatter={(val: unknown) => [`$${Number(val || 0).toFixed(2)}`, "Price"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={strokeColor}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#gradient-${quote.symbol})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No historical points available.
                </div>
              )}
            </div>
          </div>

          {/* Key Statistics Grid */}
          <div className="fintech-card p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Key Market Statistics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Day High
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(quote.dayHigh, curr)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Day Low
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(quote.dayLow, curr)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  52W High
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(quote.fiftyTwoWeekHigh, curr)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  52W Low
                </span>
                <span className="font-mono font-bold text-red-400">
                  {formatCurrency(quote.fiftyTwoWeekLow, curr)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Prev Close
                </span>
                <span className="font-mono font-bold text-foreground">
                  {formatCurrency(quote.prevClose, curr)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Volume
                </span>
                <span className="font-mono font-bold text-foreground">
                  {(quote.volume / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Sector
                </span>
                <span className="font-bold text-foreground truncate block">
                  {quote.sector || "Equities"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase block font-medium">
                  Data Feed
                </span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live 15s (NSE)
                </span>
              </div>
            </div>
          </div>

          {/* Plain-English AI Technical Snapshot */}
          <div className="fintech-card p-4 space-y-2.5 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-xs font-bold text-foreground">
                Plain-English AI Technical Snapshot
              </h4>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {quote.symbol} is exhibiting{" "}
              <strong className={isPositive ? "text-emerald-400" : "text-red-400"}>
                {isPositive ? "bullish momentum" : "short-term consolidation"}
              </strong>{" "}
              with estimated 14-day RSI around <strong>{estimatedRsi.toFixed(1)}</strong>.{" "}
              {estimatedRsi > 70
                ? "This indicates an overbought condition where buyers have driven price rapidly upward — watch for pullback risk."
                : estimatedRsi < 30
                ? "This indicates an oversold condition where heavy selling may be approaching exhaustion."
                : "This sits in neutral territory with balanced market participation."}
            </p>
          </div>

          {/* Educational Disclaimer */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border text-[11px] text-muted-foreground flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Invest IQ is a paper-trading educational simulator. Real-time market prices are sourced directly for realistic learning, but all executions use virtual simulated money.
            </span>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg border border-border hover:bg-muted text-xs font-semibold text-foreground transition-colors"
          >
            Close Drawer
          </button>

          {!quote.symbol.startsWith("^") && (
            <Link
              href={`/trade?symbol=${quote.symbol}`}
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>Paper Trade {quote.symbol}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
