"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  Crosshair,
  Volume2,
  VolumeX,
  ArrowRight,
} from "lucide-react";
import { GravitationalCard } from "@/components/singularity/GravitationalCard";
import { LivePrompterPhysicsDeck } from "@/components/home/studio/LivePrompterPhysicsDeck";
import { LatencyBattleDeck } from "@/components/home/LatencyBattleDeck";
import { ZoomInvisibilityDeck } from "@/components/home/studio/ZoomInvisibilityDeck";
import { useLocale } from "@/contexts/LocaleContext";
import Link from "next/link";

export type StudioTab = "prompter" | "latency" | "invisibility";

export interface Scenario {
  id: string;
  tag: string;
  title: string;
  question: string;
  hook: string;
  pillars: { name: string; detail: string }[];
  takeaway: string;
  latencyBreakdown: { pcm: number; stt: number; ai: number; draw: number };
}

export const SCENARIOS: Scenario[] = [
  {
    id: "mvcc",
    tag: "PostgreSQL · Storage Engine Internals",
    title: "PostgreSQL MVCC & Autovacuum Tuning",
    question: "How does PostgreSQL handle table bloat in MVCC during high write bursts, and how do you prevent autovacuum worker starvation?",
    hook: "In our production clusters, we avoid in-place row mutations because Postgres appends new tuple versions on every UPDATE and DELETE, generating dead tuples that autovacuum must clean.",
    pillars: [
      {
        name: "Autovacuum Throttle Elimination",
        detail: "Lower autovacuum_vacuum_scale_factor from 0.20 to 0.05 and raise autovacuum_vacuum_cost_limit to 2000 to eliminate IO throttling on heavy write bursts.",
      },
      {
        name: "HOT (Heap-Only Tuples)",
        detail: "Ensure updated columns are unindexed so Postgres creates Heap-Only Tuples without incurring index maintenance or leaf page splits.",
      },
      {
        name: "Online Zero-Downtime Repack",
        detail: "Run pg_repack instead of VACUUM FULL to rebuild tables and indexes concurrently without taking table-level ACCESS EXCLUSIVE locks.",
      },
    ],
    takeaway: "Production takeaway: Eliminate dead tuple backlog with tuned vacuum cost limits + HOT updates, and repack tables online during maintenance windows.",
    latencyBreakdown: { pcm: 36, stt: 204, ai: 382, draw: 11 },
  },
  {
    id: "redlock",
    tag: "Distributed Systems · Consensus & Locks",
    title: "Redis Redlock & Fencing Tokens",
    question: "Explain why naive Redis SETNX fails in distributed systems and how Redlock with fencing tokens provides safety.",
    hook: "Naive SETNX fails because single-instance Redis lacks monotonic fencing: a process paused by Stop-The-World GC can wake up after TTL expiry and corrupt shared state with stale writes.",
    pillars: [
      {
        name: "Multi-Master Quorum",
        detail: "Redlock acquires locks across N/2 + 1 independent Redis master nodes using unique UUID tokens and strict per-node connection timeouts.",
      },
      {
        name: "Clock Drift Validity Margin",
        detail: "Valid lock lifetime equals initial lease time minus network round-trip time and clock drift margin across non-synchronized nodes.",
      },
      {
        name: "Monotonic Fencing Tokens",
        detail: "Downstream storage engines (e.g. Postgres or ZooKeeper) validate monotonic fencing tokens, rejecting transactions with lower token sequence numbers.",
      },
    ],
    takeaway: "Production takeaway: Redlock provides probabilistic safety, but true linearizability always requires monotonically increasing fencing tokens at the storage layer.",
    latencyBreakdown: { pcm: 38, stt: 198, ai: 395, draw: 9 },
  },
  {
    id: "ratelimit",
    tag: "High-Throughput Architecture · Low Latency",
    title: "100k req/sec Distributed Rate Limiter",
    question: "Design a high-throughput rate limiter capable of sustaining 100k req/sec across a multi-region cluster with sub-2ms overhead.",
    hook: "At 100,000 requests per second, making synchronous Redis calls for every incoming request causes network card saturation and Redis single-thread bottlenecking.",
    pillars: [
      {
        name: "Sliding Window Approximation",
        detail: "Blend previous and current window counts with weight: count = prev * (1 - t/window) + curr. Provides 99.8% precision with O(1) memory.",
      },
      {
        name: "Local Edge Token Batching",
        detail: "Envoy or Cloudflare edge proxies acquire token batches (e.g. 100 tokens per tenant) in local memory, syncing delta counts back asynchronously via atomic Lua.",
      },
      {
        name: "Tenant Key Sharding",
        detail: "Shard hot tenant counters across 16 sub-keys (tenant_id:shard_N) with consistent hashing to spread load across all cluster CPU cores.",
      },
    ],
    takeaway: "Production takeaway: Never hit centralized Redis on every packet; buffer tokens at the edge and shard hot keys with atomic sliding window Lua scripts.",
    latencyBreakdown: { pcm: 34, stt: 215, ai: 378, draw: 12 },
  },
  {
    id: "rsc",
    tag: "Fullstack Architecture · React 19",
    title: "React 19 Server Components & Hydration",
    question: "How do React 19 Server Components eliminate frontend data-fetching waterfalls, and how does Selective Hydration preserve 60fps interactivity?",
    hook: "Traditional SPA client-side fetching creates nested network waterfalls; React 19 Server Components execute data queries directly on the edge server adjacent to the database.",
    pillars: [
      {
        name: "RSC Flight Payload Streaming",
        detail: "The server streams serialized component trees and Promises over HTTP chunked transfer without sending runtime JavaScript bundle weight to the client.",
      },
      {
        name: "Selective Suspense Hydration",
        detail: "Suspense boundaries allow React to prioritize hydrating components the user clicks first, bypassing off-screen markup completely.",
      },
      {
        name: "Zero-Bundle Dependencies",
        detail: "Heavy libraries like markdown parsers or date formatters remain 100% on the server, dropping total client bundle size by up to 40%.",
      },
    ],
    takeaway: "Production takeaway: Colocate queries inside Server Components, stream via Suspense, and rely on Selective Hydration to achieve sub-second TTFB and zero INP latency.",
    latencyBreakdown: { pcm: 32, stt: 195, ai: 368, draw: 10 },
  },
  {
    id: "rag",
    tag: "AI Engineering · Vector Search & Latency",
    title: "Sub-500ms Enterprise RAG Pipeline",
    question: "Architect an enterprise RAG pipeline that retrieves semantic context and generates structured responses within 500ms.",
    hook: "Naive RAG takes 2-4 seconds due to sequential embedding computation, vector database similarity search, and high TTFT from large language models.",
    pillars: [
      {
        name: "Semantic Redis Cache",
        detail: "Cache query embeddings with 0.94 cosine similarity threshold in Redis, serving 65% of repetitive corporate queries in under 8ms.",
      },
      {
        name: "Hybrid Dense-Sparse Reranking",
        detail: "Combine BM25 keyword matching with pgvector HNSW index search in parallel, reranking top-20 candidates using a lightweight cross-encoder.",
      },
      {
        name: "Speculative Token Streaming",
        detail: "Stream generation immediately from Gemini 3.8 Flash while background guardrail verification runs concurrently over SSE.",
      },
    ],
    takeaway: "Production takeaway: Use Redis semantic caching + pgvector HNSW index + speculative token streaming to achieve sub-500ms end-to-end latency.",
    latencyBreakdown: { pcm: 35, stt: 208, ai: 352, draw: 11 },
  },
];

