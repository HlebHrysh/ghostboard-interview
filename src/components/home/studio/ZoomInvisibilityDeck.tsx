"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Video,
  Monitor,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Layers,
  Sparkles,
  Sliders,
  Lock,
} from "lucide-react";

interface ZoomInvisibilityDeckProps {
  isUa: boolean;
  soundEnabled: boolean;
  playClickSound: () => void;
  playLockSound: () => void;
}

export function ZoomInvisibilityDeck({
  isUa,
  soundEnabled: _soundEnabled,
  playClickSound,
  playLockSound,
}: ZoomInvisibilityDeckProps) {
  // View mode: "candidate" (your screen), "interviewer" (Zoom feed), "split" (interactive divider)
  const [viewMode, setViewMode] = useState<"split" | "candidate" | "interviewer">("split");
  const [splitPos, setSplitPos] = useState<number>(50);
  const [isSnapshotting, setIsSnapshotting] = useState<boolean>(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState<boolean>(false);
  const [isPanicDisguised, setIsPanicDisguised] = useState<boolean>(false);

  const triggerSnapshot = () => {
    setIsSnapshotting(true);
    playClickSound();

    setTimeout(() => {
      setIsSnapshotting(false);
      setShowSnapshotModal(true);
      playLockSound();
    }, 450);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Hook */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isUa ? "Апаратний захист від захоплення екрана" : "Hardware Buffer Exclusion · Zero Zoom Leak"}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-white mt-1">
            {isUa ? "«Пошарте весь екран, будь ласка» — Спокій замість паніки" : "“Can You Share Your Whole Desktop?” — Zero Panic"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">
            {isUa
              ? "Ghostboard викликає SetWindowDisplayAffinity на Windows та NSWindowSharingNone на macOS. Вікно суфлера апаратно вирізається графічним сервером ОС — у Zoom транслюється лише чистий робочий стіл."
              : "Ghostboard invokes OS kernel buffer exclusion. The prompter is physically clipped by the OS window server — Zoom and Teams capture only your clean workspace."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Snapshot test button */}
          <button
            onClick={triggerSnapshot}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono hover:bg-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isUa ? "Тест знімка Zoom" : "Test Zoom Snapshot"}</span>
          </button>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              onClick={() => {
                setViewMode("split");
                playClickSound();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                viewMode === "split" ? "bg-white text-black font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              {isUa ? "Спліт" : "Split"}
            </button>
            <button
              onClick={() => {
                setViewMode("interviewer");
                playClickSound();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "interviewer" ? "bg-white text-black font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isUa ? "У Zoom" : "Zoom Feed"}</span>
            </button>
            <button
              onClick={() => {
                setViewMode("candidate");
                playClickSound();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "candidate" ? "bg-white text-black font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{isUa ? "Ваш екран" : "Retina"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
        {/* Screen Share Interactive Arena */}
        <div
          onMouseMove={(e) => {
            if (viewMode !== "split") return;
            const r = e.currentTarget.getBoundingClientRect();
            const pct = Math.max(10, Math.min(90, ((e.clientX - r.left) / r.width) * 100));
            setSplitPos(pct);
          }}
          className="relative min-h-[440px] rounded-2xl bg-[#090d16] border border-white/10 overflow-hidden select-none cursor-ew-resize flex flex-col justify-between shadow-2xl"
        >
          {/* Snapshot Shutter Flash */}
          {isSnapshotting && (
            <div className="absolute inset-0 bg-white/95 animate-out fade-out duration-300 pointer-events-none z-50" />
          )}

          {/* 1. Underlying Clean IDE Workspace (Visible to Everyone) */}
          <div className="absolute inset-0 p-5 font-mono text-xs leading-relaxed bg-[#0d1117] text-zinc-300 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.08] text-zinc-500 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 text-zinc-200 font-semibold">distributed_rate_limiter.rs — VS Code</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Zoom Screenshare Active: 1080p @ 60fps</span>
              </span>
            </div>

            <div className="space-y-1 text-zinc-400 text-[11px]">
              <div><span className="text-purple-400">pub struct</span> <span className="text-yellow-200">SlidingWindowRateLimiter</span> &lt;R: RedisConnection&gt; &#123;</div>
              <div className="pl-4">client: Arc&lt;R&gt;,</div>
              <div className="pl-4">window_size_seconds: <span className="text-amber-300">60</span>,</div>
              <div className="pl-4">max_requests: <span className="text-amber-300">100_000</span>,</div>
              <div>&#125;</div>
              <div className="pt-2"><span className="text-purple-400">impl</span>&lt;R: RedisConnection&gt; <span className="text-yellow-200">SlidingWindowRateLimiter</span>&lt;R&gt; &#123;</div>
              <div className="pl-4"><span className="text-blue-400">pub async fn</span> <span className="text-green-300">check_rate_limit</span>(&self, tenant_id: &<span className="text-blue-300">str</span>) -&gt; Result&lt;bool, Error&gt; &#123;</div>
              <div className="pl-8 text-zinc-500">{"// Atomic sliding window Lua token check on Redis cluster"}</div>
              <div className="pl-8">let current_timestamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs();</div>
              <div className="pl-8">let sub_key = format!("tenant:&#123;&#125;:shard_&#123;&#125;", tenant_id, tenant_id.len() % 16);</div>
              <div className="pl-8">self.client.eval_lua(&ATOMIC_SLIDING_SCRIPT, &[&sub_key], &[current_timestamp]).await</div>
              <div className="pl-4">&#125;</div>
              <div>&#125;</div>
            </div>
          </div>

          {/* 2. Floating Ghostboard Teleprompter HUD (ONLY visible on Candidate side) */}
          {(viewMode === "candidate" || viewMode === "split") && !isPanicDisguised && (
            <div
              className="absolute top-12 left-1/2 -translate-x-1/2 w-[92%] max-w-lg p-4 rounded-xl bg-black/90 border border-emerald-500/50 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-none transition-all z-20"
              style={{
                clipPath:
                  viewMode === "split"
                    ? `polygon(${splitPos}% 0, 100% 0, 100% 100%, ${splitPos}% 100%)`
                    : undefined,
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">GHOSTBOARD HUD [HARDWARE EXCLUDED]</span>
                </div>
                <span className="text-[10px] text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded font-bold">
                  0% ZOOM LEAK
                </span>
              </div>

              <div className="mt-2 text-xs font-mono text-zinc-200 space-y-1.5">
                <p className="text-emerald-300 font-semibold text-xs">🎯 100k req/s System Design Hook:</p>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  "Blend previous window with current window: previous_count * (1 - t/window) + current_count. Avoid hotkey bottlenecks by sharding tenant counters across 16 sub-keys."
                </p>
              </div>
            </div>
          )}

          {/* 3. Split Divider Line with Interactive Drag Pill */}
          {viewMode === "split" && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_20px_rgba(255,255,255,1)] pointer-events-none z-30"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-white text-black font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap shadow-2xl flex items-center gap-1.5">
                <span>← ZOOM FEED (100% ЧИСТО)</span>
                <span className="text-zinc-400">|</span>
                <span>ВАШ ЕКРАН (HUD) →</span>
              </div>
            </div>
          )}

          {/* Bottom Status Ticker */}
          <div className="relative mt-auto p-3 bg-black/80 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-zinc-400 z-10">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isUa ? "Статус захоплення: Апаратно ізольовано в OS WindowServer" : "Capture Buffer: Hardware Isolated in OS WindowServer"}</span>
            </span>
            <span className="text-emerald-400 font-bold">
              {viewMode === "interviewer" ? "ZOOM: 0 PIXELS VISIBLE" : "PROTECTED"}
            </span>
          </div>
        </div>

        {/* Right Telemetry Panel */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Card 1: Kernel Affinities */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <span className="text-xs font-mono text-zinc-400 block pb-2 border-b border-white/[0.06] uppercase">
              {isUa ? "Апаратні протоколи ОС" : "OS Kernel Exclusions"}
            </span>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-zinc-500 block text-[10px]">WINDOWS KERNEL</span>
                <span className="text-emerald-400 font-semibold block mt-0.5 text-[11px]">
                  SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)
                </span>
                <span className="text-zinc-400 text-[10px] mt-1 block">
                  {isUa ? "Графічний драйвер DWM вирізає вікно ще до рендеру кадру" : "DWM graphics pipeline drops window before frame capture"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-zinc-500 block text-[10px]">MACOS QUARTZ / WINDOWSERVER</span>
                <span className="text-emerald-400 font-semibold block mt-0.5 text-[11px]">
                  NSWindowSharingNone
                </span>
                <span className="text-zinc-400 text-[10px] mt-1 block">
                  {isUa ? "WindowServer забороняє будь-якому сторонньому софту бачити пікселі" : "Quartz compositor excludes pixels from all capture APIs"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Emergency Disguise Button */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 border-b border-white/[0.06]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-zinc-300" />
                <span>{isUa ? "ЕКСТРЕНЕ МАСКУВАННЯ" : "EMERGENCY DISGUISE"}</span>
              </span>
              <span className="text-zinc-500">[ESC]</span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {isUa
                ? "Якщо співрозмовник попросить: «Згорніть вікна або покажіть свій термінал» — одне натискання ESC миттєво замінює суфлер на реальну компіляцію Rust."
                : "If asked to minimize or show your shell — one tap on ESC instantly morphs into genuine build output."}
            </p>

            <button
              onClick={() => {
                setIsPanicDisguised(!isPanicDisguised);
                playClickSound();
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 border ${
                isPanicDisguised
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                  : "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isPanicDisguised ? (isUa ? "ВІДНОВИТИ СУФЛЕР" : "RESTORE HUD") : (isUa ? "УВІМКНУТИ ПАНІКУ [ESC]" : "TRIGGER PANIC [ESC]")}</span>
            </button>
          </div>

          {/* Card 3: Snapshot Proof Confirmation */}
          {showSnapshotModal && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {isUa
                    ? "Знімок перевірено: у буфері захоплення Zoom суфлер 100% відсутній."
                    : "Snapshot verified: 0% leakage in Zoom capture buffer."}
                </span>
              </div>
              <button
                onClick={() => setShowSnapshotModal(false)}
                className="text-zinc-400 hover:text-white underline cursor-pointer text-[11px]"
              >
                OK
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
