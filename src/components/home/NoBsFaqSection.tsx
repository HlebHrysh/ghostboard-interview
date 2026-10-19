'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, ShieldAlert } from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

export function NoBsFaqSection({ t }: Props) {
  const { locale } = useLocale();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqItems = [
    { id: 'q1', q: t.faq.q1, a: t.faq.a1 },
    { id: 'q2', q: t.faq.q2, a: t.faq.a2 },
    { id: 'q3', q: t.faq.q3, a: t.faq.a3 },
    { id: 'q4', q: t.faq.q4, a: t.faq.a4 },
  ];

  const handleToggle = (index: number, id: string) => {
    const isOpening = openIndex !== index;
    setOpenIndex(isOpening ? index : null);
    if (isOpening) {
      trackFunnelEvent('faq_fear_expanded', {
        locale,
        questionId: id,
      });
    }
  };

  return (
    <section id="faq" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06] scroll-mt-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-400 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>{t.faq.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            {t.faq.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t.faq.subtitle}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'bg-white/[0.04] border-white/20 shadow-lg'
                    : 'bg-white/[0.015] border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(idx, item.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-semibold text-white tracking-tight">
                    {item.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'bg-white/10 rotate-180' : 'bg-white/[0.04]'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/[0.04] pt-4">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
