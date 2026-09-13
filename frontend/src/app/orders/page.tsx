"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Hash,
  MoreHorizontal,
  Download,
  Sparkles,
  X,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useSimulator, Trade } from "@/lib/store";
import { TICKERS } from "@/lib/mock-data";
import { formatCurrency, cn } from "@/lib/utils";

export default function TradeHistoryPage() {
  const { trades, currency, debriefsByTradeId } = useSimulator();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // Stored debrief modal state
  const [debriefModalTrade, setDebriefModalTrade] = useState<Trade | null>(null);
  const [modalDebriefData, setModalDebriefData] = useState<any | null>(null);
  const [isLoadingDebrief, setIsLoadingDebrief] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);

  const handleOpenDebrief = async (trade: Trade) => {
    setDebriefModalTrade(trade);
    setDebriefError(null);

    // 1. Check client store cache first (0 network calls)
    if (debriefsByTradeId && debriefsByTradeId[trade.id]) {
      setModalDebriefData(debriefsByTradeId[trade.id]);
      setIsLoadingDebrief(false);
      return;
    }

    // 2. Pure read from GET /api/agents/debrief?tradeId=... (0 LLM calls, read-only from agent_runs)
    setIsLoadingDebrief(true);
    try {
      const res = await fetch(`/api/agents/debrief?tradeId=${encodeURIComponent(trade.id)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data && (data.success || data.debrief)) {
        setModalDebriefData(data.debrief || data);
      } else {
        setDebriefError(
          data?.message || "No stored debrief found for this trade in the audit ledger."
        );
      }
    } catch (err: any) {
      setDebriefError("Could not retrieve stored debrief.");
    } finally {
      setIsLoadingDebrief(false);
    }
  };

  const handleCloseDebrief = () => {
    setDebriefModalTrade(null);
    setModalDebriefData(null);
    setDebriefError(null);
    setIsLoadingDebrief(false);
  };

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
          {/* Search Input */}
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

          {/* Dropdown filters */}
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

      {/* 3. Table with Checkboxes, Logo + Sector tag, Amount, Date, Status, AI Debrief button */}
      <div className="fintech-card p-5 sm:p-6 space-y-4">
        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full text-left border-collapse min-w-[750px]">
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
                <th className="pb-3 font-semibold text-center">AI Analysis</th>
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
                const hasCachedDebrief = Boolean(debriefsByTradeId?.[trade.id]);

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

                    {/* AI Debrief Action: Pure Read of Stored Debrief */}
                    <td className="py-3.5 text-center">
                      {trade.type === "SELL" ? (
                        <button
                          onClick={() => handleOpenDebrief(trade)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border",
                            hasCachedDebrief
                              ? "bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25"
                              : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                          )}
                          title="View stored AI post-trade debrief (zero LLM calls)"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>AI Debrief</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">
                          Exit only
                        </span>
                      )}
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

      {/* 4. AI Post-Trade Debrief Modal (Stored debrief view - pure read) */}
      {debriefModalTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fintech-card max-w-xl w-full bg-card border border-border shadow-2xl p-6 space-y-5 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      AI Post-Trade Debrief
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground tracking-wider uppercase">
                      Stored Record
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {debriefModalTrade.symbol} • {debriefModalTrade.id} • {debriefModalTrade.timestamp}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseDebrief}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            {isLoadingDebrief ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground">
                  Retrieving pre-computed debrief from audit ledger...
                </span>
              </div>
            ) : debriefError ? (
              <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-center">
                <AlertCircle className="h-6 w-6 text-amber-400 mx-auto" />
                <p className="text-xs text-muted-foreground">{debriefError}</p>
                <p className="text-[11px] text-muted-foreground">
                  Debriefs are generated once when an exit (SELL) order is executed and stored in the database.
                </p>
              </div>
            ) : modalDebriefData ? (
              <div className="space-y-4">
                {/* Metric Summary Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Realized P&amp;L
                    </span>
                    <div
                      className={cn(
                        "text-base font-bold",
                        (modalDebriefData.realized_pnl ?? debriefModalTrade.pnl ?? 0) >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      )}
                    >
                      {(modalDebriefData.realized_pnl ?? debriefModalTrade.pnl ?? 0) >= 0 ? "+" : ""}
                      {formatCurrency(
                        modalDebriefData.realized_pnl ?? debriefModalTrade.pnl ?? 0,
                        currency
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Trade Outcome
                    </span>
                    <div className="text-xs font-bold text-foreground">
                      {(modalDebriefData.realized_pnl ?? debriefModalTrade.pnl ?? 0) >= 0 ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Profitable Exit
                        </span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Managed Loss
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Setup Win Rate
                    </span>
                    <div className="text-xs font-bold text-foreground">
                      {modalDebriefData.setup_win_rate
                        ? `${Math.round(modalDebriefData.setup_win_rate * 100)}% Historical`
                        : modalDebriefData.win_rate
                        ? `${Math.round(modalDebriefData.win_rate * 100)}% Win Rate`
                        : "Empirical Setup"}
                    </div>
                  </div>
                </div>

                {/* Entry Setup Mechanics */}
                {modalDebriefData.setup_at_entry && (
                  <div className="p-3.5 rounded-xl bg-muted/30 border border-border/80 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Technical Setup At Entry
                    </span>
                    <p className="text-xs text-foreground">
                      {modalDebriefData.setup_at_entry}
                    </p>
                  </div>
                )}

                {/* Debrief Summary */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    AI Execution Review
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {modalDebriefData.summary ||
                      modalDebriefData.explanation ||
                      modalDebriefData.content ||
                      "Trade execution analysis stored upon transaction settlement."}
                  </p>
                </div>

                {/* Lesson Learned / Discipline Focus */}
                {(modalDebriefData.lesson_learned || modalDebriefData.takeaway) && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>Key Discipline Lesson</span>
                    </div>
                    <p className="text-xs text-amber-200 leading-relaxed">
                      {modalDebriefData.lesson_learned || modalDebriefData.takeaway}
                    </p>
                  </div>
                )}

                {/* Educational Disclaimer & Cache Notice */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Stored debrief • Pure read (0 LLM tokens consumed)
                  </span>
                  <button
                    onClick={handleCloseDebrief}
                    className="px-3 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground font-semibold transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
