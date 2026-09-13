"use client";

import React, { useState } from "react";
import { Send, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import { TICKERS, TickerInfo } from "@/lib/mock-data";
import { useSimulator } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";

const RECENT_NSE_TICKERS = [
  { symbol: "RELIANCE.NS", label: "R", name: "Reliance Ind.", bg: "bg-blue-600 text-white" },
  { symbol: "TCS.NS", label: "T", name: "TCS", bg: "bg-indigo-600 text-white" },
  { symbol: "HDFCBANK.NS", label: "H", name: "HDFC Bank", bg: "bg-sky-600 text-white" },
  { symbol: "TATAMOTORS.NS", label: "TM", name: "Tata Motors", bg: "bg-emerald-600 text-white" },
  { symbol: "INFY.NS", label: "I", name: "Infosys", bg: "bg-violet-600 text-white" },
];

export function QuickTrade() {
  const { cash, currency, executePaperTrade } = useSimulator();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE.NS");
  const [shares, setShares] = useState<string>("5");
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fallbackTicker: TickerInfo = {
    symbol: selectedSymbol,
    name: "Indian Equity",
    price: 2987.5,
    change: 24.5,
    changePercent: 0.82,
    sector: "NSE",
    marketCap: "₹20.2L Cr",
    volume: "1.2M",
    logoBg: "bg-blue-600 text-white",
    logoLetter: selectedSymbol.charAt(0),
  };

  const currentTicker: TickerInfo = TICKERS[selectedSymbol] || fallbackTicker;
  const numShares = parseInt(shares) || 0;
  const estimatedCost = numShares * currentTicker.price;
  const canAfford = tradeType === "SELL" || cash >= estimatedCost;

  const [watchdogWarning, setWatchdogWarning] = useState<string | null>(null);

  const handleTrade = async (e?: React.FormEvent, bypassWarning: boolean = false) => {
    if (e) e.preventDefault();
    if (numShares <= 0) return;

    const result = await executePaperTrade({
      symbol: selectedSymbol,
      type: tradeType,
      shares: numShares,
      price: currentTicker.price,
      confirmedWarning: bypassWarning,
    });

    if (result.warning && result.requiresConfirmation && !bypassWarning) {
      setWatchdogWarning(result.message);
      return;
    }

    setWatchdogWarning(null);
    if (result.success) {
      setFeedback({ type: "success", message: result.message });
      try {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      } catch {
        // Confetti optional
      }
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", message: result.message });
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="fintech-card p-5 space-y-4">
      {/* Header matching 'Quick Transfer' & 'See All Contacts >' */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-foreground">Quick Trade</h3>
        <a
          href="/markets"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 font-medium"
        >
          <span>See All Stocks</span>
          <ChevronRight className="h-3 w-3" />
        </a>
      </div>

      {/* Row of avatar circles for recently traded stocks */}
      <div className="flex items-center gap-2">
        {RECENT_NSE_TICKERS.map((item) => {
          const isSelected = selectedSymbol === item.symbol;
          return (
            <button
              key={item.symbol}
              type="button"
              onClick={() => setSelectedSymbol(item.symbol)}
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs transition-all relative shrink-0",
                item.bg,
                isSelected
                  ? "ring-2 ring-white ring-offset-2 ring-offset-card scale-105"
                  : "opacity-75 hover:opacity-100"
              )}
              title={`${item.symbol} (${item.name})`}
            >
              {item.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setSelectedSymbol("ITC.NS")}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          title="More NSE equities"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Sublabel matching 'Sending to Sarah Chen' */}
      <div className="text-xs text-muted-foreground">
        Trading <span className="font-semibold text-foreground">{currentTicker.name}</span>{" "}
        <span className="font-mono text-zinc-400">({currentTicker.symbol})</span>
      </div>

      {/* Trading Form */}
      <form onSubmit={handleTrade} className="space-y-3">
        {/* Quantity / Amount Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Quantity (Shares)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-muted-foreground font-semibold text-xs">
              Qty
            </span>
            <input
              type="number"
              min="1"
              max="5000"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full pl-11 pr-24 py-2 rounded-lg border border-border bg-input/50 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
            <div className="absolute right-3 text-xs text-muted-foreground font-mono tabular-nums">
              ≈ {formatCurrency(estimatedCost, currency)}
            </div>
          </div>
        </div>

        {/* Watchdog Behavioral Warning Confirmation Banner */}
        {watchdogWarning && (
          <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Watchdog Notice</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              {watchdogWarning}
            </p>
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => handleTrade(undefined, true)}
                className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition"
              >
                Proceed
              </button>
              <button
                type="button"
                onClick={() => setWatchdogWarning(null)}
                className="px-2.5 py-1 rounded-md bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Buy / Sell selector and Submit Button */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setTradeType("BUY")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                tradeType === "BUY"
                  ? "bg-emerald-500 text-black font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setTradeType("SELL")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors",
                tradeType === "SELL"
                  ? "bg-rose-500 text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sell
            </button>
          </div>

          <button
            type="submit"
            disabled={!canAfford || numShares <= 0}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-bold text-xs transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
              tradeType === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
            )}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Execute {tradeType}</span>
          </button>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={cn(
              "text-[11px] p-2 rounded-md font-medium text-center",
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            )}
          >
            {feedback.message}
          </div>
        )}
      </form>
    </div>
  );
}
