"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Wifi,
  CreditCard,
} from "lucide-react";
import { useSimulator } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function AccountMiniCards() {
  const { cash, totalPortfolioValue, positions, currency, maskedBalance, resetSimulationCash } =
    useSimulator();
  const [modalOpen, setModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("10000");

  const handleDeposit = () => {
    const val = parseFloat(amountInput);
    if (!isNaN(val) && val > 0) {
      resetSimulationCash(cash + val);
      setModalOpen(false);
    }
  };

  return (
    <div className="fintech-card p-5 space-y-4 h-full flex flex-col justify-between">
      {/* Physical Demat / Card Mockup matching reference */}
      <div className="relative rounded-2xl bg-linear-to-br from-zinc-900 via-zinc-800 to-black text-white p-5 shadow-xl border border-zinc-700/60 overflow-hidden flex flex-col justify-between h-[160px]">
        {/* Subtle background curved glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

        <div className="flex items-center justify-between z-10">
          <span className="font-bold text-xs tracking-tight text-zinc-100">
            Virtual Trading Card
          </span>
          <span className="font-mono text-xs font-bold text-zinc-400">
            NSE · EQ
          </span>
        </div>

        {/* EMV Chip & Contactless Wifi Icon */}
        <div className="flex items-center gap-2 z-10 my-auto">
          <div className="w-8 h-6 rounded-md bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
            <div className="w-4 h-3 border border-amber-400/80 rounded-xs" />
          </div>
          <Wifi className="h-4 w-4 text-zinc-400 rotate-90" />
        </div>

        <div className="flex items-end justify-between z-10">
          <span className="font-mono text-xs tracking-widest text-zinc-400 font-semibold">
            **** 7321
          </span>
          <span className="font-mono font-bold text-sm text-white tabular-nums">
            {maskedBalance ? "••••" : formatCurrency(cash, currency)}
          </span>
        </div>
      </div>

      {/* 3 cards indicator row with '+' action */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
          <span className="font-medium text-foreground">{positions.length || 3} simulated accounts</span>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition-colors shadow-xs"
          title="Add virtual capital"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Wallet Balance & Gain indicator */}
      <div className="pt-2 border-t border-border/50">
        <span className="text-xs font-medium text-muted-foreground block">
          Wallet Balance
        </span>
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-0.5 tabular-nums">
          {maskedBalance ? "••••••••" : formatCurrency(totalPortfolioValue, currency)}
        </div>
        <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span>+12.4% this month</span>
        </div>
      </div>

      {/* Deposit Funds Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="fintech-card p-6 w-full max-w-sm space-y-4 shadow-2xl border-border bg-card">
            <h3 className="font-bold text-base text-foreground">
              Add Virtual Paper Capital
            </h3>
            <p className="text-xs text-muted-foreground">
              Add simulated funds to your virtual trading account to practice margin trades.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Amount (₹)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-muted-foreground font-semibold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-input/50 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  min="1000"
                  step="5000"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDeposit}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm"
              >
                Add Virtual Funds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
