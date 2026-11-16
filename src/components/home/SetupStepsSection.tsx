'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Sliders, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { HomeTranslations } from '@/lib/homeI18n';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

const SPRING_PHYSICS = { type: 'spring' as const, stiffness: 300, damping: 26 };

export function SetupStepsSection({ t }: Props) {
  const { locale } = useLocale();
  const isUa = locale === 'ua';
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      ...t.setup.step1,
      icon: Download,
      accentBg: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
      ringGlow: 'from-sky-500/20 via-transparent to-cyan-500/10',
    },
    {
      ...t.setup.step2,
      icon: Sliders,
      accentBg: 'bg-violet-500/15 border-violet-400/30 text-violet-300',
      ringGlow: 'from-violet-500/20 via-transparent to-indigo-500/10',
    },
    {
      ...t.setup.step3,
      icon: Sparkles,
      accentBg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
      ringGlow: 'from-emerald-500/20 via-transparent to-teal-500/10',
    },
  ];

  return (
    <section
      id="setup"
      className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06] scroll-mt-24"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] text-xs font-mono text-zinc-200 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.setup.badge}</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            {t.setup.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
            {t.setup.subtitle}
          </p>
        </div>

        {/* Interactive 3-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;

            return (
              <motion.button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(idx)}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ ...SPRING_PHYSICS, delay: idx * 0.08 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                className={`bento-card text-left rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-white/[0.065] border-white/[0.24] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_20px_50px_rgba(0,0,0,0.55)]'
                    : 'bg-white/[0.025] border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:border-white/[0.18]'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="setup-active-step"
                    transition={SPRING_PHYSICS}
                    className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${step.ringGlow} ring-1 ring-white/25`}
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-inner ${step.accentBg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-display tabular-nums text-3xl font-extrabold text-white/15 tracking-tight">
                      {step.number}
                    </span>
                  </div>

                  <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    {step.tag}
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-6">
                    {step.desc}
                  </p>
                </div>

                <div className="relative z-10 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{step.pill}</span>
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Clean Action Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/guide"
            className="text-xs sm:text-sm font-mono text-zinc-300 hover:text-white transition-colors inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]"
          >
            <span>{isUa ? 'Відкрити повний гайд налаштування' : 'Open full pre-flight guide'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/interview"
            data-magnetic
            className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 text-xs sm:text-sm font-bold transition-all shadow-[0_0_24px_rgba(255,255,255,0.18)]"
          >
            {isUa ? 'Запустити Копайлот' : 'Launch Copilot'}
          </Link>
        </div>
      </div>
    </section>
  );
}
