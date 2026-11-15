"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Crown,
  Infinity as InfinityIcon,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { SupportedLocale } from "@/lib/i18n";

export interface BillingStatusData {
  authenticated?: boolean;
  plan: "free" | "emergency" | "pro" | "lifetime" | string;
  planExpiresAt: string | null;
  provider: "monobank" | "lemonsqueezy" | "stripe" | "sandbox" | string | null;
  billingCycle: "monthly" | "annual" | "one_time" | string | null;
  cardTokenAvailable?: boolean;
  freeQuotas?: {
    sessionMinutes: number;
    aiAnswers: number;
    dailySessionsLimit: number;
  };
  capabilities?: {
    activeProvider?: string;
  };
}

interface SubscriptionStatusCardProps {
  plan?: string;
  locale: SupportedLocale;
  onManageBilling?: () => Promise<void> | void;
  compact?: boolean;
  showManageProfileLink?: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  monobank: "Monobank Acquiring (plata)",
  lemonsqueezy: "Lemon Squeezy",
  stripe: "Stripe Checkout",
  sandbox: "Sandbox Test Gateway",
};

function formatRenewalDate(
  isoDate: string | null,
  isUa: boolean,
): string | null {
  if (!isoDate) return null;
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat(isUa ? "uk-UA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(dt);
}

export function SubscriptionStatusCard({
  plan: propPlan = "free",
  locale,
  onManageBilling,
  compact = false,
  showManageProfileLink = false,
}: SubscriptionStatusCardProps) {
  const isUa = locale === "ua";
  const [status, setStatus] = useState<BillingStatusData | null>(null);
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch("/api/billing/status", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: BillingStatusData | null) => {
        if (!active || !data) return;
        setStatus(data);
        try {
          if (data.authenticated && data.plan) {
            localStorage.setItem("ghostboard_plan", data.plan);
          }
        } catch {
          // Ignore storage error in restricted modes
        }
      })
      .catch(() => {
        // Fallback to propPlan seamlessly
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const effectivePlan = (
    status?.authenticated ? status.plan : propPlan || status?.plan || "free"
  ).toLowerCase();

  const isLifetime = effectivePlan === "lifetime";
  const isPro = effectivePlan === "pro" || effectivePlan === "emergency";
  const isPaid = isLifetime || isPro;

  const quotas = status?.freeQuotas || {
    sessionMinutes: 15,
    aiAnswers: 5,
    dailySessionsLimit: 3,
  };

  const formattedExpires = formatRenewalDate(status?.planExpiresAt ?? null, isUa);
  const activeProviderLabel =
    (status?.provider && PROVIDER_LABELS[status.provider]) ||
    (status?.capabilities?.activeProvider &&
      PROVIDER_LABELS[status.capabilities.activeProvider]) ||
    null;

  const handleManageClick = async () => {
    setManaging(true);
    try {
      if (onManageBilling) {
        await onManageBilling();
        return;
      }
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string };
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      window.location.href = "/pricing";
    } catch {
      window.location.href = "/pricing";
    } finally {
      setManaging(false);
    }
  };

  return (
    <motion.section
      aria-label={isUa ? "Підписка та оплата" : "Subscription & Billing"}
      initial={false}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.6 }}
      className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_20px_50px_rgba(0,0,0,0.6)] ${
        compact ? "p-5 sm:p-6" : "p-6 sm:p-7"
      }`}
    >
      {/* Subtle luxury radial atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent blur-2xl"
      />

      {/* Top Row: Section label + Live Plan Pill */}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
            <span>{isUa ? "Підписка та оплата" : "Subscription & Billing"}</span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {isLifetime ? (
              <>
                <Crown className="w-5 h-5 text-amber-300" />
                <span>Ghostboard Lifetime Pass</span>
              </>
            ) : isPro ? (
              <>
                <Sparkles className="w-5 h-5 text-emerald-300" />
                <span>
                  Ghostboard Pro{" "}
                  {status?.billingCycle === "annual"
                    ? isUa
                      ? "(Річний)"
                      : "(Annual)"
                    : isUa
                    ? "(Місячний)"
                    : "(Monthly)"}
                </span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 text-zinc-300" />
                <span>{isUa ? "Free Trial (Демо-тариф)" : "Free Trial Tier"}</span>
              </>
            )}
          </h3>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider border ${
            isLifetime
              ? "bg-amber-400/15 text-amber-200 border-amber-400/35 shadow-[0_0_20px_rgba(251,191,36,0.18)]"
              : isPro
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/35 shadow-[0_0_20px_rgba(16,185,129,0.18)]"
              : "bg-white/[0.06] text-zinc-300 border-white/15"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isLifetime
                ? "bg-amber-300"
                : isPro
                ? "bg-emerald-400 animate-pulse"
                : "bg-zinc-400"
            }`}
          />
          {isLifetime ? "LIFETIME" : isPro ? "PRO ACTIVE" : "FREE TIER"}
        </span>
      </div>

      {/* Metadata & Quotas Grid */}
      <dl className="relative mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-3.5 space-y-1">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <CalendarClock className="w-3.5 h-3.5 text-zinc-400" />
            <span>
              {isLifetime
                ? isUa
                  ? "Термін дії"
                  : "Access Term"
                : isPro
                ? isUa
                  ? "Наступне поновлення"
                  : "Renewal / Expiration"
                : isUa
                ? "Ліміти Free-доступу"
                : "Free Tier Quotas"}
            </span>
          </dt>
          <dd className="font-semibold text-zinc-100 text-sm">
            {isLifetime ? (
              <span className="inline-flex items-center gap-1.5 text-amber-200">
                <InfinityIcon className="w-4 h-4" />
                <span>{isUa ? "Назавжди (безлімітно)" : "Lifetime Unlimited"}</span>
              </span>
            ) : isPro ? (
              formattedExpires ? (
                <span>
                  {isUa ? `Активно до ${formattedExpires}` : `Active until ${formattedExpires}`}
                </span>
              ) : (
                <span>{isUa ? "Активна автопролонгація" : "Active Subscription"}</span>
              )
            ) : (
              <span className="text-zinc-200">
                {isUa
                  ? `${quotas.sessionMinutes} хв/сесія · ${quotas.aiAnswers} AI-відповідей · ${quotas.dailySessionsLimit} сесії/день`
                  : `${quotas.sessionMinutes} min/session · ${quotas.aiAnswers} AI answers · ${quotas.dailySessionsLimit} sessions/day`}
              </span>
            )}
          </dd>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-3.5 space-y-1">
          <dt className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isUa ? "Платіжний шлюз" : "Payment Gateway"}</span>
          </dt>
          <dd className="font-semibold text-zinc-100 text-sm flex items-center gap-2 flex-wrap">
            <span>
              {activeProviderLabel ||
                (isPaid
                  ? isUa
                    ? "Верифікована оплата"
                    : "Verified Checkout"
                  : isUa
                  ? "Monobank / Global / Free"
                  : "Monobank / Global Checkout")}
            </span>
            {status?.cardTokenAvailable && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15">
                {isUa ? "Токен картки" : "Card Saved"}
              </span>
            )}
          </dd>
        </div>
      </dl>

      {/* Entitlement Highlights */}
      <ul className="relative mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
        <li className="flex items-center gap-2">
          <CheckCircle2
            className={`w-3.5 h-3.5 shrink-0 ${
              isPaid ? "text-emerald-400" : "text-zinc-400"
            }`}
          />
          <span>
            {isPaid
              ? isUa
                ? "Безлімітні сесії та тривалість інтерв’ю"
                : "Unlimited live interview minutes"
              : isUa
              ? `До ${quotas.sessionMinutes} хв на одну пробну сесію`
              : `Up to ${quotas.sessionMinutes} minutes per trial session`}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <CheckCircle2
            className={`w-3.5 h-3.5 shrink-0 ${
              isPaid ? "text-emerald-400" : "text-zinc-400"
            }`}
          />
          <span>
            {isPaid
              ? isUa
                ? "Необмежені AI-відповіді Deepgram + Gemini"
                : "Unlimited AI answers & Vision OCR"
              : isUa
              ? `Максимум ${quotas.aiAnswers} AI-відповідей у демо-режимі`
              : `Up to ${quotas.aiAnswers} AI copilot answers included`}
          </span>
        </li>
      </ul>

      {/* Actions */}
      <div className="relative mt-5 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-zinc-400 font-sans">
          {isPaid
            ? isUa
              ? "Керуйте поновленням або змінюйте план у будь-який момент."
              : "Manage renewal, invoices, or plan upgrades anytime."
            : isUa
            ? "Оновіть план через Monobank (Apple/Google Pay) або міжнародну картку."
            : "Upgrade seamlessly via Monobank (UAH/Apple Pay) or global checkout (USD)."}
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          {showManageProfileLink && (
            <Link
              href="/profile?tab=security_billing"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-mono text-zinc-200 hover:bg-white/[0.09] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>{isUa ? "Профіль та безпека" : "Profile & Security"}</span>
            </Link>
          )}

          {isPaid ? (
            <button
              type="button"
              onClick={handleManageClick}
              disabled={managing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2 text-xs font-mono font-semibold text-white hover:bg-white/[0.14] transition-all cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>
                {managing
                  ? isUa
                    ? "Відкриваємо..."
                    : "Opening..."
                  : isUa
                  ? "Керувати підпискою"
                  : "Manage Subscription"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-mono font-bold text-black shadow-[0_0_24px_rgba(255,255,255,0.2)] hover:bg-zinc-200 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span>{isUa ? "Перейти на Pro" : "Upgrade Plan"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </motion.section>
  );
}
