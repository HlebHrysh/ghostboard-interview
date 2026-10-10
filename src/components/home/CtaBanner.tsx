"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";

interface Props {
  t: HomeTranslations["ctaSection"];
}

export function CtaBanner({ t }: Props) {
  return (
    <section className="relative w-full py-20 sm:py-28 px-4 sm:px-6 bg-black border-t border-white/[0.08] overflow-hidden text-center">
      {/* Monochromatic titanium ambient cone */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[320px] bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* Subtle pinstripes */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 28px)",
          maskImage: "radial-gradient(circle 500px at center, black, transparent)",
          WebkitMaskImage: "radial-gradient(circle 500px at center, black, transparent)",
        }}
      />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-display">
          {t.title}
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 font-sans leading-relaxed">
          {t.subtitle}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/interview"
            className="btn-resend-primary !py-3.5 !px-8 text-sm group"
          >
            <Sparkles className="w-4 h-4 fill-black" />
            <span>{t.button}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono text-zinc-500">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>{t.guarantee}</span>
        </div>
      </div>
    </section>
  );
}
