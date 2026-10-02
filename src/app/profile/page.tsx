"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Mail,
  ShieldCheck,
  Zap,
  CreditCard,
  Clock,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  LogOut,
  Briefcase,
  Code2,
  Sliders,
  Check,
  ExternalLink,
  ChevronRight,
  Calendar,
  Activity,
  Layers,
  Award,
} from "lucide-react";
import {
  ROLE_PRESETS,
  CandidateProfile,
  getStoredCandidateProfile,
} from "@/components/CandidateProfileModal";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { useLocale } from "@/contexts/LocaleContext";
import { getProfileTranslations } from "@/lib/profileI18n";

interface UserAccount {
  id: string;
  email: string;
  name?: string | null;
  plan: "free" | "pro" | "lifetime";
  role?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getProfileTranslations(locale);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("fullstack_react_node");
  const [selectedLevel, setSelectedLevel] = useState<string>("senior");
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [resumeContext, setResumeContext] = useState<string>("");
  const [isSavingContext, setIsSavingContext] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/profile/context")
      .then((res) => res.json())
      .then((data) => {
        if (data.resumeContext) setResumeContext(data.resumeContext);
      })
      .catch(() => {});
  }, []);

  const handleSaveResumeContext = async () => {
    setIsSavingContext(true);
    try {
      const res = await fetch("/api/profile/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeContext }),
      });
      if (res.ok) {
        toast.success(locale === "ua" ? "Контекст збережено!" : "Context saved!");
      } else {
        toast.error("Failed to save context");
      }
    } catch {
      toast.error("Failed to save context");
    } finally {
      setIsSavingContext(false);
    }
  };
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 1. Strict Auth Clearance Check & Data Loading
  useEffect(() => {
    let isMounted = true;

    fetch("/api/sessions/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data?.authenticated && data?.user) {
          setUser(data.user);
          setLoading(false);
        } else {
          router.replace("/auth/login?from=/profile");
        }
      })
      .catch(() => {
        router.replace("/auth/login?from=/profile");
      });

    // Load Candidate Career Profile
    try {
      const stored = getStoredCandidateProfile();
      setCandidateProfile(stored);

      // Match preset if possible
      const matchingPresetKey = Object.keys(ROLE_PRESETS).find(
        (key) => ROLE_PRESETS[key].role === stored.role
      );
      if (matchingPresetKey) {
        setSelectedRoleKey(matchingPresetKey);
      }
    } catch {}

    // Load History Stats
    fetch("/api/sessions/history")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.history && Array.isArray(data.history)) {
          setSessionCount(data.history.length);
          const qCount = data.history.reduce(
            (acc: number, s: any) => acc + (s.questionsCount || (s.items?.length || 0)),
            0
          );
          setTotalQuestions(qCount);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Apply Role Preset
  const handleSelectPreset = (presetKey: string) => {
    setSelectedRoleKey(presetKey);
    const preset = ROLE_PRESETS[presetKey];
    if (!preset) return;

    const updated: CandidateProfile = {
      age: candidateProfile?.age || 25,
      role: preset.role || "Software Engineer",
      techStack: Array.isArray(preset.techStack) ? [...preset.techStack] : [],
      petProjects: Array.isArray(preset.petProjects) ? [...preset.petProjects] : [],
      customContext: preset.customContext || "",
    };
    setCandidateProfile(updated);
  };

  // Save Career Profile
  const handleSaveProfile = () => {
    if (!candidateProfile) return;
    setIsSavingProfile(true);

    try {
      localStorage.setItem("ghostboard_candidate_profile", JSON.stringify(candidateProfile));
      toast.success(
        locale === "ua"
          ? `Спеціалізацію оновлено: ${candidateProfile.role}`
          : `Specialization updated: ${candidateProfile.role}`
      );
    } catch {
      toast.error(locale === "ua" ? "Помилка збереження" : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Manage Billing (Stripe Portal)
  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        router.push("/pricing");
      }
    } catch {
      router.push("/pricing");
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try {
        localStorage.removeItem("ghostboard_session");
      } catch {}
      toast.success(locale === "ua" ? "Вихід з акаунту виконано" : "Successfully logged out");
      router.replace("/auth/login");
    } catch {
      toast.error(locale === "ua" ? "Помилка виходу" : "Logout failed");
      setIsLoggingOut(false);
    }
  };

  // Loading state (Cyber-Noir Clearance Animation)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#040406] flex flex-col items-center justify-center font-mono text-zinc-400 gap-4 selection:bg-[#C8F135]/30">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#C8F135] animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs tracking-widest text-[#C8F135] uppercase font-bold">
            GHOSTBOARD CLEARANCE
          </span>
          <span className="text-[11px] text-zinc-500 tracking-wider">
            {locale === "ua" ? "Завантаження профілю кандидата..." : "Loading candidate profile..."}
          </span>
        </div>
      </div>
    );
  }

  const activePlan = user?.plan || "free";
  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "C";

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 flex flex-col justify-between selection:bg-[#C8F135]/30 font-sans">
      <UnifiedNavbar />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 flex-1 space-y-6">
        {/* ── Sub-header Navigation Strip ── */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <Link
              href="/interview"
              className="p-2 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-400 hover:text-white hover:border-[#C8F135]/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-mono group"
              title="Повернутися до тренажера інтерв'ю"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden xs:inline">
                {locale === "ua" ? "До тренажера" : "Back to Copilot"}
              </span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <GhostDetectiveLogo size="mini" />
                <h1 className="text-base font-black text-white font-mono tracking-wider uppercase flex items-center gap-2">
                  <User className="w-4 h-4 text-[#C8F135]" />
                  {t.title}
                </h1>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                {locale === "ua"
                  ? "Керування обліковим записом, тарифом та спеціалізацією"
                  : "Account clearance, subscription tier & interview persona"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/interview"
              className="btn-lime text-xs font-mono font-bold py-2 px-3.5 rounded-xl shadow-[0_0_20px_rgba(200,241,53,0.25)] flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>{locale === "ua" ? "Запустити Копілот" : "Launch Copilot"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* ── 1. Hero Identity & Account Card ── */}
        <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-b from-[#121318] to-[#0c0d10] border border-white/[0.08] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C8F135]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-4">
              {/* Large Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border-2 border-[#C8F135]/40 flex items-center justify-center text-2xl font-black text-[#C8F135] shadow-[0_0_25px_rgba(200,241,53,0.15)] relative shrink-0 font-mono">
                {userInitial}
                <span
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0c0d10]"
                  title="Active Clearance"
                />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {user?.name || user?.email?.split("@")[0] || t.guestUser}
                  </h2>

                  {/* Plan Badge */}
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                      activePlan === "lifetime"
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                        : activePlan === "pro"
                        ? "bg-[#C8F135]/20 text-[#C8F135] border border-[#C8F135]/40 shadow-[0_0_15px_rgba(200,241,53,0.2)]"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700/80"
                    }`}
                  >
                    {activePlan === "lifetime" ? (
                      <>
                        <Award className="w-3 h-3 text-amber-300" />
                        <span>LIFETIME VIP</span>
                      </>
                    ) : activePlan === "pro" ? (
                      <>
                        <Zap className="w-3 h-3 fill-[#C8F135] text-[#C8F135]" />
                        <span>PRO PASS</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-zinc-400" />
                        <span>FREE TIER</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    {user?.email}
                  </span>
                  <span>•</span>
                  <span className="text-zinc-500">ID: {user?.id?.slice(0, 10)}...</span>
                </div>
              </div>
            </div>

            {/* Account Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-xs font-mono text-zinc-400 hover:text-rose-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isLoggingOut ? t.loggingOut : t.btnLogout}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Subscription Status & Upgrade Hub ── */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#0a0a0e]/80 border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
              <h2 className="text-xs font-bold text-[#C8F135] font-mono tracking-widest uppercase">
                {t.activePlan}
              </h2>
            </div>

            {activePlan === "free" && (
              <span className="text-[11px] font-mono text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                {locale === "ua" ? "15 хв демо-ліміт на сесію" : "15-min trial session cap"}
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white font-mono flex items-center gap-2">
                {activePlan === "lifetime"
                  ? "Ghostboard Founder Lifetime VIP"
                  : activePlan === "pro"
                  ? "Ghostboard Pro Pass"
                  : "Ghostboard Free Trial"}
              </div>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-xl">
                {activePlan === "lifetime"
                  ? t.planLifetimeDesc
                  : activePlan === "pro"
                  ? t.planProDesc
                  : t.planFreeDesc}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activePlan === "free" ? (
                <Link
                  href="/pricing"
                  className="btn-lime text-xs font-mono py-2 px-4 flex items-center gap-1.5 shadow-[0_0_20px_rgba(200,241,53,0.3)] cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>{t.btnUpgrade}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#C8F135]" />
                  <span>{t.btnManageBilling}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Career Specialization & Persona for Copilot ── */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#0a0a0e]/80 border border-white/[0.08] space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
              <h2 className="text-xs font-bold text-[#C8F135] font-mono tracking-widest uppercase">
                {locale === "ua" ? "Спеціалізація та стек для ШІ" : "Copilot Technical Persona"}
              </h2>
            </div>

            <span className="text-xs text-zinc-500 font-mono">
              {locale === "ua" ? "20 готових пресетів" : "20 Stack Presets"}
            </span>
          </div>

          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            {locale === "ua"
              ? "Копілот адаптує генерацію коду, термінологію та архітектурні патерни під обрану роль:"
              : "Copilot dynamically tailors live answers, code snippets, and architecture depth to your active role:"}
          </p>

          {/* Quick Role Preset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(ROLE_PRESETS)
              .slice(0, 8)
              .map(([key, preset]) => {
                const isSelected = selectedRoleKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectPreset(key)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#C8F135]/15 border-[#C8F135] text-white shadow-[0_0_15px_rgba(200,241,53,0.15)]"
                        : "bg-black/40 border-white/5 hover:border-white/20 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-bold truncate text-[11px]">{preset.role || "Developer"}</div>
                    <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                      {preset.techStack ? preset.techStack.slice(0, 2).join(", ") : ""}
                    </div>
                  </button>
                );
              })}
          </div>

          {/* Active Persona Details */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.06] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {locale === "ua" ? "Активна посада:" : "Active Role:"}
                </span>
                <div className="text-sm font-bold text-white font-mono mt-0.5">
                  {candidateProfile?.role || "Software Engineer"}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="btn-lime text-xs font-mono py-1.5 px-3 self-start sm:self-center flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{locale === "ua" ? "Зберегти стек" : "Save Stack"}</span>
              </button>
            </div>

            {/* Tech Stack Pills */}
            <div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1.5">
                {locale === "ua" ? "Технології в контексті:" : "Active Tech Stack:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidateProfile?.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── 3.5. Adaptive Resume Context Injection ── */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#0a0a0e]/80 border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
              <h2 className="text-xs font-bold text-[#C8F135] font-mono tracking-widest uppercase">
                {locale === "ua" ? "Персональний контекст (CV / Резюме)" : "Adaptive Context Engine (CV & Job Spec)"}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSaveResumeContext}
              disabled={isSavingContext}
              className="btn-lime text-xs font-mono py-1.5 px-3 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{locale === "ua" ? "Зберегти резюме" : "Save Resume"}</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            {locale === "ua"
              ? "Вставте текст вашого резюме або вимоги до вакансії. Копілот автоматично інтегрує ваші реальні проєкти та досвід у кожну відповідь."
              : "Paste your resume, past projects, or target job requirements. Copilot will seamlessly weave your real background into every live answer."}
          </p>

          <textarea
            value={resumeContext}
            onChange={(e) => setResumeContext(e.target.value)}
            placeholder={
              locale === "ua"
                ? "Наприклад: 5 років досвіду з Go, Kubernetes та Kafka. Працював над платіжним шлюзом..."
                : "e.g. 5 years building distributed systems in Go, Kafka, and Postgres. Led payment gateway migration..."
            }
            className="w-full h-36 p-3 rounded-2xl bg-zinc-950/70 border border-white/10 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#C8F135]/50 resize-y"
          />
        </div>

        {/* ── 4. Interview Activity Statistics ── */}
        <div className="p-5 sm:p-7 rounded-3xl bg-[#0a0a0e]/80 border border-white/[0.08] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135]" />
              <h2 className="text-xs font-bold text-[#C8F135] font-mono tracking-widest uppercase">
                {t.activityHeading}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.06] space-y-1">
              <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#C8F135]" />
                <span>{t.statSessions}</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {sessionCount}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.06] space-y-1">
              <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.statQuestions}</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {totalQuestions}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/[0.06] space-y-1">
              <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.statSpeed}</span>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                &lt; 1.2s
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-zinc-500 font-mono">
              {locale === "ua"
                ? "Усі сесії та відповіді зберігаються локально та в хмарі"
                : "All sessions are encrypted and synced to your private space"}
            </span>

            <Link
              href="/settings"
              className="text-xs font-mono text-[#C8F135] hover:underline flex items-center gap-1"
            >
              <span>{locale === "ua" ? "Перейти до розширених налаштувань" : "Advanced Audio & System Settings"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </main>

      <UnifiedFooter />
    </div>
  );
}
