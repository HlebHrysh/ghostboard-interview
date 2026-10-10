"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Eye, EyeOff, Sparkles, Check } from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";

interface Props {
  t: HomeTranslations["stealthLens"];
}

export function StealthInkLens({ t }: Props) {
  const [view, setView] = useState<"interviewer" | "candidate">("candidate");

  return (
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-black overflow-hidden">
      {/* Subtle monochromatic titanium ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-white/[0.02] rounded-full blur-[160px] pointer-events-none" />

      {/* Blueprint architectural grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(circle 600px at center, black, transparent)",
          WebkitMaskImage: "radial-gradient(circle 600px at center, black, transparent)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="shimmer-pill inline-flex items-center px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-2" />
            {t.badge}
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {t.title}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed">
            {t.desc}
          </p>

          {/* Interactive Switcher */}
          <div className="inline-flex p-1 mt-6 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-xl gap-1">
            <button
              type="button"
              onClick={() => setView("interviewer")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                view === "interviewer"
                  ? "bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
              <span>{t.tabInterviewer}</span>
            </button>
            <button
              type="button"
              onClick={() => setView("candidate")}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-medium transition-all cursor-pointer ${
                view === "candidate"
                  ? "bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{t.tabCandidate}</span>
            </button>
          </div>
        </div>

        {/* The Screen Mockup Frame */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-black border border-white/[0.08] shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden">
          {/* OS Window Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-[#08080a] border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
              <span className="ml-3 text-[11px] font-mono text-zinc-500 hidden sm:inline">
                VS Code — server_websocket.py
              </span>
            </div>

            <div className="flex items-center gap-2">
              {view === "interviewer" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-zinc-300 text-[10px] font-mono">
                  <ShieldCheck className="w-3 h-3 text-white" />
                  <span>ZOOM CAPTURE: CLEAN</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>GHOSTBOARD: EXCLUDED_FROM_CAPTURE</span>
                </span>
              )}
            </div>
          </div>

          {/* Screen Content */}
          <div className="p-4 sm:p-8 font-mono text-xs sm:text-sm text-zinc-300 relative min-h-[420px] bg-black">
            {/* Background IDE Code that both see */}
            <div className="space-y-1.5 select-none opacity-40 filter blur-[0.3px]">
              <div className="text-zinc-600"># System Architecture: Distributed WebSocket Hub</div>
              <div><span className="text-zinc-400">from</span> fastapi <span className="text-zinc-400">import</span> FastAPI, WebSocket</div>
              <div><span className="text-zinc-400">import</span> redis.asyncio <span className="text-zinc-400">as</span> aioredis</div>
              <div className="h-2" />
              <div>app = FastAPI()</div>
              <div>redis_pool = aioredis.from_url(<span className="text-zinc-400">&quot;redis://cluster-hub:6379&quot;</span>)</div>
              <div className="h-2" />
              <div><span className="text-zinc-400">@app.websocket</span>(<span className="text-zinc-400">&quot;/ws/candidate/:id&quot;</span>)</div>
              <div><span className="text-zinc-300">async def</span> <span className="text-white">websocket_endpoint</span>(ws: WebSocket):</div>
              <div className="pl-6"><span className="text-zinc-400">await</span> ws.accept()</div>
              <div className="pl-6 text-zinc-500"># Handle multi-node subscription broadcast without state loss</div>
              <div className="pl-6"><span className="text-zinc-400">pass</span></div>
            </div>

            {/* Overlaid Ghostboard HUD — Visible ONLY in Candidate View */}
            <AnimatePresence mode="wait">
              {view === "candidate" ? (
                <motion.div
                  key="candidate-overlay"
                  initial={{ opacity: 0, scale: 0.97, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-6 left-1/2 -translate-x-1/2 w-[94%] sm:w-[560px] p-5 rounded-2xl bg-[#09090c]/95 backdrop-blur-3xl border border-white/[0.15] shadow-[0_25px_60px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.2),0_0_35px_rgba(255,255,255,0.06)] space-y-3.5 z-20"
                >
                  {/* HUD Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2">
                      <span className="status-dot" />
                      <span className="text-[10px] font-mono font-medium text-zinc-300 tracking-wider uppercase">
                        STEALTH HUD · EYELINE TELEPROMPTER
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08]">
                      LATENCY: 1.18s
                    </span>
                  </div>

                  {/* Question */}
                  <div>
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">
                      🎙 Interviewer Question Detected:
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                      «{t.sampleQuestion}»
                    </div>
                  </div>

                  {/* Hook */}
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.12]">
                    <span className="text-[10px] font-mono font-bold text-zinc-200 uppercase block mb-0.5">
                      FIRST SENTENCE HOOK:
                    </span>
                    <p className="text-xs text-zinc-100 font-sans italic">
                      «{t.sampleHook}»
                    </p>
                  </div>

                  {/* Architecture Pillars */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase block">
                      KEY ARCHITECTURE PILLARS:
                    </span>
                    <ul className="space-y-1 text-xs text-zinc-300 font-sans">
                      {t.samplePoints.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Native Crib */}
                  <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.12] text-[11px] font-mono text-zinc-200">
                    <span className="font-bold text-white mr-1.5">СУТЬ:</span>
                    {t.sampleCrib}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="interviewer-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                >
                  <div className="p-5 rounded-2xl bg-[#08080a] border border-white/10 shadow-2xl max-w-md text-center space-y-2.5 pointer-events-auto">
                    <ShieldCheck className="w-8 h-8 text-white mx-auto" />
                    <div className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      {t.interviewerNotice}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                      Neither Zoom, nor Google Meet, nor screen recording software captures the teleprompter window. Your candidate performance looks 100% natural and unassisted.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom notice strip */}
          <div className="px-6 py-3 bg-[#050505] border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>
              {view === "candidate" ? t.candidateNotice : t.interviewerNotice}
            </span>
            <span className="text-[10px] text-zinc-600 hidden sm:inline">
              Win32 WDA_EXCLUDEFROMCAPTURE | macOS NSWindowSharingNone
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
