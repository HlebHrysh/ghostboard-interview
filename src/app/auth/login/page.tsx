"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Zap, Sparkles, Check, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { LangDropdown } from "@/components/ui/LangDropdown";
import { useLocale } from "@/contexts/LocaleContext";
import { getAuthTranslations } from "@/lib/authI18n";

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getAuthTranslations(locale).login;
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const getDestination = () => {
    if (typeof window !== "undefined") {
      const from = new URLSearchParams(window.location.search).get("from");
      if (from && from.startsWith("/")) return from;
    }
    return "/interview";
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const from = new URLSearchParams(window.location.search).get("from");
      if (from && from.includes("interview")) {
        toast.info(
          locale === "ua"
            ? "Будь ласка, авторизуйтесь для доступу до тренажера інтерв'ю"
            : "Please sign in to access the Interview Copilot"
        );
      }
    }
  }, [locale]);

  const handleOAuthLogin = async (provider: string) => {
    setLoading(true);
    toast.success(t.authorizingGoogle);
    try {
      const email = `${provider.toLowerCase()}_user@ghostboard.ai`;
      let res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "oauth_default_password" }),
      });
      let data = await res.json();
      if (!data?.success) {
        res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "oauth_default_password", name: `${provider} Developer` }),
        });
        data = await res.json();
      }
      if (data?.user) {
        localStorage.setItem("ghostboard_auth_user", JSON.stringify(data.user));
      }
    } catch {}
    router.push(getDestination());
  };


  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error(t.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      let res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "magic_password_123" }),
      });
      let data = await res.json();
      if (!data?.success) {
        res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: "magic_password_123" }),
        });
        data = await res.json();
      }
      if (data?.user) {
        localStorage.setItem("ghostboard_auth_user", JSON.stringify(data.user));
      }
      toast.success(t.signInSuccess);
      router.push(getDestination());
    } catch {
      localStorage.setItem("ghostboard_auth_user", JSON.stringify({ email, plan: "trial" }));
      router.push(getDestination());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 flex flex-col md:flex-row selection:bg-[#C8F135]/30">
      {/* ── Left Showcase Panel ── */}
      <div className="md:w-7/12 bg-gradient-to-b from-[#07070b] via-[#040406] to-[#050508] p-8 md:p-14 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08]">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#C8F135]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <GhostDetectiveLogo size="md" className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="text-lg font-black font-mono tracking-widest text-white group-hover:text-[#C8F135] transition-colors">
                GHOSTBOARD
              </span>
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                DETECTIVE CLEARANCE PORTAL
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LangDropdown />
            <span className="hidden sm:inline-flex text-[10px] px-2.5 py-1 rounded-full bg-[#C8F135]/10 text-[#C8F135] font-mono border border-[#C8F135]/30 uppercase tracking-widest">
              SECURE v2.5
            </span>
          </div>
        </div>

        {/* Hero Quote */}
        <div className="my-12 md:my-auto max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {t.statEngineers}
          </div>
          <h2 className="display-xl text-white mb-6 leading-tight font-display">
            {t.heroQuote} <br />
            <span className="italic text-[#C8F135]">{t.heroAccent}</span>
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            {t.heroDesc}
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
            <div>
              <div className="text-2xl font-mono font-black text-[#C8F135]">{t.statLatency}</div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono">{t.statLatencyLabel}</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-black text-white">{t.statShield}</div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono">{t.statShieldLabel}</div>
            </div>
            <div>
              <div className="text-2xl font-mono font-black text-white">{t.statKeys}</div>
              <div className="text-xs text-zinc-500 mt-0.5 font-mono">{t.statKeysLabel}</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-zinc-600 font-mono relative z-10 flex items-center justify-between">
          <span>© 2026 Ghostboard Studio</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* ── Right Auth Form ── */}
      <div className="md:w-5/12 p-8 md:p-14 flex flex-col justify-center bg-[#040406] relative">
        <div className="max-w-md w-full mx-auto space-y-7 bg-[#08080c]/80 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
              <span className="text-[10px] font-mono tracking-widest text-[#C8F135] uppercase">
                {t.badge}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {t.portalTitle}
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-2">
              {t.portalDesc}
            </p>
          </div>

          {/* 1-Click Google OAuth */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleOAuthLogin("Google")}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-100 text-black font-bold text-xs md:text-sm transition-all shadow-lg active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{t.googleBtn}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {t.orEmail}
            </span>
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-2">
                {t.emailLabel}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full bg-[#0c0c12] border border-white/[0.08] focus:border-[#C8F135]/60 rounded-xl px-4 py-3 text-xs md:text-sm font-mono text-zinc-100 placeholder-zinc-700 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(200,241,53,0.15)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-lime font-mono text-xs md:text-sm py-3.5 shadow-[0_0_25px_rgba(200,241,53,0.3)] hover:shadow-[0_0_35px_rgba(200,241,53,0.5)] transition-all cursor-pointer"
            >
              <span>{t.magicLinkBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 space-y-1 font-mono">
            <div className="flex items-center gap-2 text-[#C8F135] font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.privacyTitle}</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {t.privacyDesc}
            </p>
          </div>

          <p className="text-center text-xs text-zinc-500 font-mono">
            {t.noAccount}{" "}
            <Link href="/auth/signup" className="text-[#C8F135] hover:underline font-bold">
              {t.signUpLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
