"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useSimulator } from "@/lib/store";
import { TICKERS } from "@/lib/mock-data";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

const BORDER_COLORS = [
  "border-l-blue-500",
  "border-l-cyan-500",
  "border-l-amber-500",
  "border-l-emerald-500",
  "border-l-purple-500",
  "border-l-lime-500",
];

export default function PositionsPage() {
  const { positions, totalPortfolioValue, currency } = useSimulator();
  const [selectedFilter, setSelectedFilter] = useState("All");

  // Fallback initial positions in real Indian equities if none active yet
  const displayPositions = positions.length > 0 ? positions : [
    {
      symbol: "RELIANCE.NS",
      name: "Reliance Industries Limited",
      shares: 15,
      avgBuyPrice: 2890.0,
      currentPrice: 2987.5,
      totalValue: 44812.5,
      unrealizedPnL: 1462.5,
      unrealizedPnLPercent: 3.37,
      sector: "Energy",
      portfolioWeight: 35.0,
    },
    {
      symbol: "TCS.NS",
      name: "Tata Consultancy Services",
      shares: 10,
      avgBuyPrice: 3950.0,
      currentPrice: 4180.2,
      totalValue: 41802.0,
      unrealizedPnL: 2302.0,
      unrealizedPnLPercent: 5.83,
      sector: "Technology",
      portfolioWeight: 32.5,
    },
    {
      symbol: "HDFCBANK.NS",
      name: "HDFC Bank Limited",
      shares: 15,
      avgBuyPrice: 1680.0,
      currentPrice: 1664.8,
      totalValue: 24972.0,
      unrealizedPnL: -228.0,
      unrealizedPnLPercent: -0.91,
      sector: "Banking",
      portfolioWeight: 19.4,
    },
    {
      symbol: "TATAMOTORS.NS",
      name: "Tata Motors Limited",
      shares: 20,
      avgBuyPrice: 940.0,
      currentPrice: 984.6,
      totalValue: 19692.0,
      unrealizedPnL: 892.0,
      unrealizedPnLPercent: 4.74,
      sector: "Automobile",
      portfolioWeight: 15.3,
    },
    {
      symbol: "INFY.NS",
      name: "Infosys Limited",
      shares: 10,
      avgBuyPrice: 1840.0,
      currentPrice: 1892.3,
      totalValue: 18923.0,
      unrealizedPnL: 523.0,
      unrealizedPnLPercent: 2.84,
      sector: "Technology",
      portfolioWeight: 14.7,
    },
    {
      symbol: "SBIN.NS",
      name: "State Bank of India",
      shares: 25,
      avgBuyPrice: 770.0,
      currentPrice: 798.1,
      totalValue: 19952.5,
      unrealizedPnL: 702.5,
      unrealizedPnLPercent: 3.65,
      sector: "Banking",
      portfolioWeight: 15.5,
    },
  ];

  const totalPnL = displayPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  const filters = ["All", "Technology", "Banking", "Energy", "Automobile"];

  const filteredPositions = selectedFilter === "All"
    ? displayPositions
    : displayPositions.filter((p) => p.sector?.toLowerCase() === selectedFilter.toLowerCase());

  return (
    <div className="space-y-6">
      {/* 1. Top 3 Stat Cards matching screenshot 5 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Balance */}
        <div className="fintech-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Balance
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-foreground mt-1 tabular-nums">
              {formatCurrency(totalPortfolioValue, currency)}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Total Change */}
        <div className="fintech-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Change
            </span>
            <div
              className={cn(
                "text-xl sm:text-2xl font-extrabold mt-1 tabular-nums",
                totalPnL >= 0 ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {totalPnL >= 0 ? "+" : "-"}
              {formatCurrency(Math.abs(totalPnL), currency)}
            </div>
          </div>
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              totalPnL >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            )}
          >
            {totalPnL >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Linked Accounts / Open Positions */}
        <div className="fintech-card p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Active Holdings
            </span>
            <div className="text-xl sm:text-2xl font-extrabold text-foreground mt-1 tabular-nums">
              {displayPositions.length} Positions
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. Filter Pills matching screenshot 5 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0",
              selectedFilter === filter
                ? "bg-muted text-foreground border border-border shadow-xs"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* 3. Two-Column Card Grid with colored left border accents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPositions.map((pos, idx) => {
          const borderClass = BORDER_COLORS[idx % BORDER_COLORS.length];
          const isProfit = pos.unrealizedPnL >= 0;
          const ticker = TICKERS[pos.symbol] || {
            logoBg: "bg-blue-600 text-white",
            logoLetter: pos.symbol.charAt(0),
          };

          return (
            <div
              key={pos.symbol}
              className={cn(
                "fintech-card p-5 space-y-4 border-l-4 transition-all hover:border-border hover:shadow-lg relative group",
                borderClass
              )}
            >
              {/* Card Header: Brand Logo + Company Name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs",
                      ticker.logoBg
                    )}
                  >
                    {ticker.logoLetter}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {pos.name}
                    </h3>
                    <span className="font-mono text-[11px] text-muted-foreground block">
                      Equity Holding · ****{pos.shares} shares
                    </span>
                  </div>
                </div>
              </div>

              {/* Large Balance in Tabular Figures */}
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums tracking-tight">
                  {formatCurrency(pos.totalValue, currency)}
                </div>
              </div>

              {/* Footer Line: +$1,240.00 (5.2%) in green + Clock timestamp */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                <div
                  className={cn(
                    "flex items-center gap-1 font-semibold font-mono tabular-nums",
                    isProfit ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {isProfit ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isProfit ? "+" : ""}
                    {formatCurrency(pos.unrealizedPnL, currency)} ({formatPercent(pos.unrealizedPnLPercent)})
                  </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground text-[11px] font-medium">
                  <Clock className="h-3 w-3" />
                  <span>Today</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Dashed 'Link New Position / Open Trade' Card */}
        <Link
          href="/trade"
          className="fintech-card p-6 border-dashed border-2 border-border/80 hover:border-primary/50 hover:bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all min-h-[160px] rounded-xl"
        >
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-foreground">
            <Plus className="h-4 w-4" />
          </div>
          <span className="text-xs font-bold">Open New Simulated Position</span>
        </Link>
      </div>
    </div>
  );
}
