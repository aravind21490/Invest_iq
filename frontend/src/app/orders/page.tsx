"use client";

import React, { useState } from "react";
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Hash,
  MoreHorizontal,
  Download,
} from "lucide-react";
import { useSimulator } from "@/lib/store";
import { TICKERS } from "@/lib/mock-data";
import { formatCurrency, cn } from "@/lib/utils";

export default function TradeHistoryPage() {
  const { trades, currency } = useSimulator();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // 1. Summary calculations
  const totalBought = trades
    .filter((t) => t.type === "BUY")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSold = trades
    .filter((t) => t.type === "SELL")
    .reduce((acc, t) => acc + t.amount, 0);

  const largestTrade = Math.max(...trades.map((t) => t.amount), 0);
  const tradeCount = trades.length;

  const filteredTrades = trades.filter((t) => {
    const matchSearch =
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "ALL" || t.type === typeFilter;
    const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const toggleSelectAll = () => {
    if (selectedTrades.length === filteredTrades.length) {
      setSelectedTrades([]);
    } else {
      setSelectedTrades(filteredTrades.map((t) => t.id));
    }
  };

  const toggleSelectTrade = (id: string) => {
    setSelectedTrades((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = "Trade ID,Symbol,Type,Shares,Price,Amount,Date,Status\n";
    const rows = filteredTrades
      .map(
        (t) =>
          `${t.id},${t.symbol},${t.type},${t.shares},${t.price},${t.amount},"${t.timestamp}",${t.status}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `InvestIQ_TradeHistory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Trade History
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Complete ledger of simulated paper-trade executions and transaction fills
        </p>
      </div>

      {/* 1. Summary Row (Four Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Bought
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalBought, currency)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Cumulative paper purchases
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Sold
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {formatCurrency(totalSold, currency)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Realized paper proceeds
          </span>
        </div>

        <div className="fintech-card p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Largest Trade
            </span>
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {formatCurrency(largestTrade, currency)}
          </div>
          <span className="text-[11px] text-muted-foreground">Single order peak</span>
        </div>

        <div className="fintech-card p-4 sm:p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trade Count
            </span>
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {tradeCount} Orders
          </div>
          <span className="text-[11px] text-muted-foreground">100% Filled</span>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="fintech-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Input with magnifying-glass icon */}
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trades..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-primary"
            />
          </div>

          {/* Two dropdown filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="Filled">Filled</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select className="px-2.5 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-primary">
              <option value="ALL">All Sectors</option>
              <option value="Tech">Technology</option>
              <option value="Cyclical">Consumer Cyclical</option>
              <option value="Comm">Communication</option>
              <option value="Energy">Energy</option>
            </select>
          </div>
        </div>

        {/* Segmented Control (All / Buy / Sell) + CSV Export */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
            {(["ALL", "BUY", "SELL"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-3 py-1 rounded-md transition-all",
                  typeFilter === t
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "ALL" ? "All" : t === "BUY" ? "Buy" : "Sell"}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* 3. Table with Checkboxes, Logo + Sector tag, Sign-prefixed Amount, Status pill, and overflow menu */}
      <div className="fintech-card p-5 sm:p-6 space-y-4">
        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="pb-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      selectedTrades.length > 0 &&
                      selectedTrades.length === filteredTrades.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </th>
                <th className="pb-3 font-semibold">Ticker</th>
                <th className="pb-3 font-semibold">Trade ID</th>
                <th className="pb-3 font-semibold text-right">Amount</th>
                <th className="pb-3 font-semibold text-right">Date</th>
                <th className="pb-3 font-semibold text-center">Status</th>
                <th className="pb-3 font-semibold text-right w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {filteredTrades.map((trade) => {
                const ticker = TICKERS[trade.symbol] || {
                  sector: "Tech",
                  logoBg: "bg-muted text-foreground",
                  logoLetter: trade.symbol.charAt(0),
                };
                const isBuy = trade.type === "BUY";
                const isSelected = selectedTrades.includes(trade.id);

                return (
                  <tr
                    key={trade.id}
                    className={cn(
                      "hover:bg-muted/40 transition-colors group",
                      isSelected ? "bg-primary/5" : ""
                    )}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTrade(trade.id)}
                        className="rounded border-border"
                      />
                    </td>

                    {/* Ticker: Logo + Name + Sector tag pill */}
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0",
                            ticker.logoBg
                          )}
                        >
                          {ticker.logoLetter}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {trade.symbol}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-medium">
                            {ticker.sector}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Trade ID */}
                    <td className="py-3.5 font-mono text-[11px] text-muted-foreground">
                      {trade.id}
                    </td>

                    {/* Amount (colored, sign-prefixed) */}
                    <td
                      className={cn(
                        "py-3.5 text-right font-bold",
                        isBuy
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {isBuy ? "+" : "-"}
                      {formatCurrency(trade.amount, currency)}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 text-right text-muted-foreground text-[11px]">
                      {trade.timestamp}
                    </td>

                    {/* Status pill (Filled / Pending / Cancelled) */}
                    <td className="py-3.5 text-center">
                      <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 border border-emerald-500/20">
                        {trade.status}
                      </span>
                    </td>

                    {/* Row-hover "···" overflow menu */}
                    <td className="py-3.5 text-right">
                      <button className="p-1 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
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
