"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BarChart3, Calendar } from "lucide-react";
import { Heatmap } from "@/components/charts/heatmap";
import { Donut, DonutDataItem } from "@/components/charts/donut";
import { useSimulator } from "@/lib/store";
import { formatCurrency, formatPercent } from "@/lib/utils";

const SECTOR_ALLOCATION: DonutDataItem[] = [
  { name: "Information Technology", value: 52180, color: "#3b82f6" },
  { name: "Energy & Conglomerate", value: 34706, color: "#10b981" },
  { name: "Banking & Finance", value: 26500, color: "#f59e0b" },
  { name: "Automobile & Parts", value: 16800, color: "#8b5cf6" },
  { name: "Simulated Cash", value: 20000, color: "#14b8a6" },
];

const MONTH_COMPARISON = [
  { category: "IT & Tech", thisMonth: 12400, lastMonth: 9800, delta: 26.5 },
  { category: "Energy", thisMonth: 7800, lastMonth: 6200, delta: 25.8 },
  { category: "Banking", thisMonth: 6200, lastMonth: 5800, delta: 6.9 },
  { category: "Automobile", thisMonth: 4900, lastMonth: 4100, delta: 19.5 },
  { category: "FMCG / Retail", thisMonth: 3100, lastMonth: 2900, delta: 6.9 },
];

export default function AnalyticsPage() {
  const { totalPortfolioValue, currency } = useSimulator();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <BarChart3 className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Trading Analytics
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Statistical breakdown of paper trade volume, sector exposure, and month-over-month performance
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors self-start sm:self-auto">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Year to Date (2026)</span>
        </button>
      </div>

      {/* 1. Trading Activity Heatmap (was Spending Activity) */}
      <Heatmap totalTrades={428} weeks={28} />

      {/* 2 & 3: Allocation by Sector Donut + Month vs Last Month Grouped Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (5 cols): Allocation by Sector Donut */}
        <div className="lg:col-span-5">
          <Donut
            data={SECTOR_ALLOCATION}
            totalValue={totalPortfolioValue}
            totalLabel="Portfolio Value"
            currency={currency}
          />
        </div>

        {/* Right (7 cols): Month vs Last Month Grouped Bar Chart */}
        <div className="lg:col-span-7 fintech-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                Month vs Last Month P&amp;L
              </h3>
              <span className="text-xs text-muted-foreground">
                Sector-by-sector simulated gains
              </span>
            </div>

            {/* Two legend dots at top showing "This Month $X" / "Last Month $Y" */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">This Month</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(27400, currency)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                <span className="text-muted-foreground">Last Month</span>
                <span className="font-bold text-muted-foreground">
                  {formatCurrency(23900, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Grouped Bar Chart with floating delta labels */}
          <div className="h-[250px] w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MONTH_COMPARISON}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="category"
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
                    const tm = payload.find((p) => p.dataKey === "thisMonth")?.value as number;
                    const lm = payload.find((p) => p.dataKey === "lastMonth")?.value as number;
                    const delta = payload[0].payload.delta as number;

                    return (
                      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-xl space-y-1">
                        <div className="font-semibold text-foreground border-b border-border/50 pb-1">
                          {label} Sector
                        </div>
                        <div className="flex justify-between gap-3 text-emerald-600 dark:text-emerald-400">
                          <span>This Month:</span>
                          <span className="font-bold">{formatCurrency(tm, currency)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-muted-foreground">
                          <span>Last Month:</span>
                          <span>{formatCurrency(lm, currency)}</span>
                        </div>
                        <div className="pt-1 border-t border-border/40 font-semibold text-[11px] text-primary">
                          Delta: {formatPercent(delta)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="thisMonth" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="lastMonth" fill="#71717a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Deltas summary footer */}
          <div className="grid grid-cols-5 gap-2 text-center pt-2 border-t border-border/50 text-[11px]">
            {MONTH_COMPARISON.map((m) => (
              <div key={m.category}>
                <span className="text-muted-foreground block truncate">{m.category}</span>
                <span
                  className={
                    m.delta >= 0
                      ? "text-emerald-600 dark:text-emerald-400 font-bold"
                      : "text-rose-600 dark:text-rose-400 font-bold"
                  }
                >
                  {formatPercent(m.delta)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
