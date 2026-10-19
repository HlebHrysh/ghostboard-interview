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

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
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
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold px-2.5 py-0.5 rounded bg-white/[0.04]">
                    {p.data.badge}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
                  {p.data.name}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed min-h-[40px] mb-6">
                  {p.data.desc}
                </p>

                {/* Price Display */}
                <div className="flex items-baseline gap-2 pb-6 mb-6 border-b border-white/[0.06]">
                  <span className="text-4xl sm:text-5xl font-extrabold font-mono text-white tracking-tight">
                    {p.data.price}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">{p.data.period}</span>
                </div>

                {/* Feature Bullets */}
                <ul className="space-y-3 mb-8">
                  {p.data.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          p.popular ? 'text-emerald-400' : 'text-zinc-500'
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <Link
                href={p.url}
                onClick={() => handlePlanClick(p.id, p.url)}
                className={`w-full py-3.5 px-4 rounded-xl text-center text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  p.popular
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10'
                }`}
              >
                <span>{p.data.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Guarantee Banner */}
        <div className="mt-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{t.pricing.guarantee}</span>
        </div>
      </div>
    </section>
  );
}
