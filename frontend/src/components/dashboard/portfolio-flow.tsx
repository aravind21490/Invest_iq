"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight, ChevronDown } from "lucide-react";
import { useSimulator } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

const DAILY_FLOW_DATA = [
  { day: "Sun", amount: 1600 },
  { day: "Mon", amount: 3800 },
  { day: "Tue", amount: 3200 },
  { day: "Wed", amount: 5900 },
  { day: "Thu", amount: 5200 },
  { day: "Fri", amount: 6800 },
  { day: "Sat", amount: 2400 },
];

export function PortfolioFlow() {
  const { currency } = useSimulator();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "YTD">("7d");

  const moneyIn = 22250;
  const moneyOut = 15340;
  const netFlow = moneyIn - moneyOut;

  return (
    <div className="fintech-card p-5 sm:p-6 space-y-4">
      {/* Header matching 'Money Movement' & '7d' dropdown */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-foreground tracking-tight">
          Money Movement
        </h3>

        <button
          type="button"
          onClick={() => {
            const next = timeframe === "7d" ? "30d" : timeframe === "30d" ? "YTD" : "7d";
            setTimeframe(next);
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-card text-xs font-semibold text-foreground cursor-pointer hover:bg-muted transition-colors"
        >
          <span>{timeframe}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Two colored stat blocks side-by-side matching screenshot */}
      <div className="grid grid-cols-2 gap-3">
        {/* Green 'Money In' Card */}
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-emerald-400/80 block">
              Money In
            </span>
            <span className="font-extrabold text-base text-foreground font-mono tabular-nums">
              {formatCurrency(moneyIn, currency)}
            </span>
          </div>
        </div>

        {/* Red 'Money Out' Card */}
        <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-rose-400/80 block">
              Money Out
            </span>
            <span className="font-extrabold text-base text-foreground font-mono tabular-nums">
              {formatCurrency(moneyOut, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Net Flow Row */}
      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-muted-foreground font-medium">Net Flow</span>
        <span className="font-bold text-sm text-emerald-500 font-mono tabular-nums">
          +{formatCurrency(netFlow, currency)}
        </span>
      </div>

      {/* Bar chart beneath with solid white vertical bars */}
      <div className="h-[180px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={DAILY_FLOW_DATA}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              ticks={[0, 2000, 4000, 6000]}
              domain={[0, 7000]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => (v === 0 ? "₹0" : `₹${v / 1000}k`)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const amt = payload[0].value as number;
                return (
                  <div className="rounded-lg border border-border bg-card/95 backdrop-blur-md p-2 text-xs shadow-xl font-mono">
                    <div className="text-muted-foreground">{label} Volume</div>
                    <div className="font-bold text-foreground mt-0.5">
                      {formatCurrency(amt, currency)}
                    </div>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="amount"
              fill="#ffffff"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
