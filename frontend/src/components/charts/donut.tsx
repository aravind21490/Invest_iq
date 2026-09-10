"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, cn } from "@/lib/utils";

export interface DonutDataItem {
  name: string;
  value: number;
  color: string;
  percent?: number;
}

interface DonutProps {
  data: DonutDataItem[];
  totalLabel?: string;
  totalValue: number;
  currency?: "USD" | "INR";
  className?: string;
}

export function Donut({
  data,
  totalLabel = "Total Portfolio",
  totalValue,
  currency = "USD",
  className,
}: DonutProps) {
  return (
    <div className={cn("fintech-card p-5 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground">
          Allocation by Sector
        </h3>
        <span className="text-xs text-muted-foreground">Active Distribution</span>
      </div>

      {/* Donut with centered text */}
      <div className="relative h-[220px] w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as DonutDataItem;
                return (
                  <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-xl space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      {d.name}
                    </div>
                    <div className="text-muted-foreground">
                      {formatCurrency(d.value, currency)} (
                      {((d.value / totalValue) * 100).toFixed(1)}%)
                    </div>
                  </div>
                );
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-xl font-bold tracking-tight text-foreground">
            {formatCurrency(totalValue, currency)}
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
            {totalLabel}
          </span>
        </div>
      </div>

      {/* Two-column legend below */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-border/50 text-xs">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground truncate">{item.name}</span>
            </div>
            <span className="font-semibold text-foreground ml-2">
              {formatCurrency(item.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
