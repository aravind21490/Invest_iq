"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  PieChart,
  Bookmark,
  ArrowLeftRight,
  History,
  Briefcase,
  Sparkles,
  BookOpen,
  GraduationCap,
  Settings,
  Trophy,
  Globe2,
  Wallet,
  BarChart3,
  Moon,
  Sun,
  Eye,
  EyeOff,
  RotateCcw,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { TICKERS } from "@/lib/mock-data";
import { useSimulator } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";

export function CommandPalette({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { maskedBalance, toggleMaskedBalance, resetSimulationCash, currency } = useSimulator();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setQuery(""), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTickers = Object.values(TICKERS).filter(
    (t) =>
      t.symbol.toLowerCase().includes(query.toLowerCase()) ||
      t.name.toLowerCase().includes(query.toLowerCase())
  );

  const pages = [
    { title: "Dashboard Overview", href: "/", icon: LayoutDashboard, group: "Navigation" },
    { title: "Portfolio Holdings", href: "/portfolio", icon: PieChart, group: "Navigation" },
    { title: "Watchlist & Alerts", href: "/watchlist", icon: Bookmark, group: "Navigation" },
    { title: "Trading Terminal", href: "/trade", icon: ArrowLeftRight, group: "Navigation" },
    { title: "Global Markets", href: "/markets", icon: Globe2, group: "Navigation" },
    { title: "Portfolio Analytics", href: "/analytics", icon: BarChart3, group: "Navigation" },
    { title: "Order History", href: "/orders", icon: History, group: "Navigation" },
    { title: "Open Positions", href: "/positions", icon: Briefcase, group: "Navigation" },
    { title: "Simulated Cash Accounts", href: "/accounts", icon: Wallet, group: "Account" },
    { title: "Academy Overview Hub", href: "/learn", icon: GraduationCap, group: "Learn" },
    { title: "AI Market Insights", href: "/learn/insights", icon: Sparkles, group: "Learn" },
    { title: "Technical Signal Directory", href: "/learn/signals", icon: BookOpen, group: "Learn" },
    { title: "Educational Tutorials", href: "/learn/tutorials", icon: GraduationCap, group: "Learn" },
    { title: "Paper Trader Leaderboard", href: "/leaderboard", icon: Trophy, group: "Account" },
    { title: "Simulator Settings", href: "/settings", icon: Settings, group: "Account" },
  ];

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.group.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectPage = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleSelectTicker = (symbol: string) => {
    setIsOpen(false);
    router.push(`/trade?symbol=${symbol}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-border gap-3">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tickers, signals, pages, or commands (⌘K)..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {/* Tickers Section */}
          {filteredTickers.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Simulated Stocks & Tickers
              </div>
              <div className="space-y-0.5">
                {filteredTickers.slice(0, 5).map((ticker) => (
                  <button
                    key={ticker.symbol}
                    onClick={() => handleSelectTicker(ticker.symbol)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0",
                          ticker.logoBg
                        )}
                      >
                        {ticker.logoLetter}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground group-hover:text-primary">
                          {ticker.symbol}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {ticker.name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {formatCurrency(ticker.price, currency)}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-medium",
                          ticker.change >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {ticker.change >= 0 ? "+" : ""}
                        {ticker.changePercent}%
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Pages Section */}
          {filteredPages.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Application Pages
              </div>
              <div className="space-y-0.5">
                {filteredPages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <button
                      key={page.href}
                      onClick={() => handleSelectPage(page.href)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors group"
                    >
                      <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:text-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium text-foreground flex-1">
                        {page.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                        {page.group}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Simulator Quick Controls
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </div>
                <span className="text-sm font-medium text-foreground">
                  Toggle {theme === "dark" ? "Light" : "Dark"} Mode
                </span>
              </button>

              <button
                onClick={() => {
                  toggleMaskedBalance();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  {maskedBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {maskedBalance ? "Reveal Balances" : "Mask Balances (Privacy)"}
                </span>
              </button>

              <button
                onClick={() => {
                  resetSimulationCash(100000);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent text-left transition-colors"
              >
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Reset Paper Cash to $100,000.00
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>Navigate with ⌘K / Arrow keys</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Paper Simulation Engine Ready
          </span>
        </div>
      </div>
    </div>
  );
}
