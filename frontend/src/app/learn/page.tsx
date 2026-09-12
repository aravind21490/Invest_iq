"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  Zap,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACADEMY_TRACKS = [
  {
    id: "tutorials",
    title: "Market Fundamentals & Tutorials",
    subtitle: "Master candlestick charts, market regimes, and risk management",
    description:
      "A structured 6-module curriculum designed for beginners and intermediate traders. Learn how orders match on the exchange, how to read Japanese candlesticks, and how to protect capital with proper position sizing.",
    href: "/learn/tutorials",
    icon: GraduationCap,
    badge: "Curriculum",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    modulesCount: "6 Lessons",
    features: [
      "What is the Stock Market & How Prices Move",
      "Demystifying Candlesticks (OHLC) & Timeframes",
      "Order Types: Market, Limit, Delivery (CNC) vs Intraday (MIS)",
      "Realistic Indian Transaction Fees (STT, GST, Exchange Charges)",
    ],
  },
  {
    id: "signals",
    title: "Technical Indicator Directory",
    subtitle: "Statistical definitions & 10-day historical win-rate precedents",
    description:
      "Deep dive into Wilder's 14-day RSI, 12/26 EMA MACD crossovers, 2-standard-deviation Bollinger Band squeezes, and volume breakout ratios. Every signal includes historical empirical backtest precedents.",
    href: "/learn/signals",
    icon: BookOpen,
    badge: "Indicators",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    modulesCount: "5 Core Indicators",
    features: [
      "RSI Oversold Bounce & Overbought Exhaustion rules",
      "MACD Signal Line momentum crossovers",
      "Bollinger Bandwidth Volatility Squeeze detection",
      "Empirical precedent win rates (5, 10, and 20-day holding)",
    ],
  },
  {
    id: "insights",
    title: "AI Market Explanations",
    subtitle: "Plain-English breakdowns grounded strictly in computed numbers",
    description:
      "See how artificial intelligence analyzes live securities without hallucinations or predictive promises. Every explanation is strictly grounded in verifiable technical levels with explicit educational disclaimers.",
    href: "/learn/insights",
    icon: Sparkles,
    badge: "AI Grounded",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    modulesCount: "Live Feed",
    features: [
      "Zero speculative predictions — pure mathematical grounding",
      "Daily cached LLM & deterministic plain-English analysis",
      "Realistic market caveats (oversold continuation risk)",
      "Mandatory safe-harbor educational disclaimers",
    ],
  },
];

const PILLARS = [
  {
    icon: ShieldCheck,
    title: "Zero Financial Risk",
    desc: "Practice with persistent virtual capital (₹1,00,000 / $100,000) before risking real hard-earned money.",
  },
  {
    icon: TrendingUp,
    title: "Real Institutional Data",
    desc: "Live streaming quotes for 2,400+ Indian NSE equities and Global market leaders with sub-second caching.",
  },
  {
    icon: BrainCircuit,
    title: "Behavioral Guardrails",
    desc: "Built-in loss-streak cooldowns and mandatory reflection gates to prevent impulsive revenge trading.",
  },
  {
    icon: Zap,
    title: "Realistic Friction Audit",
    desc: "Accurate modeling of Brokerage, STT, Exchange Turnover fees, SEBI charges, GST, and STCG tax provision.",
  },
];

export default function LearnOverviewPage() {
  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="fintech-card p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Invest IQ Stock Market Academy</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Understand the Markets <br />
            <span className="text-primary">Before You Risk Real Capital</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            A comprehensive, hands-on educational platform built to demystify equity trading,
            technical indicators, and behavioral discipline. Learn through interactive tutorials,
            verifiable mathematical indicators, and realistic simulation.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/learn/tutorials"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:bg-primary/90 transition-all group"
            >
              <span>Start Course (Module 1)</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/learn/signals"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted/50 transition-all"
            >
              <span>Explore Technical Signals</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Core Tracks Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Academy Curriculum & Tools</h2>
          <p className="text-xs text-muted-foreground">
            Select a learning pathway to explore comprehensive lessons, indicator mechanics, or AI insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ACADEMY_TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <div
                key={track.id}
                className="fintech-card p-6 flex flex-col justify-between space-y-5 hover:border-primary/40 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
                        track.badgeColor
                      )}
                    >
                      {track.modulesCount}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                      {track.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {track.subtitle}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground/90 leading-relaxed">
                    {track.description}
                  </p>

                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <span className="text-[11px] font-semibold text-foreground/80 block">
                      Key Takeaways:
                    </span>
                    {track.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={track.href}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-secondary/50 hover:bg-primary hover:text-primary-foreground font-semibold text-xs transition-all group/btn"
                >
                  <span>Open {track.title.split(" ")[0]}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Core Educational Pillars */}
      <div className="fintech-card p-6 sm:p-8 space-y-6">
        <div className="border-b border-border pb-4">
          <h2 className="text-base font-bold text-foreground">The Invest IQ Learning Philosophy</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Four foundational principles governing everything simulated and taught on this platform
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div key={idx} className="space-y-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safe Harbor Legal Notice */}
      <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 text-xs text-amber-600 dark:text-amber-400">
        <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Mandatory Educational Notice:</strong> Invest IQ is strictly an educational learning
          simulator and computational laboratory. It is not an investment advisor, does not issue buy or
          sell directives, and does not execute orders on real monetary accounts. All virtual trades utilize
          simulated paper funds.
        </div>
      </div>
    </div>
  );
}
