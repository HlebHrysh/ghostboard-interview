'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Headphones, Sparkles, ArrowRight } from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';

interface Props {
  t: HomeTranslations;
}

export function SetupStepsSection({ t }: Props) {
  const steps = [
    {
      data: t.setup.step1,
      icon: <FileText className="w-5 h-5 text-emerald-400" />,
      accent: 'emerald',
    },
    {
      data: t.setup.step2,
      icon: <Headphones className="w-5 h-5 text-indigo-400" />,
      accent: 'indigo',
    },
    {
      data: t.setup.step3,
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      accent: 'amber',
    },
  ];

  return (
    <section className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>{t.setup.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            {t.setup.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t.setup.subtitle}
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between hover:border-white/[0.15] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold font-mono text-zinc-700">
                    {step.data.number}
                  </span>
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    {step.icon}
                  </div>
                </div>

                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  {step.data.tag}
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 tracking-tight">
                  {step.data.title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  {step.data.desc}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>{step.data.pill}</span>
                <span className="text-zinc-600">→</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
