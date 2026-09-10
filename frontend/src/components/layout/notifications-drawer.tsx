"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  ArrowLeftRight,
  Info,
  Clock,
  ExternalLink,
  PlusCircle,
} from "lucide-react";
import { useSimulator } from "@/lib/store";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "unread" | "signal" | "trade" | "system";

export function NotificationsDrawer() {
  const {
    notifications,
    unreadCount,
    isNotificationsOpen,
    setNotificationsOpen,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    addNotification,
  } = useSimulator();

  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isNotificationsOpen) {
        setNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNotificationsOpen, setNotificationsOpen]);

  if (!isNotificationsOpen) return null;

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === "unread") return !item.read;
    if (activeFilter === "signal") return item.type === "signal";
    if (activeFilter === "trade") return item.type === "trade";
    if (activeFilter === "system") return item.type === "system";
    return true;
  });

  const handleSimulateAlert = () => {
    const samples = [
      {
        title: "AI Signal: RELIANCE.NS Bullish Breakout",
        message: "Technical momentum and high-volume breakout detected. Target: ₹1,340, Stop Loss: ₹1,245.",
        type: "signal" as const,
        symbol: "RELIANCE.NS",
      },
      {
        title: "Paper Order Executed: NVDA",
        message: "Market BUY filled for 5 shares of NVDA at $138.25. Total amount: $691.25.",
        type: "trade" as const,
        symbol: "NVDA",
      },
      {
        title: "Global Market Alert: S&P 500 Uptick",
        message: "US indices opening with positive momentum. Tech sector up +1.4% in pre-market trading.",
        type: "system" as const,
      },
      {
        title: "AI Signal: TCS.NS RSI Divergence",
        message: "Oversold conditions reversal flagged on 15m chart. Support holding firmly at ₹3,880.",
        type: "signal" as const,
        symbol: "TCS.NS",
      },
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    addNotification(picked);
  };

  return (
    <>
      {/* Dim backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => setNotificationsOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Alerts and Notifications"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                  Alerts &amp; Signals
                </h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/15 text-primary text-[10px] font-bold px-2 py-0.5">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Live market signals, order fills &amp; alerts
              </p>
            </div>
          </div>

          <button
            onClick={() => setNotificationsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Bar & Quick Filters */}
        <div className="p-3 border-b border-border bg-card/60 space-y-2.5">
          {/* Quick action buttons */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={markAllNotificationsAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-muted/40 hover:bg-muted text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-medium"
                title="Mark all notifications as read"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Mark all read</span>
              </button>
              <button
                onClick={clearNotifications}
                disabled={notifications.length === 0}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>

            <button
              onClick={handleSimulateAlert}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-medium cursor-pointer text-[11px]"
              title="Trigger a realistic test alert"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Simulate Alert</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            {(
              [
                { key: "all", label: "All", count: notifications.length },
                { key: "unread", label: "Unread", count: unreadCount },
                { key: "signal", label: "Signals", count: notifications.filter((n) => n.type === "signal").length },
                { key: "trade", label: "Trades", count: notifications.filter((n) => n.type === "trade").length },
                { key: "system", label: "System", count: notifications.filter((n) => n.type === "system").length },
              ] as const
            ).map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer",
                    active
                      ? "bg-foreground text-background font-semibold shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[9px] font-bold",
                        active
                          ? "bg-background text-foreground"
                          : "bg-border text-foreground"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground border border-border">
                <Bell className="h-6 w-6 opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">
                  No notifications in this view
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {activeFilter === "unread"
                    ? "You are all caught up! No unread notifications."
                    : "New market signals, order executions, and price alerts will appear here."}
                </p>
              </div>
              <button
                onClick={handleSimulateAlert}
                className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
              >
                Send Test Notification
              </button>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isSignal = item.type === "signal";
              const isTrade = item.type === "trade";

              return (
                <div
                  key={item.id}
                  onClick={() => !item.read && markNotificationAsRead(item.id)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all relative flex flex-col gap-2 cursor-pointer group",
                    item.read
                      ? "bg-card/50 border-border/70 hover:bg-muted/40 opacity-80"
                      : "bg-card border-primary/30 shadow-xs hover:border-primary/60"
                  )}
                >
                  {/* Top row: Type badge & Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Unread indicator dot */}
                      {!item.read && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                      )}

                      {/* Category Badge */}
                      {isSignal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <Sparkles className="h-3 w-3" />
                          <span>AI SIGNAL</span>
                        </span>
                      ) : isTrade ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <ArrowLeftRight className="h-3 w-3" />
                          <span>TRADE FILL</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Info className="h-3 w-3" />
                          <span>SYSTEM ALERT</span>
                        </span>
                      )}

                      {item.symbol && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                          {item.symbol}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                      <Clock className="h-3 w-3" />
                      <span>{item.time}</span>
                    </div>
                  </div>

                  {/* Notification Content */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xs text-foreground tracking-tight leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                    {item.symbol ? (
                      <Link
                        href={`/trade?symbol=${encodeURIComponent(item.symbol)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotificationsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                      >
                        <span>Trade {item.symbol}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Invest IQ Feed</span>
                    )}

                    {!item.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationAsRead(item.id);
                        }}
                        className="text-muted-foreground hover:text-foreground font-medium text-[11px] cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border bg-muted/20 text-center text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Real-time price feed active</span>
          <button
            onClick={() => setNotificationsOpen(false)}
            className="text-xs font-semibold text-foreground hover:underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}
