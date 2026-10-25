'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

export function TransparentPricingSection({ t }: Props) {
  const { locale } = useLocale();

  const handlePlanClick = (planName: string, targetUrl: string) => {
    trackFunnelEvent('pricing_plan_selected', {
      locale,
      plan: planName,
      target: targetUrl,
    });
  };

  const plans = [
    {
      id: 'sandbox',
      data: t.pricing.sandbox,
      popular: false,
      url: '/interview',
      accent: 'zinc',
    },
    {
      id: 'offerPack',
      data: t.pricing.offerPack,
      popular: true,
      url: '/pricing',
      accent: 'emerald',
    },
    {
      id: 'unlimited',
      data: t.pricing.unlimited,
      popular: false,
      url: '/pricing',
      accent: 'indigo',
    },
  ];

  return (
    <section id="pricing" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06] scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.pricing.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t.pricing.subtitle}
          </p>
        </div>

        {/* 3 Compact Preview Cards (No Text Bloat) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, idx) => {
            const previewHighlights = [
              locale === 'ua'
                ? '15 хв бойової сесії · 5 AI-відповідей · Без кредитної картки'
                : '15-min trial session · 5 AI answers · No credit card required',
              locale === 'ua'
                ? 'Безлімітні співбесіди · 100% стелс ядра ОС · Нульова затримка'
                : 'Unlimited interviews · 100% kernel stealth · Sub-450ms TTFT',
              locale === 'ua'
                ? 'Разовий платіж до отримання оффера · Без підписок та списань'
                : 'One-off pass until you land the offer · Zero recurring fees',
            ];

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                  p.popular
                    ? 'bg-gradient-to-b from-white/[0.06] to-white/[0.02] border-2 border-emerald-500/60 shadow-[0_0_50px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                    : 'bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15]'
                }`}
              >
                {/* Top Banner Tag for Popular Plan */}
                {p.popular && p.data.popularTag && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-500 text-zinc-950 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                    {p.data.popularTag}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold px-2.5 py-0.5 rounded bg-white/[0.04]">
                      {p.data.badge}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-1">
                    {p.data.name}
                  </h3>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-2 my-4 pb-4 border-b border-white/[0.06]">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
                      {p.data.price}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{p.data.period}</span>
                  </div>

                  {/* Compact Essence Highlight */}
                  <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed mb-6">
                    {previewHighlights[idx]}
                  </p>
                </div>

                {/* Action Button */}
                <Link
                  href={p.url}
                  onClick={() => handlePlanClick(p.id, p.url)}
                  className={`w-full py-3 px-4 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    p.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10'
                  }`}
                >
                  <span>{p.data.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Conversion link to full /pricing page */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white transition-all shadow-sm cursor-pointer"
          >
            <span>
              {locale === 'ua'
                ? 'Переглянути детальне порівняння всіх тарифів та матрицю фіч'
                : 'View full plan comparison & feature matrix'}
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>

        {/* Guarantee Banner */}
        <div className="mt-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{t.pricing.guarantee}</span>
        </div>
      </div>
    </section>
  );
}
