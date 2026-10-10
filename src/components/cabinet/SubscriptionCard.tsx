"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Award, Zap, CheckCircle2, CreditCard, Shield, Sparkles, ExternalLink, ArrowRight } from "lucide-react";

interface SubscriptionCardProps {
  plan: "free" | "pro" | "lifetime";
  locale: string;
  onManageBilling: () => void;
}

export function SubscriptionCard({
  plan,
  locale,
  onManageBilling,
}: SubscriptionCardProps) {
  const [loadingPortal, setLoadingPortal] = useState(false);

  const handlePortalClick = async () => {
    setLoadingPortal(true);
    try {
      await onManageBilling();
    } finally {
      setLoadingPortal(false);
    }
  };

  const isLifetime = plan === "lifetime";
  const isPro = plan === "pro";
  const isFree = plan === "free";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]">
      {/* Decorative ambient lighting */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full blur-3xl ${
          isLifetime
            ? "bg-amber-500/[0.06]"
            : isPro
            ? "bg-cyan-500/[0.05]"
            : "bg-white/[0.02]"
        }`}
      />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Tier Info & Value Proposition */}
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              {locale === "ua" ? "Поточний тарифний план" : "Subscription Status"}
            </span>

            {isLifetime && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-400/30">
                <Sparkles className="h-3 w-3" />
                <span>{locale === "ua" ? "Довічний доступ" : "Perpetual Access"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {isLifetime
                ? "Ghostboard Founder Lifetime VIP"
                : isPro
                ? "Ghostboard Pro Pass (Unlimited)"
                : "Ghostboard Free Starter"}
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-zinc-400">
            {isLifetime
              ? locale === "ua"
                ? "Пожиттєвий безлімітний доступ до всіх релізів, стелс-суфлера, пріоритетної черги ШІ та мобільного компаньйона без щомісячних списань."
                : "Perpetual unlimited clearance to all models, desktop stealth prompter, VIP priority AI queue, and mobile companion with zero recurring fees."
              : isPro
              ? locale === "ua"
                ? "Безлімітні живі сесії, аналіз коду з екрана [F9], суб-секундна генерація відповідей та хмарна синхронізація."
                : "Unlimited live sessions, instant screen OCR solver [F9], sub-second answer synthesis, and multi-device sync."
              : locale === "ua"
              ? "15 хвилин на сесію. Базові моделі ШІ. Оновіть до Pro або Lifetime для зняття лімітів часу та активації F9 OCR."
              : "15-minute trial session limit. Base AI models. Upgrade to Pro or Lifetime for unlimited time and live screen OCR."}
          </p>

          {/* Key Feature Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {[
              isLifetime
                ? locale === "ua"
                  ? "Довічні оновлення включено"
                  : "Perpetual updates guaranteed"
                : locale === "ua"
                ? "Безлімітна тривалість інтерв'ю"
                : "Unlimited session duration",
              locale === "ua" ? "Екранний OCR розв'язувач коду [F9]" : "Silent Screen OCR solver [F9]",
              locale === "ua" ? "Пріоритетне обчислення Gemini Flash" : "VIP Gemini Flash priority compute",
              locale === "ua" ? "Синхронізація мобільного компаньйона" : "Eyeline mobile companion sync",
            ].map((perk, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0 pt-2 lg:pt-0">
          {isFree ? (
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-xs font-semibold text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.2)] transition-all hover:bg-zinc-100 hover:shadow-[0_0_32px_rgba(255,255,255,0.3)] active:scale-[0.98]"
            >
              <Zap className="h-4 w-4 fill-black" />
              <span>{locale === "ua" ? "Оновити до Pro · Безліміт" : "Upgrade to Pro · Unlimited"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={handlePortalClick}
              disabled={loadingPortal}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-zinc-200 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <CreditCard className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                {loadingPortal
                  ? locale === "ua"
                    ? "Підключення..."
                    : "Connecting..."
                  : locale === "ua"
                  ? "Керування підпискою та рахунками"
                  : "Manage Billing & Invoices"}
              </span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </button>
          )}

          <div className="flex items-center gap-2 text-[11px] text-zinc-500 self-center lg:self-end">
            <Shield className="h-3 w-3 text-emerald-500" />
            <span>
              {isLifetime
                ? locale === "ua"
                  ? "Автоматично активовано назавжди"
                  : "Perpetually licensed to this account"
                : locale === "ua"
                ? "Захищено через Stripe Customer Portal"
                : "Secured via Stripe Customer Portal"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
