"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";
import { Reveal } from "./Reveal";

interface Props {
  t: HomeTranslations["faq"];
}

export function MinimalFaq({ t }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const items = [
    { q: t.q1, a: t.a1 },
    { q: t.q2, a: t.a2 },
    { q: t.q3, a: t.a3 },
  ];

  return (
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-black">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Reveal className="text-center max-w-xl mx-auto mb-12">
          <div className="shimmer-pill inline-flex items-center px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 mb-4">
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {t.title}
          </h2>
        </Reveal>

        <Reveal className="border-b border-white/[0.08]">
          {items.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="border-t border-white/[0.08]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full py-5 text-left flex items-center justify-between gap-4 cursor-pointer group"
                >
                  <span className="text-base font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {item.q}
                  </span>
                  <Plus
                    className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45 text-white" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6 text-sm text-zinc-400 leading-relaxed">{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

