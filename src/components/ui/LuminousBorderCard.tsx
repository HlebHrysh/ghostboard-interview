"use client";

import React from "react";

interface LuminousBorderCardProps {
  children: React.ReactNode;
  className?: string;
  badge?: string;
  animated?: boolean;
}

export function LuminousBorderCard({
  children,
  className = "",
  badge,
  animated = true,
}: LuminousBorderCardProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-zinc-950/90 p-px transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.06)] ${className}`}
    >
      {/* Animated rotating border beam (White-Silver monochrome) */}
      {animated && (
        <div
          className="pointer-events-none absolute -inset-[100%] z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 animate-border-spin"
          style={{
            background:
              "conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 300deg, rgba(255,255,255,0.7) 340deg, #ffffff 360deg)",
          }}
        />
      )}

      {/* Titanium 1px structural micro-border */}
      <div className="absolute inset-0 z-[1] rounded-2xl border border-white/[0.08] pointer-events-none group-hover:border-white/[0.2] transition-colors" />

      {/* Obsidian glass card body */}
      <div className="relative z-[2] h-full w-full rounded-[15px] bg-[#070709]/95 p-6 sm:p-8 backdrop-blur-xl flex flex-col justify-between">
        {badge && (
          <div className="mb-4 inline-flex items-center gap-1.5 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {badge}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
