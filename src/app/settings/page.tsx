"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check, ExternalLink, ArrowLeft,
  Shield, Mic, Globe, Monitor, Apple, Server,
  Sliders, Key, Volume2, Sparkles, Zap, ArrowRight, RefreshCw,
  CreditCard, ChevronDown, ChevronUp, Lock, User
} from "lucide-react";
import { ROLE_PRESETS, CandidateProfile, getStoredCandidateProfile } from "@/components/CandidateProfileModal";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { useLocale } from "@/contexts/LocaleContext";
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import { getSettingsTranslations, type Platform } from "@/lib/settingsI18n";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-bold text-[#C8F135] font-mono tracking-widest uppercase mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
        {title}
      </h2>
      <div className="bg-[#0a0a0e]/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
        {children}
      </div>
    </div>
  );
}

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  linux: <Server className="w-4 h-4 text-emerald-400" />,
  windows: <Monitor className="w-4 h-4 text-sky-400" />,
  macos: <Apple className="w-4 h-4 text-zinc-300" />,
};

export default function SettingsPage() {
  const { locale, setLocale, t } = useLocale();
  const s = getSettingsTranslations(locale);
  const [platform, setPlatform] = useState<Platform>("linux");
  const [speechLang, setSpeechLang] = useState<string>("uk");
  const [outputLang, setOutputLang] = useState<string>("uk");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [stripeConfig, setStripeConfig] = useState<{
    isConfigured: boolean;
    mode: 'live' | 'test' | 'sandbox';
    maskedSecretKey: string | null;
    maskedPublishableKey: string | null;
    maskedWebhookSecret: string | null;
  } | null>(null);

  const [inputSecretKey, setInputSecretKey] = useState('');
  const [inputPublKey, setInputPublKey] = useState('');
  const [inputWebhookSec, setInputWebhookSec] = useState('');
  const [isSavingStripe, setIsSavingStripe] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [showAudioGuide, setShowAudioGuide] = useState(false);

  useEffect(() => {
    // OS detection
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) setPlatform("windows");
    else if (ua.includes("mac")) setPlatform("macos");
    else setPlatform("linux");

    try {
      const sl = localStorage.getItem("ghostboard_speech_language");
      const ol = localStorage.getItem("ghostboard_output_language");
      const storedPlan = localStorage.getItem("ghostboard_plan") || "free";
      if (sl) setSpeechLang(sl);
      if (ol) setOutputLang(ol);
      setUserPlan(storedPlan);
      setProfile(getStoredCandidateProfile());
    } catch {}

    fetch('/api/stripe/config')
      .then((res) => res.json())
      .then((data) => setStripeConfig(data))
      .catch(() => {});
  }, []);

  const handleSetPlan = (plan: string) => {
    try {
      localStorage.setItem("ghostboard_plan", plan);
      setUserPlan(plan);
      if (plan === "lifetime") {
        toast.success(s.toastLifetime);
      } else if (plan === "pro") {
        toast.success(s.toastPro);
      } else {
        toast.info(s.toastFree);
      }
    } catch {
      toast.error(t.common.error);
    }
  };

  const handleUpgradeStripe = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "pro_ua_monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.success(s.toastStripeActivated);
      }
    } catch {
      toast.error(s.toastPaymentError);
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.info(s.toastPortalOpened);
      }
    } catch {
      toast.error(s.toastPortalError);
    }
  };

  const handleSaveStripeKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStripe(true);
    try {
      const res = await fetch('/api/stripe/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretKey: inputSecretKey || undefined,
          publishableKey: inputPublKey || undefined,
          webhookSecret: inputWebhookSec || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || s.toastKeysSaved);
        const fresh = await fetch('/api/stripe/config').then((r) => r.json());
        setStripeConfig(fresh);
        setShowStripeForm(false);
        setInputSecretKey('');
        setInputPublKey('');
        setInputWebhookSec('');
      } else {
        toast.error(data.error || s.toastKeysError);
      }
    } catch {
      toast.error(s.toastNetworkError);
    } finally {
      setIsSavingStripe(false);
    }
  };

  const saveLangPrefs = () => {
    try {
      localStorage.setItem("ghostboard_speech_language", speechLang);
      localStorage.setItem("ghostboard_output_language", outputLang);
      toast.success(s.toastLangSaved);
    } catch {
      toast.error(t.common.error);
    }
  };

  const guide = s.guides[platform];

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 flex flex-col justify-between selection:bg-[#C8F135]/30">
      <UnifiedNavbar />

      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex-1">
        {/* Detective Sub-header strip */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <Link
              href="/interview"
              className="p-2 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer hover:border-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <GhostDetectiveLogo size="mini" />
                <h1 className="text-base font-black text-white font-mono tracking-wider uppercase flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#C8F135]" />
                  {s.title}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">{s.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-[#C8F135]/40 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
              title="Перейти в профіль / Profile"
            >
              <User className="w-3.5 h-3.5 text-[#C8F135]" />
              <span className="hidden sm:inline">Профіль</span>
            </Link>

            <Link
              href="/interview"
              className="hidden sm:inline-flex text-xs font-mono font-bold text-black bg-[#C8F135] px-4 py-2 rounded-xl hover:bg-[#d4f545] transition-all cursor-pointer shadow-[0_0_20px_rgba(200,241,53,0.3)] items-center gap-1.5"
            >
              <span>{s.toCopilot}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ── Section 1: Subscription & Payment Gateway ── */}
        <Section title={s.planSectionTitle}>
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#171a24] to-[#12141c] border border-[#C8F135]/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white font-mono">
                    {userPlan === "lifetime"
                      ? "Ghostboard Lifetime Founder Pass"
                      : userPlan === "pro"
                      ? "Ghostboard Pro Pass"
                      : "Free Trial Demo"}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                      userPlan === "lifetime"
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                        : userPlan === "pro"
                        ? "bg-[#C8F135]/20 text-[#C8F135] border border-[#C8F135]/40"
                        : "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                    }`}
                  >
                    {userPlan === "lifetime"
                      ? "LIFETIME VIP"
                      : userPlan === "pro"
                      ? s.unlimitedBadge
                      : s.limitBadge}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {userPlan === "lifetime"
                    ? t.settings.subscriptionLifetime
                    : userPlan === "pro"
                    ? t.settings.subscriptionPro
                    : t.settings.subscriptionFree}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {userPlan === "free" ? (
                  <button
                    onClick={handleUpgradeStripe}
                    disabled={isUpgrading}
                    className="btn-lime text-xs font-mono py-2 px-3.5 flex items-center gap-1.5 shadow-[0_0_25px_rgba(200,241,53,0.3)] cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>{isUpgrading ? t.settings.upgrading : t.settings.upgradeBtn}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleManageSubscription}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-[#C8F135]" />
                    <span>{t.settings.manageSubscription}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Trial / Active Info Bar */}
            {userPlan === "free" ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-300 flex items-center justify-between">
                <span>⏱️ {s.freeLimitText}</span>
                <Link href="/pricing" className="text-[#C8F135] underline font-bold hover:text-white">
                  {s.plansPricingLink}
                </Link>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{s.unlimitedDesc}</span>
                </span>
                <Link href="/pricing" className="text-zinc-400 hover:text-white text-[11px] underline">
                  {s.viewAllPlansLink}
                </Link>
              </div>
            )}
          </div>

          {/* Stripe Gateway & Key Configuration Box (Admin & Dev Only) */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#C8F135]" />
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    {s.stripeTitle} <span className="text-[10px] text-zinc-500 font-normal">[Dev Only]</span>
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    stripeConfig?.isConfigured
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                  }`}
                >
                  {stripeConfig?.isConfigured
                    ? `🟢 ${stripeConfig.mode === 'live' ? 'Live Stripe' : 'Test Stripe API'}`
                    : s.stripeSandboxBadge}
                </span>
              </div>

              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                {stripeConfig?.isConfigured
                  ? s.stripeConnectedDesc(stripeConfig.maskedSecretKey || '')
                  : s.stripeSandboxDesc}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href="/pricing"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#C8F135] hover:text-black border border-white/15 text-xs font-mono text-zinc-200 transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{s.testPricingLink}</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowStripeForm((p) => !p)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-mono text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                >
                  <span>{showStripeForm ? s.hideFormBtn : s.configureKeysBtn}</span>
                  {showStripeForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Collapsible Stripe API Keys Form */}
              {showStripeForm && (
                <form onSubmit={handleSaveStripeKeys} className="pt-3 mt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                      {s.secretKeyLabel}
                    </label>
                    <input
                      type="password"
                      value={inputSecretKey}
                      onChange={(e) => setInputSecretKey(e.target.value)}
                      placeholder={stripeConfig?.maskedSecretKey || "sk_test_..."}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-[#C8F135] text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">
                      {s.webhookSecLabel}
                    </label>
                    <input
                      type="password"
                      value={inputWebhookSec}
                      onChange={(e) => setInputWebhookSec(e.target.value)}
                      placeholder={stripeConfig?.maskedWebhookSecret || "whsec_..."}
                      className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-[#C8F135] text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSavingStripe || (!inputSecretKey && !inputWebhookSec)}
                      className="btn-lime text-xs font-mono py-2 px-4 cursor-pointer disabled:opacity-40"
                    >
                      {isSavingStripe ? s.savingKeysBtn : s.saveKeysBtn}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </Section>

        {/* ── Section 2: Candidate Profile ── */}
        <Section title={s.profileTitle}>
          <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
            <div>
              <span className="text-[11px] font-mono text-zinc-500 uppercase">{s.roleLabel}:</span>
              <div className="text-sm font-bold text-white font-mono mt-0.5">
                {profile?.role || "Python Backend Developer"}
              </div>
            </div>

            {profile?.techStack && profile.techStack.length > 0 && (
              <div>
                <span className="text-[11px] font-mono text-zinc-500 uppercase block mb-1.5">{s.stackLabel}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.techStack.slice(0, 10).map((tech) => (
                    <span key={tech} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-300">
                      {tech}
                    </span>
                  ))}
                  {profile.techStack.length > 10 && (
                    <span className="text-xs font-mono text-zinc-500 self-center">
                      +{profile.techStack.length - 10} {s.moreTech(profile.techStack.length - 10)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-mono">
                {s.profileAiHint}
              </span>
              <Link
                href="/interview"
                className="text-xs font-mono text-[#C8F135] hover:underline flex items-center gap-1"
              >
                <span>{s.editCvBtn}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Section>

        {/* ── Section 3: Audio Setup ── */}
        <Section title={s.audioSectionTitle}>
          {/* OS Switcher */}
          <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
            {(["linux", "windows", "macos"] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  platform === p ? "bg-[#C8F135] text-black" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {p === "linux" ? "🐧 Linux" : p === "windows" ? "🪟 Windows" : "🍎 macOS"}
              </button>
            ))}
          </div>

          {/* Collapsible guide */}
          <button
            type="button"
            onClick={() => setShowAudioGuide((p) => !p)}
            className="w-full flex items-center justify-between text-left mt-1 p-3 rounded-xl bg-black/30 border border-white/5 hover:border-white/15 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {PLATFORM_ICONS[platform]}
              <span className="text-xs font-bold text-white font-mono">{guide.title}</span>
            </div>
            {showAudioGuide ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
          </button>

          {showAudioGuide && (
            <div className="animate-in fade-in duration-200">
              <ol className="space-y-2.5 mt-3">
                {guide.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-zinc-300 font-sans leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#C8F135]/20 border border-[#C8F135]/30 text-[#C8F135] text-[10px] font-bold font-mono flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              {guide.link && (
                <a
                  href={guide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {guide.linkText}
                </a>
              )}
            </div>
          )}
        </Section>

        {/* ── Section 4: Language Preferences ── */}
        <Section title={s.langSectionTitle}>
          {/* Interface / site language */}
          <div>
            <label className="text-xs font-mono text-zinc-400 mb-3 block font-bold">
              {s.interfaceLangLabel}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_LOCALES.map((loc) => {
                const meta = LOCALE_META[loc];
                return (
                  <button
                    key={loc}
                    onClick={() => {
                      setLocale(loc as SupportedLocale);
                      toast.success(t.settings.interfaceLangSaved);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                      locale === loc
                        ? "bg-[#C8F135] text-black border-[#C8F135]"
                        : "bg-black/30 border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <span>{meta.flag}</span>
                    <span>{meta.nativeName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STT Language */}
          <div>
            <label className="text-xs font-mono text-zinc-400 mb-2.5 block font-bold">{s.speechLangLabel}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {[
                { val: "uk", label: "🇺🇦 Українська" },
                { val: "en", label: "🇬🇧 English" },
                { val: "pl", label: "🇵🇱 Polski" },
                { val: "de", label: "🇩🇪 Deutsch" },
                { val: "fr", label: "🇫🇷 Français" },
                { val: "es", label: "🇪🇸 Español" },
                { val: "pt", label: "🇵🇹 Português" },
                { val: "it", label: "🇮🇹 Italiano" },
                { val: "cs", label: "🇨🇿 Čeština" },
                { val: "nl", label: "🇳🇱 Nederlands" },
                { val: "ru", label: "🇷🇺 Русский" },
                { val: "auto", label: `🌐 ${t.common.auto}` },
              ].map((o) => (
                <button
                  key={o.val}
                  onClick={() => setSpeechLang(o.val)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    speechLang === o.val
                      ? "bg-[#C8F135] text-black border-[#C8F135]"
                      : "bg-black/30 border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Output Language */}
          <div>
            <label className="text-xs font-mono text-zinc-400 mb-2.5 block font-bold">{s.outputLangLabel}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { val: "uk", label: "🇺🇦 Українська" },
                { val: "en", label: "🇬🇧 English" },
                { val: "pl", label: "🇵🇱 Polski" },
                { val: "de", label: "🇩🇪 Deutsch" },
                { val: "fr", label: "🇫🇷 Français" },
                { val: "es", label: "🇪🇸 Español" },
                { val: "pt", label: "🇵🇹 Português" },
                { val: "it", label: "🇮🇹 Italiano" },
                { val: "cs", label: "🇨🇿 Čeština" },
                { val: "nl", label: "🇳🇱 Nederlands" },
                { val: "auto", label: `🌐 ${t.common.auto}` },
              ].map((o) => (
                <button
                  key={o.val}
                  onClick={() => setOutputLang(o.val)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                    outputLang === o.val
                      ? "bg-[#C8F135] text-black border-[#C8F135]"
                      : "bg-black/30 border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveLangPrefs}
            className="btn-lime font-mono text-xs py-2.5 px-5 cursor-pointer"
          >
            {s.saveLangBtn}
          </button>
        </Section>


        {/* ── Section 5: App Version ── */}
        <Section title={s.systemTitle}>
          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{s.systemVersion}</span>
              <span className="text-zinc-300">2.0.0 Commercial Release</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{s.systemAiCore}</span>
              <span className="text-[#C8F135]">Gemini 2.5 Flash Fallback Cascade</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{s.systemStt}</span>
              <span className="text-white">Deepgram Nova-3 (16kHz PCM)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{s.systemPhonetics}</span>
              <span className="text-zinc-300">{s.phoneticsRuleCount}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex flex-wrap gap-4 text-xs font-mono">
            <Link href="/" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              {s.navHome}
            </Link>
            <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/mock-interview" className="text-sky-400 hover:text-sky-200 transition-colors">
              {s.navMock}
            </Link>
            <Link href="/sandbox" className="text-violet-400 hover:text-violet-200 transition-colors">
              Interview Arena
            </Link>
            <Link href="/interview" className="text-[#C8F135] hover:underline transition-colors">
              {s.navCopilot}
            </Link>
          </div>
        </Section>
      </main>
      <UnifiedFooter />
    </div>
  );
}
