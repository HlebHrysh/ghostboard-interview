"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Shield,
  CreditCard,
  Sliders,
  ChevronRight,
  User,
} from "lucide-react";
import {
  ROLE_PRESETS,
  CandidateProfile,
  getStoredCandidateProfile,
} from "@/components/CandidateProfileModal";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { SubpageStripesContainer } from "@/components/ui/SubpageStripesContainer";
import { useLocale } from "@/contexts/LocaleContext";
import { getProfileTranslations } from "@/lib/profileI18n";
import { CabinetHeader } from "@/components/cabinet/CabinetHeader";
import { TelemetryBento } from "@/components/cabinet/TelemetryBento";
import { SubscriptionCard } from "@/components/cabinet/SubscriptionCard";
import { DeviceManager, DeviceSession } from "@/components/cabinet/DeviceManager";
import { SecuritySettings } from "@/components/cabinet/SecuritySettings";
import { SpecializationTab } from "@/components/cabinet/SpecializationTab";

interface UserAccount {
  id: string;
  email: string;
  name?: string | null;
  plan: "free" | "pro" | "lifetime";
  role?: string | null;
}

type TabType = "security" | "billing" | "specialization";

export default function ProfilePage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = getProfileTranslations(locale);

  const [activeTab, setActiveTab] = useState<TabType>("security");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserAccount | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("fullstack_react_node");
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [resumeContext, setResumeContext] = useState<string>("");
  const [isSavingContext, setIsSavingContext] = useState<boolean>(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newProfileTag, setNewProfileTag] = useState("");

  // Connected Devices state
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Load Resume Context
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
        toast.success(t.toastContextSaved);
      } else {
        toast.error("Failed to save context");
      }
    } catch {
      toast.error("Failed to save context");
    } finally {
      setIsSavingContext(false);
    }
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch("/api/sessions/devices");
      if (res.ok) {
        const data = await res.json();
        if (data.sessions && Array.isArray(data.sessions)) {
          setDevices(data.sessions);
        }
      }
    } catch {}
    finally {
      setLoadingDevices(false);
    }
  };

  const handleRevokeDevice = async (sessionId: string) => {
    try {
      const res = await fetch("/api/sessions/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVOKE", sessionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t.revokeSuccess);
        loadDevices();
      } else {
        toast.error(data.error || "Failed to revoke device");
      }
    } catch {
      toast.error("Failed to revoke device");
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      const res = await fetch("/api/sessions/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVOKE_ALL_OTHERS" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          locale === "ua"
            ? "Усі інші сесії успішно деавторизовано"
            : "All other sessions terminated successfully"
        );
        loadDevices();
      } else {
        toast.error(data.error || "Failed to terminate other sessions");
      }
    } catch {
      toast.error("Failed to terminate other sessions");
    }
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(t.passwordChangedSuccess);
        return true;
      } else {
        toast.error(data.error || t.toastPasswordError);
        return false;
      }
    } catch {
      toast.error(t.toastPasswordError);
      return false;
    }
  };

  // Auth Clearance & Data Loading
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

    loadDevices();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Role Preset Selection
  const handleSelectPreset = (presetKey: string) => {
    setSelectedRoleKey(presetKey);
    const preset = ROLE_PRESETS[presetKey];
    if (!preset) return;

    const updated: CandidateProfile = {
      age: candidateProfile?.age || 24,
      level: candidateProfile?.level || "middle",
      role: preset.role || "Software Engineer",
      techStack: Array.isArray(preset.techStack) ? [...preset.techStack] : [],
      petProjects: Array.isArray(preset.petProjects) ? [...preset.petProjects] : [],
      customContext: preset.customContext || "",
      cvContext: candidateProfile?.cvContext || "",
      jobDescription: candidateProfile?.jobDescription || "",
    };
    setCandidateProfile(updated);
  };

  const handleAddProfileTag = () => {
    const clean = newProfileTag.trim();
    if (!clean || !candidateProfile) return;
    if (!candidateProfile.techStack.includes(clean)) {
      setCandidateProfile({
        ...candidateProfile,
        techStack: [...candidateProfile.techStack, clean],
      });
    }
    setNewProfileTag("");
  };

  const handleRemoveProfileTag = (tag: string) => {
    if (!candidateProfile) return;
    setCandidateProfile({
      ...candidateProfile,
      techStack: candidateProfile.techStack.filter((t) => t !== tag),
    });
  };

  const handleSaveProfile = () => {
    if (!candidateProfile) return;
    setIsSavingProfile(true);

    try {
      localStorage.setItem("ghostboard_candidate_profile", JSON.stringify(candidateProfile));
      toast.success(t.toastProfileSaved(candidateProfile.role));
    } catch {
      toast.error(t.toastSaveError);
    } finally {
      setIsSavingProfile(false);
    }
  };

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try {
        localStorage.removeItem("ghostboard_session");
      } catch {}
      toast.success(t.toastLoggedOut);
      router.replace("/auth/login");
    } catch {
      toast.error(t.toastLogoutError);
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans text-zinc-400 gap-4 selection:bg-white/20 selection:text-white">
        <div className="relative flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-semibold tracking-wider text-zinc-200 uppercase">
            Ghostboard Clearance
          </span>
          <span className="text-xs text-zinc-500">
            {t.loadingProfile}
          </span>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    {
      id: "security",
      label: locale === "ua" ? "Безпека та пристрої" : "Identity & Security",
      icon: Shield,
    },
    {
      id: "billing",
      label: locale === "ua" ? "Тариф та білінг" : "Plan & Billing",
      icon: CreditCard,
    },
    {
      id: "specialization",
      label: locale === "ua" ? "Спеціалізація для ШІ" : "AI Specialization",
      icon: Sliders,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-white/20 selection:text-white font-sans antialiased">
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="blueprint" className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <main className="max-w-4xl mx-auto w-full space-y-8">
          {/* ── Sub-header Navigation Strip ── */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <Link
                href="/interview"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white cursor-pointer group"
                title={t.backToCopilotTooltip}
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden xs:inline">{t.backToCopilot}</span>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <GhostDetectiveLogo size="mini" />
                  <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    {t.title}
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {locale === "ua"
                    ? "Керування обліковим записом, тарифом та спеціалізацією"
                    : "Account clearance, subscription tier & interview persona"}
                </p>
              </div>
            </div>

            <Link
              href="/interview"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-zinc-950 shadow-[0_0_24px_rgba(255,255,255,0.18)] hover:bg-zinc-100 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>{t.launchCopilot}</span>
            </Link>
          </div>

          {/* ── Zone 1: Profile & Identity Header ── */}
          <CabinetHeader
            user={user}
            locale={locale}
            isLoggingOut={isLoggingOut}
            onLogout={handleLogout}
          />

          {/* ── Zone 2: Core Telemetry Bento ── */}
          <TelemetryBento
            sessionCount={sessionCount}
            totalQuestions={totalQuestions}
            locale={locale}
          />

          {/* ── Zone 3: Main Workspace with Tabbed Navigation ── */}
          <div className="space-y-6">
            {/* Elegant Tab Pills Bar */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl w-full sm:w-fit">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 rounded-xl bg-white/10 border border-white/15 shadow-[0_2px_12px_rgba(255,255,255,0.06)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panes with Fluid Transitions */}
            <AnimatePresence mode="wait">
              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <DeviceManager
                    devices={devices}
                    loading={loadingDevices}
                    locale={locale}
                    onRefresh={loadDevices}
                    onRevokeDevice={handleRevokeDevice}
                    onRevokeAllOthers={handleRevokeAllOthers}
                  />
                  <SecuritySettings
                    locale={locale}
                    onPasswordChange={handlePasswordChange}
                  />
                </motion.div>
              )}

              {activeTab === "billing" && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <SubscriptionCard
                    plan={user?.plan || "free"}
                    locale={locale}
                    onManageBilling={handleManageBilling}
                  />
                </motion.div>
              )}

              {activeTab === "specialization" && (
                <motion.div
                  key="specialization"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <SpecializationTab
                    candidateProfile={candidateProfile}
                    selectedRoleKey={selectedRoleKey}
                    newProfileTag={newProfileTag}
                    isSavingProfile={isSavingProfile}
                    resumeContext={resumeContext}
                    isSavingContext={isSavingContext}
                    locale={locale}
                    onProfileChange={(p) => setCandidateProfile(p)}
                    onSelectPreset={handleSelectPreset}
                    onNewTagChange={(val) => setNewProfileTag(val)}
                    onAddTag={handleAddProfileTag}
                    onRemoveTag={handleRemoveProfileTag}
                    onSaveProfile={handleSaveProfile}
                    onResumeContextChange={(val) => setResumeContext(val)}
                    onSaveResumeContext={handleSaveResumeContext}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}
