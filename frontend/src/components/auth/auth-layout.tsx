"use client";

import React from "react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  quote?: {
    text: string;
    author: string;
  };
}

export function AuthLayout({
  children,
  quote = {
    text: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett",
  },
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background text-foreground">
      {/* Left Panel (roughly 45% width, dark navy/black with animated globe) */}
      <div className="relative hidden md:flex md:w-[45%] flex-col justify-between p-8 lg:p-12 bg-zinc-950 text-white overflow-hidden border-r border-border/50">
        {/* Animated Globe / Vector Background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 600 600" fill="none">
            {/* Concentric / Latitude Circles */}
            <circle cx="300" cy="300" r="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <circle cx="300" cy="300" r="170" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx="300" cy="300" r="110" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            <ellipse cx="300" cy="300" rx="220" ry="90" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <ellipse cx="300" cy="300" rx="90" ry="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

            {/* Glowing Connection Nodes */}
            <g className="animate-pulse">
              <circle cx="210" cy="240" r="4" fill="#10b981" />
              <circle cx="210" cy="240" r="10" stroke="#10b981" strokeWidth="1" opacity="0.4" />

              <circle cx="390" cy="210" r="4" fill="#3b82f6" />
              <circle cx="390" cy="210" r="12" stroke="#3b82f6" strokeWidth="1" opacity="0.4" />

              <circle cx="340" cy="360" r="4" fill="#10b981" />
              <circle cx="340" cy="360" r="8" stroke="#10b981" strokeWidth="1" opacity="0.4" />

              <circle cx="180" cy="350" r="4" fill="#6366f1" />
            </g>

            {/* Curved Flight Path Arcs */}
            <path
              d="M 210 240 Q 300 150 390 210"
              stroke="url(#arcGradient1)"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-pulse"
            />
            <path
              d="M 390 210 Q 400 320 340 360"
              stroke="url(#arcGradient2)"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
            <path
              d="M 340 360 Q 240 390 180 350"
              stroke="url(#arcGradient1)"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <path
              d="M 180 350 Q 150 270 210 240"
              stroke="url(#arcGradient2)"
              strokeWidth="2"
              strokeDasharray="3 3"
            />

            <defs>
              <linearGradient id="arcGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="arcGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* App Logo + Name Top-Left */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-bold text-sm shadow-md">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white leading-tight">
                Invest IQ
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                Educational Paper Trading
              </span>
            </div>
          </Link>
        </div>

        {/* Floating Quote Card Bottom-Left */}
        <div className="relative z-10 max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-2xl space-y-2">
          <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed italic">
            &ldquo;{quote.text}&rdquo;
          </p>
          <div className="text-xs font-semibold text-emerald-400">
            — {quote.author}
          </div>
        </div>
      </div>

      {/* Right Panel (roughly 55% width, centered form max-w ~450px) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[440px] space-y-6">
          {/* Mobile Logo fallback */}
          <div className="md:hidden flex justify-center pb-2">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                <TrendingUp className="h-4 w-4" />
              </div>
              <span className="font-bold text-base text-foreground">Invest IQ</span>
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
