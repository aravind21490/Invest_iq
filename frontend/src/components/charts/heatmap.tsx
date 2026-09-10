"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface HeatmapProps {
  totalTrades?: number;
  weeks?: number;
  className?: string;
}

export function Heatmap({
  totalTrades = 428,
  weeks = 26,
  className,
}: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    count: number;
    day: string;
  } | null>(null);

  // Generate consistent mock contribution matrix
  // 7 rows (Sun to Sat), weeks columns
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const grid = Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: weeks }, (_, col) => {
      // Deterministic intensity calculation
      const val = ((row * 7 + col * 13 + (col % 5)) % 17);
      let intensity = 0;
      let count = 0;
      if (val > 13) {
        intensity = 4;
        count = 6 + (val % 4);
      } else if (val > 9) {
        intensity = 3;
        count = 3 + (val % 3);
      } else if (val > 5) {
        intensity = 2;
        count = 2;
      } else if (val > 2) {
        intensity = 1;
        count = 1;
      }
      return { intensity, count, day: `${days[row]} W${col + 1}` };
    })
  );

  const getIntensityClass = (level: number) => {
    switch (level) {
      case 1:
        return "bg-emerald-900/60 dark:bg-emerald-950/80 border-emerald-800/40";
      case 2:
        return "bg-emerald-700/70 dark:bg-emerald-800/70 border-emerald-700/50";
      case 3:
        return "bg-emerald-600 dark:bg-emerald-600 border-emerald-500/60";
      case 4:
        return "bg-emerald-400 dark:bg-emerald-400 border-emerald-300";
      default:
        return "bg-muted/40 border-border/40";
    }
  };

  return (
    <div className={cn("fintech-card p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Trading Activity Heatmap
          </span>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
            {totalTrades} trades this year
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-xs bg-muted/40 border border-border/40" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-900/60 border border-emerald-800/40" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-700/70 border border-emerald-700/50" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600 border border-emerald-500/60" />
            <span className="h-2.5 w-2.5 rounded-xs bg-emerald-400 border border-emerald-300" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-[500px]">
          {/* Row Labels (Mon, Wed, Fri) */}
          <div className="flex flex-col justify-between text-[10px] text-muted-foreground pr-1 py-1 font-mono">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>

          {/* Grid of Cells */}
          <div className="flex gap-1">
            {Array.from({ length: weeks }, (_, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-1">
                {grid.map((row, rowIndex) => {
                  const cell = row[colIndex];
                  return (
                    <div
                      key={rowIndex}
                      onMouseEnter={() =>
                        setHoveredCell({ count: cell.count, day: cell.day })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        "h-3 w-3 rounded-xs border transition-colors cursor-pointer",
                        getIntensityClass(cell.intensity)
                      )}
                      title={`${cell.count} trades on ${cell.day}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Status */}
      <div className="text-[11px] text-muted-foreground h-4">
        {hoveredCell ? (
          <span>
            <strong className="text-foreground">{hoveredCell.count} paper trades</strong> on{" "}
            {hoveredCell.day}
          </span>
        ) : (
          <span>Hover over any block to view daily paper trading volume.</span>
        )}
      </div>
    </div>
  );
}
