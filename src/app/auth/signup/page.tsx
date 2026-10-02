"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { ROLE_PRESETS } from "@/components/CandidateProfileModal";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { LangDropdown } from "@/components/ui/LangDropdown";
import { useLocale } from "@/contexts/LocaleContext";
import { getAuthTranslations } from "@/lib/authI18n";

export default function SignupPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getAuthTranslations(locale).signup;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState("python_backend");
  const [selectedLevel, setSelectedLevel] = useState("middle");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFinish = async (provider = "Email") => {
    setLoading(true);

    const userEmail = email.trim() || `user_${Date.now()}@ghostboard.ai`;
    const tempPassword = `Pass_${Date.now()}`;

    // Save personalized candidate profile
    const preset = ROLE_PRESETS[selectedRole];
    if (preset) {
      const customContext = `Candidate Level: ${selectedLevel}. ${preset.role || ""}`;
      const profile = {
        age: 23,
        role: preset.role || "Software Engineer",
        techStack: preset.techStack || [],
        petProjects: [],
        customContext,
      };
      localStorage.setItem("ghostboard_candidate_profile", JSON.stringify(profile));
    }

    const getDestination = () => {
      if (typeof window !== "undefined") {
        const from = new URLSearchParams(window.location.search).get("from");
        if (from && from.startsWith("/")) return from;
      }
      return "/interview";
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          password: tempPassword,
          role: selectedRole,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        localStorage.setItem("ghostboard_auth_user", JSON.stringify(data.user));
        toast.success(t.toastSuccess(selectedRole));
        router.push(getDestination());
      } else {
        // Fallback for demo
        localStorage.setItem("ghostboard_auth_user", JSON.stringify({ email: userEmail, role: selectedRole, plan: "free" }));
        router.push(getDestination());
      }
    } catch {
      localStorage.setItem("ghostboard_auth_user", JSON.stringify({ email: userEmail, role: selectedRole, plan: "free" }));
      router.push(getDestination());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 flex flex-col md:flex-row selection:bg-[#C8F135]/30">
      {/* ── Left Editorial Panel (Luxury Obsidian) ── */}
      <div className="md:w-5/12 bg-gradient-to-b from-[#07070b] via-[#040406] to-[#050508] p-8 md:p-12 flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C8F135]/10 rounded-full blur-[140px] pointer-events-none" />

        <div>
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <GhostDetectiveLogo size="md" className="group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="text-lg font-black font-mono tracking-widest text-white group-hover:text-[#C8F135] transition-colors">
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
            <span className="text-[10px] font-mono tracking-widest uppercase text-[#C8F135] bg-[#C8F135]/10 px-2.5 py-1 rounded-full border border-[#C8F135]/20">
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
                    ? "bg-emerald-500 text-black"
                    : item.active
                    ? "bg-[#C8F135] text-black ring-4 ring-[#C8F135]/20"
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

      {/* ── Right Step Wizard (Luxury Obsidian) ── */}
      <div className="md:w-7/12 p-8 md:p-14 flex flex-col justify-center bg-[#040406]">
        <div className="max-w-xl w-full mx-auto bg-[#08080c]/80 backdrop-blur-2xl p-6 sm:p-9 rounded-3xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          {/* STEP 1: ROLE */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <span className="text-[11px] font-mono text-[#C8F135] uppercase tracking-wider">{t.stepIndicator(1, 3)}</span>
                <h3 className="text-2xl font-black text-white mt-1">{t.roleStepTitle}</h3>
                <p className="text-xs text-zinc-400 mt-1">{t.roleStepDesc}</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {t.roles.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setSelectedRole(r.key)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedRole === r.key
                        ? "bg-[#C8F135]/10 border-[#C8F135] shadow-[0_0_30px_rgba(200,241,53,0.12)]"
                        : "bg-[#0d0d13] border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-2xl">{r.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white font-mono">{r.label}</div>
                        <div className="text-xs text-zinc-400 font-sans mt-0.5">{r.desc}</div>
                      </div>
                    </div>
                    {selectedRole === r.key && <Check className="w-5 h-5 text-[#C8F135]" />}
                  </button>
                ))}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-lime font-mono text-xs md:text-sm py-3 px-6 shadow-[0_0_20px_rgba(200,241,53,0.25)]"
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
                <span className="text-[11px] font-mono text-[#C8F135] uppercase tracking-wider">{t.stepIndicator(2, 3)}</span>
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
                        ? "bg-[#C8F135]/10 border-[#C8F135] shadow-[0_0_30px_rgba(200,241,53,0.12)]"
                        : "bg-[#0d0d13] border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white font-mono">{l.label}</span>
                      {selectedLevel === l.key && <Check className="w-4 h-4 text-[#C8F135]" />}
                    </div>
                    <span className="text-xs text-zinc-400">{l.exp}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn-ghost font-mono text-xs py-3 px-5 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.btnBack}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-lime font-mono text-xs md:text-sm py-3 px-6 shadow-[0_0_20px_rgba(200,241,53,0.25)]"
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
                <span className="text-[11px] font-mono text-[#C8F135] uppercase tracking-wider">{t.stepIndicator(3, 3)}</span>
                <h3 className="text-2xl font-black text-white mt-1">{t.finalStepTitle}</h3>
                <p className="text-xs text-zinc-400 mt-1">{t.finalStepDesc}</p>
              </div>

              {/* Profile summary badge */}
              <div className="p-4 rounded-2xl bg-[#0c0c12] border border-white/[0.08] flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-zinc-400 uppercase">{t.selectedProfileLabel}</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">
                    {t.roles.find((r) => r.key === selectedRole)?.label || selectedRole} · {selectedLevel.toUpperCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-[#C8F135] font-mono hover:underline cursor-pointer"
                >
                  {t.btnChange}
                </button>
              </div>

              {/* 1-Click Google signup */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleFinish("Google")}
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
                <span>{t.btnGoogle}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{t.orEmail}</span>
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
              </div>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full bg-[#0c0c12] border border-white/[0.08] focus:border-[#C8F135]/60 rounded-xl px-4 py-3 text-xs md:text-sm font-mono text-zinc-100 placeholder-zinc-700 outline-none transition-all mb-3 shadow-inner focus:shadow-[0_0_20px_rgba(200,241,53,0.15)]"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleFinish("Email")}
                  className="w-full btn-lime font-mono text-xs md:text-sm py-3.5 shadow-[0_0_25px_rgba(200,241,53,0.3)] hover:shadow-[0_0_35px_rgba(200,241,53,0.5)] transition-all"
                >
                  <span>{t.btnStartTrial}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-ghost font-mono text-xs py-2.5 px-4 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{t.btnBack}</span>
                </button>
                <Link href="/auth/login" className="text-xs text-zinc-400 hover:text-white font-mono py-2.5">
                  {t.haveAccount} <span className="text-[#C8F135] underline">{t.loginLink}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
