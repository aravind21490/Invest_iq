"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PieChart,
  Bookmark,
  Briefcase,
  ArrowLeftRight,
  History,
  Wallet,
  Sparkles,
  BarChart3,
  GraduationCap,
  LogIn,
  UserPlus,
  Bell,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Globe2,
  LogOut,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useSimulator } from "@/lib/store";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "DAILY",
    items: [
      { title: "Overview", href: "/", icon: LayoutDashboard },
      { title: "Portfolio", href: "/portfolio", icon: PieChart },
      { title: "Watchlist", href: "/watchlist", icon: Bookmark },
      { title: "Positions", href: "/positions", icon: Briefcase },
    ],
  },
  {
    group: "TRADING",
    items: [
      { title: "Trade", href: "/trade", icon: ArrowLeftRight },
      { title: "Order History", href: "/orders", icon: History },
      { title: "Simulated Cash", href: "/accounts", icon: Wallet },
    ],
  },
  {
    group: "INSIGHTS",
    items: [
      { title: "AI Signals", href: "/learn/signals", icon: Sparkles, badge: "AI" },
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
      { title: "Global Markets", href: "/markets", icon: Globe2 },
      { title: "Learn", href: "/learn/tutorials", icon: GraduationCap },
    ],
  },
];

export function Sidebar({
  isMobileOpen,
  setIsMobileOpen,
  collapsed,
}: {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const { unreadCount, cash, currency, maskedBalance, user, signOut, setNotificationsOpen } =
    useSimulator();
  const [profileExpanded, setProfileExpanded] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none",
          collapsed ? "w-18" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo block: small square icon + Invest IQ + Market Dashboard */}
        <div className="flex h-16 items-center px-4 border-b border-border gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 overflow-hidden group"
            onClick={() => setIsMobileOpen?.(false)}
          >
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-foreground leading-tight">
                  Invest IQ
                </span>
                <span className="text-[11px] text-muted-foreground truncate font-medium">
                  Market Dashboard
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="space-y-1">
              {!collapsed ? (
                <h4 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.group}
                </h4>
              ) : (
                <div className="h-2" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen?.(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                        isActive
                          ? "bg-secondary text-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate flex-1">{item.title}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/15 text-primary"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Auth block */}
          <div className="space-y-1 pt-2 border-t border-border/40">
            {!collapsed ? (
              <h4 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                AUTH
              </h4>
            ) : (
              <div className="h-1" />
            )}
            <div className="space-y-0.5">
              <Link
                href="/signin"
                onClick={() => setIsMobileOpen?.(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors",
                  pathname === "/signin" && "bg-secondary text-foreground font-semibold"
                )}
                title={collapsed ? "Sign In" : undefined}
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span>Sign In</span>}
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileOpen?.(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors",
                  pathname === "/signup" && "bg-secondary text-foreground font-semibold"
                )}
                title={collapsed ? "Sign Up" : undefined}
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                {!collapsed && <span>Sign Up</span>}
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom pinned user & notifications row */}
        <div className="p-3 border-t border-border space-y-2">
          {/* Interactive Alerts & Notifications button */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer group"
            title="View Alerts & Market Signals"
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell className="h-4 w-4 group-hover:scale-110 transition-transform text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="font-medium text-foreground">Alerts &amp; Signals</span>}
            </div>
            {!collapsed && (
              <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[9px] font-bold">
                {unreadCount > 0 ? `${unreadCount} New` : "Live"}
              </span>
            )}
          </button>

          {/* Persistent Simulated Badge */}
          {!collapsed && (
            <div className="text-[10px] text-center font-medium text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 py-1 rounded-lg">
              Simulated — no real money
            </div>
          )}

          {/* User profile row */}
          {!collapsed ? (
            <div className="relative">
              <button
                onClick={() => setProfileExpanded(!profileExpanded)}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-border/80 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
                    {(user?.name || "AV")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-xs text-foreground block truncate">
                      {user?.name || "Alex Vance"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block">
                      {user?.email || user?.phone || "Paper Trader"}
                    </span>
                  </div>
                </div>
                {profileExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>

              {profileExpanded && (
                <div className="absolute bottom-full left-0 right-0 mb-1.5 rounded-xl border border-border bg-card shadow-xl p-2 text-xs space-y-1 z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="p-2 border-b border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Paper Cash Available
                    </span>
                    <span className="font-bold text-sm text-foreground font-mono">
                      {maskedBalance ? "••••••••" : formatCurrency(cash, currency)}
                    </span>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setProfileExpanded(false)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted text-foreground transition-colors"
                  >
                    <span>Account Settings</span>
                  </Link>
                  <Link
                    href="/leaderboard"
                    onClick={() => setProfileExpanded(false)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted text-foreground transition-colors"
                  >
                    <span>Leaderboard Rank (#14)</span>
                  </Link>
                  <div className="pt-1 border-t border-border/60">
                    <button
                      onClick={() => {
                        setProfileExpanded(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-red-500/10 text-red-400 font-semibold transition-colors text-left text-xs"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => signOut()}
                className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs hover:opacity-80 transition-opacity"
                title={`${user?.name || "Alex Vance"} - Click to Sign Out`}
              >
                {(user?.name || "AV")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
