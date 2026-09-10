"use client";

import React from "react";
import { PortfolioChart } from "@/components/dashboard/portfolio-chart";
import { AccountMiniCards } from "@/components/dashboard/account-mini-cards";
import { QuickTrade } from "@/components/dashboard/quick-trade";
import { RiskLimit } from "@/components/dashboard/risk-limit";
import { HealthScore } from "@/components/dashboard/health-score";
import { PortfolioFlow } from "@/components/dashboard/portfolio-flow";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { AISignalCard } from "@/components/dashboard/ai-signal-card";
import { LearningNudge } from "@/components/dashboard/learning-nudge";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Row 1 — two-column split (roughly 65/35 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <PortfolioChart />
        </div>
        <div className="lg:col-span-4">
          <AccountMiniCards />
        </div>
      </div>

      {/* Row 2 — three equal columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <QuickTrade />
        <RiskLimit />
        <HealthScore />
      </div>

      {/* Row 3 — full-width Trade Flow */}
      <div>
        <PortfolioFlow />
      </div>

      {/* Row 4 — full-width Recent Trades Table */}
      <div>
        <RecentTrades />
      </div>

      {/* Invest IQ Specific Additions: AI Signal & Academy Nudge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        <div className="lg:col-span-8">
          <AISignalCard />
        </div>
        <div className="lg:col-span-4">
          <LearningNudge />
        </div>
      </div>
    </div>
  );
}
