"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  PanelLeft,
  Search,
  Moon,
  Sun,
  LayoutGrid,
  Check,
  Bell,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSimulator } from "@/lib/store";

interface TopbarProps {
  onOpenCommandPalette: () => void;
  onToggleSidebar: () => void;
}

export function Topbar({ onOpenCommandPalette, onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { unreadCount, setNotificationsOpen } = useSimulator();
  const [mounted, setMounted] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Generate breadcrumb title
  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/portfolio") return "Portfolio";
    if (pathname === "/watchlist") return "Watchlist";
    if (pathname === "/positions") return "Positions";
    if (pathname === "/trade") return "Trade Terminal";
    if (pathname === "/orders") return "Order History";
    if (pathname === "/accounts") return "Simulated Cash";
    if (pathname === "/analytics") return "Analytics";
    if (pathname === "/learn/signals") return "AI Signals";
    if (pathname === "/learn/tutorials") return "Learn";
    if (pathname === "/settings") return "Settings";
    if (pathname === "/leaderboard") return "Leaderboard";
    if (pathname === "/signin") return "Sign In";
    if (pathname === "/signup") return "Sign Up";
    return "Dashboard";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-4 sm:px-6">
      {/* Left: Sidebar Collapse Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Toggle Sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline-block">
            Invest IQ
          </span>
          <span className="text-muted-foreground/40 hidden sm:inline-block">/</span>
          <h1 className="font-semibold text-sm sm:text-base text-foreground">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Center: Subtle persistent simulator banner */}
      <div className="hidden lg:flex items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="font-medium text-[11px]">Simulated — no real money</span>
      </div>

      {/* Right: ⌘K Search, Theme Toggle & Customize Button */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* ⌘K search trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 h-8 rounded-lg border border-border bg-muted/40 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="rounded bg-background px-1.5 py-0.5 text-[10px] font-mono border border-border">
            ⌘K
          </kbd>
        </button>

        {/* Alerts & Notifications Bell Button */}
        <button
          onClick={() => setNotificationsOpen(true)}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title={`View Alerts (${unreadCount} unread)`}
          aria-label="View Alerts & Signals"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Theme Toggle icon */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title={mounted ? (resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode") : "Toggle Theme"}
          aria-label="Toggle Theme"
        >
          {mounted ? (
            resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 transition-transform" />
            )
          ) : (
            <Sun className="h-4 w-4 opacity-50" />
          )}
        </button>

        {/* Customize button (outline style with small grid icon) */}
        <div className="relative">
          <button
            onClick={() => setCustomizeOpen(!customizeOpen)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Customize</span>
          </button>

          {customizeOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-xl p-3 z-50 animate-in fade-in-0 zoom-in-95 text-xs space-y-2">
              <div className="font-semibold text-foreground pb-1.5 border-b border-border">
                Dashboard Widgets
              </div>
              <div className="space-y-1.5 text-muted-foreground">
                <label className="flex items-center justify-between cursor-pointer hover:text-foreground">
                  <span>Portfolio Value Chart</span>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </label>
                <label className="flex items-center justify-between cursor-pointer hover:text-foreground">
                  <span>Simulated Account Balance</span>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </label>
                <label className="flex items-center justify-between cursor-pointer hover:text-foreground">
                  <span>Quick Paper Trade</span>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </label>
                <label className="flex items-center justify-between cursor-pointer hover:text-foreground">
                  <span>Risk & Health Score</span>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </label>
                <label className="flex items-center justify-between cursor-pointer hover:text-foreground">
                  <span>Trade Flow & Table</span>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
