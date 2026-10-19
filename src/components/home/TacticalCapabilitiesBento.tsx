"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Laptop,
  Smartphone,
  Globe,
  Radio,
  Lock,
  Zap,
  ArrowRight,
  Download,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { GravitationalCard } from "@/components/singularity/GravitationalCard";
import { Reveal } from "./Reveal";
import { useLocale } from "@/contexts/LocaleContext";

export function TacticalCapabilitiesBento() {
  const { locale } = useLocale();
  const isUa = locale === "ua";

  const [activeHotkey, setActiveHotkey] = useState<string>("Space");

  const hotkeys = [
    { key: "Space", action: isUa ? "Freeze Mode" : "Freeze Mode", desc: isUa ? "Заморожує поточну картку, фоновий аудіопотік продовжує слухати" : "Freezes current card while background audio continues listening" },
    { key: "Esc", action: isUa ? "Panic Shield" : "Panic Shield", desc: isUa ? "За 8мс перетворює суфлер на реальну консоль компіляції чи htop" : "Instantly morphs HUD into a real terminal or htop in 8ms" },
    { key: "Q", action: isUa ? "Concise Mode" : "Concise Mode", desc: isUa ? "Швидкий бліц-режим: 3 короткі тези замість розлогого тексту" : "Toggle 3-bullet punchy blitz summary for rapid answers" },
    { key: "C", action: isUa ? "Quick Copy" : "Quick Copy", desc: isUa ? "Копіює код або відповідь у системний буфер обміну без кліку" : "Copies active code or answer directly to clipboard without clicking" },
    { key: "F9", action: isUa ? "Screen OCR" : "Screen OCR", desc: isUa ? "Тихий аналіз задачі LeetCode або архітектурної діаграми" : "Silent screenshot OCR analysis of LeetCode or system design diagrams" },
  ];

  return (
    <section id="capabilities" className="relative w-full py-16 sm:py-24 border-t border-white/[0.08] bg-transparent overflow-hidden scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-zinc-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{isUa ? "АРХІТЕКТУРА ТА СИСТЕМНІ МОЖЛИВОСТІ" : "SYSTEM ARCHITECTURE & CAPABILITIES"}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {isUa ? "Створено для найвищих вимог безпеки" : "Engineered for Complete Tactical Stealth"}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed">
            {isUa
              ? "Від апаратного розділення аудіоканалів до миттєвих гарячих клавіш — кожен компонент Ghostboard спроектовано так, щоб вас не викрили."
              : "From dual-channel loopback capture to zero-storage memory security — built from the ground up for undetectable technical execution."}
          </p>
        </Reveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Card 1: Dual Loopback Audio (Col Span 2) */}
          <GravitationalCard
            tilt={3}
            className="md:col-span-2 p-6 sm:p-8"
            contentClassName="flex flex-col justify-between h-full space-y-6"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-emerald-400">
                  <Radio className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  DUAL-CHANNEL PCM
                </span>
              </div>

              <h3 className="text-lg font-medium text-white mt-4 tracking-tight">
                {isUa ? "Апаратне розділення мікрофона та динаміків" : "Echo-Free Virtual Loopback Matrix"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                {isUa
                  ? "Ghostboard захоплює голос інтерв'юера через системний аудіобуфер Zoom/Meet, а вашу мову — через мікрофон. Відповіді генеруються без луни та взаємних накладок."
                  : "Direct CoreAudio (macOS) and WASAPI (Windows) hooks cleanly separate the interviewer's remote audio from your local microphone with zero cross-talk or acoustic feedback."}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] font-mono text-xs flex items-center justify-between">
              <span className="text-zinc-500">SAMPLING RATE:</span>
              <span className="text-zinc-200">16,000 Hz Linear PCM · Mono 16-bit</span>
            </div>
          </GravitationalCard>

          {/* Card 2: Ephemeral RAM Security */}
          <GravitationalCard
            tilt={3}
            className="md:col-span-1 lg:col-span-2 p-6 sm:p-8"
            contentClassName="flex flex-col justify-between h-full space-y-6"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-200">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/10">
                  ZERO CLOUD STORAGE
                </span>
              </div>

              <h3 className="text-lg font-medium text-white mt-4 tracking-tight">
                {isUa ? "Повна конфіденційність: 0 байтів на диску" : "Ephemeral RAM-Only Architecture"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                {isUa
                  ? "Аудіопотік та розпізнані транскрипти існують виключно в оперативній пам'яті. Жодні записи вашої співбесіди не зберігаються на серверах."
                  : "All voice data and AI prompts reside strictly in volatile RAM. Memory is securely purged upon session termination with zero artifacts left on disk."}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>{isUa ? "Повне видалення при закритті вікна" : "Automatic Session Sanitization"}</span>
            </div>
          </GravitationalCard>

          {/* Card 3: Interactive Hotkey Matrix (Col Span 2) */}
          <GravitationalCard
            tilt={3}
            className="md:col-span-2 p-6 sm:p-8"
            contentClassName="flex flex-col justify-between h-full space-y-6"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-200">
                  <Terminal className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/10">
                  TACTILE SHORTCUTS
                </span>
              </div>

              <h3 className="text-lg font-medium text-white mt-4 tracking-tight">
                {isUa ? "Матриця швидких клавіш" : "Stealth Keyboard Controls"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {isUa ? "Керуйте суфлером непомітно без жодного руху мишкою:" : "Navigate your teleprompter without touching your mouse:"}
              </p>

              {/* Hotkey Switcher */}
              <div className="flex flex-wrap gap-2 mt-4">
                {hotkeys.map((h) => (
                  <button
                    key={h.key}
                    onClick={() => setActiveHotkey(h.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                      activeHotkey === h.key
                        ? "bg-white text-black font-semibold border-white"
                        : "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white"
                    }`}
                  >
                    [{h.key}] {h.action}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.06] font-mono text-xs text-zinc-300">
              <span className="text-emerald-400 mr-2">[{activeHotkey}]:</span>
              {hotkeys.find((h) => h.key === activeHotkey)?.desc}
            </div>
          </GravitationalCard>

          {/* Card 4: Multi-Platform Native Matrix (Col Span 2) */}
          <GravitationalCard
            tilt={3}
            className="md:col-span-2 p-6 sm:p-8"
            contentClassName="flex flex-col justify-between h-full space-y-6"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-200">
                  <Laptop className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/10">
                  CROSS-PLATFORM
                </span>
              </div>

              <h3 className="text-lg font-medium text-white mt-4 tracking-tight">
                {isUa ? "Нативні клієнти для macOS, Windows та Web" : "Native Clients for macOS, Windows & Web"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                {isUa
                  ? "Працює як легкий нативний десктоп-клієнт із апаратним прискоренням або безпосередньо у будь-якому сучасному браузері."
                  : "Zero installation barrier: launch instantly in modern Chromium browsers or install the lightweight native C++ desktop client for hardware exclusion."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/download"
                className="btn-resend-glass !py-2 !px-4 text-xs font-mono flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isUa ? "Завантажити Desktop" : "Download Native App"}</span>
              </Link>
              <Link
                href="/interview"
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>{isUa ? "Запустити у браузері" : "Launch Web Playground"}</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </GravitationalCard>
        </div>
      </div>
    </section>
  );
}
