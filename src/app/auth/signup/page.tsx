"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Laptop,
} from "lucide-react";
import { toast } from "sonner";
import { ROLE_PRESETS } from "@/components/CandidateProfileModal";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { LangDropdown } from "@/components/ui/LangDropdown";
import { MonochromeStripesCanvas } from "@/components/ui/MonochromeStripesCanvas";
import { useLocale } from "@/contexts/LocaleContext";
import { getAuthTranslations } from "@/lib/authI18n";

export default function SignupPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getAuthTranslations(locale).signup;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState("python_backend");
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleText, setCustomRoleText] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("middle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailTakenError, setEmailTakenError] = useState(false);
  const [isDesktopClient, setIsDesktopClient] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      if (search.get("client") === "desktop") {
        setIsDesktopClient(true);
      }
      const emailParam = search.get("email");
      if (emailParam) {
        setEmail(emailParam);
        // If an email was passed from login page, step directly to final step
        setStep(3);
      }
      const error = search.get("error");
      const provider = search.get("provider") || "OAuth";
      if (error === "missing_credentials") {
        toast.error(
          locale === "ua"
            ? `Ключі ${provider} OAuth не налаштовані в .env на сервері`
            : `${provider} OAuth credentials not configured in .env`,
          { duration: 6000 }
        );
      } else if (error === "access_denied") {
        toast.info(locale === "ua" ? "Реєстрацію скасовано" : "Registration cancelled");
      }
      const handshake = search.get("handshake");
      if (handshake) {
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((meData) => {
            if (meData?.authenticated && meData.user) {
              fetch("/api/auth/desktop-bind", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ handshakeId: handshake }),
              })
                .then((r) => r.json())
                .then((bindData) => {
                  if (bindData?.success) {
                    toast.success(
                      locale === "ua"
                        ? "Десктоп успішно авторизовано! Можете повернутися до програми."
                        : "Desktop app authorized! You can return to the application."
                    );
                    setTimeout(() => {
                      window.location.href = `ghostboard://auth?token=${bindData?.user?.id || ""}&handshake=${handshake}`;
                    }, 500);
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }, [locale]);

  const handleFinish = async (provider = "Email") => {
    const getDestination = () => {
      if (typeof window !== "undefined") {
        const from = new URLSearchParams(window.location.search).get("from");
        if (from && from.startsWith("/")) return from;
      }
      return "/interview";
    };

    // Save personalized candidate profile
    const effectiveRoleName = isCustomRole && customRoleText.trim()
      ? customRoleText.trim()
      : (ROLE_PRESETS[selectedRole]?.role || "Software Engineer");

    const effectiveTechStack = isCustomRole
      ? (customRoleText.toLowerCase().includes('python') ? (ROLE_PRESETS.python_backend?.techStack || [])
         : customRoleText.toLowerCase().includes('react') || customRoleText.toLowerCase().includes('front') ? (ROLE_PRESETS.frontend?.techStack || [])
         : customRoleText.toLowerCase().includes('go') ? (ROLE_PRESETS.golang_backend?.techStack || [])
         : customRoleText.toLowerCase().includes('node') ? (ROLE_PRESETS.nodejs_backend?.techStack || [])
         : (ROLE_PRESETS.fullstack?.techStack || []))
      : (ROLE_PRESETS[selectedRole]?.techStack || []);

    const customContext = `Candidate Level: ${selectedLevel}. Target Interview Vacancy: ${effectiveRoleName}`;
    const profile = {
      age: selectedLevel === 'junior' ? 21 : selectedLevel === 'middle' ? 24 : selectedLevel === 'senior' ? 28 : 33,
      level: selectedLevel,
      role: effectiveRoleName,
      techStack: effectiveTechStack,
      petProjects: [],
      customContext,
    };
    try {
      localStorage.setItem("ghostboard_candidate_profile", JSON.stringify(profile));
    } catch {}

    if (provider === "Google" || provider === "GitHub") {
      const provLower = provider.toLowerCase();
      const search = new URLSearchParams(window.location.search);
      const client = search.get("client");
      const redirectUri = search.get("redirect_uri");
      const stateParam = search.get("state");

      const oauthUrl = new URL(`/api/auth/oauth/${provLower}`, window.location.origin);
      oauthUrl.searchParams.set("from", getDestination());
      oauthUrl.searchParams.set("role", selectedRole);
      if (client === "desktop") {
        oauthUrl.searchParams.set("client", "desktop");
        if (redirectUri) oauthUrl.searchParams.set("redirect_uri", redirectUri);
        if (stateParam) oauthUrl.searchParams.set("state", stateParam);
      }
      window.location.href = oauthUrl.toString();
      return;
    }

    // Email registration validation
    const userEmail = email.trim().toLowerCase();
    if (!userEmail || !userEmail.includes("@")) {
      toast.error(t.emailPlaceholder);
      return;
    }

    if (password.length < 8) {
      toast.error(t.passwordMinLength);
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t.passwordsMismatch);
      return;
    }

    setLoading(true);
    setEmailTakenError(false);

    try {
      const search = new URLSearchParams(window.location.search);
      const client = search.get("client") === "desktop" ? "desktop" : "web";

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          password,
          role: selectedRole,
          client,
        }),
      });
      const data = await res.json();

      if (res.status === 409 || data?.code === "EMAIL_TAKEN") {
        setEmailTakenError(true);
        toast.error(t.emailTaken);
        return;
      }

      if (!res.ok || !data?.success) {
        toast.error(data?.error || "Registration failed");
        return;
      }

      if (data?.user) {
        localStorage.setItem("ghostboard_auth_user", JSON.stringify(data.user));
      }
      toast.success(t.toastSuccess(selectedRole));

      const handshake = search.get("handshake");
      if (handshake && data?.token) {
        await fetch("/api/auth/desktop-bind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handshakeId: handshake, token: data.token }),
        }).catch(() => {});
        toast.success(
          locale === "ua"
            ? "Десктоп успішно авторизовано! Можете повернутися до застосунку."
            : "Desktop authorized! You can return to the app."
        );
        setTimeout(() => {
          window.location.href = `ghostboard://auth?token=${data.token}&handshake=${handshake}`;
        }, 500);
      }

      const redirectUri = search.get("redirect_uri");
      if (redirectUri && client === "desktop" && data?.token) {
        window.location.href = `${redirectUri}?token=${data.token}&state=${search.get("state")}`;
        return;
      }

      router.push(getDestination());
    } catch {
      toast.error("Registration error, please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row selection:bg-white/20 selection:text-white">
      {/* ── Left Editorial Panel (Luxury Obsidian) ── */}
      <div className="md:w-5/12 bg-gradient-to-b from-[#07070b] via-black to-[#050508] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.02] rounded-full blur-[140px] pointer-events-none" />

        <div>
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <GhostDetectiveLogo size="md" className="group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="text-lg font-black font-mono tracking-widest text-white group-hover:text-zinc-300 transition-colors">
                  GHOSTBOARD
                </span>
                <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                  {t.subHeader}
                </span>
              </div>
            </Link>
            <LangDropdown />
          </div>

          <div className="mt-8">
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/20">
              {t.badge}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-4 font-display">
              {t.title}
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-2 leading-relaxed">
              {t.desc}
            </p>
          </div>
        </div>

        {/* Step Progress indicators */}
        <div className="my-8 space-y-4">
          {[
            { s: 1, title: t.step1Title, done: step > 1, active: step === 1 },
            { s: 2, title: t.step2Title, done: step > 2, active: step === 2 },
            { s: 3, title: t.step3Title, done: false, active: step === 3 },
          ].map((item) => (
            <div key={item.s} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                  item.done
                    ? "bg-white text-black"
                    : item.active
                    ? "bg-white text-black ring-4 ring-white/20"
                    : "bg-zinc-800 text-zinc-500 border border-white/5"
                }`}
              >
                {item.done ? <Check className="w-3.5 h-3.5" /> : item.s}
              </div>
              <span className={`text-xs font-mono ${item.active ? "text-white font-bold" : "text-zinc-500"}`}>
                {item.title}
              </span>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-zinc-600 font-mono">
          {t.includedNotice}
        </div>
      </div>

      {/* ── Right Step Wizard with Biometric Shutter Striped Canvas ── */}
      <MonochromeStripesCanvas
        direction="horizontal"
        density="tight"
        glowIntensity={0.06}
        className="md:w-7/12 p-8 md:p-14 flex flex-col justify-center"
      >
        <div className="max-w-xl w-full mx-auto bento-card p-6 sm:p-9 bg-[#08080c]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          {/* Desktop App Auth Indicator Banner */}
          {isDesktopClient && (
            <div className="mb-6 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono space-y-1 text-cyan-300">
              <div className="flex items-center gap-2 font-bold text-white">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>{locale === 'ua' ? 'Реєстрація для Ghostboard Desktop' : 'Sign Up for Ghostboard Desktop'}</span>
              </div>
              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                {locale === 'ua'
                  ? 'Після створення акаунта токен автоматично передасться в десктопний додаток.'
                  : 'After creating an account, your session token will automatically transfer to the desktop app.'}
              </p>
            </div>
          )}

          {/* STEP 1: ROLE */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div>
                <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider">{t.stepIndicator(1, 3)}</span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1">{t.roleStepTitle}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{t.roleStepDesc}</p>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {t.roles.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        setIsCustomRole(false);
                        setSelectedRole(r.key);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        !isCustomRole && selectedRole === r.key
                          ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.08)] ring-1 ring-white/20"
                          : "bg-[#0d0d13] border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{r.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white font-mono truncate">{r.label}</div>
                          <div className="text-[10px] text-zinc-400 font-sans truncate">{r.desc}</div>
                        </div>
                      </div>
                      {!isCustomRole && selectedRole === r.key && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  ))}
                </div>

                {/* Custom Role / Job Title Card */}
                <div
                  onClick={() => setIsCustomRole(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 ${
                    isCustomRole
                      ? "bg-white/10 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.08)] ring-1 ring-white/20"
                      : "bg-[#0d0d13] border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl shrink-0">🎯</span>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">
                          {locale === "ua" ? "Власна посада / Вакансія" : "Custom Target Role / Vacancy"}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-sans">
                          {locale === "ua"
                            ? "Введіть точну назву вакансії для персоналізованого контексту AI"
                            : "Enter target job title for custom AI context"}
                        </div>
                      </div>
                    </div>
                    {isCustomRole && <Check className="w-4 h-4 text-white shrink-0" />}
                  </div>

                  {isCustomRole && (
                    <div className="mt-1 w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        autoFocus
                        value={customRoleText}
                        onChange={(e) => setCustomRoleText(e.target.value)}
                        placeholder={
                          locale === "ua"
                            ? "Наприклад: Senior Golang Developer у FinTech або Lead AI Engineer"
                            : "e.g. Senior Golang Developer at FinTech or Lead AI Engineer"
                        }
                        className="w-full bg-[#12121a] border border-white/15 focus:border-white/40 focus:ring-1 focus:ring-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none font-sans"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isCustomRole && !customRoleText.trim()) {
                      toast.error(
                        locale === "ua"
                          ? "Будь ласка, введіть назву вакансії або оберіть зі списку"
                          : "Please enter your target vacancy title or choose a preset"
                      );
                      return;
                    }
                    setStep(2);
                  }}
                  className="btn-resend-primary font-mono text-xs md:text-sm !py-2.5 !px-6"
                >
                  <span>{t.btnNextExp}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: LEVEL */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider">{t.stepIndicator(2, 3)}</span>
                <h3 className="text-2xl font-black text-white mt-1">{t.levelStepTitle}</h3>
                <p className="text-xs text-zinc-400 mt-1">{t.levelStepDesc}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {t.levels.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setSelectedLevel(l.key)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedLevel === l.key
                        ? "bg-white/10 border-white/40 shadow-[0_0_25px_rgba(255,255,255,0.08)]"
                        : "bg-[#0d0d13] border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white font-mono">{l.label}</span>
                      {selectedLevel === l.key && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-xs text-zinc-400">{l.exp}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-resend-glass font-mono text-xs !py-2.5 !px-5 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.btnBack}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-resend-primary font-mono text-xs md:text-sm !py-2.5 !px-6"
                >
                  <span>{t.btnNextStart}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ACCOUNT & START */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <span className="text-[11px] font-mono text-zinc-300 uppercase tracking-wider">{t.stepIndicator(3, 3)}</span>
                <h3 className="text-2xl font-black text-white mt-1">{t.finalStepTitle}</h3>
                <p className="text-xs text-zinc-400 mt-1">{t.finalStepDesc}</p>
              </div>

              {/* Profile summary badge */}
              <div className="p-4 rounded-2xl bg-[#0c0c12] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-zinc-400 uppercase">{t.selectedProfileLabel}</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {isCustomRole && customRoleText.trim()
                      ? customRoleText.trim()
                      : (t.roles.find((r) => r.key === selectedRole)?.label || selectedRole)} · {selectedLevel.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-zinc-300 hover:text-white font-mono hover:underline cursor-pointer"
                >
                  {t.btnChange}
                </button>
              </div>

              {/* 1-Click OAuth Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFinish("Google")}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.98] transition-all cursor-pointer font-medium text-xs md:text-sm text-white"
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
                  <span>{t.btnGoogle}</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFinish("GitHub")}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/25 active:scale-[0.98] transition-all cursor-pointer font-medium text-xs md:text-sm text-white"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                  <span>{t.btnGithub}</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{t.orEmail}</span>
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
              </div>

              {emailTakenError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs font-mono text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{t.emailTaken}</span>
                  </div>
                  <Link href={`/auth/login?email=${encodeURIComponent(email)}`} className="text-white underline font-bold hover:text-zinc-300">
                    {t.loginLink}
                  </Link>
                </div>
              )}

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailTakenError) setEmailTakenError(false);
                    }}
                    placeholder={t.emailPlaceholder}
                    className="input-obsidian font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">{t.passwordLabel}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.passwordPlaceholder}
                      className="input-obsidian font-mono pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">{t.confirmPasswordLabel}</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.confirmPasswordPlaceholder}
                    className="input-obsidian font-mono"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFinish("Email")}
                  className="w-full btn-resend-primary font-mono text-xs md:text-sm py-3 flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-[0_0_25px_rgba(255,255,255,0.15)]"
                >
                  <span>{t.btnStartTrial}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-resend-glass font-mono text-xs py-2.5 px-4 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.btnBack}</span>
                </button>
                <Link href="/auth/login" className="text-xs text-zinc-400 hover:text-white font-mono py-2.5">
                  {t.haveAccount} <span className="text-white underline">{t.loginLink}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </MonochromeStripesCanvas>
    </div>
  );
}
