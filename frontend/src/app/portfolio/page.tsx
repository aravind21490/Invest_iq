"use client";

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { TICKERS } from "@/lib/mock-data";
import { useSimulator } from "@/lib/store";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

const TICKER_TAPE = [
  { symbol: "RELIANCE.NS", price: 2987.5, change: 0.82 },
  { symbol: "TCS.NS", price: 4180.2, change: 1.45 },
  { symbol: "HDFCBANK.NS", price: 1664.8, change: -0.35 },
  { symbol: "TATAMOTORS.NS", price: 984.6, change: 2.15 },
  { symbol: "INFY.NS", price: 1892.3, change: 1.1 },
  { symbol: "SBIN.NS", price: 798.1, change: 0.74 },
  { symbol: "ITC.NS", price: 496.5, change: 0.28 },
  { symbol: "BHARTIARTL.NS", price: 1582.0, change: 1.62 },
];

const PERFORMANCE_DATA: Record<string, { label: string; portfolio: number; sp500: number }[]> = {
  "1M": [
    { label: "W1", portfolio: 100000, sp500: 101200 },
    { label: "W2", portfolio: 104500, sp500: 103400 },
    { label: "W3", portfolio: 112800, sp500: 106100 },
    { label: "W4", portfolio: 128450, sp500: 109800 },
  ],
  "3M": [
    { label: "Jun", portfolio: 98500, sp500: 100000 },
    { label: "Jul", portfolio: 106200, sp500: 102500 },
    { label: "Aug", portfolio: 115400, sp500: 105800 },
    { label: "Sep", portfolio: 128450, sp500: 109800 },
  ],
  "6M": [
    { label: "Apr", portfolio: 95000, sp500: 97500 },
    { label: "May", portfolio: 101200, sp500: 101000 },
    { label: "Jun", portfolio: 109800, sp500: 103500 },
    { label: "Jul", portfolio: 114500, sp500: 105000 },
    { label: "Aug", portfolio: 121000, sp500: 107200 },
    { label: "Sep", portfolio: 128450, sp500: 109800 },
  ],
  "1Y": [
    { label: "Oct", portfolio: 90000, sp500: 94000 },
    { label: "Dec", portfolio: 97500, sp500: 99500 },
    { label: "Feb", portfolio: 104200, sp500: 102800 },
    { label: "Apr", portfolio: 112000, sp500: 104600 },
    { label: "Jun", portfolio: 119800, sp500: 107000 },
    { label: "Sep", portfolio: 128450, sp500: 109800 },
  ],
};

const SECTOR_PIE = [
  { name: "Information Technology", value: 52400, percent: 40.8, color: "#3b82f6" },
  { name: "Energy & Conglomerate", value: 34800, percent: 27.1, color: "#10b981" },
  { name: "Banking & Finance", value: 24600, percent: 19.2, color: "#f59e0b" },
  { name: "Automobile", value: 16650, percent: 12.9, color: "#8b5cf6" },
];

