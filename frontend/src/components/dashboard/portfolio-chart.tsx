"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Calendar, ChevronDown, TrendingUp, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useSimulator } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";
import {
  FINANCIAL_YEARS_DATA,
  MULTI_YEAR_DATA,
} from "@/lib/financial-history";

type YearKey = "2026" | "2025" | "2024" | "2023" | "2022" | "2021" | "5Y";

export function PortfolioChart() {
  const { totalPortfolioValue, currency, maskedBalance } = useSimulator();
  const { resolvedTheme } = useTheme();

  const [selectedYear, setSelectedYear] = useState<YearKey>("2026");
  const [activeSeries, setActiveSeries] = useState<"both" | "portfolio" | "benchmark">("both");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isDark = resolvedTheme === "dark";
  const primaryStroke = isDark ? "#ffffff" : "#09090b";
  const benchmarkStroke = "#3b82f6"; // Vibrant blue

  const isUsd = currency === "USD";
  const benchmarkName = isUsd ? "S&P 500 Benchmark" : "Nifty 50 Benchmark";

  // Build chart dataset depending on selected year
  const chartData = useMemo(() => {
    if (selectedYear === "5Y") {
      return MULTI_YEAR_DATA.map((item) => ({
        label: item.year,
        primary: isUsd ? item.spNormalized : item.niftyNormalized,
        benchmark: isUsd ? item.spNormalized : item.niftyNormalized,
        rawIndex: isUsd ? item.spRaw : item.niftyRaw,
      }));
    }

    const yearData = FINANCIAL_YEARS_DATA[selectedYear];
    if (!yearData) return [];

    return yearData.data.map((point) => {
      const isCurrentMonth = selectedYear === "2026" && point.month === "Sep";
      
      // For 2026: interpolate user's live portfolio value at the current month
      let userVal: number;
      if (selectedYear === "2026") {
        if (isCurrentMonth) {
          userVal = totalPortfolioValue;
        } else {
          // Proportionally align historical months to starting 100,000 capital
          const benchmarkVal = isUsd ? point.spNormalized : point.niftyNormalized;
          userVal = benchmarkVal;
        }
      } else {
        userVal = isUsd ? point.spNormalized : point.niftyNormalized;
      }

      const benchmarkVal = isUsd ? point.spNormalized : point.niftyNormalized;
      const rawIndexVal = isUsd ? point.spRaw : point.niftyRaw;

      // 2025 baseline comparison for 2026
      let lastYearVal: number | undefined;
      if (selectedYear === "2026") {
        const lastYearPoint = FINANCIAL_YEARS_DATA["2025"]?.data[point.monthIndex];
        if (lastYearPoint) {
          lastYearVal = isUsd ? lastYearPoint.spNormalized : lastYearPoint.niftyNormalized;
        }
      }

      return {
        label: point.month,
        primary: Math.round(userVal),
        benchmark: Math.round(benchmarkVal),
        lastYear: lastYearVal ? Math.round(lastYearVal) : undefined,
        rawIndex: rawIndexVal,
        isLivePoint: isCurrentMonth,
      };
    });
  }, [selectedYear, totalPortfolioValue, isUsd]);

  // Dynamic Min & Max for YAxis domain with headroom
  const { yMin, yMax, displayReturn, dateRangeLabel } = useMemo(() => {
    if (selectedYear === "5Y") {
      const vals = chartData.map((d) => d.primary);
      const min = Math.floor(Math.min(...vals) * 0.9 / 10000) * 10000;
      const max = Math.ceil(Math.max(...vals) * 1.05 / 10000) * 10000;
      return {
        yMin: Math.max(0, min),
        yMax: max,
        displayReturn: isUsd ? "+59.2% (5Y Gain)" : "+35.3% (5Y Gain)",
        dateRangeLabel: "2021 — 2026 (5-Year Trend)",
      };
    }

    const yearData = FINANCIAL_YEARS_DATA[selectedYear];
    const vals = chartData.flatMap((d) => [d.primary, d.benchmark]).filter((v): v is number => typeof v === "number" && !isNaN(v));
    const minVal = vals.length ? Math.min(...vals) : 90000;
    const maxVal = vals.length ? Math.max(...vals) : 130000;
    const padding = (maxVal - minVal) * 0.15 || 5000;

    const returnPct = selectedYear === "2026"
      ? (((totalPortfolioValue - 100000) / 100000) * 100).toFixed(2)
      : (isUsd ? yearData?.spAnnualReturn : yearData?.niftyAnnualReturn)?.toFixed(2) || "0.00";

    return {
      yMin: Math.max(0, Math.floor((minVal - padding) / 5000) * 5000),
      yMax: Math.ceil((maxVal + padding) / 5000) * 5000,
      displayReturn: `${Number(returnPct) >= 0 ? "+" : ""}${returnPct}% ${selectedYear === "2026" ? "Live YTD" : "Annual"}`,
      dateRangeLabel: yearData?.dateRange || `Jan ${selectedYear} - Dec ${selectedYear}`,
    };
  }, [selectedYear, chartData, totalPortfolioValue, isUsd]);

  return (
    <div className="fintech-card p-5 sm:p-6 space-y-4 relative">
      {/* Top Header: Title, Live/Historical badges, and Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Financial Overview
            </h2>
            {selectedYear === "2026" ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE • REAL-TIME
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-mono">
                HISTORICAL DATA
              </span>
            )}
          </div>

          {/* Subtitle / Legend Row with clickable toggles */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs mt-1.5">
            {/* Primary line toggle */}
            <button
              onClick={() =>
                setActiveSeries(activeSeries === "portfolio" ? "both" : "portfolio")
              }
              className="flex items-center gap-1.5 transition-opacity hover:opacity-80 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-foreground shrink-0" />
              <span className="text-muted-foreground">
                {selectedYear === "2026" ? "Current Portfolio:" : `${selectedYear} Trajectory:`}
              </span>
              <span className="font-bold text-foreground tabular-nums">
                {maskedBalance
                  ? "••••••••"
                  : selectedYear === "2026"
                  ? formatCurrency(totalPortfolioValue, currency)
                  : formatCurrency(chartData[chartData.length - 1]?.primary || 100000, currency)}
              </span>
            </button>

            {/* Benchmark line toggle */}
            <button
              onClick={() =>
                setActiveSeries(activeSeries === "benchmark" ? "both" : "benchmark")
              }
              className="flex items-center gap-1.5 transition-opacity hover:opacity-80 cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-muted-foreground">{benchmarkName}:</span>
              <span className="font-medium text-blue-500 dark:text-blue-400 tabular-nums">
                {maskedBalance ? "••••" : formatCurrency(chartData[chartData.length - 1]?.benchmark || 100000, currency)}
              </span>
            </button>

            {/* Performance Return Badge */}
            <span
              className={cn(
                "font-semibold text-xs flex items-center gap-1",
                displayReturn.startsWith("+")
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              <TrendingUp className="h-3 w-3" />
              <span>{displayReturn}</span>
            </span>
          </div>
        </div>

        {/* Right: Interactive Year Selector Dropdown & Button */}
        <div className="relative shrink-0">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all shadow-2xs cursor-pointer"
            title="Select year or historical timeframe"
            aria-expanded={dropdownOpen}
          >
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-mono">{dateRangeLabel}</span>
            <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", dropdownOpen && "rotate-180")} />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-border bg-card shadow-2xl p-2 z-40 animate-in fade-in-0 zoom-in-95 text-xs space-y-1">
                <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex items-center justify-between">
                  <span>Select Financial Year</span>
                  <span className="text-[10px] text-primary">Real Data</span>
                </div>

                <div className="pt-1 space-y-0.5">
                  {(
                    [
                      { key: "2026", label: "2026 (Live Present)", sub: "Up-to-date real-time streaming", live: true },
                      { key: "2025", label: "2025 Historical", sub: isUsd ? "+16.2% Annual Return" : "+10.8% Annual Return", live: false },
                      { key: "2024", label: "2024 Historical", sub: isUsd ? "+23.3% Annual Return" : "+11.1% Annual Return", live: false },
                      { key: "2023", label: "2023 Historical", sub: isUsd ? "+24.2% Annual Return" : "+20.0% Annual Return", live: false },
                      { key: "2022", label: "2022 Historical", sub: isUsd ? "-19.4% Macro Dip" : "+4.3% Defensive Rally", live: false },
                      { key: "2021", label: "2021 Historical", sub: isUsd ? "+26.9% Bull Market" : "+27.3% Bull Run", live: false },
                      { key: "5Y", label: "5-Year Macro (2021-2026)", sub: "5-year real compounding trend", live: false },
                    ] as { key: YearKey; label: string; sub: string; live?: boolean }[]
                  ).map((opt) => {
                    const isSelected = selectedYear === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setSelectedYear(opt.key);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer",
                          isSelected
                            ? "bg-primary/10 text-primary font-bold border border-primary/20"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            {opt.live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            <span className="font-semibold text-xs">{opt.label}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            {opt.sub}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-primary">Active</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Year Pill Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-border/40 scrollbar-none">
        <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline mr-1">
          Timeframe:
        </span>
        {(
          [
            { key: "2026", label: "2026 (Live)", live: true },
            { key: "2025", label: "2025", live: false },
            { key: "2024", label: "2024", live: false },
            { key: "2023", label: "2023", live: false },
            { key: "2022", label: "2022", live: false },
            { key: "2021", label: "2021", live: false },
            { key: "5Y", label: "5Y All Years", live: false },
          ] as { key: YearKey; label: string; live?: boolean }[]
        ).map((tab) => {
          const isSelected = selectedYear === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedYear(tab.key)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {tab.live && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Recharts Clean Line Chart with Real Institutional & Live Present Data */}
      <div className="h-[270px] w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
              opacity={0.35}
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => {
                if (v === 0) return isUsd ? "$0" : "₹0";
                return isUsd ? `$${(v / 1000).toFixed(0)}k` : `₹${(v / 1000).toFixed(0)}k`;
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                const point = payload[0]?.payload;
                const primaryVal = point?.primary;
                const benchVal = point?.benchmark;
                const rawIdx = point?.rawIndex;
                const isLive = point?.isLivePoint;

                return (
                  <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md p-3 text-xs shadow-2xl space-y-1.5 font-mono min-w-[190px]">
                    <div className="font-semibold text-foreground border-b border-border/60 pb-1 flex items-center justify-between">
                      <span>{label} {selectedYear !== "5Y" ? selectedYear : ""}</span>
                      {isLive && (
                        <span className="text-[10px] text-emerald-500 font-bold animate-pulse flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          LIVE
                        </span>
                      )}
                    </div>

                    {primaryVal !== undefined && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-foreground font-medium flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-foreground" />
                          {selectedYear === "2026" ? "Portfolio:" : "Capital Value:"}
                        </span>
                        <span className="font-bold text-foreground tabular-nums">
                          {maskedBalance ? "••••" : formatCurrency(primaryVal, currency)}
                        </span>
                      </div>
                    )}

                    {benchVal !== undefined && (
                      <div className="flex items-center justify-between gap-3 text-blue-500 dark:text-blue-400">
                        <span className="font-medium flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          {isUsd ? "S&P Index:" : "Nifty Index:"}
                        </span>
                        <span className="font-medium tabular-nums">
                          {maskedBalance ? "••••" : formatCurrency(benchVal, currency)}
                        </span>
                      </div>
                    )}

                    {rawIdx !== undefined && (
                      <div className="pt-1 border-t border-border/40 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Real Index Close:</span>
                        <span className="font-bold text-foreground">
                          {rawIdx.toLocaleString("en-US")} pts
                        </span>
                      </div>
                    )}
                  </div>
                );
              }}
            />

            {/* Benchmark Line (Nifty / S&P 500) */}
            {(activeSeries === "both" || activeSeries === "benchmark") && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke={benchmarkStroke}
                strokeWidth={1.75}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: benchmarkStroke }}
                activeDot={{ r: 4.5 }}
                isAnimationActive={false}
              />
            )}

            {/* Primary Portfolio / Year Trajectory Line (Live on 2026) */}
            {(activeSeries === "both" || activeSeries === "portfolio") && (
              <Line
                type="monotone"
                dataKey="primary"
                stroke={primaryStroke}
                strokeWidth={2.2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.isLivePoint) {
                    return (
                      <circle
                        key={`live-dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5.5}
                        fill="#10b981"
                        stroke={isDark ? "#09090b" : "#ffffff"}
                        strokeWidth={2}
                      />
                    );
                  }
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={primaryStroke}
                      stroke={isDark ? "#09090b" : "#ffffff"}
                      strokeWidth={1.5}
                    />
                  );
                }}
                activeDot={{ r: 5.5, fill: primaryStroke }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Insight Strip */}
      <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>
            {selectedYear === "2026"
              ? "Current year data tracks real-time paper portfolio balance with sub-second price ticks."
              : `Real institutional historical performance recorded across 12 calendar months of ${selectedYear}.`}
          </span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground/80">
          Baseline Capital: {formatCurrency(100000, currency)}
        </div>
      </div>
    </div>
  );
}
