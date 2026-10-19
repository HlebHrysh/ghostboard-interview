'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Crosshair, Globe2, MousePointerClick, Cpu, CheckCircle } from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';

interface Props {
  t: HomeTranslations;
}

export function EngineeringBentoGrid({ t }: Props) {
  return (
    <section id="features" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.bento.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            {t.bento.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t.bento.subtitle}
          </p>
        </div>

        {/* 4-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
          {/* Card 1: OS Kernel Stream Exclusion (Span 7) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 rounded-2xl p-6 sm:p-8 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {t.bento.cardKernel.tag}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                {t.bento.cardKernel.badge}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
              {t.bento.cardKernel.title}
            </h3>

            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {t.bento.cardKernel.desc}
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{t.bento.cardKernel.metric}</span>
            </div>
          </motion.div>

          {/* Card 2: Natural Eyeline Snapping (Span 5) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 rounded-2xl p-6 sm:p-8 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                {t.bento.cardEyeline.tag}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                {t.bento.cardEyeline.badge}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
              {t.bento.cardEyeline.title}
            </h3>

            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {t.bento.cardEyeline.desc}
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
              <Crosshair className="w-3.5 h-3.5" />
              <span>{t.bento.cardEyeline.metric}</span>
            </div>
          </motion.div>

          {/* Card 3: Real-Time Translation & Glance Bullets (Span 5) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 rounded-2xl p-6 sm:p-8 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold px-2.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                {t.bento.cardTranslation.tag}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                {t.bento.cardTranslation.badge}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
              {t.bento.cardTranslation.title}
            </h3>

            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {t.bento.cardTranslation.desc}
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
              <Globe2 className="w-3.5 h-3.5" />
              <span>{t.bento.cardTranslation.metric}</span>
            </div>
          </motion.div>

          {/* Card 4: Cursor Click-Through Mode (Span 7) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 rounded-2xl p-6 sm:p-8 bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-amber-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {t.bento.cardClickthrough.tag}
              </span>
              <span className="text-xs font-mono text-zinc-500">
                {t.bento.cardClickthrough.badge}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
              {t.bento.cardClickthrough.title}
            </h3>

            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {t.bento.cardClickthrough.desc}
            </p>

            <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              <MousePointerClick className="w-3.5 h-3.5" />
              <span>{t.bento.cardClickthrough.metric}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
