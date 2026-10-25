"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  ArrowLeft,
  Shield,
  Mic,
  Monitor,
  Apple,
  Server,
  Sliders,
  Sparkles,
  Zap,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Radio,
  Cpu,
  Volume2,
} from "lucide-react";
import { CandidateProfile, getStoredCandidateProfile } from "@/components/CandidateProfileModal";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { SubpageStripesContainer } from "@/components/ui/SubpageStripesContainer";
import { useLocale } from "@/contexts/LocaleContext";
import { LOCALE_META, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import { getSettingsTranslations, type Platform } from "@/lib/settingsI18n";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-bold text-zinc-200 font-mono tracking-widest uppercase mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        {title}
      </h2>
      <div className="bg-[#0a0a0e]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 sm:p-7 space-y-4 shadow-xl">
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
  const isUa = locale === "ua";

  const [platform, setPlatform] = useState<Platform>("linux");
  const [speechLang, setSpeechLang] = useState<string>("uk");
  const [outputLang, setOutputLang] = useState<string>("uk");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [showAudioGuide, setShowAudioGuide] = useState(false);

  // AI Copilot Technical Modes
  const [aiMode, setAiMode] = useState<"fast" | "deep">("fast");
  const [conciseMode, setConciseMode] = useState<boolean>(true);

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
      const storedAiMode = (localStorage.getItem("ghostboard_ai_mode") as "fast" | "deep") || "fast";
      const storedConcise = localStorage.getItem("ghostboard_concise_mode") !== "false";

      if (sl) setSpeechLang(sl);
      if (ol) setOutputLang(ol);
      setUserPlan(storedPlan);
      setAiMode(storedAiMode);
      setConciseMode(storedConcise);
      setProfile(getStoredCandidateProfile());
    } catch {}
  }, []);

  const handleSetAiMode = (mode: "fast" | "deep") => {
    setAiMode(mode);
    try {
      localStorage.setItem("ghostboard_ai_mode", mode);
      toast.success(
        isUa
          ? mode === "fast"
            ? "Увімкнено Fast Mode (sub-1.2s відповіді)"
            : "Увімкнено Deep Mode (поглиблений Staff-дизайн)"
          : mode === "fast"
          ? "Fast Mode active (sub-1.2s answers)"
          : "Deep Mode active (Staff-level architecture)"
      );
    } catch {}
  };

  const handleToggleConcise = (val: boolean) => {
    setConciseMode(val);
    try {
      localStorage.setItem("ghostboard_concise_mode", String(val));
      toast.success(
        isUa
          ? val
            ? "Concise Mode увімкнено (короткі буллети STAR)"
            : "Детальний режим увімкнено"
          : val
          ? "Concise Mode enabled (bullet points)"
          : "Detailed explanation mode enabled"
      );
    } catch {}
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
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-white/20 selection:text-white">
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="blueprint" className="flex-1 py-10 px-4 sm:px-6">
        <main className="max-w-3xl mx-auto w-full">
          {/* Sub-header navigation strip */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <Link
                href="/interview"
                className="p-2 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer hover:border-white/20"
                title="Назад до суфлера"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <GhostDetectiveLogo size="mini" />
                  <h1 className="text-base font-black text-white font-mono tracking-wider uppercase flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-zinc-300" />
                    {s.title}
                  </h1>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  {isUa
                    ? "Технічні параметри ШІ, налаштування мов та loopback аудіо"
                    : "Copilot AI parameters, language models & audio routing"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/25 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                title="Перейти в профіль / Profile"
              >
                <User className="w-3.5 h-3.5 text-zinc-300" />
                <span className="hidden sm:inline">{isUa ? "Профіль" : "Profile"}</span>
              </Link>

              <Link
                href="/interview"
                className="hidden sm:inline-flex text-xs font-mono font-bold text-black bg-white px-4 py-2 rounded-xl hover:bg-zinc-200 transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.15)] items-center gap-1.5"
              >
                <span>{s.toCopilot}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ── Section 1: Subscription Summary & Profile Link ── */}
          <Section title={isUa ? "Тариф та Доступ" : "Plan & Billing"}>
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e14] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
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
                        ? "bg-white/15 text-white border border-white/30"
                        : "bg-amber-400/15 text-amber-400 border border-amber-400/30"
                    }`}
                  >
                    {userPlan === "lifetime" ? "VIP PASS" : userPlan === "pro" ? "PRO" : "FREE DEMO"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {isUa
                    ? "Управління підпискою, способами оплати, пристроями та лімітами перенесено до вашого Командного Центру."
                    : "Subscription management, payment portal, active devices, and limits are managed in your Command Center."}
                </p>
              </div>

              <Link
                href="/profile?tab=security_billing"
                className="btn-resend-glass text-xs font-mono !py-2.5 !px-4 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-zinc-300" />
                <span>{isUa ? "Керувати у Профілі" : "Manage in Profile"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Section>

          {/* ── Section 2: AI Copilot Operation Modes ── */}
          <Section title={isUa ? "Режими роботи ШІ (Copilot Engine)" : "AI Copilot Engine & Modes"}>
            <div className="space-y-4">
              {/* Fast vs Deep Mode Toggle */}
              <div>
                <label className="text-xs font-mono text-zinc-300 block font-bold mb-2">
                  {isUa ? "Швидкість генерації та глибина (Latency vs Depth):" : "Generation Latency & Architecture Depth:"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSetAiMode("fast")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                      aiMode === "fast"
                        ? "bg-white/[0.08] border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                        : "bg-black/40 border-white/[0.06] hover:border-white/15 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${aiMode === "fast" ? "text-amber-400 fill-amber-400" : "text-zinc-500"}`} />
                        <span className={`text-xs font-mono font-bold ${aiMode === "fast" ? "text-white" : "text-zinc-400"}`}>
                          Fast Mode (Sub-1.2s)
                        </span>
                      </div>
                      {aiMode === "fast" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {isUa
                        ? "Миттєва генерація через Gemini 2.5 Flash. Оптимально для live-інтерв'ю без пауз."
                        : "Sub-1.2s lightning response via Gemini Flash. Ideal for fast-paced live technical rounds."}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetAiMode("deep")}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-1.5 ${
                      aiMode === "deep"
                        ? "bg-white/[0.08] border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                        : "bg-black/40 border-white/[0.06] hover:border-white/15 text-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className={`w-4 h-4 ${aiMode === "deep" ? "text-sky-400" : "text-zinc-500"}`} />
                        <span className={`text-xs font-mono font-bold ${aiMode === "deep" ? "text-white" : "text-zinc-400"}`}>
                          Deep Reasoning (Staff-Level)
                        </span>
                      </div>
                      {aiMode === "deep" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                      {isUa
                        ? "Глибоке системне проектування, аналіз компромісів (Trade-offs) та високонавантажених кейсів."
                        : "Architectural deep-dive, distributed trade-offs, and high-load edge case scenarios."}
                    </p>
                  </button>
                </div>
              </div>

              {/* Concise Mode Switcher */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-mono font-bold text-white block">
                    {isUa ? "Concise Mode (Телесуфлер-буллети)" : "Concise Mode (Teleprompter Bullets)"}
                  </span>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    {isUa
                      ? "Форматує відповідь у короткі тези та опорні ключові фрази, які легко зачитувати без відведення очей від камери."
                      : "Structures output into short bullet points and speaking triggers for natural eye contact."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleConcise(!conciseMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    conciseMode ? "bg-white" : "bg-white/15"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full transition-transform bg-black absolute top-1 ${
                      conciseMode ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Hotkeys Quick Reference */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase block">
                  {isUa ? "Швидкі комбінації клавіш:" : "Global Hotkeys Reference:"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-zinc-300">
                  <div className="flex items-center gap-2">
                    <kbd className="kbd-obsidian">Space</kbd>
                    <span className="text-[11px] text-zinc-400">{isUa ? "Заморозка екрану" : "Freeze HUD"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="kbd-obsidian">Esc</kbd>
                    <span className="text-[11px] text-zinc-400">{isUa ? "Панік-щит" : "Panic Shield"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="kbd-obsidian">Alt + G</kbd>
                    <span className="text-[11px] text-zinc-400">{isUa ? "Розпізнати LeetCode" : "LeetCode Solve"}</span>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── Section 3: Audio Routing & Loopback ── */}
          <Section title={s.audioSectionTitle}>
            {/* OS Switcher */}
            <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
              {(["linux", "windows", "macos"] as Platform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    platform === p ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"
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
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 border border-white/20 text-zinc-200 text-[10px] font-bold font-mono flex items-center justify-center mt-0.5">
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
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {guide.linkText}
                  </a>
                )}
              </div>
            )}

            {/* Quick Sound Check Diagnostic Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/5">
              <span className="text-xs text-zinc-400 font-sans">
                {isUa
                  ? "Перевірте рівень вхідного сигналу та роботу мікрофона в один клік:"
                  : "Verify microphone input level and latency test:"}
              </span>

              <Link
                href="/interview?modal=soundcheck"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/15 border border-white/10 text-xs font-mono text-white transition-all cursor-pointer shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{isUa ? "Запустити Sound Check" : "Open Sound Check"}</span>
              </Link>
            </div>
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
                      type="button"
                      onClick={() => {
                        setLocale(loc as SupportedLocale);
                        toast.success(t.settings.interfaceLangSaved);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                        locale === loc
                          ? "bg-white text-black border-white"
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
                    type="button"
                    onClick={() => setSpeechLang(o.val)}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                      speechLang === o.val
                        ? "bg-white text-black border-white"
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
                    type="button"
                    onClick={() => setOutputLang(o.val)}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                      outputLang === o.val
                        ? "bg-white text-black border-white"
                        : "bg-black/30 border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={saveLangPrefs}
              className="btn-resend-primary font-mono text-xs !py-2.5 !px-5 cursor-pointer"
            >
              {s.saveLangBtn}
            </button>
          </Section>

          {/* ── Section 5: Candidate Profile Preview ── */}
          <Section title={s.profileTitle}>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
              <div>
                <span className="text-[11px] font-mono text-zinc-500 uppercase">{s.roleLabel}:</span>
                <div className="text-sm font-bold text-white font-mono mt-0.5">
                  {profile?.role || "Software Engineer"}
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
                  href="/profile?tab=specialization"
                  className="text-xs font-mono text-zinc-300 hover:text-white hover:underline flex items-center gap-1"
                >
                  <span>{s.editCvBtn}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </Section>

          {/* ── Section 6: System & Diagnostic ── */}
          <Section title={s.systemTitle}>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">{s.systemVersion}</span>
                <span className="text-zinc-300">2.5.0 Commercial Release</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">{s.systemAiCore}</span>
                <span className="text-zinc-200">Gemini 2.5 Flash / Pro Hybrid Fallback</span>
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
              <Link href="/mock-interview" className="text-zinc-400 hover:text-white transition-colors">
                {s.navMock}
              </Link>
              <Link href="/interview" className="text-zinc-200 hover:text-white hover:underline transition-colors">
                {s.navCopilot}
              </Link>
            </div>
          </Section>
        </main>
      </SubpageStripesContainer>
      <UnifiedFooter />
    </div>
  );
}
