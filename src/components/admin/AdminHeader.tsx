"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, RefreshCw, Shield, Menu } from "lucide-react";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";

interface AdminHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onMobileMenuToggle?: () => void;
}

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/admin": { title: "Executive Dashboard", subtitle: "Live metrics, user growth & system overview" },
  "/admin/users": { title: "User Directory", subtitle: "Manage accounts, tier entitlements & access" },
  "/admin/sessions": { title: "Interview Logs", subtitle: "Inspect candidate recordings, duration & scorecards" },
  "/admin/revenue": { title: "Financial Terminal", subtitle: "Monitor Stripe payments, MRR & customer purchases" },
  "/admin/system": { title: "System Diagnostics", subtitle: "Service health, latency pings & security posture" },
};

export function AdminHeader({ onRefresh, isRefreshing, onMobileMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("uk-UA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const meta = ROUTE_TITLES[pathname] || {
    title: "Admin Portal",
    subtitle: "Ghostboard Detective Operations",
  };

  return (
    <header className="border-b border-white/[0.08] bg-[#040406]/80 backdrop-blur-xl sticky top-0 z-30 px-4 md:px-8 py-4 flex items-center justify-between gap-4">
      {/* Mobile Menu Button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 mr-2 md:hidden">
          <GhostDetectiveLogo size="mini" />
        </div>

        <div>
          <h1 className="text-base sm:text-lg font-black font-mono tracking-wider text-white uppercase flex items-center gap-2">
            <span>{meta.title}</span>
            <span className="hidden lg:inline-flex text-[9px] px-2 py-0.5 rounded-full bg-[#C8F135]/15 text-[#C8F135] border border-[#C8F135]/30">
              PROD
            </span>
          </h1>
          <p className="text-[11px] font-mono text-zinc-500 hidden sm:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Action Controls & Clock */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{time || "--:--:--"}</span>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-zinc-300 hover:text-white transition-all active:scale-95 disabled:opacity-50"
            title="Оновити дані"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#C8F135]" : ""}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>
        )}

        {/* View Live App */}
        <Link
          href="/interview"
          target="_blank"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C8F135]/10 hover:bg-[#C8F135]/20 border border-[#C8F135]/30 text-xs font-mono font-bold text-[#C8F135] transition-all hover:shadow-[0_0_15px_rgba(200,241,53,0.2)] active:scale-95"
        >
          <span>Live App</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </header>
  );
}
