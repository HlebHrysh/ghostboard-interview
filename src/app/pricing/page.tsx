"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Zap, Shield, HelpCircle, ChevronDown, Play, ExternalLink, Award } from "lucide-react";
import { toast } from "sonner";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { detectInitialLang, detectGeoCountryLang, type SupportedLocale } from "@/lib/geoLang";
import { useLocale } from "@/contexts/LocaleContext";
import { getPricingTranslations } from "@/lib/pricingI18n";

const PRICING_TOASTS: Record<SupportedLocale, { activated: string; error: string }> = {
  ua: { activated: 'Тариф успішно активовано!', error: "Помилка зв'язку з сервером оплати" },
  en: { activated: 'Plan successfully activated!', error: 'Payment server connection error' },
  pl: { activated: 'Plan pomyślnie aktywowany!', error: 'Błąd połączenia z serwerem płatności' },
  de: { activated: 'Tarif erfolgreich aktiviert!', error: 'Fehler bei der Verbindung zum Zahlungsserver' },
  fr: { activated: 'Forfait activé avec succès !', error: 'Erreur de connexion au serveur de paiement' },
  es: { activated: '¡Plan activado con éxito!', error: 'Error de conexión con el servidor de pagos' },
  pt: { activated: 'Plano ativado com sucesso!', error: 'Erro de conexão com o servidor de pagamento' },
  it: { activated: 'Piano attivato con successo!', error: 'Errore di connessione al server di pagamento' },
  cs: { activated: 'Tarif byl úspěšně aktivován!', error: 'Chyba připojení k platebnímu serveru' },
  nl: { activated: 'Abonnement succesvol geactiveerd!', error: 'Fout bij verbinding met betalingsserver' },
};