export default function PortfolioInvestmentsPage() {
  const { positions, currency, maskedBalance } = useSimulator();
  const [timeframe, setTimeframe] = useState<"1M" | "3M" | "6M" | "1Y">("1M");
  const [sortField, setSortField] = useState<string>("totalValue");
  const [sortAsc, setSortAsc] = useState(false);

  // Sparkline trend points for Indian NSE assets
  const mockSparklines: Record<string, number[]> = {
    "RELIANCE.NS": [1240, 1248, 1255, 1262, 1268, 1274],
    "TCS.NS": [2180, 2190, 2210, 2195, 2200, 2204.1],
    "TMPV.NS": [945, 955, 962, 970, 978, 984.6],
    "HDFCBANK.NS": [680, 684, 688, 690, 692, 693.8],
    "INFY.NS": [1015, 1022, 1028, 1030, 1034, 1036.5],
    "SBIN.NS": [985, 992, 998, 1002, 1006, 1009.7],
    "HAL.NS": [4820, 4850, 4890, 4910, 4930, 4950],
    "BEL.NS": [392, 396, 399, 401, 403, 405],
    "IRFC.NS": [78.5, 79.2, 79.8, 80.2, 80.8, 81.1],
    "SUZLON.NS": [42.1, 42.8, 43.2, 43.6, 44.0, 44.2],
    "ETERNAL.NS": [310, 314, 317, 319, 320.5, 322.1],
  };

  const sortedPositions = [...positions].sort((a, b) => {
    const aRecord = a as unknown as Record<string, number | string | undefined>;
    const bRecord = b as unknown as Record<string, number | string | undefined>;
    const aVal = Number(aRecord[sortField]) || 0;
    const bVal = Number(bRecord[sortField]) || 0;
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Live Ticker Tape Strip */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto py-2.5 px-4 shadow-2xs">
        <div className="flex items-center gap-6 min-w-max">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-r border-border pr-3">
            Live Quotes
          </span>
          {TICKER_TAPE.map((t) => (
            <div key={t.symbol} className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-foreground">{t.symbol}</span>
              <span className="text-muted-foreground font-mono">
                ${t.price.toFixed(2)}
              </span>
              <span
                className={cn(
                  "flex items-center text-[11px]",
                  t.change >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {t.change >= 0 ? "+" : ""}
                {t.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Top Two-Column Row: Donut (left) + Performance Chart (right, wider) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Portfolio Allocation Donut */}
        <div className="lg:col-span-5 fintech-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base text-foreground tracking-tight">
              Portfolio Allocation
            </h3>
            <span className="text-xs text-muted-foreground">Asset Distribution</span>
          </div>

          {/* Donut Chart with center label: Top holding name, value, percentage */}
          <div className="relative h-[210px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SECTOR_PIE}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {SECTOR_PIE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center label showing top sector name, dollar value, and % */}
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-xs font-semibold text-muted-foreground">
                Technology
              </span>
              <span className="text-lg font-bold text-foreground">
                {maskedBalance ? "••••" : formatCurrency(64733, currency)}
              </span>
              <span className="text-xs font-bold text-primary">50.4%</span>
            </div>
          </div>

          {/* Legend list below with colored dots, sector name, and right-aligned percentage */}
          <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
            {SECTOR_PIE.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-muted-foreground">
                    {formatCurrency(item.value, currency)}
                  </span>
                  <span className="font-bold text-foreground w-10 text-right">
                    {item.percent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (7 cols, wider): Performance Chart */}
        <div className="lg:col-span-7 fintech-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base text-foreground tracking-tight">
                Performance vs Benchmark
              </h3>
              <span className="text-xs text-muted-foreground">
                Simulated Portfolio Return vs Nifty 50 Benchmark Index
              </span>
            </div>

            {/* Timeframe Tab Group (1M / 3M / 6M / 1Y, active pill) */}
            <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
              {(["1M", "3M", "6M", "1Y"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all",
                    timeframe === tf
                      ? "bg-card text-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Line Chart with solid "My Portfolio" and dashed "Nifty 50" */}
          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={PERFORMANCE_DATA[timeframe]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload.find((x) => x.dataKey === "portfolio")?.value as number;
                    const s = payload.find((x) => x.dataKey === "sp500")?.value as number;

                    return (
                      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-xl space-y-1">
                        <div className="font-semibold text-foreground border-b border-border/50 pb-1">
                          {label}
                        </div>
                        <div className="flex justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                          <span>My Portfolio:</span>
                          <span className="font-bold">{formatCurrency(p, currency)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-muted-foreground">
                          <span>S&amp;P 500 Index:</span>
                          <span>{formatCurrency(s, currency)}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sp500"
                  stroke="#71717a"
                  strokeWidth={1.75}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Small legend beneath chart */}
          <div className="flex items-center justify-center gap-6 text-xs pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="h-2 w-5 rounded-full bg-emerald-500" />
              <span className="font-medium text-foreground">My Portfolio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-5 border-t-2 border-dashed border-zinc-400" />
              <span className="text-muted-foreground">S&amp;P 500 Benchmark</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Holdings Table (Full Width Below) */}
      <div className="fintech-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-foreground tracking-tight">
              Holdings Breakdown
            </h3>
            <span className="text-xs text-muted-foreground">
              Current open simulated equity positions
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {positions.length} active positions
          </span>
        </div>

        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th
                  onClick={() => toggleSort("symbol")}
                  className="pb-3 cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center gap-1">
                    <span>Asset</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("shares")}
                  className="pb-3 text-right cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Qty</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="pb-3 text-right">Avg Buy</th>
                <th className="pb-3 text-right">Current</th>
                <th
                  onClick={() => toggleSort("unrealizedPnLPercent")}
                  className="pb-3 text-right cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>P&amp;L %</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("unrealizedPnL")}
                  className="pb-3 text-right cursor-pointer hover:text-foreground"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>P&amp;L $</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="pb-3 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {sortedPositions.map((pos) => {
                const ticker = TICKERS[pos.symbol] || {
                  logoBg: "bg-muted text-foreground",
                  logoLetter: pos.symbol.charAt(0),
                };
                const isProfit = pos.unrealizedPnL >= 0;
                const sparkData = mockSparklines[pos.symbol] || [100, 105, 102, 108, 112];

                return (
                  <tr key={pos.symbol} className="hover:bg-muted/40 transition-colors">
                    {/* Asset: Logo + Name + Ticker subtext */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                            ticker.logoBg
                          )}
                        >
                          {ticker.logoLetter}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground block">
                            {pos.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {pos.symbol}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="py-3.5 text-right font-medium text-foreground">
                      {pos.shares}
                    </td>

                    {/* Avg Buy */}
                    <td className="py-3.5 text-right text-muted-foreground">
                      {formatCurrency(pos.avgBuyPrice, currency)}
                    </td>

                    {/* Current */}
                    <td className="py-3.5 text-right font-semibold text-foreground">
                      {formatCurrency(pos.currentPrice, currency)}
                    </td>

                    {/* P&L % with trend arrow icon */}
                    <td className="py-3.5 text-right">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-bold text-xs",
                          isProfit
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {isProfit ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        )}
                        {formatPercent(pos.unrealizedPnLPercent)}
                      </span>
                    </td>

                    {/* P&L $ */}
                    <td
                      className={cn(
                        "py-3.5 text-right font-semibold",
                        isProfit
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {isProfit ? "+" : ""}
                      {formatCurrency(pos.unrealizedPnL, currency)}
                    </td>

                    {/* Trend column with tiny inline sparkline chart */}
                    <td className="py-3.5 text-center">
                      <Sparkline
                        data={sparkData}
                        width={75}
                        height={22}
                        isPositive={isProfit}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
