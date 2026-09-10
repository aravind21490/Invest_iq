"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useSimulator } from "@/lib/store";
import { TICKERS } from "@/lib/mock-data";
import { formatCurrency, cn } from "@/lib/utils";

export function RecentTrades() {
  const { trades, currency } = useSimulator();

  // If no trades yet, provide sample initial executed trades in Indian equities
  const displayTrades = trades.length > 0 ? trades.slice(0, 6) : [
    {
      id: "INV_920076",
      symbol: "RELIANCE.NS",
      name: "Reliance Industries",
      type: "BUY" as const,
      shares: 10,
      price: 2987.5,
      amount: 29875.0,
      pnl: 1420.0,
      status: "Completed" as const,
      timestamp: "2026-04-10T10:30:00Z",
    },
    {
      id: "TXN_847291",
      symbol: "TCS.NS",
      name: "Tata Consultancy Services",
      type: "SELL" as const,
      shares: 5,
      price: 4180.2,
      amount: 20901.0,
      pnl: 2850.0,
      status: "Completed" as const,
      timestamp: "2026-04-09T14:15:00Z",
    },
    {
      id: "INV_918263",
      symbol: "HDFCBANK.NS",
      name: "HDFC Bank Limited",
      type: "BUY" as const,
      shares: 15,
      price: 1664.8,
      amount: 24972.0,
      pnl: -320.0,
      status: "Completed" as const,
      timestamp: "2026-04-08T11:20:00Z",
    },
    {
      id: "INV_773920",
      symbol: "TATAMOTORS.NS",
      name: "Tata Motors",
      type: "BUY" as const,
      shares: 20,
      price: 984.6,
      amount: 19692.0,
      pnl: 840.0,
      status: "Completed" as const,
      timestamp: "2026-04-07T09:45:00Z",
    },
    {
      id: "TXN_559831",
      symbol: "INFY.NS",
      name: "Infosys Limited",
      type: "BUY" as const,
      shares: 10,
      price: 1892.3,
      amount: 18923.0,
      pnl: 510.0,
      status: "Completed" as const,
      timestamp: "2026-04-06T15:10:00Z",
    },
    {
      id: "INV_882341",
      symbol: "ITC.NS",
      name: "ITC Limited",
      type: "BUY" as const,
      shares: 30,
      price: 496.5,
      amount: 14895.0,
      pnl: 210.0,
      status: "Completed" as const,
      timestamp: "2026-04-05T12:00:00Z",
    },
  ];

  return (
    <div className="fintech-card p-5 sm:p-6 space-y-4">
      {/* Header matching 'Recent Transactions' & 'See All >' */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-foreground tracking-tight">
          Recent Transactions
        </h3>

        <Link
          href="/orders"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 font-medium"
        >
          <span>See All</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Table matching reference screenshot exactly */}
      <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="pb-3 w-10">
                <input
                  type="checkbox"
                  className="rounded border-border bg-input/50 text-primary focus:ring-primary/40 h-3.5 w-3.5"
                  readOnly
                />
              </th>
              <th className="pb-3 font-semibold">Merchant / Asset</th>
              <th className="pb-3 font-semibold">Transaction ID</th>
              <th className="pb-3 font-semibold text-right">Amount</th>
              <th className="pb-3 font-semibold text-right">Date</th>
              <th className="pb-3 font-semibold text-center">Status</th>
              <th className="pb-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {displayTrades.map((trade) => {
              const ticker = TICKERS[trade.symbol] || {
                sector: "NSE Equity",
                logoBg: "bg-zinc-800 text-white",
                logoLetter: trade.symbol.charAt(0),
              };
              const isProfit = (trade.pnl || 0) >= 0;
              const dateStr = new Date(trade.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              });

              return (
                <tr
                  key={trade.id}
                  className="hover:bg-muted/40 transition-colors group"
                >
                  {/* Checkbox */}
                  <td className="py-3.5">
                    <input
                      type="checkbox"
                      className="rounded border-border bg-input/50 text-primary focus:ring-primary/40 h-3.5 w-3.5"
                    />
                  </td>

                  {/* Asset with logo avatar + category sublabel */}
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs",
                          ticker.logoBg
                        )}
                      >
                        {ticker.logoLetter}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">
                          {trade.name || trade.symbol}
                        </div>
                        <span className="inline-block rounded px-1.5 py-0.2 text-[10px] font-medium bg-muted text-muted-foreground mt-0.5">
                          {ticker.sector}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Transaction ID */}
                  <td className="py-3.5 font-mono text-[11px] text-muted-foreground">
                    {trade.id}
                  </td>

                  {/* Amount with green or white/red sign */}
                  <td
                    className={cn(
                      "py-3.5 text-right font-mono font-bold text-xs tabular-nums",
                      isProfit
                        ? "text-emerald-500"
                        : "text-foreground"
                    )}
                  >
                    {isProfit ? "+" : "-"}{formatCurrency(trade.amount, currency)}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 text-right text-muted-foreground font-medium text-[11px]">
                    {dateStr}
                  </td>

                  {/* Status Pill matching screenshot */}
                  <td className="py-3.5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border border-border bg-muted/50 text-foreground">
                      Completed
                    </span>
                  </td>

                  {/* Action Menu */}
                  <td className="py-3.5 text-right text-muted-foreground">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
