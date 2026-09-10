"use client";

import React, { useState } from "react";
import { Settings, RotateCcw, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSimulator } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { cash, currency, setCurrency, resetSimulationCash } = useSimulator();
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const handleReset = (amt: number) => {
    resetSimulationCash(amt);
    setResetFeedback(`Portfolio reset to ${formatCurrency(amt, currency)} paper cash.`);
    setTimeout(() => setResetFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Settings className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Simulator Preferences & Settings
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Customize your educational environment, paper balances, and risk parameters
        </p>
      </div>

      {/* Simulator Capital Reset Card */}
      <div className="fintech-card p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h3 className="font-bold text-base text-foreground">
              Simulated Capital Allocation
            </h3>
            <span className="text-xs text-muted-foreground">
              Current Available Cash: {formatCurrency(cash, currency)}
            </span>
          </div>
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
        </div>

        <p className="text-xs text-muted-foreground">
          Reset your paper balance to test various account sizing conditions. This will clear open paper positions and reset order logs.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { label: "Starter Account", amount: 25000 },
            { label: "Standard Portfolio", amount: 100000 },
            { label: "High-Roller Sim", amount: 500000 },
          ].map((preset) => (
            <button
              key={preset.amount}
              onClick={() => handleReset(preset.amount)}
              className="p-3 rounded-xl border border-border hover:border-primary hover:bg-accent/40 text-left transition-all group"
            >
              <span className="text-[11px] text-muted-foreground block group-hover:text-primary">
                {preset.label}
              </span>
              <span className="text-base font-bold text-foreground block">
                {formatCurrency(preset.amount, currency)}
              </span>
            </button>
          ))}
        </div>

        {resetFeedback && (
          <div className="p-2.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {resetFeedback}
          </div>
        )}
      </div>

      {/* Currency & Privacy Settings */}
      <div className="fintech-card p-6 space-y-4">
        <h3 className="font-bold text-base text-foreground pb-2 border-b border-border">
          Display & Currency
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Base Currency Display
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCurrency("USD")}
                className={cn(
                  "p-2.5 rounded-lg border text-xs font-semibold text-center transition-all",
                  currency === "USD"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency("INR")}
                className={cn(
                  "p-2.5 rounded-lg border text-xs font-semibold text-center transition-all",
                  currency === "INR"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                INR (₹)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Theme Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  theme === "light"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <Sun className="h-3.5 w-3.5" /> Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                  theme === "dark"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <Moon className="h-3.5 w-3.5" /> Dark
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
