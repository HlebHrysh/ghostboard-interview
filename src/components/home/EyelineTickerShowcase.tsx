"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Video,
  Eye,
  Crosshair,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Gauge,
  Sliders,
} from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";

interface Props {
  t?: HomeTranslations["tickerDemo"];
}

interface TopicItem {
  id: string;
  pill: string;
  question: string;
  hook: string;
  points: string;
  crib: string;
}

export function EyelineTickerShowcase({ t }: Props) {
  // Topic selection
  const [selectedTopic, setSelectedTopic] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [tickerSpeed, setTickerSpeed] = useState<"normal" | "fast" | "turbo">("normal");

  // Eye-contact proof toggle: "second-monitor" vs "eyeline"
  const [eyeProofMode, setEyeProofMode] = useState<"second-monitor" | "eyeline">("eyeline");

  // Interactive Gaze Angle scrubber (-45deg to 0deg)
  const [customAngle, setCustomAngle] = useState<number>(0.4);

  const topics: TopicItem[] = [
    {
      id: "mvcc",
      pill: t?.btnTry1 || "PostgreSQL MVCC & Bloat",
      question: t?.item1Q || "Q: How does PostgreSQL handle table bloat during heavy UPDATE bursts?",
      hook: t?.item1A || "Hook: «UPDATE always creates a new dead tuple version» • Autovacuum tuning (scale_factor=0.05) + lock-free pg_repack in production.",
      points: "VACUUM FULL locks table exclusive • Tune autovacuum_vacuum_cost_limit to 2000 • HOT (Heap-Only Tuples) optimization.",
      crib: "Суть: Dead tuples накопичуються при UPDATE. Autovacuum scale_factor = 0.05, pg_repack без downtime.",
    },
    {
      id: "locks",
      pill: t?.btnTry2 || "Distributed Locks (Redlock)",
      question: t?.item2Q || "Q: Why is naive Redis SETNX flawed for distributed locking?",
      hook: t?.item2A || "Hook: «Missing TTL risks permanent deadlock, missing UUID risks releasing another process's lock» • Use Redlock algorithm or Redisson watchdog.",
      points: "SET resource_id token NX PX 30000 • Fencing tokens protect storage • Redlock consensus across N independent Redis nodes.",
      crib: "Суть: Завжди генерувати унікальний UUID на клієнті + Lua script для атомарного release.",
    },
    {
      id: "kafka",
      pill: t?.btnTry3 || "Kafka Partitions & Rebalance",
      question: "Q: How do you prevent Stop-the-World consumer rebalance in Apache Kafka?",
      hook: "Hook: «Eager rebalancing drops all partitions globally» • Upgrade to CooperativeStickyAssignor and tune max.poll.interval.ms.",
      points: "Static group membership with group.instance.id • Incremental cooperative rebalancing • Avoid slow sync processing in poll thread.",
      crib: "Суть: CooperativeStickyAssignor не зупиняє здорових консьюмерів при додаванні/видаленні ноди.",
    },
  ];

  const currentTopic = topics[selectedTopic];

  // Derive animation duration based on speed
  const marqueeDuration =
    tickerSpeed === "fast" ? "18s" : tickerSpeed === "turbo" ? "12s" : "28s";

  // Dynamic gaze calculations
  const effectiveAngle = eyeProofMode === "second-monitor" ? -42.0 : customAngle;
  const isSuspicious = eyeProofMode === "second-monitor" || effectiveAngle < -15;
  const suspicionScore =
    eyeProofMode === "second-monitor"
      ? 89
      : Math.min(95, Math.max(0, Math.round(Math.abs(effectiveAngle) * 2.1)));

  return (
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-black overflow-hidden select-none">
      {/* Background illumination halo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[420px] bg-white/[0.02] rounded-full blur-[170px] pointer-events-none" />

      {/* Optical millimeter pitch grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 24px)",
          maskImage: "radial-gradient(circle 650px at center, black, transparent)",
          WebkitMaskImage: "radial-gradient(circle 650px at center, black, transparent)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="shimmer-pill inline-flex items-center px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs text-zinc-300 mb-4 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2 shadow-[0_0_8px_#34d399]" />
            {t?.badge || "● 34PX EYELINE ARCHITECTURE · 100% NATURAL EYE CONTACT"}
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            {t?.title || "Physical Webcam Bezel & Eyeline Simulator"}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed">
            {t?.desc ||
              "A razor-thin 34px ribbon docked right under your physical webcam lens. Look straight into the camera while reading answers with 100% natural conversational eye contact."}
          </p>

          {/* Topic Pills Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {topics.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedTopic(idx)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer flex items-center gap-2 ${
                  selectedTopic === idx
                    ? "bg-white text-black font-semibold shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    : "bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    selectedTopic === idx ? "bg-black" : "bg-zinc-600"
                  }`}
                />
                <span>{item.pill}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            SHOWPIECE STAGE: Physical MacBook Bezel + 34px Floating Ribbon
           ───────────────────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl bg-[#030305] border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.95)] overflow-hidden mb-12">
          {/* Physical MacBook Top Bezel */}
          <div className="relative bg-gradient-to-b from-[#1c1c20] via-[#0d0d10] to-[#040406] border-b border-white/[0.08] pt-4 pb-3.5 px-4 sm:px-6 flex flex-col items-center">
            {/* Top titanium/aluminum chamfer rim */}
            <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            {/* Centered Camera & Sensor Cluster */}
            <div className="relative flex items-center justify-center">
              {/* Dual ambient light sensor pinholes */}
              <div className="flex items-center gap-1.5 mr-3.5 opacity-60">
                <span className="w-1.5 h-1.5 rounded-full bg-black border border-white/20 shadow-inner" />
                <span className="w-1.5 h-1.5 rounded-full bg-black border border-white/20 shadow-inner" />
              </div>

              {/* Physical Glass Camera Lens */}
              <div className="relative w-8 h-8 rounded-full bg-[#050508] border border-white/25 ring-2 ring-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_0_12px_rgba(255,255,255,0.08)] flex items-center justify-center">
                {/* Optical deep sapphire/violet multi-coat element */}
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#020617] via-[#1e1b4b] to-[#0f172a] border border-white/20 flex items-center justify-center">
                  {/* Central aperture iris */}
                  <div className="w-2.5 h-2.5 rounded-full bg-black ring-1 ring-white/30" />
                  {/* Specular studio light highlight dot */}
                  <div className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-white/90 shadow-[0_0_3px_#ffffff]" />
                </div>
              </div>

              {/* Pulsing Green Camera Indicator LED */}
              <div className="flex items-center gap-2 ml-3.5">
                <div className="relative flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                  <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/30 animate-ping" />
                </div>
                <span className="text-[10px] font-mono font-medium text-emerald-400 tracking-wider">
                  ACTIVE 1080P STREAM
                </span>
              </div>
            </div>

            {/* Precision 34px Dimension Caliper Bracket */}
            <div className="relative w-full max-w-xs flex items-center justify-center my-2 select-none">
              <div className="h-6 flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-zinc-300 shadow-sm">
                <span className="text-emerald-400 font-bold">↕ 34px</span>
                <span className="text-zinc-500">|</span>
                <span>SUB-1° FOVEAL VISION CONE</span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                THE 34PX RUNNING TICKER RIBBON (DOCKED DIRECTLY UNDER LENS)
               ───────────────────────────────────────────────────────────── */}
            <div className="w-full max-w-4xl h-11 rounded-xl bg-black/95 border border-white/[0.18] shadow-[0_8px_30px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.05)] flex items-center justify-between px-3 sm:px-4 backdrop-blur-2xl z-20">
              {/* Ribbon Left Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-mono font-bold border border-white/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                  {t?.livePill || "● LIVE"}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:inline">
                  {currentTopic.pill}
                </span>
              </div>

              {/* Marquee Viewport Track with Seamless Dual-Span Infinite Loop */}
              <div className="flex-1 overflow-hidden mx-3 sm:mx-5 h-7 flex items-center relative">
                <div
                  key={`${currentTopic.id}-${tickerSpeed}`}
                  className="whitespace-nowrap inline-flex items-center font-mono text-xs"
                  style={{
                    animation: isPaused
                      ? "none"
                      : `ticker-marquee ${marqueeDuration} linear infinite`,
                    animationPlayState: isPaused ? "paused" : "running",
                  }}
                >
                  {/* First repetition block */}
                  <div className="inline-flex items-center shrink-0 pr-8">
                    <span className="text-zinc-400 font-medium mr-3">{currentTopic.question}</span>
                    <span className="text-emerald-400/80 mr-3">──</span>
                    <span className="text-white font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] mr-4">
                      {currentTopic.hook}
                    </span>
                    <span className="text-zinc-600 mr-3">|</span>
                    <span className="text-zinc-300 mr-4">{currentTopic.points}</span>
                    <span className="text-emerald-300/80 font-bold mr-6">{currentTopic.crib}</span>
                  </div>

                  {/* Second repetition block for seamless looping */}
                  <div className="inline-flex items-center shrink-0 pr-8">
                    <span className="text-zinc-400 font-medium mr-3">{currentTopic.question}</span>
                    <span className="text-emerald-400/80 mr-3">──</span>
                    <span className="text-white font-semibold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] mr-4">
                      {currentTopic.hook}
                    </span>
                    <span className="text-zinc-600 mr-3">|</span>
                    <span className="text-zinc-300 mr-4">{currentTopic.points}</span>
                    <span className="text-emerald-300/80 font-bold mr-6">{currentTopic.crib}</span>
                  </div>
                </div>
              </div>

              {/* Ribbon Right Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1 rounded bg-white/5 border border-white/10 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                  title={isPaused ? "Resume Ticker" : "Pause Ticker"}
                >
                  {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setTickerSpeed(
                      tickerSpeed === "normal"
                        ? "fast"
                        : tickerSpeed === "fast"
                        ? "turbo"
                        : "normal"
                    )
                  }
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer transition-colors hidden xs:inline"
                >
                  {tickerSpeed === "normal" ? "1.0x" : tickerSpeed === "fast" ? "1.5x" : "2.0x"}
                </button>
                <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] hidden md:inline">
                  Ctrl+Alt+M
                </span>
              </div>
            </div>
          </div>

          {/* Under-the-Bezel Mock Laptop Screen Context */}
          <div className="p-5 sm:p-7 bg-[#07070a] font-mono text-xs text-zinc-500 min-h-[160px] flex flex-col justify-center">
            <div className="max-w-3xl mx-auto space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-zinc-400 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-medium">Why 34 Pixels Changes Everything in Human Perception</span>
              </div>
              <p className="text-zinc-400 leading-relaxed font-sans text-xs sm:text-sm">
                Human foveal vision covers an approximate 1° to 2° angle. Because the Ghostboard ticker ribbon is positioned exactly 34 pixels under your webcam sensor, your eyes do not leave the camera lens while reading live hints. The interviewer experiences unbroken, confident, natural eye contact.
              </p>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            THE INTERACTIVE "EYE-CONTACT PROOF" VECTOR SIMULATOR
           ───────────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl sm:rounded-3xl bg-[#030305] border border-white/[0.1] p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 mb-1">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span>INTERACTIVE GAZE ANGLE AUDIT</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-medium text-white">
                The Eyeline Proof: Why Second Monitors Get You Rejected
              </h3>
            </div>

            {/* Proof Switcher Toggle */}
            <div className="inline-flex p-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-xl gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEyeProofMode("second-monitor");
                  setCustomAngle(-42);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  eyeProofMode === "second-monitor"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40 font-semibold shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>Typical Notes / 2nd Monitor ❌</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEyeProofMode("eyeline");
                  setCustomAngle(0.4);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  eyeProofMode === "eyeline"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ghostboard 34px Eyeline ✅</span>
              </button>
            </div>
          </div>

          {/* Interactive Gaze Vector Diagram */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-center">
            {/* Vector Graphic Diagram (7 Cols) */}
            <div className="lg:col-span-7 relative h-72 sm:h-80 rounded-2xl bg-[#060609] border border-white/[0.08] overflow-hidden flex flex-col items-center justify-center p-4">
              <svg
                viewBox="0 0 500 240"
                className="w-full h-full max-w-md select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background millimeter grid */}
                <defs>
                  <pattern id="grid-dots-eyeline" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="#ffffff" fillOpacity="0.05" />
                  </pattern>
                </defs>
                <rect width="500" height="240" fill="url(#grid-dots-eyeline)" />

                {/* Candidate Side Profile (Left) */}
                <g transform="translate(60, 60)">
                  {/* Head outline */}
                  <circle cx="40" cy="50" r="34" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="2" />
                  {/* Eye socket */}
                  <circle cx="56" cy="46" r="6" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" fill="#000000" />
                  {/* Pupil - dynamically animated based on angle */}
                  <circle
                    cx={effectiveAngle < -10 ? 57 : 58}
                    cy={effectiveAngle < -10 ? 49 : 46}
                    r="3.5"
                    fill={isSuspicious ? "#f87171" : "#34d399"}
                  />
                  {/* Direction of face pointer */}
                  <path d="M72 48 L78 52 L72 56" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <text x="18" y="105" fill="#71717a" fontSize="11" fontFamily="monospace">
                    Candidate Eye
                  </text>
                </g>

                {/* Laptop & Webcam (Right) */}
                <g transform="translate(360, 40)">
                  {/* Laptop screen body */}
                  <rect
                    x="0"
                    y="20"
                    width="8"
                    height="110"
                    rx="3"
                    fill="#18181b"
                    stroke="#ffffff"
                    strokeOpacity="0.25"
                    strokeWidth="1.5"
                  />
                  {/* Webcam lens at top of screen */}
                  <circle cx="4" cy="28" r="6" fill="#000000" stroke="#34d399" strokeWidth="2" />
                  <circle cx="4" cy="28" r="2.5" fill="#34d399" />
                  {/* 34px Ribbon position just below webcam */}
                  <rect x="-4" y="42" width="16" height="8" rx="2" fill="#ffffff" fillOpacity="0.9" />
                  {/* Laptop keyboard base */}
                  <path d="M4 130 L-50 145 L-50 150 L8 135 Z" fill="#27272a" opacity="0.6" />
                  <text x="-25" y="15" fill="#a1a1aa" fontSize="11" fontFamily="monospace">
                    Webcam Lens
                  </text>
                </g>

                {/* Sightline Vector Rays */}
                {isSuspicious ? (
                  // Awkward Downward / Off-Screen Ray
                  <g>
                    {/* Broken ray pointing away to bottom or side notes */}
                    <path
                      d="M120 106 L340 185"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                    {/* Deviation arc */}
                    <path d="M160 106 A 40 40 0 0 1 155 120" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                    <text x="170" y="130" fill="#f87171" fontSize="12" fontFamily="monospace" fontWeight="bold">
                      {effectiveAngle.toFixed(1)}° Downward Gaze
                    </text>
                    {/* Target: Notes / Second monitor */}
                    <rect x="330" y="175" width="60" height="24" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1" />
                    <text x="340" y="191" fill="#fca5a5" fontSize="10" fontFamily="monospace">
                      Notes / 2nd Disp
                    </text>
                  </g>
                ) : (
                  // 100% Direct Lock-On Eyeline Ray
                  <g>
                    {/* Direct sightline ray intersecting camera lens and 34px ribbon */}
                    <path d="M120 106 L360 68" stroke="#34d399" strokeWidth="3" />
                    {/* Concentric target ring at webcam */}
                    <circle cx="364" cy="68" r="14" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x="190" y="75" fill="#34d399" fontSize="12" fontFamily="monospace" fontWeight="bold">
                      {effectiveAngle.toFixed(1)}° Deviation · Direct Eye Contact
                    </text>
                    {/* Eyeline confidence tag */}
                    <rect
                      x="180"
                      y="85"
                      width="150"
                      height="20"
                      rx="10"
                      fill="#064e3b"
                      fillOpacity="0.8"
                      stroke="#34d399"
                      strokeWidth="0.8"
                    />
                    <text x="192" y="99" fill="#a7f3d0" fontSize="10" fontFamily="monospace">
                      100% Within Foveal Cone
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Diagnostic Telemetry Feedback Card (5 Cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              {isSuspicious ? (
                <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-mono font-bold uppercase">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Interviewer Perception: HIGH SUSPICION</span>
                  </div>
                  <div className="text-xl font-bold text-white leading-snug">
                    «Candidate is looking away reading notes»
                  </div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    Looking down at a second screen creates visible downward eyelid angle and wandering eye saccades. Interviewers immediately spot unauthentic body language.
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono border-t border-red-500/20 text-red-300">
                    <span>Gaze Deviation: {effectiveAngle.toFixed(1)}°</span>
                    <span className="font-bold">SUSPICION: {suspicionScore}%</span>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Interviewer Perception: NATURAL SENIOR CONFIDENCE</span>
                  </div>
                  <div className="text-xl font-bold text-white leading-snug">
                    «Candidate maintains direct, authoritative eye contact»
                  </div>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    By reading from the 34px ribbon positioned directly under the lens, your gaze never leaves the camera. The interviewer perceives complete fluency, deep expertise, and zero hesitation.
                  </p>
                  <div className="pt-2 flex items-center justify-between text-[11px] font-mono border-t border-emerald-500/20 text-emerald-300">
                    <span>Gaze Deviation: {effectiveAngle.toFixed(1)}°</span>
                    <span className="font-bold">SUSPICION: 0% (CLEAN)</span>
                  </div>
                </div>
              )}

              {/* Technical Advantage Metrics */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-zinc-500 block text-[10px]">RIBBON HEIGHT</span>
                  <span className="text-white font-bold text-sm">34 Pixels</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-zinc-500 block text-[10px]">EYE DARTING</span>
                  <span className="text-emerald-400 font-bold text-sm">0.0° Delta</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