/* Sound Synthesizer via Web Audio API */
class SoundEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.045, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch {}
  }

  playTone(freq = 520, duration = 0.07) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.045, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {}
  }

  playLockSound() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime);
      osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {}
  }

  playPanicAlert() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(920, this.ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch {}
  }
}

const sfx = new SoundEffects();

export function GhostboardOmniStudio() {
  const { locale } = useLocale();
  const isUa = locale === "ua";

  // Active Tab State (Consolidated 3 Tabs: Prompter/Eye Physics, Latency Battle, Zoom Invisibility)
  const [activeTab, setActiveTab] = useState<StudioTab>("prompter");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Latency Benchmarker Shared State
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [streamPhase, setStreamPhase] = useState<"idle" | "listening" | "stt" | "ai" | "completed">("idle");
  const [streamProgress, setStreamProgress] = useState(0);
  const [streamedText, setStreamedText] = useState("");
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync SFX with state
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Global hotkeys (1-3 for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "1") { setActiveTab("prompter"); sfx.playClick(); }
      if (e.key === "2") { setActiveTab("latency"); sfx.playClick(); }
      if (e.key === "3") { setActiveTab("invisibility"); sfx.playClick(); }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Audio Waveform 60fps Loop
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let t = 0;
    const draw = () => {
      t += 0.055;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isLive = streamPhase === "listening" || streamPhase === "stt" || streamPhase === "ai";
      const amp = isLive ? (streamPhase === "listening" ? 18 : streamPhase === "stt" ? 14 : 10) : 2.5;

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, "rgba(52, 211, 153, 0.2)");
      gradient.addColorStop(0.5, isLive ? "rgba(52, 211, 153, 0.95)" : "rgba(255, 255, 255, 0.35)");
      gradient.addColorStop(1, "rgba(52, 211, 153, 0.2)");

      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const midY = canvas.height / 2;
      for (let x = 0; x < canvas.width; x++) {
        const wave1 = Math.sin(x * 0.045 + t) * amp;
        const wave2 = Math.cos(x * 0.02 - t * 0.75) * (amp * 0.55);
        const wave3 = Math.sin(x * 0.08 + t * 1.4) * (amp * 0.25);
        const y = midY + wave1 + wave2 + wave3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [streamPhase]);

  // Latency Scenario Runner with Millisecond Precision
  const runSimulation = useCallback((scenario: Scenario) => {
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);

    setActiveScenario(scenario);
    setStreamPhase("listening");
    setStreamProgress(0);
    setStreamedText("");
    sfx.playTone(400, 0.04);

    setTimeout(() => {
      setStreamPhase("stt");
      sfx.playTone(600, 0.05);
    }, scenario.latencyBreakdown.pcm);

    setTimeout(() => {
      setStreamPhase("ai");
      sfx.playTone(880, 0.07);

      const fullText = `🎯 ${scenario.hook}\n\n• ${scenario.pillars[0].name}: ${scenario.pillars[0].detail}\n• ${scenario.pillars[1].name}: ${scenario.pillars[1].detail}\n• ${scenario.pillars[2].name}: ${scenario.pillars[2].detail}\n\n💡 ${scenario.takeaway}`;
      const words = fullText.split(" ");
      let currIdx = 0;

      streamTimerRef.current = setInterval(() => {
        currIdx += 2;
        setStreamedText(words.slice(0, currIdx).join(" "));
        setStreamProgress(Math.min(100, Math.round((currIdx / words.length) * 100)));

        if (currIdx >= words.length) {
          if (streamTimerRef.current) clearInterval(streamTimerRef.current);
          setStreamPhase("completed");
          sfx.playLockSound();
        }
      }, 28);
    }, scenario.latencyBreakdown.pcm + scenario.latencyBreakdown.stt);
  }, []);

  const totalSimLatency =
    activeScenario.latencyBreakdown.pcm +
    activeScenario.latencyBreakdown.stt +
    activeScenario.latencyBreakdown.ai +
    activeScenario.latencyBreakdown.draw;

  const TABS = [
    {
      id: "prompter",
      icon: Crosshair,
      key: "1",
      badge: "0.8° SNAP",
      label: isUa ? "0.8° Суфлер і Фізика" : "0.8° Prompter Physics",
      desc: isUa ? "Магнітний замок під вебкою" : "Magnetic Webcam Snapping",
      tagColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      id: "latency",
      icon: Zap,
      key: "2",
      badge: "606ms LIVE",
      label: isUa ? "600мс Нейрострімінг" : "600ms Neural Stream",
      desc: isUa ? "Битва швидкості vs ChatGPT" : "Speech ➔ Instant Answer Race",
      tagColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    },
    {
      id: "invisibility",
      icon: ShieldCheck,
      key: "3",
      badge: "0% LEAK",
      label: isUa ? "Невидимість у Zoom" : "Zoom Kernel Invisibility",
      desc: isUa ? "Апаратне вирізання з буфера ОС" : "OS Window Buffer Exclusion",
      tagColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    },
  ] as const;

  return (
    <div className="w-full relative select-none">
      {/* Ambient Cybernetic Accents */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[360px] bg-emerald-500/[0.04] rounded-full blur-[150px]" />

      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="font-semibold tracking-wide">GHOST OS · INTERACTIVE CONTROL ARENA</span>
            <span className="text-zinc-500">|</span>
            <span className="text-emerald-400 font-bold text-[11px]">FAANG TIER-1 SPEC</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-white mt-3">
            {isUa ? "Інтерактивний центр керування Ghostboard" : "Ghostboard Interactive Control Center"}
          </h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            {isUa
              ? "3 практичні випробування, що демонструють справжню перевагу: магнітний суфлер під зіницями 0.8°, стрімінг 600мс проти незручного мовчання з ChatGPT, та апаратна невидимість у Zoom."
              : "3 tactile simulations showcasing the real unfair advantage: 0.8° gaze-locked prompter, 600ms speech streaming vs ChatGPT awkward silence, and OS-level Zoom invisibility."}
          </p>

          {/* Marketing Proof KPI Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300 flex items-center gap-1.5">
              <span className="font-bold">🎯 0.8°</span>
              <span className="text-zinc-400">Safe Gaze Cone</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
              <span className="font-bold">⚡ 606ms</span>
              <span className="text-zinc-400">Nova-3 + Flash TTFT</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-[11px] font-mono text-purple-300 flex items-center gap-1.5">
              <span className="font-bold">🛡️ 0%</span>
              <span className="text-zinc-400">Zoom Capture Leak</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
              <span className="font-bold text-white">🚨 8ms</span>
              <span className="text-zinc-400">ESC Panic Shield</span>
            </span>
          </div>
        </div>

        {/* Global Studio Actions: Sound FX & Direct Copilot CTA */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              sfx.playClick();
            }}
            className="p-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white hover:border-white/20 transition-all cursor-pointer flex items-center gap-2 text-xs font-mono"
            title={soundEnabled ? "Mute sound effects" : "Unmute sound effects"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "SFX: ON" : "SFX: OFF"}</span>
          </button>

          <Link
            href="/interview"
            className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs font-mono hover:bg-zinc-200 transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
          >
            <span>{isUa ? "Запустити Копілот" : "Launch Live HUD"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 3 Focused Tactile Tabs Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-1.5 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as StudioTab);
                sfx.playClick();
              }}
              className={`relative px-4 py-3.5 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between gap-2 group ${
                isActive
                  ? "bg-white/[0.08] border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                  : "hover:bg-white/[0.03] border border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-lg transition-colors ${isActive ? "bg-white text-black shadow-md" : "bg-white/[0.05] text-zinc-400 group-hover:text-white"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${tab.tagColor}`}>
                    {tab.badge}
                  </span>
                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-400">
                    {tab.key}
                  </kbd>
                </div>
              </div>

              <div className="mt-1">
                <div className={`text-sm font-semibold font-sans leading-tight ${isActive ? "text-white" : "text-zinc-300"}`}>
                  {tab.label}
                </div>
                <div className="text-[11px] font-mono text-zinc-500 truncate mt-0.5">
                  {tab.desc}
                </div>
              </div>

              {isActive && (
                <motion.div
                  layoutId="activeControlTabUnderline"
                  className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Interactive Deck Frame */}
      <GravitationalCard tilt={0} className="p-6 sm:p-8 !overflow-visible border border-white/10 bg-zinc-950/85 backdrop-blur-2xl shadow-2xl">
        <AnimatePresence mode="wait">
          {/* TAB 1: 0.8° PROMPTER & GAZE PHYSICS */}
          {activeTab === "prompter" && (
            <motion.div
              key="prompter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LivePrompterPhysicsDeck
                isUa={isUa}
                soundEnabled={soundEnabled}
                playClickSound={() => sfx.playClick()}
                playLockSound={() => sfx.playLockSound()}
              />
            </motion.div>
          )}

          {/* TAB 2: 600MS SPEECH & NEURAL STREAMING LATENCY BATTLE */}
          {activeTab === "latency" && (
            <motion.div
              key="latency"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <LatencyBattleDeck
                isUa={isUa}
                activeScenario={activeScenario}
                onSelectScenario={setActiveScenario}
                scenarios={SCENARIOS}
                streamPhase={streamPhase}
                streamProgress={streamProgress}
                streamedText={streamedText}
                runSimulation={runSimulation}
                totalSimLatency={totalSimLatency}
                waveformCanvasRef={waveformCanvasRef}
                playClickSound={() => sfx.playClick()}
              />
            </motion.div>
          )}

          {/* TAB 3: ZOOM SCREEN SHARE INVISIBILITY RADAR */}
          {activeTab === "invisibility" && (
            <motion.div
              key="invisibility"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ZoomInvisibilityDeck
                isUa={isUa}
                soundEnabled={soundEnabled}
                playClickSound={() => sfx.playClick()}
                playLockSound={() => sfx.playLockSound()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </GravitationalCard>
    </div>
  );
}
