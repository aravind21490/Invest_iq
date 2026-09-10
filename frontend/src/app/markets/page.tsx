"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Activity,
  Zap,
} from "lucide-react";
import { MarketQuote } from "@/lib/market-api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { MarketDetailDrawer } from "@/components/markets/market-detail-drawer";

const MARKET_TABS = [
  { id: "all", label: "All Markets", badge: "2,400+ Stocks" },
  { id: "nse", label: "NSE India", badge: "2,298 Equities" },
  { id: "global", label: "Global & US", badge: "100+ Mega-Caps" },
  { id: "index", label: "Benchmark Indices", badge: "Global & Indian" },
] as const;

const SECTOR_FILTERS = [
  { id: "all", label: "All Sectors" },
  { id: "tech", label: "Technology & AI" },
  { id: "banking", label: "Banking & Financials" },
  { id: "pharma", label: "Healthcare & Pharma" },
  { id: "auto", label: "Automobile & EV" },
  { id: "energy", label: "Energy & Power" },
  { id: "consumer", label: "Consumer & FMCG" },
  { id: "defense", label: "Defense & Aerospace" },
  { id: "metals", label: "Metals & Mining" },
] as const;

function formatVolume(vol: number, currency: "INR" | "USD" = "INR"): string {
  if (!vol) return "--";
  if (currency === "INR") {
    if (vol >= 10000000) return `${(vol / 10000000).toFixed(2)} Cr`;
    if (vol >= 100000) return `${(vol / 100000).toFixed(2)} L`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
  } else {
    if (vol >= 1000000000) return `${(vol / 1000000000).toFixed(2)} B`;
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)} M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(1)} K`;
  }
  return vol.toString();
}

export default function MarketsPage() {
  const [marketTab, setMarketTab] = useState<"all" | "nse" | "global" | "index">("all");
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [searchResults, setSearchResults] = useState<MarketQuote[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [sortBy, setSortBy] = useState<"default" | "gainers" | "losers" | "price" | "name">("default");
  const [selectedQuote, setSelectedQuote] = useState<MarketQuote | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(2); // Default to 2s ultra-live stream
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Pagination for 2000+ browsing
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCatalogCount, setTotalCatalogCount] = useState(2400);

  // Price Tick Flash Tracking (Second-by-second updates)
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const [priceFlashes, setPriceFlashes] = useState<Record<string, "up" | "down">>({});

  // Countdown timer for next tick
  const [countdown, setCountdown] = useState<number>(refreshIntervalSec);

  // Load quotes from unified API
  const loadQuotes = useCallback(async () => {
    try {
      let url = `/api/market/search?market=${marketTab}&page=${page}&limit=35&includeQuotes=true`;
      if (sectorFilter !== "all") {
        url += `&sector=${encodeURIComponent(sectorFilter)}`;
      }

      const res = await fetch(url);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        const newQuotes: MarketQuote[] = (data.stocks || [])
          .filter((s: { quote?: MarketQuote | null }) => s.quote)
          .map((s: { quote: MarketQuote }) => s.quote);

        // Detect price changes for tick flash animation
        const newFlashes: Record<string, "up" | "down"> = {};
        for (const q of newQuotes) {
          const prev = prevPricesRef.current.get(q.symbol);
          if (prev !== undefined && prev !== q.price) {
            newFlashes[q.symbol] = q.price > prev ? "up" : "down";
          }
          prevPricesRef.current.set(q.symbol, q.price);
        }

        if (Object.keys(newFlashes).length > 0) {
          setPriceFlashes(newFlashes);
          setTimeout(() => {
            setPriceFlashes({});
          }, 800);
        }

        setQuotes(newQuotes);
        setTotalPages(data.totalPages || 1);
        setTotalCatalogCount(data.total || data.totalCatalogCount || 2400);
        setLastRefreshed(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
        setError(null);
      }
    } catch {
      // Keep cached quotes if connection blips
    } finally {
      setIsLoading(false);
      setCountdown(refreshIntervalSec);
    }
  }, [marketTab, page, sectorFilter, refreshIntervalSec]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const t = setTimeout(() => {
      if (isMounted) void loadQuotes();
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [loadQuotes]);

  // Second-by-second countdown and polling interval
  useEffect(() => {
    if (!autoRefresh || refreshIntervalSec <= 0) return;

    const intervalTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void loadQuotes();
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [autoRefresh, refreshIntervalSec, loadQuotes]);

  // Dynamic server-side search across ALL 2,400+ Indian and Global stocks
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      const q = searchQuery.trim();
      if (q.length < 2) {
        if (isMounted) {
          setSearchResults(null);
          setIsSearching(false);
        }
        return;
      }

      if (isMounted) setIsSearching(true);
      try {
        const res = await fetch(
          `/api/market/search?q=${encodeURIComponent(q)}&market=${marketTab}&includeQuotes=true&limit=30`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            const mappedQuotes: MarketQuote[] = (data.stocks || [])
              .filter((s: { quote?: MarketQuote | null }) => s.quote)
              .map((s: { quote: MarketQuote }) => s.quote);
            setSearchResults(mappedQuotes);
          }
        }
      } catch (err) {
        console.warn("Search fetch failed:", err);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    }, 300); // 300ms responsive debounce

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, marketTab]);

  // Sort active dataset
  const activeDataset = searchResults !== null ? searchResults : quotes;

  const sortedQuotes = useMemo(() => {
    return [...activeDataset].sort((a, b) => {
      if (sortBy === "gainers") return b.changePercent - a.changePercent;
      if (sortBy === "losers") return a.changePercent - b.changePercent;
      if (sortBy === "price") return b.price - a.price;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [activeDataset, sortBy]);

  const handleRowClick = (quote: MarketQuote) => {
    setSelectedQuote(quote);
    setIsDrawerOpen(true);
  };

  // Premier benchmark indices for top ticker
  const topIndices: MarketQuote[] = useMemo(() => {
    const defaultIndices: MarketQuote[] = [
      {
        symbol: "^NSEI",
        name: "NIFTY 50",
        price: 23477.8,
        change: 84.5,
        changePercent: 0.36,
        prevClose: 23393.3,
        dayHigh: 23520.0,
        dayLow: 23410.0,
        volume: 4500000,
        fiftyTwoWeekHigh: 26277.0,
        fiftyTwoWeekLow: 21280.0,
        sparkline: [23390, 23420, 23477],
        category: "index",
        sector: "Indian Benchmark",
        market: "INDEX",
        currency: "INR",
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "^BSESN",
        name: "SENSEX",
        price: 74902.6,
        change: 245.2,
        changePercent: 0.33,
        prevClose: 74657.4,
        dayHigh: 75100.0,
        dayLow: 74750.0,
        volume: 3200000,
        fiftyTwoWeekHigh: 85978.0,
        fiftyTwoWeekLow: 70000.0,
        sparkline: [74650, 74800, 74902],
        category: "index",
        sector: "Indian Benchmark",
        market: "INDEX",
        currency: "INR",
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "^GSPC",
        name: "S&P 500",
        price: 5610.2,
        change: 32.4,
        changePercent: 0.58,
        prevClose: 5577.8,
        dayHigh: 5625.0,
        dayLow: 5580.0,
        volume: 3800000000,
        fiftyTwoWeekHigh: 5669.0,
        fiftyTwoWeekLow: 4103.0,
        sparkline: [5577, 5595, 5610],
        category: "index",
        sector: "US Benchmark",
        market: "INDEX",
        currency: "USD",
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "^IXIC",
        name: "NASDAQ",
        price: 17520.8,
        change: 142.1,
        changePercent: 0.82,
        prevClose: 17378.7,
        dayHigh: 17580.0,
        dayLow: 17400.0,
        volume: 4900000000,
        fiftyTwoWeekHigh: 18671.0,
        fiftyTwoWeekLow: 12543.0,
        sparkline: [17380, 17460, 17520],
        category: "index",
        sector: "Tech Benchmark",
        market: "INDEX",
        currency: "USD",
        updatedAt: new Date().toISOString(),
      },
    ];

    const liveIndices = quotes.filter((q) => q.symbol.startsWith("^"));
    return liveIndices.length >= 2 ? liveIndices.slice(0, 4) : defaultIndices;
  }, [quotes]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Live {refreshIntervalSec}s Stream • Up to Seconds
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-mono">
                {totalCatalogCount.toLocaleString()}+ Total Securities
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>Global & Indian Markets</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              2,400+ Shares
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time streaming quotes for all 2,298+ Indian NSE stocks (₹) &amp; premier Global / US market titans ($) updated live every {refreshIntervalSec} seconds.
          </p>
        </div>

        {/* Live Refresh Status & Frequency Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto bg-card/80 p-2 rounded-xl border border-border">
          {/* Frequency selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline font-medium">Update:</span>
            <select
              value={refreshIntervalSec}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setRefreshIntervalSec(val);
                setCountdown(val);
              }}
              className="px-2 py-1 rounded bg-muted text-xs font-bold text-foreground border border-border focus:outline-none"
            >
              <option value="2">⚡ 2s (Ultra-Live)</option>
              <option value="5">5s (Real-Time)</option>
              <option value="10">10s (Standard)</option>
            </select>
          </div>

          {/* Auto-sync button */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium flex items-center gap-1.5 ${
              autoRefresh
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : "bg-muted border-border text-muted-foreground"
            }`}
            title="Toggle live background updates"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
            <span>{autoRefresh ? `Tick: ${countdown}s` : "PAUSED"}</span>
          </button>

          {/* Sync Now button */}
          <button
            onClick={() => {
              setIsLoading(true);
              void loadQuotes();
            }}
            disabled={isLoading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`h-3 w-3 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span>{isLoading ? "Syncing..." : "Sync"}</span>
          </button>

          {lastRefreshed && (
            <span className="text-[10px] text-muted-foreground font-mono hidden md:inline">
              {lastRefreshed}
            </span>
          )}
        </div>
      </div>

      {/* Top Benchmark Indices Strip (India & Global) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {topIndices.map((idx) => {
          const isPos = idx.change >= 0;
          const curr = idx.currency || (idx.symbol.startsWith("^NSE") || idx.symbol.startsWith("^BSE") ? "INR" : "USD");
          return (
            <button
              key={idx.symbol}
              onClick={() => handleRowClick(idx)}
              className="fintech-card p-3.5 text-left hover:border-primary/40 transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span className="truncate">{idx.name}</span>
                <span className={`flex items-center gap-0.5 font-mono ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                  {isPos ? "+" : ""}
                  {formatPercent(idx.changePercent)}
                </span>
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-foreground mt-1">
                {idx.symbol.startsWith("^")
                  ? idx.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : formatCurrency(idx.price, curr)}
              </div>
              <div className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                {idx.sector || "Index"} • {curr}
              </div>
            </button>
          );
        })}
      </div>

      {/* Primary Market Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MARKET_TABS.map((tab) => {
          const active = marketTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setMarketTab(tab.id as typeof marketTab);
                setPage(1);
                setSearchQuery("");
                setSearchResults(null);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                active
                  ? "bg-primary/15 border-primary/40 text-primary shadow-xs"
                  : "bg-card border-border hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="font-bold text-xs sm:text-sm text-foreground flex items-center justify-between">
                <span>{tab.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                {tab.badge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Instant Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
          {/* Universal Search across all 2,400+ Indian & Global shares */}
          <div className="relative flex-1 max-w-lg">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 2,400+ stocks (e.g. RELIANCE, NVDA, AAPL, TCS, TSLA, MSFT, HAL...)"
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-primary placeholder:text-muted-foreground font-medium"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <RotateCcw className="h-3.5 w-3.5 animate-spin text-primary" />
              </div>
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Controls: Sort & View Toggle */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "default" | "gainers" | "losers" | "price" | "name")}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-primary"
            >
              <option value="default">Default Market Order</option>
              <option value="gainers">Top Gainers (%)</option>
              <option value="losers">Top Losers (%)</option>
              <option value="price">Highest Price</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>

            <div className="flex items-center p-1 rounded-lg bg-muted border border-border">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1 rounded ${
                  viewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
                title="Table View"
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1 rounded ${
                  viewMode === "grid" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Sector Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SECTOR_FILTERS.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSectorFilter(cat.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                sectorFilter === cat.id
                  ? "bg-primary/15 border-primary/40 text-primary font-bold shadow-2xs"
                  : "bg-card/60 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={loadQuotes}
            className="px-3 py-1 rounded-md bg-red-500/20 text-red-300 font-semibold hover:bg-red-500/30"
          >
            Retry Feed
          </button>
        </div>
      )}

      {/* Search results banner if active */}
      {searchResults !== null && (
        <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center justify-between">
          <span>
            Showing <strong className="text-primary font-bold">{sortedQuotes.length}</strong> live results matching &quot;{searchQuery}&quot; across Indian &amp; Global markets
          </span>
          <button
            onClick={() => setSearchQuery("")}
            className="text-primary font-semibold hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Main Content: Table or Grid */}
      {isLoading && quotes.length === 0 ? (
        <div className="fintech-card p-12 text-center space-y-3 animate-pulse">
          <div className="h-6 w-56 bg-muted rounded mx-auto" />
          <p className="text-xs text-muted-foreground">
            Connecting to live institutional stream across Indian NSE &amp; Global markets...
          </p>
        </div>
      ) : sortedQuotes.length === 0 ? (
        <div className="fintech-card p-12 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">No matching stocks found</p>
          <p className="text-xs text-muted-foreground">
            Try searching by ticker (e.g. RELIANCE, NVDA, AAPL, TCS, TSLA, INFY) or company name.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW WITH LIVE PRICE FLASH */
        <div className="fintech-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4">Market &amp; Asset</th>
                  <th className="py-3.5 px-4 text-right">Live Price</th>
                  <th className="py-3.5 px-4 text-right">24H Movement</th>
                  <th className="py-3.5 px-4 text-right">Day Range</th>
                  <th className="py-3.5 px-4 text-right">52W Range</th>
                  <th className="py-3.5 px-4 text-right">Volume</th>
                  <th className="py-3.5 px-4 text-center">Trend</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedQuotes.map((q) => {
                  const isPos = q.change >= 0;
                  const spark = q.sparkline || [];
                  const min = spark.length ? Math.min(...spark) : 0;
                  const max = spark.length ? Math.max(...spark) : 1;
                  const range = max - min || 1;

                  const points = spark
                    .map((val, idx) => {
                      const x = (idx / (spark.length - 1 || 1)) * 90 + 5;
                      const y = 28 - ((val - min) / range) * 20;
                      return `${x},${y}`;
                    })
                    .join(" ");

                  const cleanSymbol = q.symbol.replace(/\.NS$/, "").replace(/\.BO$/, "");
                  const curr = q.currency || (q.symbol.endsWith(".NS") ? "INR" : "USD");
                  const flash = priceFlashes[q.symbol];

                  return (
                    <tr
                      key={q.symbol}
                      onClick={() => handleRowClick(q)}
                      className={`cursor-pointer transition-colors group ${
                        flash === "up"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : flash === "down"
                          ? "bg-rose-500/20 text-rose-300"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      {/* Asset & Ticker */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {cleanSymbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">{cleanSymbol}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                                  curr === "USD"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {curr === "USD" ? (q.symbol.startsWith("^") ? "INDEX" : "US:GLOBAL") : "NSE:EQ"}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate block max-w-[200px]">
                              {q.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80 truncate block">
                              {q.sector}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Live Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground text-sm">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded transition-all ${
                            flash === "up"
                              ? "bg-emerald-500/30 text-emerald-400 font-black scale-105"
                              : flash === "down"
                              ? "bg-rose-500/30 text-rose-400 font-black scale-105"
                              : ""
                          }`}
                        >
                          {q.symbol.startsWith("^")
                            ? q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                            : formatCurrency(q.price, curr)}
                        </span>
                      </td>

                      {/* 24h Change */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className={`inline-flex items-center gap-1 font-mono font-bold ${
                            isPos ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span>
                            {isPos ? "+" : ""}
                            {formatPercent(q.changePercent)}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {isPos ? "+" : ""}
                          {q.symbol.startsWith("^") ? q.change.toFixed(2) : formatCurrency(q.change, curr)}
                        </div>
                      </td>

                      {/* Day Range */}
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono text-[11px]">
                        <span>{formatCurrency(q.dayLow, curr)}</span>
                        <span className="mx-1 text-border">/</span>
                        <span>{formatCurrency(q.dayHigh, curr)}</span>
                      </td>

                      {/* 52W Range */}
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono text-[11px]">
                        <span>{formatCurrency(q.fiftyTwoWeekLow, curr)}</span>
                        <span className="mx-1 text-border">-</span>
                        <span>{formatCurrency(q.fiftyTwoWeekHigh, curr)}</span>
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground text-[11px]">
                        {formatVolume(q.volume, curr)}
                      </td>

                      {/* Sparkline */}
                      <td className="py-3 px-4 text-center">
                        {spark.length > 1 ? (
                          <svg className="w-20 h-6 inline-block overflow-visible" viewBox="0 0 100 30">
                            <polyline
                              fill="none"
                              stroke={isPos ? "#10b981" : "#f43f5e"}
                              strokeWidth="1.75"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={points}
                            />
                          </svg>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">--</span>
                        )}
                      </td>

                      {/* Trade Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(q);
                          }}
                          className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[11px] font-bold text-primary inline-flex items-center gap-1 transition-colors"
                        >
                          <span>Trade</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar for browsing 2000+ stocks */}
          {searchResults === null && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/20 text-xs">
              <span className="text-muted-foreground">
                Showing Page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalCatalogCount.toLocaleString()}+ total listed securities)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 font-mono font-bold px-2 text-foreground">
                  <span>{page}</span> / <span>{totalPages}</span>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CARD GRID VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedQuotes.map((q) => {
              const isPos = q.change >= 0;
              const spark = q.sparkline || [];
              const min = spark.length ? Math.min(...spark) : 0;
              const max = spark.length ? Math.max(...spark) : 1;
              const range = max - min || 1;
              const points = spark
                .map((val, idx) => {
                  const x = (idx / (spark.length - 1 || 1)) * 90 + 5;
                  const y = 28 - ((val - min) / range) * 20;
                  return `${x},${y}`;
                })
                .join(" ");

              const cleanSymbol = q.symbol.replace(/\.NS$/, "").replace(/\.BO$/, "");
              const curr = q.currency || (q.symbol.endsWith(".NS") ? "INR" : "USD");
              const flash = priceFlashes[q.symbol];

              return (
                <div
                  key={q.symbol}
                  onClick={() => handleRowClick(q)}
                  className={`fintech-card p-4 cursor-pointer hover:border-primary/50 transition-all group space-y-3 ${
                    flash === "up"
                      ? "ring-2 ring-emerald-500/60 bg-emerald-500/10"
                      : flash === "down"
                      ? "ring-2 ring-rose-500/60 bg-rose-500/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm">
                        {cleanSymbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground text-sm">{cleanSymbol}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-medium ${
                              curr === "USD"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {curr === "USD" ? "US:GLOBAL" : "NSE:EQ"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate block max-w-[170px]">
                          {q.name}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded font-mono ${
                        isPos ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
                      }`}
                    >
                      {isPos ? "+" : ""}
                      {formatPercent(q.changePercent)}
                    </div>
                  </div>

                  <div className="text-[11px] text-muted-foreground truncate">
                    {q.sector}
                  </div>

                  {/* Price and Sparkline Row */}
                  <div className="flex items-end justify-between pt-2 border-t border-border/60">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Live Price
                      </span>
                      <span className="text-lg font-black font-mono text-foreground">
                        {q.symbol.startsWith("^")
                          ? q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : formatCurrency(q.price, curr)}
                      </span>
                    </div>

                    {spark.length > 1 && (
                      <svg className="w-24 h-8 overflow-visible" viewBox="0 0 100 30">
                        <polyline
                          fill="none"
                          stroke={isPos ? "#10b981" : "#f43f5e"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination bar for card grid view */}
          {searchResults === null && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card text-xs">
              <span className="text-muted-foreground">
                Page <strong className="text-foreground">{page}</strong> of{" "}
                <strong className="text-foreground">{totalPages}</strong> ({totalCatalogCount.toLocaleString()}+ listed securities)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 font-semibold flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 font-mono font-bold px-2 text-foreground">
                  <span>{page}</span> / <span>{totalPages}</span>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over Asset Detail Drawer */}
      <MarketDetailDrawer
        quote={selectedQuote}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
