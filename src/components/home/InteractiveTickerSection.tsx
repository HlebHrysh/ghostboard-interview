"use client";

import React, { useState } from "react";
import { Play, Laptop } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";

interface Props {
  t: HomeTranslations["tickerDemo"];
}

export function InteractiveTickerSection({ t }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<0 | 1 | 2>(0);

  const items = [
    { q: t.item1Q, a: t.item1A, label: t.btnTry1 },
    { q: t.item2Q, a: t.item2A, label: t.btnTry2 },
    { q: t.item3Q, a: t.item3A, label: t.btnTry3 },
  ];

  const current = items[selectedIdx];

  return (
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-black overflow-hidden">
      {/* Subtle titanium ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-white/[0.02] rounded-full blur-[160px] pointer-events-none" />

      {/* Optical viewfinder millimeter grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 24px)",
          maskImage: "radial-gradient(circle 500px at center, black, transparent)",
          WebkitMaskImage: "radial-gradient(circle 500px at center, black, transparent)",
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
          <div className="shimmer-pill inline-flex items-center px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-2" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {t.title}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed">
            {t.desc}
          </p>
        </div>

        {/* 3 Question Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIdx(idx as 0 | 1 | 2)}
              className={`px-4 py-2 rounded-full text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
                selectedIdx === idx
                  ? "bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Realistic Desktop Screen with Eyeline Ticker Ribbon */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-black border border-white/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.95)] p-4 sm:p-8 overflow-hidden">
          {/* Top Bezel Webcam simulation with optical marks */}
          <div className="flex flex-col items-center mb-4">
            <div className="flex items-center gap-1 mb-1 opacity-20">
              {Array.from({ length: 15 }).map((_, i) => (
                <span
                  key={i}
                  className={`w-0.5 bg-white ${i === 7 ? "h-2" : i % 2 === 0 ? "h-1.5" : "h-1"}`}
                />
              ))}
            </div>
            <div className="w-12 h-3 rounded-full bg-[#08080a] border border-white/10 flex items-center justify-center gap-1.5" title="Webcam optical sensor">
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              <span className="w-1 h-1 rounded-full bg-white/30" />
            </div>
          </div>

          {/* Running Ticker Ribbon */}
          <div className="w-full h-11 rounded-xl bg-black/95 border border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.06)] flex items-center justify-between px-3 sm:px-4 backdrop-blur-xl mb-6">
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff] animate-pulse" />
                {t.livePill}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase hidden xs:inline">
                {t.modeBadge}
              </span>
            </div>

            {/* Marquee viewport */}
            <div className="flex-1 overflow-hidden mx-3 sm:mx-6 h-6 flex items-center relative">
              <div
                key={selectedIdx}
                className="whitespace-nowrap inline-flex items-center font-mono text-xs animate-[ticker-marquee_24s_linear_infinite]"
              >
                <span className="text-zinc-400 font-medium mr-3">{current.q}</span>
                <span className="text-white/20 mr-3">──</span>
                <span className="text-white font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  {current.a}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/5 border border-white/10 hidden sm:inline">
                Ctrl+Alt+M
              </span>
            </div>
          </div>

          {/* Background Desktop Window Representation */}
          <div className="rounded-xl bg-[#040406] border border-white/[0.06] p-4 sm:p-6 text-xs font-mono text-zinc-500 space-y-2 select-none">
            <div className="flex items-center gap-2 text-zinc-400 pb-2 border-b border-white/[0.06]">
              <Laptop className="w-3.5 h-3.5 text-zinc-400" />
              <span>Full Screen Desktop Environment (Zero latency overlay)</span>
            </div>
            <p className="text-zinc-500 leading-relaxed font-sans">
              The 34px ribbon stays locked directly under your webcam lens. Because you look straight into the camera when reading, your interviewer sees a candidate speaking confidently with direct, unwavering eye contact.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
