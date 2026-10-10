"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Zap,
  Eye,
  Activity,
  Lock,
  Sparkles,
  Laptop,
  Mic,
} from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

const MENU_KEYS = ["features", "simulator", "modes", "docs"] as const;
type MenuKey = typeof MENU_KEYS[number] | null;

const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? 35 : -35,
    opacity: 0,
    filter: "blur(4px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      x: { type: "spring", stiffness: 380, damping: 32 },
      opacity: { duration: 0.2, ease: "easeOut" },
      filter: { duration: 0.2, ease: "easeOut" },
    },
  },
  exit: (dir: number) => ({
    x: dir === 0 ? 0 : dir > 0 ? -35 : 35,
    opacity: 0,
    filter: "blur(4px)",
    transition: {
      x: { type: "spring", stiffness: 380, damping: 32 },
      opacity: { duration: 0.16, ease: "easeIn" },
      filter: { duration: 0.16, ease: "easeIn" },
    },
  }),
};

export function ResendMegaMenu() {
  const { locale } = useLocale();
  const isUa = locale === "ua";

  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [direction, setDirection] = useState<number>(0);
  const [targetX, setTargetX] = useState<number>(0);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const navLabels = {
    features: isUa ? "Можливості" : "Features",
    simulator: isUa ? "Симулятори" : "Simulator",
    modes: isUa ? "Платформа" : "Platform",
    docs: isUa ? "Гайди" : "Docs",
    pricing: isUa ? "Тарифи" : "Pricing",
  };

  const updateTargetX = useCallback((key: MenuKey) => {
    if (!key) return;
    const btnEl = buttonRefs.current[key];
    const containerEl = navContainerRef.current;
    if (btnEl && containerEl) {
      const btnRect = btnEl.getBoundingClientRect();
      const containerRect = containerEl.getBoundingClientRect();
      const btnCenter = btnRect.left + btnRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const diff = btnCenter - containerCenter;

      const maxOffset = Math.max(0, (window.innerWidth - 620) / 2 - 20);
      const clamped = Math.max(-maxOffset, Math.min(maxOffset, diff));
      setTargetX(clamped);
    }
  }, []);

  const handleMouseEnter = (key: MenuKey) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (key === null) {
      setActiveMenu(null);
      return;
    }

    if (activeMenu !== null && activeMenu !== key) {
      const currentIndex = MENU_KEYS.indexOf(activeMenu);
      const nextIndex = MENU_KEYS.indexOf(key);
      setDirection(nextIndex > currentIndex ? 1 : -1);
    } else if (activeMenu === null) {
      setDirection(0);
    }

    setActiveMenu(key);
    updateTargetX(key);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
      }
    };
    const handleResize = () => {
      if (activeMenu) {
        updateTargetX(activeMenu);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [activeMenu, updateTargetX]);

  return (
    <div
      ref={navContainerRef}
      className="relative flex items-center"
      onMouseLeave={handleMouseLeave}
    >
      {/* Top Nav Trigger Tabs: Larger, clearer typography */}
      <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium tracking-wide font-sans">
        {MENU_KEYS.map((key) => {
          const isActive = activeMenu === key;
          const label = navLabels[key];
          return (
            <button
              key={key}
              ref={(el) => {
                buttonRefs.current[key] = el;
              }}
              type="button"
              onMouseEnter={() => handleMouseEnter(key)}
              onClick={() => setActiveMenu((prev) => (prev === key ? null : key))}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-colors z-10 cursor-pointer ${
                isActive ? "text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="activeNavPill"
                  className="absolute inset-0 rounded-full bg-white/[0.1] border border-white/15 -z-10 shadow-[0_0_15px_rgba(255,255,255,0.08)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span>{label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                  isActive ? "rotate-180 text-white opacity-100" : ""
                }`}
              />
            </button>
          );
        })}

        <Link
          href="/pricing"
          onMouseEnter={() => handleMouseEnter(null)}
          className="px-3.5 py-1.5 rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          {navLabels.pricing}
        </Link>
      </div>

      {/* Floating Mega Dropdown Container with Smooth Directional Sliding */}
      <AnimatePresence>
        {activeMenu && (
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
            <div className="relative rounded-[28px] bg-[#0d0d12]/98 backdrop-blur-3xl border border-white/15 shadow-[0_30px_80px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] p-6 sm:p-7 text-left overflow-hidden w-[620px] max-w-[92vw]">
              {/* Pointing caret arrow */}
              <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-[#0d0d12] border-l border-t border-white/15 z-20 pointer-events-none" />

              {/* Top ambient illumination line */}
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

              {/* Sliding Content Container */}
              <div className="relative overflow-hidden">
                <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                  <motion.div
                    key={activeMenu}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {/* TAB 1: FEATURES (МОЖЛИВОСТІ) */}
                    {activeMenu === "features" && (
                      <div className="grid grid-cols-12 gap-6 items-stretch">
                        {/* Left: 4 Clear, Essential Links */}
                        <div className="col-span-7 space-y-2">
                          {[
                            {
                              title: isUa ? "Live Телесуфлер" : "Live Teleprompter",
                              sub: isUa ? "AI-підказки та STAR-відповіді наживо" : "Real-time speech cues & STAR format",
                              href: "/interview",
                              icon: Sparkles,
                              color: "text-zinc-200",
                            },
                            {
                              title: isUa ? "Десктоп додаток" : "Desktop App",
                              sub: isUa ? "100% невидимий для Zoom, Meet і Teams" : "Invisible overlay to screen sharing",
                              href: "/download",
                              icon: Laptop,
                              color: "text-sky-400",
                            },
                            {
                              title: isUa ? "Мобільний Eyeline" : "Mobile Eyeline",
                              sub: isUa ? "QR-синхронізація під веб-камеру" : "Natural eye contact via smartphone",
                              href: "/interview?modal=companion",
                              icon: Eye,
                              color: "text-emerald-400",
                            },
                            {
                              title: isUa ? "Звуковий тест" : "Sound Check",
                              sub: isUa ? "Перевірка мікрофона та 16kHz потоку" : "Test mic & 16kHz audio latency",
                              href: "/interview?modal=soundcheck",
                              icon: Mic,
                              color: "text-amber-400",
                            },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.title}
                                href={item.href}
                                onClick={() => setActiveMenu(null)}
                                className="group flex items-start gap-3.5 p-2.5 rounded-2xl hover:bg-white/[0.08] transition-all"
                              >
                                <div className="p-2 rounded-xl bg-white/[0.06] border border-white/10 group-hover:border-white/20 shrink-0 mt-0.5 transition-colors">
                                  <Icon className={`w-4 h-4 ${item.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-white group-hover:text-white transition-colors flex items-center justify-between">
                                    <span>{item.title}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                  <div className="text-xs text-zinc-300 mt-0.5 leading-snug font-normal">
                                    {item.sub}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Right: Focused Live HUD Showcase Card */}
                        <div className="col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-[#14151e] border border-white/10 shadow-inner">
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span>350ms STT</span>
                            </div>
                            <h4 className="font-semibold text-sm text-white leading-tight">
                              {isUa ? "Live AI Телесуфлер" : "Live Eyeline HUD"}
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                              {isUa
                                ? "Миттєво структурує відповіді за методом STAR під час розмови."
                                : "Structures winning technical answers into STAR format on the fly."}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10">
                            <Link
                              href="/interview"
                              onClick={() => setActiveMenu(null)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                            >
                              <span>{isUa ? "Запустити Copilot" : "Launch Copilot"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: SIMULATOR (СИМУЛЯТОРИ) */}
                    {activeMenu === "simulator" && (
                      <div className="grid grid-cols-12 gap-6 items-stretch">
                        {/* Left: 3 Essential Practice Destinations */}
                        <div className="col-span-7 space-y-2.5">
                          {[
                            {
                              title: isUa ? "Голосовий спарринг" : "Voice Sparring",
                              sub: isUa ? "Повноцінне голосове інтерв'ю з AI-тімлідом" : "Realistic voice interview with AI interviewer",
                              href: "/mock-interview",
                              icon: Activity,
                              color: "text-zinc-200",
                            },
                            {
                              title: isUa ? "Арена пісочниця" : "Arena Sandbox",
                              sub: isUa ? "Відпрацювання складних запитань без стресу" : "Practice tough technical questions under timer",
                              href: "/sandbox",
                              icon: Zap,
                              color: "text-amber-400",
                            },
                            {
                              title: isUa ? "Оцінка та аналітика" : "Scorecards & Pace",
                              sub: isUa ? "Аналіз темпу мови, слів-паразитів і STAR" : "Speech pacing, filler words & performance score",
                              href: "/sandbox",
                              icon: ShieldCheck,
                              color: "text-emerald-400",
                            },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.title}
                                href={item.href}
                                onClick={() => setActiveMenu(null)}
                                className="group flex items-start gap-3.5 p-3 rounded-2xl hover:bg-white/[0.08] transition-all"
                              >
                                <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 group-hover:border-white/20 shrink-0 mt-0.5 transition-colors">
                                  <Icon className={`w-4 h-4 ${item.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-white group-hover:text-white transition-colors flex items-center justify-between">
                                    <span>{item.title}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                  <div className="text-xs text-zinc-300 mt-1 leading-snug font-normal">
                                    {item.sub}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Right: Readiness Score Card */}
                        <div className="col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-[#14151e] border border-white/10 shadow-inner">
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/20 text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
                              <span>94% STAR COMPLIANCE</span>
                            </div>
                            <h4 className="font-semibold text-sm text-white leading-tight">
                              {isUa ? "Аналітика готовності" : "Readiness Radar"}
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                              {isUa
                                ? "Відстежуйте темп мови (140 WPM) та позбавляйтеся від слів-паразитів."
                                : "Train optimal speech pace (140 WPM) and eliminate filler words."}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10">
                            <Link
                              href="/mock-interview"
                              onClick={() => setActiveMenu(null)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                            >
                              <span>{isUa ? "Почати тренування" : "Start Sparring"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: PLATFORM (ПЛАТФОРМА) */}
                    {activeMenu === "modes" && (
                      <div className="grid grid-cols-12 gap-6 items-stretch">
                        {/* Left: 3 Core Client & Settings Links */}
                        <div className="col-span-7 space-y-2.5">
                          {[
                            {
                              title: isUa ? "Mac & Windows клієнт" : "Mac & Windows App",
                              sub: isUa ? "Окремий автономний додаток без лагів" : "Native overlay app with zero browser lag",
                              href: "/download",
                              icon: Laptop,
                              color: "text-sky-400",
                            },
                            {
                              title: isUa ? "Профіль та резюме" : "Candidate Profile",
                              sub: isUa ? "AI пам'ятає ваші навички та минулі проекти" : "Context answers tailored to your real CV",
                              href: "/profile",
                              icon: Sparkles,
                              color: "text-zinc-200",
                            },
                            {
                              title: isUa ? "Системні налаштування" : "System Settings",
                              sub: isUa ? "Хоткеї, мікрофони та вибір моделі Gemini" : "Microphones, panic shortcuts & LLM choices",
                              href: "/settings",
                              icon: Lock,
                              color: "text-zinc-300",
                            },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.title}
                                href={item.href}
                                onClick={() => setActiveMenu(null)}
                                className="group flex items-start gap-3.5 p-3 rounded-2xl hover:bg-white/[0.08] transition-all"
                              >
                                <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 group-hover:border-white/20 shrink-0 mt-0.5 transition-colors">
                                  <Icon className={`w-4 h-4 ${item.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-white group-hover:text-white transition-colors flex items-center justify-between">
                                    <span>{item.title}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                  <div className="text-xs text-zinc-300 mt-1 leading-snug font-normal">
                                    {item.sub}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Right: RAM-Only Privacy Card */}
                        <div className="col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-[#14151e] border border-white/10 shadow-inner">
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                              <ShieldCheck className="w-3 h-3" />
                              <span>100% RAM ONLY</span>
                            </div>
                            <h4 className="font-semibold text-sm text-white leading-tight">
                              {isUa ? "Повна приватність" : "Zero Data Retention"}
                            </h4>
                            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                              {isUa
                                ? "Жодні аудіозаписи не зберігаються. Повний захист від витоків."
                                : "No audio is recorded or stored on disk. Full candidate confidentiality."}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10">
                            <Link
                              href="/privacy"
                              onClick={() => setActiveMenu(null)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                            >
                              <span>{isUa ? "Політика безпеки" : "Privacy Policy"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: DOCS (ГАЙДИ) */}
                    {activeMenu === "docs" && (
                      <div className="grid grid-cols-12 gap-6 items-stretch">
                        {/* Left: 3 Essential Guides */}
                        <div className="col-span-7 space-y-2.5">
                          {[
                            {
                              title: isUa ? "Швидкий старт" : "Quickstart Guide",
                              sub: isUa ? "Покрокова інструкція за 2 хвилини" : "Step-by-step setup in under 2 minutes",
                              href: "/guide",
                              icon: Zap,
                              color: "text-amber-400",
                            },
                            {
                              title: isUa ? "Аудіомаршрутизація" : "Audio Routing",
                              sub: isUa ? "Налаштування віртуальних кабелів та Loopback" : "Virtual audio cables & loopback setup",
                              href: "/guide#audio",
                              icon: Mic,
                              color: "text-emerald-400",
                            },
                            {
                              title: isUa ? "STAR методика відповідей" : "STAR Technique",
                              sub: isUa ? "Як відповісти на будь-яке запитання ліда" : "How to master behavioral interview questions",
                              href: "/guide#star",
                              icon: Activity,
                              color: "text-zinc-200",
                            },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.title}
                                href={item.href}
                                onClick={() => setActiveMenu(null)}
                                className="group flex items-start gap-3.5 p-3 rounded-2xl hover:bg-white/[0.08] transition-all"
                              >
                                <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 group-hover:border-white/20 shrink-0 mt-0.5 transition-colors">
                                  <Icon className={`w-4 h-4 ${item.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-sm text-white group-hover:text-white transition-colors flex items-center justify-between">
                                    <span>{item.title}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                  <div className="text-xs text-zinc-300 mt-1 leading-snug font-normal">
                                    {item.sub}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>

                        {/* Right: Low-Latency Tech Highlights */}
                        <div className="col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-[#14151e] border border-white/10 shadow-inner">
                          <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/20 text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
                              <span>SUB-1.2S STACK</span>
                            </div>
                            <h4 className="font-semibold text-sm text-white leading-tight">
                              {isUa ? "Технологічний стек" : "Core Architecture"}
                            </h4>
                            <div className="space-y-1.5 text-xs text-zinc-300 pt-1 font-normal">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                                <span>Deepgram Nova-3 (350ms STT)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                <span>Gemini 2.5 Flash (1.18s Reasoning)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>16kHz PCM AudioWorklet</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10">
                            <Link
                              href="/guide"
                              onClick={() => setActiveMenu(null)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
                            >
                              <span>{isUa ? "Читати документацію" : "Read Full Guide"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
