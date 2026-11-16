"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  CreditCard,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { GravitationalCard } from "@/components/singularity/GravitationalCard";
import { MonochromeStripesCanvas } from "@/components/ui/MonochromeStripesCanvas";
import { LuminousBorderCard } from "@/components/ui/LuminousBorderCard";
import { SpatialSquircleBadge } from "@/components/ui/SpatialSquircleBadge";
import {
  detectInitialLang,
  detectGeoCountryLang,
  type SupportedLocale,
} from "@/lib/geoLang";
import { useLocale } from "@/contexts/LocaleContext";
import { getPricingTranslations } from "@/lib/pricingI18n";

const PRICING_TOASTS: Record<
  SupportedLocale,
  { activated: string; error: string }
> = {
  ua: {
    activated: "Тариф успішно активовано!",
    error: "Помилка зв'язку з сервером оплати",
  },
  en: {
    activated: "Plan successfully activated!",
    error: "Payment server connection error",
  },
  pl: {
    activated: "Plan pomyślnie aktywowany!",
    error: "Błąd połączenia z serwerem płatności",
  },
  de: {
    activated: "Tarif erfolgreich aktiviert!",
    error: "Fehler bei der Verbindung zum Zahlungsserver",
  },
  fr: {
    activated: "Forfait activé avec succès !",
    error: "Erreur de connexion au serveur de paiement",
  },
  es: {
    activated: "¡Plan activado con éxito!",
    error: "Error de conexión con el servidor de pagos",
  },
  pt: {
    activated: "Plano ativado com sucesso!",
    error: "Erro de conexão com o servidor de pagamento",
  },
  it: {
    activated: "Piano attivato con successo!",
    error: "Errore di connessione al server di pagamento",
  },
  cs: {
    activated: "Tarif byl úspěšně aktivován!",
    error: "Chyba připojení k platebnímu serveru",
  },
  nl: {
    activated: "Abonnement succesvol geactiveerd!",
    error: "Fout bij verbinding met betalingsserver",
  },
};

const PRICING_ROI: Record<SupportedLocale, string> = {
  ua: "💡 1 успішний оффер окупає підписку на роки вперед (+ $500–$2,000/міс до зарплати). Спробуйте без ризику.",
  en: "💡 1 successful offer pays for this tool for years (+ $500–$2,000/mo salary boost). Zero risk, cancel anytime.",
  pl: "💡 1 udany offer zwraca koszt narzędzia na lata (+ $500–$2,000/mies. do pensji). Bez ryzyka.",
  de: "💡 1 erfolgreiches Angebot amortisiert das Tool für Jahre (+ 500–2.000 €/Monat Gehaltssprung). Null Risiko.",
  fr: "💡 1 offre réussie rentabilise l'outil pour des années (+ 500–2 000 $/mois de salaire). Sans risque.",
  es: "💡 1 oferta exitosa amortiza la herramienta por años (+ $500–$2,000/mes de salario). Sin riesgo.",
  pt: "💡 1 oferta bem-sucedida paga esta ferramenta por anos (+ $500–$2,000/mês de salário). Sem risco.",
  it: "💡 1 offerta superata ripaga lo strumento per anni (+ $500–$2,000/mese di stipendio). Senza rischi.",
  cs: "💡 1 úspěšná nabídka zaplatí tento nástroj na roky dopředu (+ $500–$2,000/měs. ke mzdě). Bez rizika.",
  nl: "💡 1 geslaagd aanbod betaalt deze tool voor jaren terug (+ $500–$2,000/mnd salarisgroei). Zonder risico.",
};

interface SandboxChallengeState {
  invoiceId: string;
  challengeToken: string;
  planName: string;
  amountLabel: string;
  currency: "UAH" | "USD";
  redirectUrl: string;
}

const PROVIDER_DISPLAY: Record<string, string> = {
  monobank: "plata by mono (Apple Pay / Google Pay)",
  lemonsqueezy: "Lemon Squeezy Global Checkout",
  stripe: "Stripe Secure Checkout",
  sandbox: "Sandbox 3DS Verification Gateway",
};

