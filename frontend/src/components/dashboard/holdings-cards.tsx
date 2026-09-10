"use client";

import React from "react";
import { INITIAL_HOLDINGS_CARDS } from "@/lib/mock-data";
import { useSimulator } from "@/lib/store";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Layers, ArrowRight } from "lucide-react";
import Link from "next/link";

export function HoldingsCards() {
  const { maskedBalance, currency } = useSimulator();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">
            Simulated Holdings & Baskets
          </h3>
        </div>
        <Link
          href="/portfolio"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {INITIAL_HOLDINGS_CARDS.map((card) => {
          const isPositive = card.change24h >= 0;

          return (
            <div
              key={card.id}
              className="fintech-card p-4 space-y-3 relative overflow-hidden group"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    {card.badge}
                  </span>
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {card.title}
                  </h4>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md",
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{formatPercent(card.change24h)}</span>
                </div>
              </div>

              {/* Balance */}
              <div>
                <div className="text-xl font-bold tracking-tight text-foreground">
                  {maskedBalance ? "••••••••" : formatCurrency(card.value, currency)}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {card.shareOfPortfolio}% of paper portfolio
                </span>
              </div>

              {/* Progress Bar & Constituents */}
              <div className="space-y-1.5 pt-1">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${card.shareOfPortfolio}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
                  <span className="font-medium">Constituents:</span>
                  <div className="flex gap-1">
                    {card.symbols.map((sym) => (
                      <span
                        key={sym}
                        className="rounded bg-muted px-1.5 py-0.2 font-mono font-medium text-foreground/80"
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
