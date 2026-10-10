"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, Download, Volume2, ShieldCheck } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";
import { MonochromeStripesCanvas } from "@/components/ui/MonochromeStripesCanvas";
import { PerspectiveGridHero } from "@/components/ui/PerspectiveGridHero";

// Three.js is client-only and heavy — load it lazily after hydration.
const GhostDetective3D = dynamic(
  () => import("@/components/ui/GhostDetective3D").then((m) => m.GhostDetective3D),
  { ssr: false }
);

interface Props {
  t: HomeTranslations;
}

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.7, ease, delay },
});

export function ResendHero({ t }: Props) {
  return (
    <MonochromeStripesCanvas
      direction="vertical"
      density="normal"
      glowIntensity={0.08}
      className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6"
    >
      {/* 3D Perspective Grid floor & ceiling laser lines */}
      <PerspectiveGridHero />

      <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-6 items-center">
        {/* Left: Typography & Action */}
        <div className="flex flex-col items-start text-left">
          <motion.div {...fadeUp(0)}>
            <Link
              href="/interview"
              className="shimmer-pill group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.08)] text-xs text-zinc-300 hover:text-white transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>{t.badge}</span>
              <span className="text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          </motion.div>

          <motion.h1
            {...fadeUp(0.08)}
            className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.05] text-white bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent"
          >
            {t.title} <br className="hidden sm:inline" />
            {t.titleAccent}
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className="text-zinc-400 text-base sm:text-lg max-w-lg leading-relaxed font-normal mt-4"
          >
            {t.subtitle}
          </motion.p>

          <motion.div {...fadeUp(0.24)} className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link
              href="/interview"
              className="btn-resend-primary !py-3 !px-7 text-sm group"
            >
              <span>{t.ctaLaunch}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/download"
              className="btn-resend-glass !py-3 !px-6 text-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              <span>{t.ctaDownload}</span>
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.32)} className="mt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/interview?modal=soundcheck"
              className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{t.ctaSoundcheck} →</span>
            </Link>
            <span className="hidden sm:inline text-zinc-700">•</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
              <span>100% Invisible to Zoom & Meet capture</span>
            </span>
          </motion.div>

          {/* Key metrics */}
          <motion.div
            {...fadeUp(0.4)}
            className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-white/[0.08] w-full max-w-lg"
          >
            {[
              ["1.18s", "Gemini 2.5 Flash"],
              ["16kHz", "Deepgram Nova-3"],
              ["100%", "Capture Excluded"],
              ["0 Keys", "Pre-Configured"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-lg font-medium text-white tracking-tight">{value}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: Interactive 3D Ghost */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease, delay: 0.2 }}
          className="relative w-full h-[450px] lg:h-[580px] flex items-center justify-center pointer-events-auto"
        >
          <div className="absolute inset-[15%] rounded-full bg-white/[0.04] blur-[90px] pointer-events-none" />
          <GhostDetective3D className="absolute inset-0 w-full h-full [&>canvas]:w-full [&>canvas]:h-full" />
        </motion.div>
      </div>
    </MonochromeStripesCanvas>
  );
}
