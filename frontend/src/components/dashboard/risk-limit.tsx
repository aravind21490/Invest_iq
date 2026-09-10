"use client";

import { Shield } from "lucide-react";
import { useSimulator } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function RiskLimit() {
  const { totalPortfolioValue, currency } = useSimulator();

  // Sector concentration limit
  const maxBudget = totalPortfolioValue * 0.3; // 30% budget
  const allocated = totalPortfolioValue * 0.245; // 24.5% allocated to Tech
  const headroom = maxBudget - allocated;
  const progressRatio = (allocated / maxBudget) * 100;

  return (
    <div className="fintech-card p-5 space-y-4">
      {/* Header with small shield icon top-right */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">
            Risk / Exposure Limit
          </h3>
          <span className="text-xs text-muted-foreground">Max Sector Cap</span>
        </div>
        <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
          <Shield className="h-4 w-4" />
        </div>
      </div>

      {/* "Budget" label with big figure */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground block font-medium">
          Budget
        </span>
        <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
          {formatCurrency(maxBudget, currency)}
        </div>
      </div>

      {/* Thin progress bar beneath */}
      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(100, progressRatio)}%` }}
          />
        </div>
      </div>

      {/* Two-column Allocated / Headroom row */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50 text-xs">
        <div>
          <span className="text-muted-foreground block text-[11px]">Allocated (Tech)</span>
          <span className="font-semibold text-foreground text-sm">
            {formatCurrency(allocated, currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">24.5% of portfolio</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px]">Headroom</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
            {formatCurrency(headroom, currency)}
          </span>
          <span className="text-[10px] text-muted-foreground block">5.5% capacity left</span>
        </div>
      </div>

      {/* Date range underneath */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
        <span>Cycle: Sep 1 – Sep 30, 2026</span>
        <span className="text-emerald-500 font-semibold">Within Risk Band</span>
      </div>
    </div>
  );
}
