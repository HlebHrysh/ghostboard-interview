'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, ArrowRight, Sparkles, Zap } from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';
import { SpatialVideoCapsule, type SpatialVideoItem } from '@/components/ui/SpatialVideoCapsule';

interface Props {
  t: HomeTranslations;
}

const SPRING_PHYSICS = { type: 'spring' as const, stiffness: 300, damping: 26 };

export function TransparentPricingSection({ t }: Props) {
  const { locale } = useLocale();
  const isUa = locale === 'ua';
  const [focusView, setFocusView] = useState<'plans' | 'roi'>('plans');

  const handlePlanClick = (planName: string, targetUrl: string) => {
    trackFunnelEvent('pricing_plan_selected', {
      locale,
      plan: planName,
      target: targetUrl,
    });
  };

  const moneyVideos: SpatialVideoItem[] = [
    {
      id: 'money-roi',
      src: '/videos/money.mp4',
      label: isUa ? 'Offer ROI' : 'Offer ROI',
      caption: isUa ? 'Окупність з першого тижня після оффера' : 'Pays for itself on day one of your new offer',
    },
  ];

  const plans = [
    {
      id: 'sandbox',
      data: t.pricing.sandbox,
      popular: false,
      url: '/interview',
      quotaPills: isUa
        ? ['15 хв бойова сесія', '5 AI-відповідей', 'Без картки']
        : ['15m session', '5 AI answers', 'Zero card'],
    },
    {
      id: 'offerPack',
      data: t.pricing.offerPack,
      popular: true,
      url: '/pricing',
      quotaPills: isUa
        ? ['Безлімітні сесії', 'WDA Kernel Stealth', 'Sub-450ms TTFT']
        : ['Unlimited sessions', 'WDA Kernel Stealth', 'Sub-450ms TTFT'],
    },
    {
      id: 'unlimited',
      data: t.pricing.unlimited,
      popular: false,
      url: '/pricing',
      quotaPills: isUa
        ? ['Усі можливості', 'Priority Gemini 2.5', 'До отримання оффера']
        : ['All features', 'Priority Gemini 2.5', 'Zero recurring fees'],
    },
  ];

  return (
    <section
      id="pricing"
      className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06] scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header + Apple Spatial Glass ROI PiP Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-14">
          <div className="lg:col-span-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-xs font-mono text-emerald-300 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.pricing.badge}</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              {t.pricing.title}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {t.pricing.subtitle}
            </p>

            {/* Spring Pill View Toggle */}
            <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setFocusView('plans')}
                className={`relative px-4 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer z-10 ${
                  focusView === 'plans' ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {focusView === 'plans' && (
                  <motion.span
                    layoutId="pricing-view-pill"
                    transition={SPRING_PHYSICS}
                    className="absolute inset-0 rounded-full bg-white -z-10 shadow-sm"
                  />
                )}
                {isUa ? 'Тарифи та ліміти' : 'Plans & Quotas'}
              </button>
              <button
                type="button"
                onClick={() => setFocusView('roi')}
                className={`relative px-4 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer z-10 ${
                  focusView === 'roi' ? 'text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {focusView === 'roi' && (
                  <motion.span
                    layoutId="pricing-view-pill"
                    transition={SPRING_PHYSICS}
                    className="absolute inset-0 rounded-full bg-white -z-10 shadow-sm"
                  />
                )}
                {isUa ? 'Чому разовий пасс вигідніший' : 'Why One-Time Pass Wins'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bento-card rounded-3xl p-4 bg-white/[0.03] border border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
              <SpatialVideoCapsule
                videos={moneyVideos}
                layoutGroupId="pricing-money-capsule"
                compact
                aspectClassName="aspect-[16/9]"
              />
            </div>
          </div>
        </div>

        {/* Optional ROI summary banner when switched */}
        {focusView === 'roi' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING_PHYSICS}
            className="mb-8 p-5 rounded-3xl bg-emerald-500/[0.07] border border-emerald-400/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {isUa
                  ? 'Середнє зростання оффера після підготовки в Ghostboard становить +$800–$1 500/міс. Offer Pack за $29 окуповується за перші 2 дні роботи — без автоматичних списань.'
                  : 'Average compensation bump with Ghostboard prep is +$800–$1,500/mo. The $29 Offer Pack pays for itself in the first 2 days with zero auto-renew traps.'}
              </div>
            </div>
            <Link
              href="/pricing"
              className="shrink-0 px-4 py-2 rounded-xl bg-emerald-400 text-zinc-950 font-bold text-xs whitespace-nowrap hover:bg-emerald-300 transition-colors"
            >
              {isUa ? 'Порівняти детально →' : 'Compare tiers →'}
            </Link>
          </motion.div>
        )}

        {/* 3 Apple Spatial Glass Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, idx) => {
            const previewHighlights = [
              isUa
                ? '15 хв бойової сесії · 5 AI-відповідей · Без кредитної картки'
                : '15-min trial session · 5 AI answers · No credit card required',
              isUa
                ? 'Безлімітні співбесіди · 100% стелс ядра ОС · Нульова затримка'
                : 'Unlimited interviews · 100% kernel stealth · Sub-450ms TTFT',
              isUa
                ? 'Разовий платіж до отримання оффера · Без підписок та списань'
                : 'One-off pass until you land the offer · Zero recurring fees',
            ];

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING_PHYSICS, delay: idx * 0.08 }}
                whileHover={{ y: -4 }}
                className={`bento-card rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all relative shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ${
                  p.popular
                    ? 'bg-gradient-to-b from-white/[0.08] to-white/[0.025] border-2 border-emerald-400/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_0_55px_rgba(16,185,129,0.16)] ring-1 ring-emerald-400/20'
                    : 'bg-white/[0.03] border border-white/[0.1] hover:border-white/[0.2]'
                }`}
              >
                {p.popular && p.data.popularTag && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-400 text-zinc-950 font-mono text-xs font-bold uppercase tracking-wider shadow-md whitespace-nowrap">
                    {p.data.popularTag}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1]">
                      {p.data.badge}
                    </span>
                    {p.popular && <Zap className="w-4 h-4 text-emerald-400" />}
                  </div>

                  <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight mb-1">
                    {p.data.name}
                  </h3>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-2 my-4 pb-4 border-b border-white/[0.08]">
                    <span className="font-display tabular-nums text-4xl font-extrabold text-white tracking-tight">
                      {p.data.price}
                    </span>
                    <span className="text-xs font-mono text-zinc-300">{p.data.period}</span>
                  </div>

                  {/* Essence Highlight */}
                  <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed mb-5">
                    {previewHighlights[idx]}
                  </p>

                  {/* Quota Pills */}
                  <div className="space-y-2 mb-6">
                    {p.quotaPills.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-xs text-zinc-200 font-mono bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2"
                      >
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 ${
                            p.popular ? 'text-emerald-400' : 'text-zinc-300'
                          }`}
                        />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href={p.url}
                  data-magnetic
                  onClick={() => handlePlanClick(p.id, p.url)}
                  className={`w-full py-3.5 px-4 rounded-2xl text-center text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                    p.popular
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                      : 'bg-white/[0.07] hover:bg-white/[0.13] text-white border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  }`}
                >
                  <span>{p.data.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Link to full /pricing matrix */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/pricing"
            data-magnetic
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] text-xs sm:text-sm font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer"
          >
            <span>
              {isUa
                ? 'Переглянути детальне порівняння всіх тарифів та матрицю фіч'
                : 'View full plan comparison & feature matrix'}
            </span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>

        {/* Guarantee Banner */}
        <div className="mt-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{t.pricing.guarantee}</span>
        </div>
      </div>
    </section>
  );
}
