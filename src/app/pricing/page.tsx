"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Sparkles, Zap, Shield, HelpCircle, ChevronDown, Play, ExternalLink, Award } from "lucide-react";
import { toast } from "sonner";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { GravitationalCard } from "@/components/singularity/GravitationalCard";
import { MonochromeStripesCanvas } from "@/components/ui/MonochromeStripesCanvas";
import { LuminousBorderCard } from "@/components/ui/LuminousBorderCard";
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

const PRICING_ROI: Record<SupportedLocale, string> = {
  ua: '💡 1 успішний оффер окупає підписку на роки вперед (+ $500–$2,000/міс до зарплати). Спробуйте без ризику.',
  en: '💡 1 successful offer pays for this tool for years (+ $500–$2,000/mo salary boost). Zero risk, cancel anytime.',
  pl: '💡 1 udany offer zwraca koszt narzędzia na lata (+ $500–$2,000/mies. do pensji). Bez ryzyka.',
  de: '💡 1 erfolgreiches Angebot amortisiert das Tool für Jahre (+ 500–2.000 €/Monat Gehaltssprung). Null Risiko.',
  fr: "💡 1 offre réussie rentabilise l'outil pour des années (+ 500–2 000 $/mois de salaire). Sans risque.",
  es: '💡 1 oferta exitosa amortiza la herramienta por años (+ $500–$2,000/mes de salario). Sin riesgo.',
  pt: '💡 1 oferta bem-sucedida paga esta ferramenta por anos (+ $500–$2,000/mês de salário). Sem risco.',
  it: '💡 1 offerta superata ripaga lo strumento per anni (+ $500–$2,000/mese di stipendio). Senza rischi.',
  cs: '💡 1 úspěšná nabídka zaplatí tento nástroj na roky dopředu (+ $500–$2,000/měs. ke mzdě). Bez rizika.',
  nl: '💡 1 geslaagd aanbod betaalt deze tool voor jaren terug (+ $500–$2,000/mnd salarisgroei). Zonder risico.',
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-white selection:text-black">
      <UnifiedNavbar />

      <MonochromeStripesCanvas direction="diagonal" density="tight" glowIntensity={0.06} className="py-16">
        <main className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Title */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            {/* 3D Money Mascot Animation */}
            <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 mb-6 overflow-hidden rounded-[1.9rem] sm:rounded-[2.2rem] border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
              <video
                src="/videos/money.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
              />
            </div>

            <span className="text-[11px] font-mono text-zinc-200 uppercase tracking-widest bg-white/[0.04] px-3.5 py-1 rounded-full border border-white/10 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
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

            {/* Switchers Row: Billing Cycle + Geo Region */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
              <div className="relative inline-flex items-center p-1 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md font-mono text-xs">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`relative z-10 px-5 py-2 rounded-full transition-colors cursor-pointer font-medium ${
                    billingCycle === "monthly" ? "text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {billingCycle === "monthly" && (
                    <motion.div
                      layoutId="billing-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
                    />
                  )}
                  {t.pricing.monthly}
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`relative z-10 px-5 py-2 rounded-full transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
                    billingCycle === "annual" ? "text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {billingCycle === "annual" && (
                    <motion.div
                      layoutId="billing-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      className="absolute inset-0 bg-white rounded-full -z-10 shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
                    />
                  )}
                  <span>{t.pricing.annual}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                    billingCycle === "annual" ? "bg-transparent text-white" : "bg-white/15 text-white border border-white/20"
                  }`}>
                    {t.pricing.discount}
                  </span>
                </button>
              </div>

              {/* Geo Region Switcher */}
              <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.1] font-mono text-xs">
                <button
                  onClick={() => setRegion("ua")}
                  className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    region === "ua" ? "bg-white/15 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span>🇺🇦 Україна</span>
                  <span className="text-[10px] text-zinc-400">(-40% PPP)</span>
                </button>
                <button
                  onClick={() => setRegion("global")}
                  className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                    region === "global" ? "bg-white/15 text-white font-medium" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span>🌐 US / EU / Global</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 items-stretch">
            {/* Card 1: Free Trial */}
            <GravitationalCard className="p-6 sm:p-8" contentClassName="flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-semibold">{p.plans.free.subtitle}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">{p.plans.free.badge}</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono mt-1">{p.plans.free.name}</h3>
                <div className="flex items-baseline gap-1 my-5">
                  <span className="text-4xl font-bold text-white font-mono">$0</span>
                  <span className="text-xs text-zinc-500 font-mono">{p.plans.free.period}</span>
                </div>

                {/* Explicit Free Trial Limits Box */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5 font-mono text-[11px] space-y-1 text-amber-300">
                  <div className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                    <span>{locale === 'ua' ? '⚡ Ліміти Free Trial:' : '⚡ Free Trial Limits:'}</span>
                  </div>
                  <ul className="space-y-0.5 text-zinc-300 font-sans text-xs">
                    <li>• <strong>{locale === 'ua' ? '1 пробна сесія' : '1 trial session'}</strong> {locale === 'ua' ? 'тривалістю до 15 хвилин' : 'up to 15 minutes'}</li>
                    <li>• <strong>{locale === 'ua' ? 'До 5 AI-відповідей' : 'Up to 5 AI answers'}</strong> {locale === 'ua' ? 'на реальні запитання' : 'to live interview questions'}</li>
                    <li>• <strong>$0</strong> {locale === 'ua' ? 'без прив’язки банківської картки' : 'no credit card required'}</li>
                  </ul>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300 font-sans mb-8">
                  {p.plans.free.features.map((feat, i) => (
                    <li key={i} className={`flex items-center gap-2.5 ${feat.startsWith('✕') ? 'text-zinc-500' : ''}`}>
                      <span className="chrome-check">
                        {feat.startsWith('✕') ? <span className="text-[10px] text-zinc-500">✕</span> : <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span>{feat.replace(/^([✓✕]|\u2713|\u2715)\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/auth/signup" className="btn-resend-glass text-xs font-mono py-3 w-full justify-center flex items-center gap-1.5">
                <span>{t.pricing.freeCta}</span>
                <span className="text-[10px] text-zinc-400 font-sans opacity-80">
                  {locale === 'ua' ? '(Без картки)' : '(No Card)'}
                </span>
              </Link>
            </GravitationalCard>

            {/* Card 2: Pro Pass with Luminous Border Card */}
            <LuminousBorderCard animated={true} badge={t.pricing.proBadge} className="h-full">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold">PRO</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-200 border border-white/20">{p.plans.pro.badge}</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono mt-1">{p.plans.pro.name}</h3>
                <div className="flex items-baseline gap-1 my-5">
                  <span className="text-4xl font-bold text-chrome font-mono">
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
                      <span className="chrome-check">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      <span>{feat.replace(/^([✓✕]|\u2713|\u2715)\s*/, '')}</span>
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
                className="btn-resend-primary text-xs font-mono py-3.5 w-full justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] cursor-pointer"
              >
                {loadingPlan?.startsWith("pro") ? "..." : t.pricing.proCta}
              </button>
            </LuminousBorderCard>

            {/* Card 3: Lifetime Founder Pass */}
            <GravitationalCard className="p-6 sm:p-8 !overflow-visible" ignited={true} contentClassName="flex h-full flex-col justify-between">
              <div className="absolute -top-3.5 right-6 bg-white text-black text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                {p.plans.life.popular || "Founder Pass"}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold">LIFETIME</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/20">{p.plans.life.badge}</span>
                </div>
                <h3 className="text-2xl font-bold text-white font-mono mt-1">{p.plans.life.name}</h3>
                <div className="flex items-baseline gap-1 my-5">
                  <span className="text-4xl font-bold text-white font-mono">
                    {region === "ua" ? "$99" : "$149"}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">{t.pricing.oneTime}</span>
                </div>
                <ul className="space-y-3 text-xs text-zinc-300 font-sans mb-8">
                  {p.plans.life.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-white">
                      <span className="chrome-check">
                        <Check className="w-3 h-3 text-white" />
                      </span>
                      <span>{feat.replace(/^([✓✕]|\u2713|\u2715)\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleCheckout(region === "ua" ? "lifetime_ua" : "lifetime_global")}
                disabled={loadingPlan?.startsWith("lifetime")}
                className="btn-resend-glass text-xs font-mono py-3 w-full justify-center border-white/20 hover:border-white/40 hover:bg-white/10 cursor-pointer"
              >
                {loadingPlan?.startsWith("lifetime") ? "..." : t.pricing.lifeCta}
              </button>
            </GravitationalCard>
          </div>

          {/* Feature Matrix */}
          <div className="mb-24">
            <h2 className="text-xl sm:text-2xl font-black font-display text-white text-center mb-8">
              {p.matrix.title}
            </h2>
            <div className="overflow-x-auto rounded-3xl border border-white/10 bg-[#09090b]/80">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 bg-transparent/40">
                    <th className="text-left p-4 text-zinc-400 font-bold">{p.matrix.headers.feature}</th>
                    <th className="text-center p-4 text-zinc-400 font-bold">{p.matrix.headers.free}</th>
                    <th className="text-center p-4 text-white font-bold">{p.matrix.headers.pro}</th>
                    <th className="text-center p-4 text-zinc-400 font-bold">{p.matrix.headers.life}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.matrix.rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/2">
                      <td className="p-4 text-zinc-300 font-medium">{row.feat}</td>
                      <td className="p-4 text-center text-zinc-500">{row.free}</td>
                      <td className="p-4 text-center text-white font-bold">{row.pro}</td>
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
                <details key={i} className="gb-accordion group bg-[#09090b] border border-white/8 rounded-2xl p-5 open:border-white/20 transition-all">
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
            <Link href="/auth/signup" className="btn-resend-primary text-xs font-mono !py-3.5 !px-8 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <span>{p.ctaBottom.btn}</span>
            </Link>

            {/* Developer Payment Simulator (Visible in non-production environments only) */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="flex justify-center mt-6">
                <Link
                  href="/checkout/simulator?planId=pro_ua_monthly&targetPlan=pro&name=Ghostboard%20Pro%20Pass&amount=1500&price=%2415"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/30 text-amber-300 font-mono text-[11px] hover:bg-amber-500/20 transition-all"
                >
                  <Zap className="w-3 h-3" />
                  <span>[Dev Only] Checkout Simulator</span>
                </Link>
              </div>
            )}
          </div>
        </main>
      </MonochromeStripesCanvas>

      <UnifiedFooter />
    </div>
  );
}
