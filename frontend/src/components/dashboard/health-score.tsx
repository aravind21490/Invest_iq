"use client";

import React from "react";
import {
  Heart,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { Gauge } from "@/components/charts/gauge";

const SUB_METRICS = [
  { name: "Win Rate", score: 85, color: "bg-emerald-500", icon: TrendingUp },
  { name: "Trade Discipline", score: 72, color: "bg-blue-500", icon: ShieldCheck },
  { name: "Risk/Reward Ratio", score: 90, color: "bg-emerald-500", icon: Percent },
];

export function HealthScore() {
  return (
    <div className="fintech-card p-5 space-y-4">
      {/* Header: Heart icon + 'Financial Health' + '+3 pts' pill */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500/20" />
          <h3 className="font-bold text-sm text-foreground tracking-tight">
            Financial Health
          </h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-500 border border-emerald-500/20">
          +3 pts
        </span>
      </div>

      {/* Large Semicircular Gauge matching screenshot */}
      <div className="py-2 flex justify-center">
        <Gauge value={78} label="Good" size={170} strokeWidth={12} />
      </div>

      {/* 3 sub-metric progress rows */}
      <div className="space-y-2.5 pt-2 border-t border-border/50">
        {SUB_METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.name}
              className="flex items-center justify-between gap-3 text-xs py-1"
            >
              <div className="flex items-center gap-2 w-36 shrink-0">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {metric.name}
                </span>
              </div>

              {/* Progress bar with specific metric color */}
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full ${metric.color} rounded-full transition-all duration-500`}
                  style={{ width: `${metric.score}%` }}
                />
              </div>

              {/* Score + chevron */}
              <div className="flex items-center gap-1 shrink-0 text-right">
                <span className="font-bold text-foreground text-xs w-6 tabular-nums">
                  {metric.score}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
