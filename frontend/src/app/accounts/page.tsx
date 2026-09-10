"use client";

import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Layers,
  Plus,
  Building2,
  Cpu,
  Globe,
  Coins,
} from "lucide-react";
import { useSimulator } from "@/lib/store";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

interface SimAccount {
  id: string;
  name: string;
  institution: string;
  type: string;
  category: "Growth" | "Dividend" | "Crypto Sim" | "Watchlist";
  maskedId: string;
  balance: number;
  change: number;
  timeAgo: string;
  accentColor: string; // Left-edge color
  icon: React.ElementType;
}

const INITIAL_ACCOUNTS: SimAccount[] = [
  {
    id: "acc-1",
    name: "Apex Tech Alpha Sim",
    institution: "Apex Clearing Mock",
    type: "Primary Growth Account",
    category: "Growth",
    maskedId: "**** 7321",
    balance: 52180,
    change: 4.82,
    timeAgo: "Today",
    accentColor: "border-l-blue-500",
    icon: Building2,
  },
  {
    id: "acc-2",
    name: "Blue-Chip Dividend Core",
    institution: "Interactive Sim Corp",
    type: "Income & Value Sim",
    category: "Dividend",
    maskedId: "**** 4482",
    balance: 28940,
    change: 1.15,
    timeAgo: "Yesterday",
    accentColor: "border-l-emerald-500",
    icon: Globe,
  },
  {
    id: "acc-3",
    name: "Synthetic Crypto Sandbox",
    institution: "Paper Web3 Engine",
    type: "High-Volatility Sim",
    category: "Crypto Sim",
    maskedId: "**** 9104",
    balance: 14880,
    change: 8.42,
    timeAgo: "2 hours ago",
    accentColor: "border-l-purple-500",
    icon: Coins,
  },
  {
    id: "acc-4",
    name: "NSE Screener Watchlist",
    institution: "India Mock Gateway",
    type: "Practice Desk",
    category: "Watchlist",
    maskedId: "**** 2381",
    balance: 32450,
    change: -0.65,
    timeAgo: "3 hours ago",
    accentColor: "border-l-amber-500",
    icon: Cpu,
  },
];

export default function AccountsPage() {
  const { totalPortfolioValue, currency, maskedBalance } = useSimulator();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [accounts, setAccounts] = useState<SimAccount[]>(INITIAL_ACCOUNTS);
  const [modalOpen, setModalOpen] = useState(false);
  const [newAccName, setNewAccName] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("25000");

  const filteredAccounts = accounts.filter(
    (acc) => activeTab === "All" || acc.category === activeTab
  );

  const handleAddAccount = () => {
    if (!newAccName.trim()) return;
    const newAcc: SimAccount = {
      id: `acc-${Date.now()}`,
      name: newAccName,
      institution: "InvestIQ Sandbox",
      type: "Custom Paper Account",
      category: "Growth",
      maskedId: `**** ${Math.floor(1000 + Math.random() * 9000)}`,
      balance: parseFloat(newAccBalance) || 25000,
      change: 0,
      timeAgo: "Just now",
      accentColor: "border-l-indigo-500",
      icon: Building2,
    };
    setAccounts([...accounts, newAcc]);
    setNewAccName("");
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Simulated Portfolios &amp; Accounts
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage isolated paper trading portfolios, margin accounts, and sandbox environments
        </p>
      </div>

      {/* 1. Summary Row (Three Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="fintech-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Balance
            </span>
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {maskedBalance ? "••••••••" : formatCurrency(totalPortfolioValue, currency)}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Across {accounts.length} simulated portfolios
          </span>
        </div>

        <div className="fintech-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Change
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            +$4,230.50
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            +3.40% simulated 24h return
          </span>
        </div>

        <div className="fintech-card p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Portfolios
            </span>
            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {accounts.length} Active
          </div>
          <span className="text-[11px] text-muted-foreground">
            All sandboxes live &amp; funded
          </span>
        </div>
      </div>

      {/* 2. Filter Tabs: Pill-style segmented control */}
      <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium w-fit">
        {(["All", "Growth", "Dividend", "Crypto Sim", "Watchlist"] as const).map(
          (cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "px-3 py-1.5 rounded-md transition-all",
                activeTab === cat
                  ? "bg-card text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat}
            </button>
          )
        )}
      </div>

      {/* 3. Account Cards Grid (2-3 per row) with thin colored left-edge accent bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map((acc) => {
          const Icon = acc.icon;
          const isPositive = acc.change >= 0;

          return (
            <div
              key={acc.id}
              className={cn(
                "fintech-card p-5 space-y-3.5 border-l-4 relative group hover:border-primary/40 transition-all flex flex-col justify-between",
                acc.accentColor
              )}
            >
              {/* Top: small institution logo + name */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">
                      {acc.name}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {acc.institution}
                    </span>
                  </div>
                </div>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {acc.category}
                </span>
              </div>

              {/* Account-type label with masked identifier (**** 1234) */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>{acc.type}</span>
                <span className="font-mono text-[11px]">{acc.maskedId}</span>
              </div>

              {/* Large balance figure */}
              <div>
                <div className="text-2xl font-bold tracking-tight text-foreground">
                  {maskedBalance ? "••••••••" : formatCurrency(acc.balance, currency)}
                </div>
              </div>

              {/* Colored change indicator with relative timestamp */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-bold",
                    isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {isPositive ? "+" : ""}
                  {formatPercent(acc.change)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Updated {acc.timeAgo}
                </span>
              </div>
            </div>
          );
        })}

        {/* Final Dashed-Outline "+" Card: Add Portfolio */}
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-xl border-2 border-dashed border-border hover:border-primary p-6 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground hover:text-foreground transition-all group min-h-[190px]"
        >
          <div className="h-10 w-10 rounded-full border border-border group-hover:border-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">
            Add Portfolio
          </span>
          <span className="text-xs text-muted-foreground">
            Start a new paper trading simulation sandbox
          </span>
        </button>
      </div>

      {/* Add Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="fintech-card max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">
                Start New Paper Simulation
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. Swing Trading Lab"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground block">
                  Initial Paper Capital ($)
                </label>
                <input
                  type="number"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  placeholder="25000"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-primary"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAccount}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90"
              >
                Create Sandbox
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
