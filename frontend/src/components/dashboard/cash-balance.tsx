"use client";

import React, { useState } from "react";
import { Wallet, Plus, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useSimulator } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function CashBalance() {
  const { cash, currency, maskedBalance, resetSimulationCash } = useSimulator();
  const [modalOpen, setModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("10000");

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (!isNaN(amt) && amt > 0) {
      resetSimulationCash(cash + amt);
      setModalOpen(false);
    }
  };

  const handleReset = (amount: number) => {
    resetSimulationCash(amount);
    setModalOpen(false);
  };

  return (
    <>
      <div className="fintech-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Simulated Cash Balance
              </span>
              <span className="text-xs text-muted-foreground">
                Available Buying Power
              </span>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-accent text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Manage Cash</span>
          </button>
        </div>

        <div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {maskedBalance ? "••••••••" : formatCurrency(cash, currency)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              +12.4%
            </span>
            <span className="text-[11px] text-muted-foreground">this month (cash yield sim)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="p-2 rounded-lg bg-muted/30">
            <span className="text-[10px] text-muted-foreground block font-medium">
              Simulated Buying Power
            </span>
            <span className="font-semibold text-foreground text-sm">
              {maskedBalance ? "••••" : formatCurrency(cash * 2, currency)}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-muted/30">
            <span className="text-[10px] text-muted-foreground block font-medium">
              Unsettled Funds
            </span>
            <span className="font-semibold text-foreground text-sm">
              {formatCurrency(0, currency)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span>Paper cash is 100% simulated for educational practice.</span>
        </div>
      </div>

      {/* Cash Manager Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="fintech-card max-w-sm w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-base text-foreground">
                Manage Simulated Cash
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Adjust your paper trading capital to simulate different account sizes and portfolio constraints.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Add Paper Funds
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-primary"
                  placeholder="10000"
                />
                <button
                  onClick={handleDeposit}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90"
                >
                  Deposit
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <span className="text-xs font-semibold text-foreground block">
                Quick Reset Presets
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleReset(25000)}
                  className="py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  $25,000
                </button>
                <button
                  onClick={() => handleReset(100000)}
                  className="py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  $100,000
                </button>
                <button
                  onClick={() => handleReset(500000)}
                  className="py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground"
                >
                  $500,000
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
