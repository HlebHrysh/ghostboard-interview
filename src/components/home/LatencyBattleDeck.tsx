"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Cpu,
  Radio,
  Sliders,
  Volume2,
} from "lucide-react";
import type { Scenario } from "./GhostboardOmniStudio";

interface LatencyBattleDeckProps {
  isUa: boolean;
  activeScenario: Scenario;
  onSelectScenario: (sc: Scenario) => void;
  scenarios: Scenario[];
  streamPhase: "idle" | "listening" | "stt" | "ai" | "completed";
  streamProgress: number;
  streamedText: string;
  runSimulation: (sc: Scenario) => void;
  totalSimLatency: number;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  playClickSound: () => void;
}

export function LatencyBattleDeck({
  isUa,
  activeScenario,
  onSelectScenario,
  scenarios,
  streamPhase,
  streamProgress: _streamProgress,
  streamedText,
  runSimulation,
  totalSimLatency,
  waveformCanvasRef,
  playClickSound,
}: LatencyBattleDeckProps) {
  // Competitor (ChatGPT Web) simulated lag timer
  const [chatGptTimer, setChatGptTimer] = useState<number>(0);
  const [isBattling, setIsBattling] = useState<boolean>(false);
  const battleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isRunning = streamPhase === "listening" || streamPhase === "stt" || streamPhase === "ai";

  // Trigger head-to-head race
  const startBattle = (sc: Scenario) => {
    setIsBattling(true);
    setChatGptTimer(0);
    playClickSound();
    runSimulation(sc);

    if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    const startMs = Date.now();

    battleIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startMs;
      setChatGptTimer(elapsed);
      if (elapsed >= 7400) {
        if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
      }
    }, 40);
  };

  useEffect(() => {
    return () => {
      if (battleIntervalRef.current) clearInterval(battleIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 select-none">
      {/* ========================================================================= */}
      {/* 1. HEADER: MARKETING VALUE PROPOSITION */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tracking-wide uppercase">
              {isUa ? "Бій швидкостей: Голос проти Паузи мовчання" : "Sub-1.2s Speech-to-Answer Engine · Head-to-Head Battle"}
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-medium tracking-tight text-white mt-1">
            {isUa
              ? "600 мілісекунд Ghostboard проти 7.4 секунди ChatGPT"
              : "600ms Ghostboard Stream vs 7.4s ChatGPT Awkward Silence"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mt-1 leading-relaxed">
            {isUa
              ? "Людська розмова втрачає природність вже після 1.5 секунд мовчання. Поки інтерв'юер закінчує фразу, Deepgram Nova-3 та Gemini 3.8 Flash вже проектують структурований хук відповіді."
              : "Human conversation breaks after 1.5s of silence. While the interviewer finishes their sentence, Nova-3 and Gemini 3.8 Flash already project a senior structured answer."}
          </p>
        </div>

        {/* Primary CTA: Launch Benchmark */}
        <div className="flex items-center gap-3 self-stretch xl:self-auto justify-end">
          <button
            onClick={() => startBattle(activeScenario)}
            disabled={isRunning}
            className={`px-5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-lg ${
              isRunning
                ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 cursor-not-allowed"
                : "bg-white text-black hover:bg-zinc-200 shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : "fill-black"}`} />
            <span>
              {isRunning
                ? isUa ? "Стрімінг відповіді..." : "Streaming Pipeline..."
                : isUa ? "Запустити битву швидкості" : "Trigger Head-to-Head Race"}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ARCHITECTURAL SCENARIOS SELECTOR */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <span className="text-[11px] font-mono text-zinc-500 mr-2 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>{isUa ? "Сценарій питання:" : "FAANG Scenario:"}</span>
        </span>

        {scenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => {
              onSelectScenario(sc);
              playClickSound();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-2 border ${
              activeScenario.id === sc.id
                ? "bg-white/[0.08] border-white/25 text-white font-semibold shadow-sm"
                : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeScenario.id === sc.id ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "bg-zinc-600"
              }`}
            />
            <span>{sc.title}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3. HEAD-TO-HEAD BATTLE ARENA (DUAL LANES) */}
      {/* ========================================================================= */}
      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        {/* ----------------------------------------------------------------------- */}
        {/* LANE 1: GHOSTBOARD (THE WINNER) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="p-6 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.06] via-zinc-950 to-zinc-950/90 shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden">
          {/* Ambient Corner Glow */}
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Lane Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                  Ghostboard Neural Pipeline
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 font-bold">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>SUB-1.2S STREAM</span>
              </div>
            </div>

            {/* Live Stopwatch & Pipeline Stage */}
            <div className="my-4 flex items-end justify-between">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">End-to-End Latency</span>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-emerald-400 tracking-tight">
                  {streamPhase === "idle"
                    ? "0 ms"
                    : streamPhase === "completed"
                    ? `${totalSimLatency} ms`
                    : `${totalSimLatency} ms`}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Pipeline Status</span>
                <span className="text-xs font-mono font-medium text-white">
                  {streamPhase === "idle" && "READY TO LISTEN"}
                  {streamPhase === "listening" && "PCM AUDIO BUFFER (35ms)"}
                  {streamPhase === "stt" && "DEEPGRAM NOVA-3 (208ms)"}
                  {streamPhase === "ai" && "GEMINI 3.8 FLASH TTFT (352ms)"}
                  {streamPhase === "completed" && "STREAM COMPLETED"}
                </span>
              </div>
            </div>

            {/* 60fps Audio Waveform Canvas */}
            <div className="p-2.5 rounded-xl bg-black/60 border border-white/[0.08] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 shrink-0">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>16kHz PCM</span>
              </div>
              <div className="flex-1 h-6 rounded overflow-hidden">
                <canvas ref={waveformCanvasRef} width={260} height={24} className="w-full h-full" />
              </div>
            </div>

            {/* Live Streaming Answer Prompter Box */}
            <div className="mt-4 p-4 rounded-xl bg-black/80 border border-emerald-500/25 min-h-[170px] font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap relative shadow-inner">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06] text-[10px] text-zinc-500">
                <span className="text-emerald-400 font-semibold">{activeScenario.tag}</span>
                <span>Sub-Bezel Teleprompter Output</span>
              </div>

              {streamedText ? (
                <div>
                  {streamedText}
                  {streamPhase === "ai" && (
                    <span className="inline-block w-2 h-3.5 bg-emerald-400 ml-1 animate-pulse" />
                  )}
                </div>
              ) : (
                <div className="text-zinc-600 flex items-center justify-center h-28 italic text-center">
                  {isUa
                    ? "Натисніть «Запустити битву швидкості», щоб спостерігати стрімінг у реальному часі..."
                    : "Click 'Trigger Head-to-Head Race' to watch answers stream in under 600ms..."}
                </div>
              )}
            </div>
          </div>

          {/* 4-Stage Waterfall Breakdown */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-white/[0.08] text-[10px] font-mono">
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="text-zinc-500">1. AUDIO</div>
              <div className="text-white font-semibold mt-0.5">{activeScenario.latencyBreakdown.pcm}ms</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="text-zinc-500">2. NOVA-3</div>
              <div className="text-white font-semibold mt-0.5">{activeScenario.latencyBreakdown.stt}ms</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="text-zinc-500">3. GEMINI</div>
              <div className="text-white font-semibold mt-0.5">{activeScenario.latencyBreakdown.ai}ms</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="text-zinc-500">4. DRAW</div>
              <div className="text-emerald-400 font-semibold mt-0.5">{activeScenario.latencyBreakdown.draw}ms</div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* LANE 2: CHATGPT WEB / CLAUDE (THE FAILURE STATE) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="p-6 rounded-2xl border border-rose-500/20 bg-gradient-to-b from-rose-500/[0.04] via-zinc-950 to-zinc-950/90 shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden">
          <div>
            {/* Lane Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-mono font-bold tracking-wider text-rose-400 uppercase">
                  ChatGPT Web / Claude in Browser
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-[10px] font-mono text-rose-300 font-bold">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>AWKWARD SILENCE</span>
              </div>
            </div>

            {/* Competitor Stopwatch */}
            <div className="my-4 flex items-end justify-between">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Awkward Pause Duration</span>
                <div className="text-3xl sm:text-4xl font-mono font-bold text-rose-400 tracking-tight">
                  {!isBattling ? "0 ms" : `${chatGptTimer} ms`}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">Interviewer Perception</span>
                <span className="text-xs font-mono font-medium text-rose-300">
                  {!isBattling
                    ? "IDLE"
                    : chatGptTimer < 2000
                    ? "Waiting for answer..."
                    : chatGptTimer < 4500
                    ? "⚠️ Candidate is silent..."
                    : "❌ FAILED: Candidate stalled for 7s"}
                </span>
              </div>
            </div>

            {/* Stalling Steps Simulation */}
            <div className="space-y-2 mt-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-400">1. Manual Prompt Typing / Dictation:</span>
                <span className="text-rose-400 font-semibold">+2,400 ms</span>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-400">2. Cloudflare & Rate-Limit Queue:</span>
                <span className="text-rose-400 font-semibold">+1,800 ms</span>
              </div>
              <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] flex items-center justify-between">
                <span className="text-zinc-400">3. Unstructured Essay Generation:</span>
                <span className="text-rose-400 font-semibold">+3,200 ms</span>
              </div>
            </div>

            {/* Pain Point Callout */}
            <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-200 leading-relaxed font-sans space-y-1.5">
              <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{isUa ? "Чому ChatGPT провалює співбесіди:" : "Why ChatGPT Fails in Live Interviews:"}</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                {isUa
                  ? "Поки ви чекаєте 7 секунд, на співбесіді виникає мертве мовчання. Інтерв'юер бачить, як ви напружено чекаєте відповіді на іншому екрані, і ставить позначку «Unprepared»."
                  : "During 7 seconds of dead silence, the interviewer notices you waiting on another screen and immediately marks 'Poor Technical Depth'."}
              </p>
            </div>
          </div>

          {/* Competitor Fatal Verdict */}
          <div className="p-3 rounded-xl bg-black/40 border border-rose-500/30 text-center text-xs font-mono text-rose-400 font-bold">
            {isUa ? "Підсумок: 12x повільніше за швидкість живої мови" : "Verdict: 12x Slower Than Natural Conversational Cadence"}
          </div>
        </div>
      </div>
    </div>
  );
}
