"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GaugeProps {
  value: number; // 0 to 100
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Gauge({
  value,
  label = "Good",
  size = 180,
  strokeWidth = 14,
  className,
}: GaugeProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const cy = size / 2;

  // Semicircle arc calculations (180 degrees)
  // Circumference of full circle = 2 * PI * r
  // Half circumference = PI * r
  const arcLength = Math.PI * radius;
  const strokeDashoffset = arcLength - (clampedValue / 100) * arcLength;

  return (
    <div className={cn("flex flex-col items-center justify-center relative", className)}>
      <svg
        width={size}
        height={size / 2 + strokeWidth + 4}
        viewBox={`0 0 ${size} ${size / 2 + strokeWidth + 4}`}
        className="overflow-visible"
      >
        {/* Background Semicircle Arc */}
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Foreground Active Arc (Blue / primary) */}
        <path
          d={`M ${strokeWidth / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${cy}`}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Centered Number and Label */}
      <div className="absolute top-[38%] flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tracking-tight text-foreground leading-none">
          {clampedValue}
        </span>
        <span className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}
