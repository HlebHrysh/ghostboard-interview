"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Eye,
  Sparkles,
  Laptop,
  Mic,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

export function ResendMegaMenu() {
  const { locale, t } = useLocale();
  const isUa = locale === "ua";

  const [isOpen, setIsOpen] = useState(false);
  const [targetX, setTargetX] = useState<number>(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const navLabels = {
    features: isUa ? "Можливості" : t.nav.features || "Features",
    arena: t.nav.arena || "Arena",
    download: isUa ? "Завантажити" : "Download",
    pricing: t.nav.pricing || "Pricing",
    guide: t.nav.guide || "Guide",
  };

  const updateTargetX = useCallback(() => {
    const btnEl = buttonRef.current;
    const containerEl = navContainerRef.current;
    if (btnEl && containerEl) {
      const btnRect = btnEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      const btnCenter = btnRect.left + btnRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const diff = btnCenter - containerCenter;

      const maxOffset = Math.max(0, (window.innerWidth - 640) / 2 - 20);
      const clamped = Math.max(-maxOffset, Math.min(maxOffset, diff));
      setTargetX(clamped);
    }
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
    updateTargetX();
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    const handleResize = () => {
      if (isOpen) {
        updateTargetX();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, updateTargetX]);

  return (
    <div
      ref={navContainerRef}
      className="relative flex items-center"
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Nav Links Strip: 1-Click Zero-Friction IA */}
      <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium tracking-wide font-sans">
        {/* Features Dropdown Trigger */}
        <button
          ref={buttonRef}
          type="button"
          onMouseEnter={handleMouseEnter}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors z-10 cursor-pointer ${
            isOpen ? "text-white" : "text-zinc-400 hover:text-white"
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {isOpen && (
            <motion.span
              layoutId="activeNavPill"
              className="absolute inset-0 rounded-full bg-white/[0.1] border border-white/15 -z-10 shadow-[0_0_15px_rgba(255,255,255,0.08)]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span>{navLabels.features}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-white opacity-100" : ""
            }`}
          />
        </button>

        {/* Direct Link: Arena */}
        <Link
          href="/mock-interview"
          onMouseEnter={() => setIsOpen(false)}
          className="px-3.5 py-1.5 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          {navLabels.arena}
        </Link>

        {/* Direct Link: Download */}
        <Link
          href="/download"
          onMouseEnter={() => setIsOpen(false)}
          className="px-3.5 py-1.5 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          {navLabels.download}
        </Link>

        {/* Direct Link: Pricing */}
        <Link
          href="/pricing"
          onMouseEnter={() => setIsOpen(false)}
          className="px-3.5 py-1.5 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          {navLabels.pricing}
        </Link>

        {/* Direct Link: Guide */}
        <Link
          href="/guide"
          onMouseEnter={() => setIsOpen(false)}
          className="px-3.5 py-1.5 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          {navLabels.guide}
        </Link>
      </div>

      {/* Floating Mega Dropdown Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98, x: targetX }}
            animate={{ opacity: 1, y: 0, scale: 1, x: targetX }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{
              x: { type: "spring", stiffness: 360, damping: 32 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
              y: { duration: 0.2 },
            }}
            onMouseEnter={() => {
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50 pointer-events-auto"
          >
            {/* High-Contrast Frosted Glass Card */}
            <div className="relative rounded-[28px] bg-[#0d0d12]/98 backdrop-blur-3xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] p-6 sm:p-7 text-left overflow-hidden w-[640px] max-w-[94vw]">
              {/* Pointing caret arrow */}
              <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-[#0d0d12] border-l border-t border-white/15 z-20 pointer-events-none" />

              {/* Top ambient illumination line */}
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

              {/* Features Content Grid */}
              <div className="grid grid-cols-12 gap-6 items-stretch">
                {/* Left: Essential Features List */}
                <div className="col-span-7 space-y-1.5">
                  {[
                    {
                      title: isUa ? "Live AI Телесуфлер" : "Live Teleprompter",
                      sub: isUa ? "AI-підказки та STAR-відповіді наживо під час розмови" : "Real-time speech cues & STAR format",
                      href: "/interview",
                      icon: Sparkles,
                      color: "text-zinc-200",
                    },
                    {
                      title: "LeetCode Chrome Extension",
                      sub: isUa ? "Миттєве авто-зчитування та розв'язання задач у браузері" : "Instant task extraction & auto-solution",
                      href: "/download#extension",
                      icon: Zap,
                      color: "text-amber-400",
                      badge: "EXTENSION",
                    },
                    {
                      title: isUa ? "Десктоп додаток" : "Desktop Overlay App",
                      sub: isUa ? "100% невидимий оверлей для Zoom, Meet і Teams" : "Invisible overlay to screen sharing",
                      href: "/download",
                      icon: Laptop,
                      color: "text-sky-400",
                    },
                    {
                      title: isUa ? "Мобільний Eyeline" : "Mobile Eyeline",
                      sub: isUa ? "QR-синхронізація під веб-камеру смартфона" : "Natural eye contact via smartphone",
                      href: "/interview?modal=companion",
                      icon: Eye,
                      color: "text-emerald-400",
                    },
                    {
                      title: isUa ? "Звуковий тест" : "Sound Check",
                      sub: isUa ? "Перевірка мікрофона та 16kHz PCM аудіопотоку" : "Test mic & 16kHz audio latency",
                      href: "/interview?modal=soundcheck",
                      icon: Mic,
                      color: "text-amber-400",
                    },
                    {
                      title: isUa ? "ШІ-Профіль та Резюме" : "Candidate Profile & CV",
                      sub: isUa ? "Відповіді AI на базі вашого реального досвіду" : "Tailored answers calibrated to your CV",
                      href: "/profile",
                      icon: ShieldCheck,
                      color: "text-zinc-200",
                    },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-start gap-3 p-2 rounded-xl hover:bg-white/[0.08] transition-all"
                      >
                        <div className="p-2 rounded-lg bg-white/[0.06] border border-white/10 group-hover:border-white/20 shrink-0 mt-0.5 transition-colors">
                          <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-white group-hover:text-white transition-colors flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>{item.title}</span>
                              {item.badge && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase font-bold">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug font-normal truncate">
                            {item.sub}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Right: Focused Live HUD Showcase Card */}
                <div className="col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-[#14151e] border border-white/10 shadow-inner">
                  <div className="space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>SUB-1.2S STACK</span>
                    </div>
                    <h4 className="font-semibold text-sm text-white leading-tight">
                      {isUa ? "Live AI Телесуфлер" : "Live Eyeline HUD"}
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                      {isUa
                        ? "Миттєво структурує відповіді за методом STAR під час реальної розмови."
                        : "Structures winning technical answers into STAR format on the fly."}
                    </p>
                    <div className="space-y-1 text-[11px] text-zinc-400 font-mono pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>350ms Deepgram Nova-3</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span>Gemini 2.5 Flash Reasoning</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                        <span>16kHz PCM AudioWorklet</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10">
                    <Link
                      href="/interview"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                    >
                      <span>{isUa ? "Запустити Copilot" : "Launch Copilot"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