export default function PricingPage() {
  const { t, locale } = useLocale();
  const p = getPricingTranslations(locale);
  const toasts = PRICING_TOASTS[locale] || PRICING_TOASTS.en;
  const isUa = locale === "ua";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [currency, setCurrency] = useState<"UAH" | "USD">("UAH");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [activeGateway, setActiveGateway] = useState<string>("sandbox");
  const [freeQuotas, setFreeQuotas] = useState({
    sessionMinutes: 15,
    aiAnswers: 5,
    dailySessionsLimit: 3,
  });

  const sandboxDialogRef = useRef<HTMLDialogElement | null>(null);
  const [sandboxChallenge, setSandboxChallenge] =
    useState<SandboxChallengeState | null>(null);
  const [confirming3ds, setConfirming3ds] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const initial = detectInitialLang();
    setCurrency(initial === "ua" ? "UAH" : "USD");

    detectGeoCountryLang((lang) => {
      if (active) {
        setCurrency(lang === "ua" ? "UAH" : "USD");
      }
    });

    fetch("/api/billing/status", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.freeQuotas) {
          setFreeQuotas(data.freeQuotas);
        }
        if (data.capabilities?.activeProvider) {
          setActiveGateway(data.capabilities.activeProvider);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const dlg = sandboxDialogRef.current;
    if (!dlg) return;
    if (sandboxChallenge && !dlg.open) {
      dlg.showModal();
    } else if (!sandboxChallenge && dlg.open) {
      dlg.close();
    }
  }, [sandboxChallenge]);

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const cycle =
        planId === "lifetime"
          ? "one_time"
          : billingCycle === "annual"
          ? "annual"
          : "monthly";

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle: cycle,
          currency,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || toasts.error);
        return;
      }

      if (data.mode === "redirect" && data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.mode === "sandbox" && data.invoiceId && data.challengeToken) {
        const amtLabel =
          data.currency === "UAH"
            ? `₴${Math.round((data.amountMinor || 0) / 100).toLocaleString("en-US")}`
            : `$${Math.round((data.amountMinor || 0) / 100).toLocaleString("en-US")}`;

        setSandboxChallenge({
          invoiceId: data.invoiceId,
          challengeToken: data.challengeToken,
          planName: data.plan?.name || "Ghostboard Pro",
          amountLabel: amtLabel,
          currency: data.currency || currency,
          redirectUrl: data.redirectUrl || "/interview?upgrade=success",
        });
        return;
      }

      toast.success(toasts.activated);
    } catch {
      toast.error(toasts.error);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleConfirmSandbox3ds = async () => {
    if (!sandboxChallenge) return;
    setConfirming3ds(true);
    try {
      const res = await fetch("/api/billing/sandbox/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: sandboxChallenge.invoiceId,
          challengeToken: sandboxChallenge.challengeToken,
          outcome: "paid",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || toasts.error);
        return;
      }

      try {
        if (data.plan) {
          localStorage.setItem("ghostboard_plan", data.plan);
        }
      } catch {}

      toast.success(toasts.activated);
      const targetUrl = data.redirectUrl || sandboxChallenge.redirectUrl;
      setSandboxChallenge(null);
      window.location.href = targetUrl;
    } catch {
      toast.error(toasts.error);
    } finally {
      setConfirming3ds(false);
    }
  };

  const proPrimary =
    currency === "UAH"
      ? billingCycle === "annual"
        ? "₴479"
        : "₴599"
      : billingCycle === "annual"
      ? "$12"
      : "$15";

  const proSecondary =
    currency === "UAH"
      ? billingCycle === "annual"
        ? "$12/mo · ₴5,748/рік"
        : "$15/mo"
      : billingCycle === "annual"
      ? "₴479/міс · $144/yr"
      : "₴599/міс";

  const lifePrimary = currency === "UAH" ? "₴3,190" : "$79";
  const lifeSecondary =
    currency === "UAH"
      ? "$79 USD"
      : "₴3,190 UAH";

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-white selection:text-black">
      <UnifiedNavbar />

      <MonochromeStripesCanvas
        direction="diagonal"
        density="tight"
        glowIntensity={0.06}
        className="py-16"
      >
        <main className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Title */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            {/* Sleek 3D Money Squircle Emblem */}
            <SpatialSquircleBadge
              src="/videos/money.mp4"
              accent="emerald"
              size="hero"
              centered
              className="mb-6"
            />

            <span className="text-[11px] font-mono text-zinc-200 uppercase tracking-widest bg-white/[0.04] px-3.5 py-1 rounded-full border border-white/10 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.pricing.label}
            </span>
            <h1 className="text-4xl sm:text-6xl font-medium tracking-tight mt-6 text-chrome">
              {t.pricing.title}
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed font-normal">
              {t.pricing.subtitle}
            </p>

            {/* ROI Value Proposition Banner */}
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/15 text-xs text-zinc-300 backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.06)]">
              <span>{PRICING_ROI[locale] || PRICING_ROI.en}</span>
            </div>

            {/* Switchers Row: Billing Cycle (-20% Annual Toggle) + Currency (UAH ₴ / USD $) */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <div
                role="group"
                aria-label={isUa ? "Цикл оплати" : "Billing cycle"}
                className="relative inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md font-mono text-xs"
              >
                <button
                  type="button"
                  onClick={() => setBillingCycle("monthly")}
                  aria-pressed={billingCycle === "monthly"}
                  className={`relative z-10 px-5 py-2 rounded-full transition-colors cursor-pointer font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    billingCycle === "monthly"
                      ? "text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {billingCycle === "monthly" && (
                    <motion.div
                      layoutId="billing-pill"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                        mass: 0.6,
                      }}
                      className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
                    />
                  )}
                  {t.pricing.monthly}
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle("annual")}
                  aria-pressed={billingCycle === "annual"}
                  className={`relative z-10 px-5 py-2 rounded-full transition-colors cursor-pointer font-medium flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    billingCycle === "annual"
                      ? "text-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {billingCycle === "annual" && (
                    <motion.div
                      layoutId="billing-pill"
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 28,
                        mass: 0.6,
                      }}
                      className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
                    />
                  )}
                  <span>{t.pricing.annual}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                      billingCycle === "annual"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    }`}
                  >
                    -20%
                  </span>
                </button>
              </div>

              {/* Currency Switcher: UAH (₴) vs USD ($) */}
              <div
                role="group"
                aria-label={isUa ? "Валюта оплати" : "Checkout currency"}
                className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.1] font-mono text-xs"
              >
                <button
                  type="button"
                  onClick={() => setCurrency("UAH")}
                  aria-pressed={currency === "UAH"}
                  className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    currency === "UAH"
                      ? "bg-white/15 text-white font-semibold border border-white/20"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>🇺🇦 UAH (₴)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  aria-pressed={currency === "USD"}
                  className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    currency === "USD"
                      ? "bg-white/15 text-white font-semibold border border-white/20"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>🌐 USD ($)</span>
                </button>
              </div>
            </div>

            {/* Active Gateway Security Pill */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-mono text-zinc-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {PROVIDER_DISPLAY[activeGateway] || PROVIDER_DISPLAY.monobank}
              </span>
            </div>
          </div>

          {/* 3 Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 items-stretch">
            {/* Card 1: Free Trial */}
            <GravitationalCard
              className="p-6 sm:p-8"
              contentClassName="flex h-full flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    {p.plans.free.subtitle}
                  </span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                    {p.plans.free.badge}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono mt-1">
                  {p.plans.free.name}
                </h3>
                <div className="flex items-baseline gap-2 my-5">
                  <span className="text-4xl font-bold text-white font-mono">
                    {currency === "UAH" ? "₴0" : "$0"}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {currency === "UAH" ? "($0 USD)" : "(₴0 UAH)"} ·{" "}
                    {p.plans.free.period}
                  </span>
                </div>

                {/* Exact Free Tier Quotas Box */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/25 mb-5 font-mono text-[11px] space-y-1.5 text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-amber-300">
                    <Zap className="w-3.5 h-3.5" />
                    <span>
                      {isUa
                        ? "Точні ліміти Free-тарифу:"
                        : "Exact Free Tier Quotas:"}
                    </span>
                  </div>
                  <ul className="space-y-1 text-zinc-200 font-sans text-xs">
                    <li>
                      •{" "}
                      <strong>
                        {freeQuotas.sessionMinutes}{" "}
                        {isUa ? "хв / сесія" : "min / session"}
                      </strong>{" "}
                      {isUa ? "аудіо-захоплення" : "live audio capture"}
                    </li>
                    <li>
                      •{" "}
                      <strong>
                        {freeQuotas.aiAnswers}{" "}
                        {isUa ? "AI-відповідей" : "AI answers"}
                      </strong>{" "}
                      {isUa ? "у копілоті" : "per trial session"}
                    </li>
                    <li>
                      •{" "}
                      <strong>
                        {freeQuotas.dailySessionsLimit}{" "}
                        {isUa ? "сесії / день" : "sessions / day"}
                      </strong>{" "}
                      {isUa ? "без прив’язки картки" : "with zero card required"}
                    </li>
                  </ul>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 font-sans mb-8">
                  {p.plans.free.features.map((feat, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-2.5 ${
                        feat.startsWith("✕") ? "text-zinc-500" : ""
                      }`}
                    >
                      <span className="chrome-check">
                        {feat.startsWith("✕") ? (
                          <span className="text-xs text-zinc-500">✕</span>
                        ) : (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </span>
                      <span>
                        {feat.replace(/^([✓✕]|\u2713|\u2715)\s*/, "")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/auth/signup"
                className="btn-resend-glass text-xs font-mono py-3 w-full justify-center flex items-center gap-1.5"
              >
                <span>{t.pricing.freeCta}</span>
                <span className="text-xs text-zinc-400 font-sans opacity-80">
                  {isUa ? "(Без картки)" : "(No Card)"}
                </span>
              </Link>
            </GravitationalCard>

            {/* Card 2: Pro Pass with Luminous Border Card */}
            <LuminousBorderCard
              animated={true}
              badge={
                billingCycle === "annual"
                  ? `${t.pricing.proBadge} · -20%`
                  : t.pricing.proBadge
              }
              className="h-full"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    PRO
                  </span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                    {billingCycle === "annual"
                      ? isUa
                        ? "Річний (-20%)"
                        : "Annual (-20%)"
                      : p.plans.pro.badge}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono mt-1">
                  {p.plans.pro.name}
                </h3>
                <div className="my-5 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-chrome font-mono">
                      {proPrimary}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {t.pricing.perMonth}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
                    <span>{proSecondary}</span>
                    {billingCycle === "annual" && (
                      <span className="text-emerald-300 font-semibold">
                        · {isUa ? "Економія 20%" : "Save 20%"}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-zinc-200 font-sans mb-8">
                  {p.plans.pro.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-white">
                      <span className="chrome-check">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      <span>
                        {feat.replace(/^([✓✕]|\u2713|\u2715)\s*/, "")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleCheckout(
                      billingCycle === "annual" ? "pro_annual" : "pro_monthly",
                    )
                  }
                  disabled={loadingPlan?.startsWith("pro")}
                  className="btn-resend-primary text-xs font-mono py-3.5 w-full justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] cursor-pointer disabled:opacity-60"
                >
                  {loadingPlan?.startsWith("pro")
                    ? isUa
                      ? "Створення рахунку..."
                      : "Initializing checkout..."
                    : t.pricing.proCta}
                </button>
                <div className="text-center text-xs font-mono text-zinc-400">
                  {isUa
                    ? "Apple Pay · Google Pay · Monobank / Visa / Mastercard"
                    : "Apple Pay · Google Pay · Visa / Mastercard / Monobank"}
                </div>
              </div>
            </LuminousBorderCard>

            {/* Card 3: Lifetime Founder Pass */}
            <GravitationalCard
              className="p-6 sm:p-8 !overflow-visible"
              ignited={true}
              contentClassName="flex h-full flex-col justify-between"
            >
              <div className="absolute -top-3.5 right-6 bg-white text-black text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                {p.plans.life.popular || "Founder Pass"}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    LIFETIME
                  </span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-zinc-200 border border-white/20">
                    {p.plans.life.badge}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono mt-1">
                  {p.plans.life.name}
                </h3>
                <div className="my-5 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white font-mono">
                      {lifePrimary}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {t.pricing.oneTime}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    {lifeSecondary} ·{" "}
                    {isUa ? "без щомісячних списань" : "no recurring fees"}
                  </div>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300 font-sans mb-8">
                  {p.plans.life.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-white">
                      <span className="chrome-check">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      <span>
                        {feat.replace(/^([✓✕]|\u2713|\u2715)\s*/, "")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleCheckout("lifetime")}
                disabled={loadingPlan === "lifetime"}
                className="btn-resend-glass text-xs font-mono py-3 w-full justify-center border-white/20 hover:border-white/40 hover:bg-white/10 cursor-pointer disabled:opacity-60"
              >
                {loadingPlan === "lifetime"
                  ? isUa
                    ? "Створення рахунку..."
                    : "Initializing..."
                  : t.pricing.lifeCta}
              </button>
            </GravitationalCard>
          </div>

          {/* Feature Matrix */}
          <div className="mb-24">
            <h2 className="text-xl sm:text-2xl font-black font-display text-white text-center mb-8">
              {p.matrix.title}
            </h2>
            <div
              tabIndex={0}
              role="region"
              aria-label={p.matrix.title}
              className="overflow-x-auto rounded-3xl border border-white/10 bg-[#09090b]/80 focus-visible:outline-2 focus-visible:outline-white"
            >
              <table className="w-full text-xs font-mono">
                <caption className="sr-only">{p.matrix.title}</caption>
                <thead>
                  <tr className="border-b border-white/10 bg-transparent/40">
                    <th
                      scope="col"
                      className="text-left p-4 text-zinc-400 font-bold"
                    >
                      {p.matrix.headers.feature}
                    </th>
                    <th
                      scope="col"
                      className="text-center p-4 text-zinc-400 font-bold"
                    >
                      {p.matrix.headers.free}
                    </th>
                    <th
                      scope="col"
                      className="text-center p-4 text-white font-bold"
                    >
                      {p.matrix.headers.pro}
                    </th>
                    <th
                      scope="col"
                      className="text-center p-4 text-zinc-400 font-bold"
                    >
                      {p.matrix.headers.life}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.matrix.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-white/5 hover:bg-white/2"
                    >
                      <td className="p-4 text-zinc-300 font-medium">
                        {row.feat}
                      </td>
                      <td className="p-4 text-center text-zinc-400">
                        {row.free}
                      </td>
                      <td className="p-4 text-center text-white font-bold">
                        {row.pro}
                      </td>
                      <td className="p-4 text-center text-zinc-300">
                        {row.life}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ Accordion */}
          <div className="max-w-3xl mx-auto mb-20">
            <h2 className="text-xl sm:text-2xl font-black font-display text-white text-center mb-8">
              {p.faq.title}
            </h2>
            <div className="space-y-3">
              {p.faq.items.map((faq, i) => (
                <details
                  key={i}
                  className="gb-accordion group bg-[#09090b] border border-white/8 rounded-2xl p-5 open:border-white/20 transition-all"
                >
                  <summary className="flex items-center justify-between font-bold text-sm text-zinc-100 font-mono">
                    <span>{faq.q}</span>
                    <ChevronDown className="w-4 h-4 text-zinc-500 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* Bottom CTA (Zero exposed simulator links) */}
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#121216] to-[#08080a] border border-white/15 text-center max-w-4xl mx-auto shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            <div className="flex justify-center mb-4">
              <GhostDetectiveLogo size="lg" animated={true} />
            </div>
            <h3 className="text-2xl font-bold font-display text-white mb-2">
              {p.ctaBottom.title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6">
              {p.ctaBottom.desc}
            </p>
            <Link
              href="/auth/signup"
              className="btn-resend-primary text-xs font-mono !py-3.5 !px-8 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              <span>{p.ctaBottom.btn}</span>
            </Link>
          </div>
        </main>
      </MonochromeStripesCanvas>

      {/* Native <dialog> for Secure Sandbox 3DS Flow (only opens when server selects sandbox) */}
      <dialog
        ref={sandboxDialogRef}
        onCancel={(e) => {
          e.preventDefault();
          if (!confirming3ds) setSandboxChallenge(null);
        }}
        className="m-auto w-[min(92vw,440px)] rounded-3xl border border-white/[0.12] bg-[#0d0f12] p-6 text-zinc-100 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop:bg-black/80 backdrop:backdrop-blur-md overscroll-contain"
      >
        {sandboxChallenge && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-300">
                  <Lock className="w-3 h-3" />
                  Sandbox 3DS Verification
                </span>
                <h2 className="mt-2 text-lg font-bold tracking-tight text-white">
                  {sandboxChallenge.planName}
                </h2>
              </div>
              <CreditCard className="w-5 h-5 text-zinc-400" />
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/50 p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>{isUa ? "Сума до списання" : "Test Authorization"}</span>
                <span className="text-white font-bold">
                  {sandboxChallenge.amountLabel} ({sandboxChallenge.currency})
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>{isUa ? "Вартість (Sandbox)" : "Real Charge"}</span>
                <span className="text-emerald-300 font-bold">
                  $0.00 / Free Test
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 text-[11px]">
                <span>Invoice</span>
                <span>{sandboxChallenge.invoiceId}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {isUa
                ? "Підтвердьте тестову 3D-Secure транзакцію — сервер згенерує криптографічно підписаний HMAC webhook і миттєво активує ваш план."
                : "Confirm this test 3-D Secure challenge to dispatch an HMAC-signed webhook and activate your plan in <1ms."}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                autoFocus
                disabled={confirming3ds}
                onClick={() => setSandboxChallenge(null)}
                className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-mono text-zinc-300 hover:bg-white/[0.08] cursor-pointer disabled:opacity-50"
              >
                {isUa ? "Скасувати" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={confirming3ds}
                onClick={handleConfirmSandbox3ds}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-mono font-bold text-black hover:bg-zinc-200 cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {confirming3ds
                    ? isUa
                      ? "Верифікація 3DS..."
                      : "Verifying 3DS..."
                    : isUa
                    ? "Підтвердити 3DS (Безкоштовно)"
                    : "Confirm 3DS (Free Test)"}
                </span>
              </button>
            </div>
          </div>
        )}
      </dialog>

      <UnifiedFooter />
    </div>
  );
}
