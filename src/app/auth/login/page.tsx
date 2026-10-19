"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Check,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { LangDropdown } from "@/components/ui/LangDropdown";
import { MonochromeStripesCanvas } from "@/components/ui/MonochromeStripesCanvas";
import { useLocale } from "@/contexts/LocaleContext";
import { getAuthTranslations } from "@/lib/authI18n";

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getAuthTranslations(locale).login;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [notFoundEmail, setNotFoundEmail] = useState("");

  const getDestination = () => {
    if (typeof window !== "undefined") {
      const from = new URLSearchParams(window.location.search).get("from");
      if (from && from.startsWith("/")) return from;
    }
    return "/interview";
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const from = search.get("from");
      const error = search.get("error");
      const provider = search.get("provider") || "OAuth";
      const client = search.get("client");
      const redirectUri = search.get("redirect_uri");
      const stateParam = search.get("state");

      // Auto-redirect if already authenticated and requested by desktop
      if (client === "desktop" && redirectUri && stateParam) {
        fetch("/api/auth/desktop-token", { method: "POST" })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Not authenticated");
          })
          .then((data) => {
            if (data?.token) {
              window.location.href = `${redirectUri}?token=${data.token}&state=${stateParam}`;
            }
          })
          .catch(() => {
            // User is not authenticated in browser, show login form normally
          });
      }

      if (error === "missing_credentials") {
        toast.error(t.oauthConfigError(provider), { duration: 6000 });
      } else if (error === "access_denied") {
        toast.info(locale === "ua" ? "Авторизацію скасовано" : "Authentication cancelled");
      } else if (error) {
        toast.error(locale === "ua" ? "Помилка входу через " + provider : "Authentication error with " + provider);
      } else if (from && from.includes("interview")) {
        toast.info(
          locale === "ua"
            ? "Будь ласка, авторизуйтесь для доступу до тренажера інтерв'ю"
            : "Please sign in to access the Interview Copilot"
        );
      }
    }
  }, [locale, t]);

  const handleOAuthLogin = (provider: "google" | "github") => {
    setLoading(true);
    toast.success(provider === "google" ? t.authorizingGoogle : t.authorizingGithub);
    const destination = getDestination();
    const search = new URLSearchParams(window.location.search);
    const client = search.get("client");
    const redirectUri = search.get("redirect_uri");
    const stateParam = search.get("state");

    const oauthUrl = new URL(`/api/auth/oauth/${provider}`, window.location.origin);
    oauthUrl.searchParams.set("from", destination);
    if (client === "desktop") {
      oauthUrl.searchParams.set("client", "desktop");
      if (redirectUri) oauthUrl.searchParams.set("redirect_uri", redirectUri);
      if (stateParam) oauthUrl.searchParams.set("state", stateParam);
    }
    window.location.href = oauthUrl.toString();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserNotFound(false);

    if (!email || !email.includes("@")) {
      toast.error(t.invalidEmail);
      return;
    }
    if (!password) {
      toast.error(t.passwordRequired);
      return;
    }

    setLoading(true);
    try {
      const search = new URLSearchParams(window.location.search);
      const client = search.get("client") === "desktop" ? "desktop" : "web";

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, client }),
      });
      const data = await res.json();

      if (res.status === 404 || data?.code === "USER_NOT_FOUND") {
        setUserNotFound(true);
        setNotFoundEmail(email.trim().toLowerCase());
        toast.error(t.userNotFoundTitle);
        return;
      }

      if (data?.code === "WRONG_PASSWORD") {
        toast.error(t.wrongPassword);
        return;
      }

      if (data?.code === "PASSWORD_NOT_SET") {
        toast.error(t.passwordNotSet);
        return;
      }

      if (data?.code === "RATE_LIMITED") {
        toast.error(t.rateLimited);
        return;
      }

      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Login failed");
        return;
      }

      if (data?.user) {
        localStorage.setItem("ghostboard_auth_user", JSON.stringify(data.user));
      }
      toast.success(t.signInSuccess);
      
      const redirectUri = search.get("redirect_uri");
      if (redirectUri && search.get("client") === "desktop") {
        window.location.href = `${redirectUri}?token=${data.token}&state=${search.get("state")}`;
        return;
      }
      
      router.push(getDestination());
    } catch {
      toast.error(t.wrongPassword);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row selection:bg-white/20 selection:text-white">
      {/* ── Left Showcase Panel ── */}
      <div className="md:w-7/12 bg-gradient-to-b from-[#09090c] via-[#050507] to-black p-8 md:p-14 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08]">
        {/* Subtle monochrome ambient light cones */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/[0.03] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-white/[0.02] rounded-full blur-[140px] pointer-events-none" />

        {/* Blueprint background grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Brand */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <GhostDetectiveLogo size="md" className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="text-lg font-black font-mono tracking-widest text-white group-hover:text-zinc-200 transition-colors">
                GHOSTBOARD
              </span>
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                DETECTIVE CLEARANCE PORTAL
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <LangDropdown />
            <span className="hidden sm:inline-flex text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-white font-mono border border-white/20 uppercase tracking-widest">
              SECURE v2.5
            </span>
          </div>
        </div>

        {/* Hero Quote */}
        <div className="my-12 md:my-auto max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-zinc-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {t.statEngineers}
          </div>
          <h2 className="display-xl text-white mb-6 leading-tight font-display">
            {t.heroQuote} <br />
            <span className="italic text-zinc-300">{t.heroAccent}</span>
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            {t.heroDesc}
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
            <div>
              <div className="text-2xl font-mono font-black text-white">{t.statLatency}</div>
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

      {/* ── Right Auth Form with Biometric Shutter Striped Canvas ── */}
      <MonochromeStripesCanvas
        direction="horizontal"
        density="tight"
        glowIntensity={0.06}
        className="md:w-5/12 p-8 md:p-14 flex flex-col justify-center"
      >
        <div className="max-w-md w-full mx-auto space-y-7 bento-card p-6 sm:p-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-dot !w-1.5 !h-1.5" />
              <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                {t.badge}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-medium text-white tracking-tight text-chrome">
              {t.portalTitle}
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 mt-2">
              {t.portalDesc}
            </p>
          </div>



          {/* USER NOT FOUND ALERT / MODAL PROMPT */}
          {userNotFound && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-2.5 text-amber-300">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="font-bold text-sm text-white">{t.userNotFoundTitle}</div>
                  <p className="text-zinc-300 text-xs mt-1 font-sans">
                    {t.userNotFoundDesc(notFoundEmail)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/auth/signup?email=${encodeURIComponent(notFoundEmail)}`}
                  className="flex-1 btn-resend-primary text-center font-mono text-xs py-2 px-3 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.registerNowBtn}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setUserNotFound(false)}
                  className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl bg-white/5 border border-white/10 transition-colors cursor-pointer"
                >
                  {t.tryAgainBtn}
                </button>
              </div>
            </div>
          )}

          {/* Email + Password form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-2">
                {t.emailLabel}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (userNotFound) setUserNotFound(false);
                }}
                placeholder={t.emailPlaceholder}
                className="input-obsidian font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-2">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="input-obsidian font-mono pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-resend-primary !py-2.5 !rounded-xl font-mono text-xs md:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t.signInBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 space-y-1 font-mono">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              <span>{t.privacyTitle}</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              {t.privacyDesc}
            </p>
          </div>

          <p className="text-center text-xs text-zinc-500 font-mono">
            {t.noAccount}{" "}
            <Link href="/auth/signup" className="text-white hover:underline font-bold">
              {t.signUpLink}
            </Link>
          </p>
        </div>
      </MonochromeStripesCanvas>
    </div>
  );
}
