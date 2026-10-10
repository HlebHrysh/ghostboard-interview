"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Users,
  Mic,
  DollarSign,
  Laptop,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {}
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") return null;

  const navs = [
    {
      name: "Dashboard",
      path: "/admin",
      icon: BarChart3,
      badge: "LIVE",
    },
    {
      name: "Desktop Fleet",
      path: "/admin/desktop",
      icon: Laptop,
      badge: "FLEET",
    },
    {
      name: "Users",
      path: "/admin/users",
      icon: Users,
    },
    {
      name: "Sessions",
      path: "/admin/sessions",
      icon: Mic,
    },
    {
      name: "Revenue",
      path: "/admin/revenue",
      icon: DollarSign,
    },
    {
      name: "System",
      path: "/admin/system",
      icon: Settings,
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-[#040406] text-zinc-300">
      {/* Brand & Header */}
      <div>
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <GhostDetectiveLogo size="mini" className="group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="text-sm font-black font-mono tracking-widest text-white group-hover:text-zinc-200 transition-colors">
                GHOSTBOARD
              </span>
              <span className="text-[9px] font-mono text-zinc-500 tracking-wider">
                CONTROL VAULT
              </span>
            </div>
            <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-mono border border-white/20 uppercase font-bold">
              v2.5
            </span>
          </Link>

          {/* Mobile close button */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            Management
          </div>
          {navs.map((n) => {
            const isActive = pathname === n.path;
            const Icon = n.icon;
            return (
              <Link
                key={n.name}
                href={n.path}
                onClick={onMobileClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-mono text-xs tracking-wider transition-all group ${
                  isActive
                    ? "bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-black" : "text-zinc-400 group-hover:text-white"}`} />
                  <span>{n.name}</span>
                </div>
                {n.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-black/20 text-black"
                        : "bg-white/10 text-white border border-white/20"
                    }`}
                  >
                    {n.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer & Security Status */}
      <div className="p-4 border-t border-white/[0.08] space-y-3">
        {/* Status Pill */}
        <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400">Vault Secure</span>
          </div>
          <span className="text-[9px] text-zinc-300 uppercase font-bold">256-BIT</span>
        </div>

        {/* Public App Link */}
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-xl font-mono text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </span>
          <span className="text-[10px] text-zinc-600">ghostboard.pro</span>
        </Link>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl font-mono text-xs tracking-wider text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>SIGN OUT</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 border-r border-white/[0.08] h-screen hidden md:flex flex-col fixed top-0 left-0 z-40 bg-[#040406]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop + Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
          />
          <aside className="relative w-72 max-w-[85%] h-full z-10 border-r border-white/10 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
