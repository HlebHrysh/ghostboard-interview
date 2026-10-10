"use client";

import React from "react";
import Link from "next/link";
import { Activity, MessageSquareCode, Zap, ArrowUpRight } from "lucide-react";

interface TelemetryBentoProps {
  sessionCount: number;
  totalQuestions: number;
  locale: string;
}

export function TelemetryBento({
  sessionCount,
  totalQuestions,
  locale,
}: TelemetryBentoProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* ── Metric Card 1: Active Sessions ── */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.16] hover:bg-zinc-950/80 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            {locale === "ua" ? "Активні сесії" : "Active Sessions"}
          </span>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{locale === "ua" ? "Синхронізовано" : "Live Sync"}</span>
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-3xl font-semibold tracking-tight text-white">
            {sessionCount}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.08] group-hover:scale-105 transition-transform">
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
        </div>

        <p className="mt-2 text-[11px] text-zinc-500">
          {locale === "ua"
            ? "Пройдених тренувань та реальних співбесід"
            : "Recorded mock and real live interview sessions"}
        </p>
      </div>

      {/* ── Metric Card 2: Total Questions with Sparkline ── */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.16] hover:bg-zinc-950/80 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            {locale === "ua" ? "Опрацьовано питань" : "Questions Handled"}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-300 border border-white/[0.08] group-hover:scale-105 transition-transform">
            <MessageSquareCode className="h-4 w-4 text-cyan-400" />
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-semibold tracking-tight text-white">
              {totalQuestions}
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              {locale === "ua" ? "Розпізнано STT та синтезовано ШІ" : "STT speech parsed & AI synthesized"}
            </p>
          </div>

          {/* SVG Sparkline Graph */}
          <div className="h-9 w-20 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
            <svg viewBox="0 0 80 36" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="cyanSparkline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0 28 Q 15 26, 25 18 T 50 14 T 70 6 L 80 4"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M 0 28 Q 15 26, 25 18 T 50 14 T 70 6 L 80 4 L 80 36 L 0 36 Z"
                fill="url(#cyanSparkline)"
              />
              <circle cx="80" cy="4" r="2.5" fill="#22d3ee" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Metric Card 3: AI Inference Latency HUD ── */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.16] hover:bg-zinc-950/80 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            {locale === "ua" ? "Затримка ШІ Копілота" : "Copilot AI Latency"}
          </span>
          <Link
            href="/scorecard"
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors"
            title={locale === "ua" ? "Перейти до звітів" : "View performance scorecards"}
          >
            <span>{locale === "ua" ? "Звіти" : "Scorecard"}</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-3xl font-semibold tracking-tight text-white flex items-baseline gap-1">
            <span>&lt; 1.2</span>
            <span className="text-sm font-normal text-zinc-400">s</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>1.1s avg</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{locale === "ua" ? "Deepgram Nova-3 + Gemini Flash" : "Deepgram Nova-3 + Gemini Flash"}</span>
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      </div>
    </section>
  );
}
