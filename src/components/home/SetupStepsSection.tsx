'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Headphones, Sparkles, ChevronDown } from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

export function SetupStepsSection({ t }: Props) {
  const { locale } = useLocale();

  const stepSummaries = [
    locale === 'ua'
      ? 'Адаптує відповіді під ваш реальний стек (Python, React, Go, System Design) та мову дзвінка.'
      : 'Tailors answers to your actual tech stack and target interview vacancy language.',
    locale === 'ua'
      ? 'Чисте захоплення співрозмовника з динаміків або навушників без сторонніх ботів на дзвінку.'
      : 'Crystal clear interviewer voice capture from speakers or headphones with zero meeting bots.',
    locale === 'ua'
      ? 'Отримуйте стислі тези за структурою STAR прямо під веб-камерою за 350 мс.'
      : 'Receive concise STAR bullets directly beneath your webcam lens within 350ms.',
  ];

  const steps = [
    {
      data: t.setup.step1,
      summary: stepSummaries[0],
      icon: <FileText className="w-5 h-5 text-emerald-400" />,
      techDetail: 'Local PDF parsing · Zero server resume storage · Instant vector context',
    },
    {
      data: t.setup.step2,
      summary: stepSummaries[1],
      icon: <Headphones className="w-5 h-5 text-indigo-400" />,
      techDetail: 'WASAPI Direct · CoreAudio Loopback · PipeWire null-sink · 0 driver installs',
    },
    {
      data: t.setup.step3,
      summary: stepSummaries[2],
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      techDetail: 'Deepgram Nova-3 16kHz PCM · Sub-400ms TTFT · STAR format constraints',
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

                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 tracking-tight">
                  {step.data.title}
                </h3>

                {/* Concise 1-sentence essence */}
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  {step.summary}
                </p>

                {/* Progressive Disclosure: Under the hood */}
                <details className="group/details mb-4 text-xs">
                  <summary className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 cursor-pointer select-none font-mono transition-colors">
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400 transition-transform group-open/details:rotate-180" />
                    <span>{locale === 'ua' ? 'Під капотом (технічні деталі)' : 'Under the hood'}</span>
                  </summary>
                  <div className="mt-2 p-3 rounded-xl bg-black/40 border border-white/[0.06] text-zinc-400 text-xs space-y-1">
                    <p>{step.data.desc}</p>
                    <div className="text-[10px] font-mono text-indigo-300/80 pt-1">
                      {step.techDetail}
                    </div>
                  </div>
                </details>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-500">
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
