'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Download, ShieldCheck, Sparkles } from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

export function FooterSmartCta({ t }: Props) {
  const { locale } = useLocale();

  return (
    <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden border-t border-white/[0.08]">
      {/* Ambient Radial Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-t from-emerald-500/10 via-indigo-500/10 to-transparent blur-[120px] -z-10"
      />

      <div className="max-w-4xl mx-auto text-center spatial-glass-window rounded-3xl p-8 sm:p-14 border border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_25px_70px_rgba(0,0,0,0.65)]">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-mono text-zinc-200 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t.footerCta.badge}</span>
        </div>

        <h2 className="font-display text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          {t.footerCta.title}
        </h2>

        <p className="mt-6 text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          {t.footerCta.subtitle}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/interview"
            data-magnetic
            onClick={() =>
              trackFunnelEvent('hero_cta_download_clicked', {
                locale,
                target: '/interview',
              })
            }
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm shadow-[0_0_40px_rgba(255,255,255,0.22),inset_0_1px_0_rgba(255,255,255,0.8)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <span>{t.footerCta.primaryButton}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/download"
            data-magnetic
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 backdrop-blur-xl cursor-pointer active:scale-[0.98]"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            <span>{t.footerCta.secondaryButton}</span>
          </Link>
        </div>

        <div className="mt-6 text-xs text-zinc-400 flex items-center justify-center gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{t.footerCta.guaranteeNote}</span>
        </div>
      </div>
    </section>
  );
}
