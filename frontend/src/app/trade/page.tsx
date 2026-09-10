"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import confetti from "canvas-confetti";
import { useSimulator } from "@/lib/store";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { ChartPoint } from "@/lib/market-api";
import { Search, RotateCcw } from "lucide-react";

const QUICK_MARKET_SYMBOLS = [
  { symbol: "RELIANCE.NS", label: "RELIANCE" },
  { symbol: "NVDA", label: "NVIDIA" },
  { symbol: "AAPL", label: "APPLE" },
  { symbol: "TCS.NS", label: "TCS" },
  { symbol: "TSLA", label: "TESLA" },
  { symbol: "HDFCBANK.NS", label: "HDFC BANK" },
  { symbol: "MSFT", label: "MICROSOFT" },
  { symbol: "INFY.NS", label: "INFOSYS" },
  { symbol: "AMZN", label: "AMAZON" },
  { symbol: "ETERNAL.NS", label: "ZOMATO" },
  { symbol: "HAL.NS", label: "HAL" },
  { symbol: "SUZLON.NS", label: "SUZLON" },
];

function TradeTerminalContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") || "RELIANCE.NS";

  const { cash, executePaperTrade, positions } = useSimulator();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const isGlobalStock = !selectedSymbol.endsWith(".NS") && !selectedSymbol.startsWith("^");
  const symbolCurrency = isGlobalStock ? "USD" : "INR";
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [orderMode, setOrderMode] = useState<"Market" | "Limit" | "Stop">("Market");
  const [shares, setShares] = useState<string>("10");
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [chartRange, setChartRange] = useState<"1d" | "5d" | "1mo" | "1y">("1d");
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState("");
  const [symbolSearchResults, setSymbolSearchResults] = useState<Array<{ symbol: string; nseSymbol: string; name: string }>>([]);
  const [isSearchingSymbols, setIsSearchingSymbols] = useState(false);

  const [liveQuote, setLiveQuote] = useState<{
    price: number;
    change: number;
    changePercent: number;
    name: string;
    dayHigh: number;
    dayLow: number;
    volume: number;
    sector: string;
  }>({
    price: 1274.0,
    change: 12.4,
    changePercent: 0.98,
    name: "Reliance Industries Limited",
    dayHigh: 1285.0,
    dayLow: 1262.0,
    volume: 3400000,
    sector: "Energy & Conglomerate",
  });

  // Fetch live real-time quote
  const fetchQuote = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(sym)}`);
      if (res.ok) {
        const data = await res.json();
        const q = data.quotes?.[0];
        if (q) {
          setLiveQuote({
            price: q.price,
            change: q.change,
            changePercent: q.changePercent,
            name: q.name,
            dayHigh: q.dayHigh,
            dayLow: q.dayLow,
            volume: q.volume,
            sector: q.sector || "Equities",
          });
        }
      }
    } catch (e) {
      console.error("Failed to load quote for trade terminal:", e);
    }
  }, []);

  // Fetch real historical chart
  const fetchChart = useCallback(async (sym: string, range: "1d" | "5d" | "1mo" | "1y") => {
    setIsChartLoading(true);
    try {
      const res = await fetch(`/api/market/chart?symbol=${encodeURIComponent(sym)}&range=${range}`);
      if (res.ok) {
        const data = await res.json();
        if (data.points && Array.isArray(data.points)) {
          setChartPoints(data.points);
        }
      }
    } catch (e) {
      console.error("Failed to load chart points:", e);
    } finally {
      setIsChartLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const t = setTimeout(() => {
      if (isMounted) {
        void fetchQuote(selectedSymbol);
        void fetchChart(selectedSymbol, chartRange);
      }
    }, 0);

    const interval = setInterval(() => {
      if (isMounted) void fetchQuote(selectedSymbol);
    }, 2000); // 2s live polling up to seconds

    return () => {
      isMounted = false;
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [selectedSymbol, chartRange, fetchQuote, fetchChart]);

  // Handle symbol search input
  const handleSymbolSearch = async (val: string) => {
    setSymbolSearchQuery(val);
    if (val.trim().length < 2) {
      setSymbolSearchResults([]);
      return;
    }
    setIsSearchingSymbols(true);
    try {
      const res = await fetch(`/api/market/search?q=${encodeURIComponent(val.trim())}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        if (data.stocks) {
          setSymbolSearchResults(data.stocks);
        }
      }
    } catch (e) {
      console.warn("Search symbol failed:", e);
    } finally {
      setIsSearchingSymbols(false);
    }
  };

  const numShares = parseInt(shares) || 0;
  const currentPrice = liveQuote.price;
  const totalCost = numShares * currentPrice;
  const position = positions.find((p) => p.symbol === selectedSymbol);

  const cleanDisplaySymbol = selectedSymbol.replace(/\.NS$/, "").replace(/\.BO$/, "");

  // Generate dynamic Level 2 Order Book centered around live Indian Rupee price
  const orderBook = {
    asks: [
      { price: currentPrice * 1.002, size: 450, total: 1850 },
      { price: currentPrice * 1.0015, size: 320, total: 1400 },
      { price: currentPrice * 1.001, size: 680, total: 1080 },
      { price: currentPrice * 1.0005, size: 400, total: 400 },
    ],
    bids: [
      { price: currentPrice * 0.9995, size: 520, total: 520 },
      { price: currentPrice * 0.999, size: 710, total: 1230 },
      { price: currentPrice * 0.9985, size: 430, total: 1660 },
      { price: currentPrice * 0.998, size: 890, total: 2550 },
    ],
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numShares <= 0) return;

    const res = await executePaperTrade({
      symbol: selectedSymbol,
      type: tradeType,
      shares: numShares,
      price: currentPrice,
    });

    setMessage({ text: res.message, success: res.success });
    if (res.success) {
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      } catch {
        // Fallback
      }
    }
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner: Active NSE Ticker Quote Header */}
      <div className="fintech-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-base shrink-0">
            {cleanDisplaySymbol.slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">{cleanDisplaySymbol}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                NSE:EQ
              </span>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground truncate max-w-[150px]">
                {liveQuote.sector}
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium truncate max-w-sm mt-0.5">
              {liveQuote.name}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-2xl font-black font-mono text-foreground">
                {formatCurrency(currentPrice, "INR")}
              </span>
              <div
                className={cn(
                  "flex items-center text-xs font-bold font-mono px-2 py-0.5 rounded-md",
                  liveQuote.change >= 0
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                )}
              >
                {liveQuote.change >= 0 ? "+" : ""}
                {formatPercent(liveQuote.changePercent)}
                <span className="ml-1 text-[11px] opacity-80">
                  ({liveQuote.change >= 0 ? "+" : ""}{formatCurrency(liveQuote.change, "INR")})
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live 15s (NSE)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Indian Ticker Switcher & Search */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={symbolSearchQuery}
              onChange={(e) => handleSymbolSearch(e.target.value)}
              placeholder="Search all 2,298 NSE stocks..."
              className="w-full sm:w-64 pl-8 pr-8 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-primary placeholder:text-muted-foreground font-medium"
            />
            {isSearchingSymbols && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {symbolSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-lg border border-border bg-card shadow-2xl p-1 max-h-56 overflow-y-auto">
                {symbolSearchResults.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => {
                      setSelectedSymbol(item.nseSymbol);
                      setSymbolSearchQuery("");
                      setSymbolSearchResults([]);
                    }}
                    className="w-full text-left p-2 rounded hover:bg-muted text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-bold text-foreground">{item.symbol}</span>
                      <span className="text-[11px] text-muted-foreground block truncate max-w-[180px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-primary font-bold">Select</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-md scrollbar-none">
            {QUICK_MARKET_SYMBOLS.map((item) => (
              <button
                key={item.symbol}
                onClick={() => setSelectedSymbol(item.symbol)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all whitespace-nowrap",
                  selectedSymbol === item.symbol
                    ? "border-primary bg-primary/15 text-primary shadow-2xs"
                    : "border-border bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Terminal Grid: Real Live Chart + Order Book + Order Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Chart & Order Book */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real Live Chart Container */}
          <div className="fintech-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Interactive Live Price Chart (₹)
                </span>
                <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Stream
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
                {(["1d", "5d", "1mo", "1y"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setChartRange(tf)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors font-bold uppercase",
                      chartRange === tf
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[340px] w-full relative">
              {isChartLoading && (
                <div className="absolute inset-0 bg-card/60 backdrop-blur-xs flex items-center justify-center z-10">
                  <RotateCcw className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              {chartPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartPoints}>
                    <defs>
                      <linearGradient id="tradeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                      opacity={0.3}
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      domain={["dataMin - 2", "dataMax + 2"]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => isGlobalStock ? `$${v.toLocaleString("en-US")}` : `₹${v.toLocaleString("en-IN")}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].value as number;
                        const pt = payload[0].payload as ChartPoint;
                        return (
                          <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-xl space-y-1 font-mono">
                            <div className="text-[10px] text-muted-foreground">{pt.date}</div>
                            <div className="font-bold text-foreground text-sm">
                              {formatCurrency(p, symbolCurrency)}
                            </div>
                            {pt.volume > 0 && (
                              <div className="text-[10px] text-muted-foreground">
                                Vol: {pt.volume.toLocaleString("en-IN")}
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#tradeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Loading real-time price history...
                </div>
              )}
            </div>
          </div>

          {/* Simulated Level 2 Order Book Depth in ₹ */}
          <div className="fintech-card p-5 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Level 2 Market Depth (NSE Bids & Asks in ₹)
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Bids */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 block uppercase">
                  Bids (Buyer Orders)
                </span>
                {orderBook.bids.map((b, i) => (
                  <div
                    key={i}
                    className="flex justify-between p-1.5 rounded bg-emerald-500/5 font-mono border border-emerald-500/10"
                  >
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(b.price, "INR")}
                    </span>
                    <span className="text-muted-foreground">{b.size} shs</span>
                  </div>
                ))}
              </div>

              {/* Asks */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-rose-400 block uppercase">
                  Asks (Seller Orders)
                </span>
                {orderBook.asks.map((a, i) => (
                  <div
                    key={i}
                    className="flex justify-between p-1.5 rounded bg-rose-500/5 font-mono border border-rose-500/10"
                  >
                    <span className="font-bold text-rose-400">
                      {formatCurrency(a.price, "INR")}
                    </span>
                    <span className="text-muted-foreground">{a.size} shs</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Order Execution Ticket in ₹ */}
        <div className="fintech-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="font-bold text-sm text-foreground">
              NSE Order Execution
            </h3>
            <span className="rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 border border-emerald-500/20">
              Live Paper ₹
            </span>
          </div>

          <form onSubmit={handleExecute} className="space-y-4 text-xs">
            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 rounded-lg bg-muted/60 p-1 font-semibold">
              <button
                type="button"
                onClick={() => setTradeType("BUY")}
                className={cn(
                  "py-2 rounded-md transition-all text-center font-bold",
                  tradeType === "BUY"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                BUY (Long)
              </button>
              <button
                type="button"
                onClick={() => setTradeType("SELL")}
                className={cn(
                  "py-2 rounded-md transition-all text-center font-bold",
                  tradeType === "SELL"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                SELL (Short/Exit)
              </button>
            </div>

            {/* Order Type */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Order Execution Type
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["Market", "Limit", "Stop"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setOrderMode(m)}
                    className={cn(
                      "py-1.5 rounded-lg border text-center font-bold transition-colors",
                      orderMode === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Shares Input */}
            <div className="space-y-1">
              <label className="text-muted-foreground font-medium block">
                Quantity (NSE Equity Lots)
              </label>
              <input
                type="number"
                min="1"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground font-mono font-bold focus:outline-primary text-sm"
              />
            </div>

            {/* Cost Breakdown in ₹ */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Live NSE Price:</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(currentPrice, "INR")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">Estimated Order Total:</span>
                <span className="font-black text-foreground text-sm">
                  {formatCurrency(totalCost, "INR")}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px] pt-1 border-t border-border/60">
                <span className="font-sans">Simulated Available Cash:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(cash, "INR")}
                </span>
              </div>
              {position && (
                <div className="flex justify-between text-muted-foreground text-[11px]">
                  <span className="font-sans">Currently Holding:</span>
                  <span className="font-bold text-primary">
                    {position.shares} shares (@ {formatCurrency(position.avgBuyPrice, "INR")})
                  </span>
                </div>
              )}
            </div>

            {/* Notification message */}
            {message && (
              <div
                className={cn(
                  "p-3 rounded-lg text-xs font-semibold",
                  message.success
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                )}
              >
                {message.text}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={numShares <= 0 || (tradeType === "BUY" && totalCost > cash)}
              className={cn(
                "w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md",
                tradeType === "BUY"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-rose-600 hover:bg-rose-500"
              )}
            >
              {tradeType === "BUY" ? "Place Buy Order (₹)" : "Place Sell Order (₹)"}
            </button>
            <p className="text-[10px] text-center text-muted-foreground">
              Direct simulated paper execution on live NSE feeds • No real financial capital at risk
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense
      fallback={
        <div className="fintech-card p-12 text-center text-xs text-muted-foreground">
          Loading NSE Trading Terminal...
        </div>
      }
    >
      <TradeTerminalContent />
    </Suspense>
  );
}
