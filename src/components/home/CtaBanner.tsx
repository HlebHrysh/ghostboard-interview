"use client";

import React from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";
import { BlackHoleButton } from "@/components/singularity/BlackHoleButton";

interface Props {
  t: HomeTranslations["ctaSection"];
}

export function CtaBanner({ t }: Props) {
  return (
    <section className="relative w-full py-24 sm:py-32 px-4 sm:px-6 bg-transparent border-t border-white/[0.08] overflow-hidden text-center isolate">
      {/* Event Horizon Cosmic Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] rounded-full blur-[110px] opacity-75"
        style={{
          background: "radial-gradient(circle, rgb(var(--sg-ink) / 0.12) 0%, transparent 70%)",
        }}
      />

      {/* Orbiting Accretion Disk Silhouette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full opacity-40 animate-disk-spin"
        style={{
          transform: "rotateX(74deg)",
          background: `conic-gradient(from 0deg, transparent, rgb(var(--sg-ink) / 0.5) 90deg, transparent 200deg)`,
          filter: "blur(4px)",
          maskImage: "radial-gradient(circle, transparent 40%, black 48%, black 60%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 40%, black 48%, black 60%, transparent 75%)",
        }}
      />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight font-display">
          {t.title}
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 font-sans leading-relaxed max-w-xl mx-auto">
          {t.subtitle}
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <BlackHoleButton href="/interview" size="lg">
            <Sparkles className="w-4 h-4 fill-current" />
            <span>{t.button}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </BlackHoleButton>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>{t.guarantee}</span>
        </div>
      </div>
    </section>
  );
}
