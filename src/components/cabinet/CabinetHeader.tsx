"use client";

import React from "react";
import Link from "next/link";
import { Mail, Award, Zap, Clock, Sparkles, ArrowRight, LogOut } from "lucide-react";

interface UserAccount {
  id: string;
  email: string;
  name?: string | null;
  plan: "free" | "pro" | "lifetime";
  role?: string | null;
}

interface CabinetHeaderProps {
  user: UserAccount | null;
  locale: string;
  isLoggingOut: boolean;
  onLogout: () => void;
}

export function CabinetHeader({
  user,
  locale,
  isLoggingOut,
  onLogout,
}: CabinetHeaderProps) {
  const activePlan = user?.plan || "free";
  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "C";

  const maskedId = user?.id ? `${user.id.slice(0, 6)}...${user.id.slice(-4)}` : "usr_live";

  return (
    <header className="relative w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.8)]">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-500/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-white/[0.02] blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: Avatar & Identity Block */}
        <div className="flex items-center gap-4 sm:gap-5">
          {/* Avatar with Ambient Glow Ring */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-white/20 via-amber-400/20 to-transparent blur-sm opacity-70" />
            <div className="relative flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl border border-white/20 bg-zinc-900 text-2xl font-bold tracking-tight text-white shadow-inner">
              {userInitial}
              {/* Online indicator */}
              <span
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-zinc-950 bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                title="Active Session"
              />
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white truncate">
                {user?.name || user?.email?.split("@")[0] || "Candidate"}
              </h1>

              {/* Plan Pill Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide transition-all ${
                  activePlan === "lifetime"
                    ? "bg-amber-400/15 text-amber-300 border border-amber-400/35 shadow-[0_0_20px_rgba(251,191,36,0.18)]"
                    : activePlan === "pro"
                    ? "bg-white/10 text-white border border-white/25 shadow-[0_0_15px_rgba(255,255,255,0.08)]"
                    : "bg-zinc-800/80 text-zinc-300 border border-white/10"
                }`}
              >
                {activePlan === "lifetime" ? (
                  <>
                    <Award className="h-3.5 w-3.5 text-amber-300" />
                    <span>LIFETIME VIP</span>
                  </>
                ) : activePlan === "pro" ? (
                  <>
                    <Zap className="h-3.5 w-3.5 fill-white text-white" />
                    <span>PRO PASS</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5 text-zinc-400" />
                    <span>FREE TIER</span>
                  </>
                )}
              </div>
            </div>

            {/* Email & ID Metadata */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Mail className="h-3.5 w-3.5 text-zinc-500" />
                <span className="truncate max-w-[200px] sm:max-w-none">{user?.email}</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="font-mono text-[11px] text-zinc-500">ID: {maskedId}</span>
            </div>
          </div>
        </div>

        {/* Right: Primary Actions */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
          <Link
            href="/interview"
            className="group relative inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-zinc-950 shadow-[0_1px_3px_rgba(0,0,0,0.5),0_0_24px_rgba(255,255,255,0.2)] transition-all hover:bg-zinc-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5 fill-black" />
            <span>{locale === "ua" ? "Запустити Копілот" : "Launch Copilot"}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            title={locale === "ua" ? "Вийти з облікового запису" : "Sign out of account"}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isLoggingOut
                ? locale === "ua"
                  ? "Вихід..."
                  : "Signing out..."
                : locale === "ua"
                ? "Вийти"
                : "Sign Out"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
