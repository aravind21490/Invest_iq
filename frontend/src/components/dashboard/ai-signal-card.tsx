"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { PRIMARY_AI_SIGNAL, SECONDARY_AI_SIGNALS, AISignal } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function AISignalCard() {
  const router = useRouter();
  const [activeSignalIndex, setActiveSignalIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  const allSignals: AISignal[] = [PRIMARY_AI_SIGNAL, ...SECONDARY_AI_SIGNALS];
  const signal = allSignals[activeSignalIndex];

  return (
    <div className="fintech-card p-5 space-y-4 border-primary/30 relative overflow-hidden bg-gradient-to-br from-card to-primary/5">
      {/* Top AI Badge & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">
                AI Signal Breakdown
              </h3>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                Live Scanner
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Algorithmic technical indicator explanation
            </span>
          </div>
        </div>

        {/* Signal Switcher Buttons */}
        <div className="flex items-center rounded-lg border border-border bg-card/60 p-0.5 text-xs font-medium">
          {allSignals.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveSignalIndex(idx)}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all text-xs font-semibold",
                activeSignalIndex === idx
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Title & Confidence Meter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-card border border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">
              {signal.symbol} ({signal.name})
            </span>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                signal.type === "BULLISH"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              )}
            >
              {signal.type} SETUP
            </span>
          </div>
          <span className="text-xs text-muted-foreground block font-medium mt-0.5">
            {signal.title} · {signal.timeframe}
          </span>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold block">
              Confidence Score
            </span>
            <span className="text-sm font-bold text-foreground">
              {signal.confidence}% High
            </span>
          </div>
          <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Plain-English Explanation Panel */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
          Plain-English Market Translation
        </span>
        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed rounded-xl bg-muted/30 p-3.5 border border-border/50">
          {signal.summary}
        </p>
      </div>

      {/* Expandable "Why This Matters" Section */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-accent/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-foreground">
              Why This Matters for Paper Traders (Educational Deep Dive)
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <div className="p-3 pt-0 space-y-3 text-xs border-t border-border/40 animate-in fade-in-0 duration-150">
            <p className="text-muted-foreground leading-relaxed pt-2">
              {signal.whyItMatters}
            </p>

            {/* Suggested Paper Action */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 space-y-1">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                Educational Playbook Suggestion
              </span>
              <p className="text-foreground text-xs leading-relaxed font-medium">
                {signal.suggestedAction}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action CTA */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ShieldAlert className="h-3 w-3 text-amber-500" />
          Educational algorithm — never risk real capital without personal research.
        </span>
        <button
          onClick={() => router.push(`/trade?symbol=${signal.symbol}`)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <span>Simulate in Terminal</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
