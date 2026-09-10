import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ElementType;
  delta?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  delta,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "fintech-card p-5 space-y-2 relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {Icon && (
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "text-xs font-semibold",
              delta.isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {delta.isPositive ? "+" : ""}
            {delta.value}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
