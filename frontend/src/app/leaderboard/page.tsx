"use client";

import React from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const LEADERBOARD_USERS = [
  {
    rank: 1,
    name: "Alex Vance (AlphaQuant)",
    returnPercent: 38.4,
    winRate: 82.5,
    sharpe: 2.45,
    badge: "Master Disciplined",
    trades: 142,
    avatarBg: "bg-amber-500 text-white",
  },
  {
    rank: 2,
    name: "Maya Lin (TrendSurfer)",
    returnPercent: 34.2,
    winRate: 79.1,
    sharpe: 2.18,
    badge: "Risk Defender",
    trades: 98,
    avatarBg: "bg-zinc-400 text-white",
  },
  {
    rank: 3,
    name: "Devon Reed (MomentumX)",
    returnPercent: 31.8,
    winRate: 76.4,
    sharpe: 2.05,
    badge: "Breakout Scout",
    trades: 115,
    avatarBg: "bg-amber-700 text-white",
  },
  {
    rank: 4,
    name: "Sophia Chen",
    returnPercent: 29.5,
    winRate: 75.0,
    sharpe: 1.95,
    badge: "Disciplined",
    trades: 64,
    avatarBg: "bg-blue-600 text-white",
  },
  {
    rank: 14,
    name: "You (Sim Trader IQ)",
    returnPercent: 28.45,
    winRate: 74.2,
    sharpe: 1.82,
    badge: "Level 4 Trader",
    trades: 36,
    avatarBg: "bg-primary text-primary-foreground",
    isCurrentUser: true,
  },
];

export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Trophy className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Paper Trading Academy Leaderboard
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Rankings are calibrated strictly on risk-adjusted returns and discipline, not reckless leverage
        </p>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LEADERBOARD_USERS.slice(0, 3).map((trader) => (
          <div
            key={trader.rank}
            className={cn(
              "fintech-card p-5 space-y-3 relative overflow-hidden",
              trader.rank === 1 ? "border-amber-500/40 bg-amber-500/5" : ""
            )}
          >
            <div className="flex items-center justify-between">
              <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                #{trader.rank}
              </span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {trader.badge}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm",
                  trader.avatarBg
                )}
              >
                {trader.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">{trader.name}</h3>
                <span className="text-[11px] text-muted-foreground">
                  {trader.trades} paper trades executed
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Return</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{trader.returnPercent}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Win Rate</span>
                <span className="font-bold text-foreground">{trader.winRate}%</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Sharpe</span>
                <span className="font-bold text-foreground">{trader.sharpe}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Leaderboard Table */}
      <div className="fintech-card p-5 space-y-4">
        <h3 className="font-bold text-base text-foreground">All Student Rankings</h3>

        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="pb-3">Rank</th>
                <th className="pb-3">Trader</th>
                <th className="pb-3">Badge</th>
                <th className="pb-3 text-right">Simulated Return</th>
                <th className="pb-3 text-right">Win Rate</th>
                <th className="pb-3 text-right">Sharpe Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {LEADERBOARD_USERS.map((user) => (
                <tr
                  key={user.rank}
                  className={cn(
                    "hover:bg-accent/40 transition-colors",
                    user.isCurrentUser ? "bg-primary/5 font-semibold" : ""
                  )}
                >
                  <td className="py-3 font-bold text-foreground">
                    #{user.rank}
                    {user.isCurrentUser && (
                      <span className="ml-2 text-[10px] text-primary font-semibold">
                        (You)
                      </span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px]",
                          user.avatarBg
                        )}
                      >
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-foreground">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-medium">
                      {user.badge}
                    </span>
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    +{user.returnPercent}%
                  </td>
                  <td className="py-3 text-right text-foreground">{user.winRate}%</td>
                  <td className="py-3 text-right text-foreground">{user.sharpe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
