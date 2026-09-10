"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { TradeRecord, Position } from "./mock-data";

export interface UserSession {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  authProvider?: "phone" | "google";
}

interface ApiPosition {
  symbol: string;
  name: string;
  shares: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  sector?: string;
}

interface ApiTrade {
  id: string;
  symbol: string;
  name: string;
  type: "BUY" | "SELL";
  shares: number;
  price: number;
  amount: number;
  pnl: number;
  status: "Filled" | "Pending" | "Cancelled";
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "trade" | "signal" | "system";
  symbol?: string;
  actionUrl?: string;
}

interface SimulatorContextType {
  user: UserSession | null;
  cash: number;
  totalPortfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  trades: TradeRecord[];
  positions: Position[];
  watchlist: string[];
  maskedBalance: boolean;
  currency: "USD" | "INR";
  notifications: NotificationItem[];
  unreadCount: number;
  isNotificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  isLoading: boolean;
  toggleMaskedBalance: () => void;
  setCurrency: (c: "USD" | "INR") => void;
  toggleWatchlist: (symbol: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (item: {
    title: string;
    message: string;
    type: "trade" | "signal" | "system";
    symbol?: string;
    actionUrl?: string;
  }) => void;
  resetSimulationCash: (amount?: number) => void;
  refreshPortfolio: () => Promise<void>;
  signOut: () => Promise<void>;
  executePaperTrade: (trade: {
    symbol: string;
    type: "BUY" | "SELL";
    shares: number;
    price?: number;
  }) => Promise<{ success: boolean; message: string }>;
}

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export function SimulatorProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [cash, setCash] = useState<number>(100000.0);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(100000.0);
  const [dayChange, setDayChange] = useState<number>(0);
  const [dayChangePercent, setDayChangePercent] = useState<number>(0);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [watchlist, setWatchlist] = useState<string[]>([
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "TATAMOTORS.NS",
    "INFY.NS",
    "SBIN.NS",
  ]);
  const [maskedBalance, setMaskedBalance] = useState<boolean>(false);
  const [currency, setCurrency] = useState<"USD" | "INR">("INR");
  const [isNotificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "NSE Real-Time Market Feed Active",
      message: "Streaming live institutional price feeds for 2,400+ Indian NSE equities (₹) and Global market leaders ($).",
      time: "Just now",
      read: false,
      type: "system",
    },
    {
      id: "notif-2",
      title: "Paper Simulator Capital Ready",
      message: "₹1,00,000 / $100,000 in virtual paper funds credited to your portfolio. Practice zero-risk trading.",
      time: "10 mins ago",
      read: false,
      type: "system",
    },
  ]);

  // Load authenticated user and real portfolio from backend DB
  const refreshPortfolio = useCallback(async () => {
    try {
      const res = await fetch("/api/user/portfolio");
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return;
        const data = await res.json();
        if (data.success) {
          if (data.user) {
            setUser(data.user);
          }
          if (data.portfolio) {
            setCash(data.portfolio.cashBalance);
            setTotalPortfolioValue(data.portfolio.totalPortfolioValue);
            setDayChange(data.portfolio.totalReturn || 0);
            setDayChangePercent(data.portfolio.totalReturnPercent || 0);
          }
          if (data.positions) {
            const mappedPositions: Position[] = (data.positions as ApiPosition[]).map((p) => ({
              symbol: p.symbol,
              name: p.name,
              shares: p.shares,
              avgBuyPrice: p.avgBuyPrice,
              currentPrice: p.currentPrice,
              totalValue: p.totalValue,
              unrealizedPnL: p.unrealizedPnL,
              unrealizedPnLPercent: p.unrealizedPnLPercent,
              sector: p.sector || "General",
              portfolioWeight: data.portfolio.totalPortfolioValue
                ? Math.round((p.totalValue / data.portfolio.totalPortfolioValue) * 100)
                : 10,
            }));
            setPositions(mappedPositions);
          }
          if (data.trades) {
            const mappedTrades: TradeRecord[] = (data.trades as ApiTrade[]).map((t) => ({
              id: t.id,
              symbol: t.symbol,
              name: t.name,
              type: t.type,
              shares: t.shares,
              price: t.price,
              amount: t.amount,
              pnl: t.pnl,
              pnlPercent: 0,
              timestamp: new Date(t.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                month: "short",
                day: "numeric",
              }),
              status: t.status,
            }));
            setTrades(mappedTrades);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user portfolio:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        void refreshPortfolio();
      }
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [refreshPortfolio]);

  const toggleMaskedBalance = () => setMaskedBalance((prev) => !prev);

  const toggleWatchlist = (symbol: string) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addNotification = (item: {
    title: string;
    message: string;
    type: "trade" | "signal" | "system";
    symbol?: string;
    actionUrl?: string;
  }) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: item.title,
        message: item.message,
        time: "Just now",
        read: false,
        type: item.type,
        symbol: item.symbol,
        actionUrl: item.actionUrl,
      },
      ...prev,
    ]);
  };

  const resetSimulationCash = (amount: number = 100000) => {
    void (async () => {
      try {
        await fetch("/api/user/portfolio/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
      } catch (err) {
        console.error("Failed to persist portfolio reset:", err);
      }
    })();

    setCash(amount);
    setPositions([]);
    setTrades([]);
    setTotalPortfolioValue(amount);
    setNotifications((prev) => [
      {
        id: `reset-${Date.now()}`,
        title: "Simulation Capital Reset",
        message: `Paper portfolio reset to starting cash balance of $${amount.toLocaleString()}.`,
        time: "Just now",
        read: false,
        type: "system",
      },
      ...prev,
    ]);
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch (e) {
      console.error("Signout error:", e);
    } finally {
      // Intentionally hard-navigate on signout to purge all React state and caches
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/signin";
    }
  };

  // Real paper trade execution against live market prices via backend API
  const executePaperTrade = async ({
    symbol,
    type,
    shares,
  }: {
    symbol: string;
    type: "BUY" | "SELL";
    shares: number;
    price?: number;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch("/api/user/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, type, shares }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return {
          success: false,
          message: "Unable to execute paper trade. Please sign in and retry.",
        };
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || "Failed to execute paper trade.",
        };
      }

      // Add to notifications
      setNotifications((prev) => [
        {
          id: `trade-${Date.now()}`,
          title: `Paper ${type} Executed`,
          message: `${type === "BUY" ? "Bought" : "Sold"} ${shares} ${symbol} @ $${data.livePrice?.toFixed(2)} (Real Market Price)`,
          time: "Just now",
          read: false,
          type: "trade",
        },
        ...prev,
      ]);

      // Refresh portfolio to reflect latest database state & live prices
      await refreshPortfolio();

      return {
        success: true,
        message: data.message,
      };
    } catch (err) {
      console.error("Trade execution error:", err);
      return {
        success: false,
        message: "Network error executing paper trade.",
      };
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SimulatorContext.Provider
      value={{
        user,
        cash,
        totalPortfolioValue,
        dayChange,
        dayChangePercent,
        trades,
        positions,
        watchlist,
        maskedBalance,
        currency,
        notifications,
        unreadCount,
        isNotificationsOpen,
        setNotificationsOpen,
        isLoading,
        toggleMaskedBalance,
        setCurrency,
        toggleWatchlist,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        addNotification,
        resetSimulationCash,
        refreshPortfolio,
        signOut,
        executePaperTrade,
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error("useSimulator must be used within a SimulatorProvider");
  }
  return context;
}
