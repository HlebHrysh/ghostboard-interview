"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { getModalsTranslations } from "@/lib/modalsI18n";

interface TrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeToPro: () => void;
  onActivateDemoPro: () => void;
}

/**
 * Trial-limit notice. Intentionally NON-BLOCKING: a compact banner pinned above the cards,
 * so the candidate can finish reading the current answer even when the limit is reached.
 * (Export name kept for API compatibility; `TrialLimitBanner` is the preferred alias.)
 */
export const TrialLimitModal: React.FC<TrialLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgradeToPro,
  onActivateDemoPro,
}) => {
  const { locale } = useLocale();
  const tr = getModalsTranslations(locale).trial;
  const [isProcessing, setIsProcessing] = useState(false);

  const checkout = async (planId: "pro_monthly" | "emergency_pass") => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        onActivateDemoPro();
      }
    } catch {
      onActivateDemoPro();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="pointer-events-none fixed inset-x-0 top-14 z-[60] flex justify-center px-3 sm:top-16">
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="pointer-events-auto flex w-full max-w-[760px] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-white/[0.08] bg-[#111113] px-3.5 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
          >
            <Clock className="h-4 w-4 shrink-0 text-zinc-300" aria-hidden />
            <div className="min-w-0 flex-1 basis-[200px]">
              <div className="text-sm font-semibold leading-tight text-white">{tr.title}</div>
              <div className="line-clamp-2 text-xs text-zinc-400 sm:line-clamp-1">{tr.desc}</div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:shrink-0 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => checkout("pro_monthly")}
                disabled={isProcessing}
                className="h-9 min-w-0 flex-1 cursor-pointer rounded-lg bg-white px-3 sm:h-8 sm:flex-none text-xs font-bold text-black transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-white/60 disabled:opacity-50"
              >
                {isProcessing ? "…" : tr.upgradeBtn}
              </button>
              <button
                type="button"
                onClick={() => checkout("emergency_pass")}
                disabled={isProcessing}
                className="h-9 min-w-0 flex-1 cursor-pointer truncate rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 sm:h-8 sm:flex-none text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-white/60 disabled:opacity-50"
              >
                Emergency Pass <span className="hidden min-[420px]:inline">· $14.99</span>
              </button>
              <button
                type="button"
                onClick={onUpgradeToPro}
                className="hidden h-8 cursor-pointer px-2 text-xs text-zinc-400 underline-offset-2 hover:text-white hover:underline sm:inline-block"
              >
                {locale === "ua" ? "Тарифи" : "Plans"}
              </button>
              {process.env.NODE_ENV !== "production" && (
                <button
                  type="button"
                  onClick={onActivateDemoPro}
                  title="Visible in local development environment only"
                  className="h-8 cursor-pointer px-2 text-xs text-zinc-500 hover:text-white"
                >
                  [Dev] {tr.demoBtn}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={tr.stayFree}
                title={tr.stayFree}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center sm:h-8 sm:w-8 justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-white/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const TrialLimitBanner = TrialLimitModal;
