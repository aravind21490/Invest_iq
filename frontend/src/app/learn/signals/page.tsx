"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Sparkles, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const INDICATOR_GUIDES = [
  {
    id: "rsi",
    name: "Relative Strength Index (RSI)",
    category: "Momentum",
    definition:
      "RSI measures the speed and change of price movements on an oscillator scale of 0 to 100.",
    thresholds: "Overbought above 70 | Oversold below 30",
    plainEnglish:
      "Think of RSI like a runner sprinting up a hill. If the runner sprints too fast without a break, they eventually fatigue (overbought). When they stop and stumble downward too steeply, bargain hunters step in to catch their breath (oversold).",
    paperPractice:
      "Never buy solely because RSI is below 30. In strong bear trends, RSI can stay oversold for weeks. Always wait for a bullish candlestick confirmation before entering paper trades.",
  },
  {
    id: "macd",
    name: "MACD (Moving Average Convergence Divergence)",
    category: "Trend Following",
    definition:
      "MACD reveals changes in the strength, direction, momentum, and duration of a trend.",
    thresholds: "Fast Line (12) vs Slow Line (26) + 9-period Signal Line",
    plainEnglish:
      "MACD compares two moving averages (short term vs long term). When the faster line crosses above the slower line, it's like a sports car accelerating past traffic — signaling bullish momentum.",
    paperPractice:
      "Look for MACD Divergence: If price makes a lower low but MACD makes a higher low, the selling momentum is weakening and a reversal is statistically probable.",
  },
  {
    id: "bollinger",
    name: "Bollinger Bands",
    category: "Volatility",
    definition:
      "A 20-day simple moving average flanked by upper and lower bands calculated at 2 standard deviations.",
    thresholds: "Upper Band (Resistance) | Lower Band (Support)",
    plainEnglish:
      "Bollinger Bands act like rubber bands around stock prices. 95% of all price action stays between the bands. When the bands contract tightly ('The Squeeze'), an explosive move is imminent.",
    paperPractice:
      "During strong trends, price can 'walk the band' for extended runs. Combine with volume to separate real breakouts from fakeouts.",
  },
  {
    id: "golden-cross",
    name: "Golden Cross & Death Cross",
    category: "Macro Trend",
    definition:
      "The crossing of the 50-day moving average and 200-day moving average.",
    thresholds: "50 EMA > 200 EMA (Golden) | 50 EMA < 200 EMA (Death)",
    plainEnglish:
      "A Golden Cross signifies that medium-term investor sentiment has completely overtaken the long-term trend, historically ushering in multi-month bull markets.",
    paperPractice:
      "Because moving averages are lagging indicators, wait for the first pullback test of the 50 EMA after the cross to secure a high-probability entry.",
  },
];

export default function SignalExplanationsPage() {
  const [selectedId, setSelectedId] = useState("rsi");
  const selected = INDICATOR_GUIDES.find((g) => g.id === selectedId) || INDICATOR_GUIDES[0];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Plain-English Signal Explanations
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Demystifying complex algorithmic and technical indicators for students and paper traders
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Indicator Navigation List */}
        <div className="space-y-2">
          {INDICATOR_GUIDES.map((guide) => (
            <button
              key={guide.id}
              onClick={() => setSelectedId(guide.id)}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all",
                selectedId === guide.id
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border bg-card hover:bg-accent/40 text-muted-foreground"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {guide.category}
                </span>
              </div>
              <h3 className="font-bold text-sm text-foreground mt-1">{guide.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {guide.definition}
              </p>
            </button>
          ))}
        </div>

        {/* Right 2 Cols: Deep Dive Guide */}
        <div className="lg:col-span-2 fintech-card p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                {selected.category} Indicator
              </span>
              <h3 className="text-xl font-bold text-foreground mt-0.5">
                {selected.name}
              </h3>
            </div>
            <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
              {selected.thresholds}
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Standard Technical Definition
            </h4>
            <p className="text-sm text-foreground/90 leading-relaxed rounded-lg bg-muted/30 p-3">
              {selected.definition}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Plain-English Mental Model</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed p-4 rounded-xl border border-primary/20 bg-primary/5 font-medium">
              {selected.plainEnglish}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Common Paper Trading Trap & Defense</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed p-3.5 rounded-xl border border-border bg-card">
              {selected.paperPractice}
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Ready to test this indicator?
            </span>
            <Link
              href="/trade"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <span>Practice on Live Mock Charts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
