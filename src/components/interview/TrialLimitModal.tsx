"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Zap, ShieldCheck, Check, Sparkles, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { getModalsTranslations } from "@/lib/modalsI18n";

interface TrialLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeToPro: () => void;
  onActivateDemoPro: () => void;
}

export const TrialLimitModal: React.FC<TrialLimitModalProps> = ({
  isOpen,
  onClose,
  onUpgradeToPro,
  onActivateDemoPro,
}) => {
  const { locale } = useLocale();
  const tr = getModalsTranslations(locale).trial;
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleStripe = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "pro_monthly" }),
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

  const handleEmergencyPass = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "emergency_pass" }),
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg overflow-hidden bg-[#111113] border border-[#C8F135]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(200,241,53,0.12)] text-zinc-100"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#C8F135]/15 border border-[#C8F135]/30 flex items-center justify-center text-[#C8F135]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-mono text-[10px] text-[#C8F135] uppercase tracking-widest font-bold">
                {tr.badge}
              </div>
              <h3 className="text-xl font-bold font-sans text-white">
                {tr.title}
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed mb-6">
            {tr.desc}
          </p>

          {/* Comparison list */}
          <div className="space-y-2.5 p-4 rounded-2xl bg-black/50 border border-white/5 font-sans text-xs mb-6">
            <div className="flex items-center justify-between text-zinc-400 pb-2 border-b border-white/5">
              <span>{tr.freeLabel}</span>
              <span className="font-mono text-zinc-400">{tr.freeValue}</span>
            </div>
            <div className="flex items-center justify-between text-white font-medium pt-1">
              <span className="flex items-center gap-2 text-[#C8F135]">
                <Zap className="w-3.5 h-3.5 fill-[#C8F135]" />
                {tr.proLabel}
              </span>
              <span className="font-mono text-emerald-400 font-bold">{tr.proValue}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 text-[11px] pt-1">
              <Check className="w-3.5 h-3.5 text-[#C8F135] shrink-0" />
              <span>{tr.benefit1}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 text-[11px]">
              <Check className="w-3.5 h-3.5 text-[#C8F135] shrink-0" />
              <span>{tr.benefit2}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-300 text-[11px]">
              <Check className="w-3.5 h-3.5 text-[#C8F135] shrink-0" />
              <span>{tr.benefit3}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <button
              onClick={handleEmergencyPass}
              disabled={isProcessing}
              className="w-full py-3 px-6 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95"
            >
              <span>{isProcessing ? "..." : "⚡ Emergency Pass ($14.99 / 24h)"}</span>
            </button>

            <button
              onClick={handleStripe}
              disabled={isProcessing}
              className="w-full py-3.5 px-6 rounded-xl font-mono text-xs font-bold uppercase tracking-wider bg-[#C8F135] text-black hover:bg-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(200,241,53,0.3)] active:scale-95"
            >
              <span>{isProcessing ? "..." : tr.upgradeBtn}</span>
            </button>

            {process.env.NODE_ENV !== 'production' && (
              <button
                onClick={onActivateDemoPro}
                className="w-full py-2.5 px-4 rounded-xl font-mono text-[11px] font-semibold text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
                title="Visible in local development environment only"
              >
                <Sparkles className="w-3 h-3 text-[#C8F135]" />
                <span>[Dev Only] {tr.demoBtn}</span>
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={onClose}
              className="font-mono text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              {tr.stayFree}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