export default function PricingPage() {
  const { t, locale } = useLocale();
  const p = getPricingTranslations(locale);
  const toasts = PRICING_TOASTS[locale] || PRICING_TOASTS.en;
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [region, setRegion] = useState<"ua" | "global">("ua");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  React.useEffect(() => {
    const initial = detectInitialLang();
    setRegion(initial === "ua" ? "ua" : "global");

    detectGeoCountryLang((lang) => {
      setRegion(lang === "ua" ? "ua" : "global");
    });
  }, []);

  const handleCheckout = async (planId: string, forceSimulate = false) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          billingCycle,
          simulate: forceSimulate,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.success(toasts.activated);
      }
    } catch {
      toast.error(toasts.error);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 selection:bg-[#C8F135] selection:text-black">
      <UnifiedNavbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        {/* Title */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-[11px] font-mono text-[#C8F135] uppercase tracking-widest bg-[#C8F135]/10 px-3 py-1 rounded-full border border-[#C8F135]/20">
            {t.pricing.label}
          </span>
          <h1 className="display-xl text-white font-display mt-4">
            {t.pricing.title}
          </h1>
          <p className="text-sm text-zinc-400 mt-3 font-sans leading-relaxed">
            {t.pricing.subtitle}
          </p>

          {/* Switchers Row: Billing Cycle + Geo Region */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-[#111113] border border-white/10 font-mono text-xs">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer font-bold ${
                  billingCycle === "monthly" ? "bg-[#C8F135] text-black shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.pricing.monthly}
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  billingCycle === "annual" ? "bg-[#C8F135] text-black shadow-md" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>{t.pricing.annual}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-400 text-black font-black uppercase">
                  {t.pricing.discount}
                </span>
              </button>
            </div>

            {/* Geo Region Switcher */}
            <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-[#111113] border border-white/10 font-mono text-xs">
              <button
                onClick={() => setRegion("ua")}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  region === "ua" ? "bg-white/15 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span>🇺🇦 Україна</span>
                <span className="text-[10px] text-[#C8F135]">(-40% PPP)</span>
              </button>
              <button
                onClick={() => setRegion("global")}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  region === "global" ? "bg-white/15 text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span>🌐 US / EU / Global</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Tier Cards with Spotlight Effects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {/* Card 1: Free Trial */}
          <SpotlightCard enableTilt={true} className="gb-card p-6 sm:p-8 flex flex-col justify-between border-white/[0.08]">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-bold">{p.plans.free.subtitle}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">{p.plans.free.badge}</span>
              </div>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{p.plans.free.name}</h3>
              <div className="flex items-baseline gap-1 my-5">
                <span className="text-4xl font-black text-white font-mono">$0</span>
                <span className="text-xs text-zinc-500 font-mono">{p.plans.free.period}</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-300 font-sans mb-8">
                {p.plans.free.features.map((feat, i) => (
                  <li key={i} className={`flex items-center gap-2.5 ${feat.startsWith('✕') ? 'text-zinc-500' : ''}`}>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <Link href="/auth/signup" className="btn-ghost text-xs font-mono py-3 w-full justify-center">
              {t.pricing.freeCta}
            </Link>
          </SpotlightCard>

          {/* Card 2: Pro Pass */}
          <SpotlightCard
            enableTilt={true}
            glowColor="rgba(200, 241, 53, 0.45)"
            className="gb-card pricing-card-featured p-6 sm:p-8 flex flex-col justify-between relative shadow-[0_0_60px_rgba(200,241,53,0.15)] border-[#C8F135]/40"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#C8F135] text-black text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
              {t.pricing.proBadge}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-[#C8F135] uppercase tracking-wider font-bold">PRO</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C8F135]/20 text-[#C8F135] border border-[#C8F135]/30">{p.plans.pro.badge}</span>
              </div>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{p.plans.pro.name}</h3>
              <div className="flex items-baseline gap-1 my-5">
                <span className="text-4xl font-black text-[#C8F135] font-mono">
                  {region === "ua"
                    ? billingCycle === "annual"
                      ? "$12"
                      : "$15"
                    : billingCycle === "annual"
                    ? "$20"
                    : "$25"}
                </span>
                <span className="text-xs text-zinc-400 font-mono">{t.pricing.perMonth}</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-200 font-sans mb-8">
                {p.plans.pro.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-white">
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() =>
                handleCheckout(
                  region === "ua"
                    ? billingCycle === "annual"
                      ? "pro_ua_annual"
                      : "pro_ua_monthly"
                    : billingCycle === "annual"
                    ? "pro_global_annual"
                    : "pro_global_monthly"
                )
              }
              disabled={loadingPlan?.startsWith("pro")}
              className="btn-lime text-xs font-mono py-3.5 w-full justify-center shadow-[0_0_25px_rgba(200,241,53,0.35)] cursor-pointer"
            >
              {loadingPlan?.startsWith("pro") ? "..." : t.pricing.proCta}
            </button>
          </SpotlightCard>

          {/* Card 3: Lifetime Founder Pass */}
          <SpotlightCard
            enableTilt={true}
            glowColor="rgba(245, 158, 11, 0.4)"
            className="gb-card p-6 sm:p-8 flex flex-col justify-between border-amber-500/40 relative bg-gradient-to-b from-[#14161f] to-[#0a0b0e]"
          >
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-400 to-[#C8F135] text-black text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
              {p.plans.life.popular || "Founder Pass"}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-amber-400 uppercase tracking-wider font-bold">LIFETIME</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">{p.plans.life.badge}</span>
              </div>
              <h3 className="text-2xl font-black text-white font-mono mt-1">{p.plans.life.name}</h3>
              <div className="flex items-baseline gap-1 my-5">
                <span className="text-4xl font-black text-white font-mono">
                  {region === "ua" ? "$99" : "$149"}
                </span>
                <span className="text-xs text-zinc-500 font-mono">{t.pricing.oneTime}</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-300 font-sans mb-8">
                {p.plans.life.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-white">
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => handleCheckout(region === "ua" ? "lifetime_ua" : "lifetime_global")}
              disabled={loadingPlan?.startsWith("lifetime")}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-[#C8F135] text-black font-mono text-xs font-bold transition-all w-full justify-center cursor-pointer shadow-[0_0_25px_rgba(245,158,11,0.25)]"
            >
              {loadingPlan?.startsWith("lifetime") ? "..." : t.pricing.lifeCta}
            </button>
          </SpotlightCard>
        </div>

        {/* Feature Matrix */}
        <div className="mb-24">
          <h2 className="text-xl sm:text-2xl font-black font-display text-white text-center mb-8">
            {p.matrix.title}
          </h2>
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#111113]/60">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-white/10 bg-black/40">
                  <th className="text-left p-4 text-zinc-400 font-bold">{p.matrix.headers.feature}</th>
                  <th className="text-center p-4 text-zinc-400 font-bold">{p.matrix.headers.free}</th>
                  <th className="text-center p-4 text-[#C8F135] font-bold">{p.matrix.headers.pro}</th>
                  <th className="text-center p-4 text-zinc-400 font-bold">{p.matrix.headers.life}</th>
                </tr>
              </thead>
              <tbody>
                {p.matrix.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/2">
                    <td className="p-4 text-zinc-300 font-medium">{row.feat}</td>
                    <td className="p-4 text-center text-zinc-500">{row.free}</td>
                    <td className="p-4 text-center text-[#C8F135] font-bold">{row.pro}</td>
                    <td className="p-4 text-center text-zinc-300">{row.life}</td>
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
              <details key={i} className="gb-accordion group bg-[#111113] border border-white/8 rounded-2xl p-5 open:border-[#C8F135]/30 transition-all">
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

        {/* Bottom CTA */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#171a24] to-[#12141c] border border-[#C8F135]/30 text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-4">
            <GhostDetectiveLogo size="lg" animated={true} />
          </div>
          <h3 className="text-2xl font-bold font-display text-white mb-2">
            {p.ctaBottom.title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto mb-6">
            {p.ctaBottom.desc}
          </p>
          <Link href="/auth/signup" className="btn-lime text-xs font-mono py-3.5 px-8 shadow-[0_0_30px_rgba(200,241,53,0.35)]">
            <span>{p.ctaBottom.btn}</span>
          </Link>
        </div>
      </main>

      <UnifiedFooter />
    </div>
  );
}
