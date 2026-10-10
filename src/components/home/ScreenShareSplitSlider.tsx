"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  Check,
  Sliders,
  Radar,
  Radio,
  Lock,
  Copy,
  Terminal,
  Code2,
  FileCode,
  Eye,
  Monitor,
  Video,
  Mic,
  Maximize2,
  CheckCheck,
} from "lucide-react";
import type { HomeTranslations } from "@/lib/homeI18n";

interface Props {
  t?: HomeTranslations["stealthLens"];
}

type ActiveCodeFile = "python" | "go";

export function ScreenShareSplitSlider({ t }: Props) {
  // Slider position percentage (0 to 100)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeFile, setActiveFile] = useState<ActiveCodeFile>("python");
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoAnimFrameRef = useRef<number | null>(null);
  const autoStartTimeRef = useRef<number | null>(null);

  // Copywriting with i18n fallback support
  const badgeText = t?.badge || "● HARDWARE-LEVEL BUFFER EXCLUSION";
  const titleText = t?.title || "What the Interviewer Sees vs What You See";
  const descText =
    t?.desc ||
    "Powered by SetWindowDisplayAffinity (Windows) and NSWindowSharingNone (macOS), the Ghostboard HUD is physically excluded from screen capture buffers. Share your screen in Zoom, Teams, or Meet with zero trace.";
  const sampleQuestion =
    t?.sampleQuestion ||
    "How do you scale WebSocket connections across multiple server instances without dropping state?";
  const sampleHook =
    t?.sampleHook ||
    "To scale stateful WebSockets horizontally, we decouple client connection sockets from state storage using an event-driven Redis Pub/Sub cluster with NLB sticky sessions...";
  const samplePoints = t?.samplePoints || [
    "L4 Network Load Balancer (AWS NLB) with TLS termination & TCP keep-alive",
    "Redis Pub/Sub or Kafka partitioned broker for cross-node inter-process broadcasts",
    "Heartbeat ping-pong every 30s to prune zombie connection pools",
  ];
  const sampleCrib =
    t?.sampleCrib ||
    "Core: Edge NLB + Redis Pub/Sub backbone. Never store state in local process memory.";

  // Update slider position based on client pointer X
  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const percentage = Math.max(6, Math.min(94, (rawX / rect.width) * 100));
    setSliderPos(percentage);
  }, []);

  // Global pointer move & up listeners to prevent dragging hitch
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      handleMove(e.clientX);
    };

    const onPointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging, handleMove]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setMode("manual");
    handleMove(e.clientX);
  };

  // Auto-scan radar pulse animation loop
  useEffect(() => {
    if (mode !== "auto") {
      if (autoAnimFrameRef.current) {
        cancelAnimationFrame(autoAnimFrameRef.current);
        autoAnimFrameRef.current = null;
      }
      return;
    }

    const animateAutoScan = (timestamp: number) => {
      if (!autoStartTimeRef.current) autoStartTimeRef.current = timestamp;
      const elapsed = (timestamp - autoStartTimeRef.current) / 1000;
      // Oscillate smoothly between 16% and 84% using sine wave (~4.5s period)
      const wave = Math.sin(elapsed * 1.4);
      const newPos = 50 + wave * 34;
      setSliderPos(newPos);
      autoAnimFrameRef.current = requestAnimationFrame(animateAutoScan);
    };

    autoStartTimeRef.current = null;
    autoAnimFrameRef.current = requestAnimationFrame(animateAutoScan);

    return () => {
      if (autoAnimFrameRef.current) {
        cancelAnimationFrame(autoAnimFrameRef.current);
      }
    };
  }, [mode]);

  const handleCopyHook = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sampleHook);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <section className="relative w-full py-20 sm:py-28 border-t border-white/[0.08] bg-black overflow-hidden select-none">
      {/* Monochromatic ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-white/[0.02] rounded-full blur-[170px] pointer-events-none" />

      {/* Optical millimeter alignment grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle 700px at center, black, transparent)",
          WebkitMaskImage: "radial-gradient(circle 700px at center, black, transparent)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="shimmer-pill inline-flex items-center px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs text-zinc-300 mb-4 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2 shadow-[0_0_8px_#34d399]" />
            {badgeText}
          </div>
          <h2 className="text-3xl sm:text-5xl font-medium tracking-tight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            {titleText}
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed max-w-2xl mx-auto">
            {descText}
          </p>

          {/* Interactive Mode & Perspective Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {/* Manual vs Auto Radar Toggle */}
            <div className="inline-flex p-1 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-xl gap-1">
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  mode === "manual"
                    ? "bg-white text-black font-semibold shadow-[0_0_15px_rgba(255,255,255,0.25)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Manual Drag Slider</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("auto")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                  mode === "auto"
                    ? "bg-emerald-400 text-black font-semibold shadow-[0_0_20px_rgba(52,211,153,0.35)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>Auto-Scan Radar Pulse</span>
              </button>
            </div>

            {/* Quick Preset Perspective Buttons */}
            <div className="hidden sm:inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
              <button
                type="button"
                onClick={() => {
                  setMode("manual");
                  setSliderPos(10);
                }}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  sliderPos < 25 ? "bg-white/10 text-white font-medium" : "text-zinc-400 hover:text-white"
                }`}
              >
                Zoom Feed (0%)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("manual");
                  setSliderPos(50);
                }}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  sliderPos >= 40 && sliderPos <= 60 ? "bg-white/10 text-white font-medium" : "text-zinc-400 hover:text-white"
                }`}
              >
                50/50 Split
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("manual");
                  setSliderPos(90);
                }}
                className={`px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                  sliderPos > 75 ? "bg-white/10 text-white font-medium" : "text-zinc-400 hover:text-white"
                }`}
              >
                Your HUD (100%)
              </button>
            </div>

            {/* Hardware Exclusion Telemetry Badge */}
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>STATUS: 100% EXCLUDED FROM VIDEO BUFFER</span>
            </div>
          </div>
        </div>

        {/* Hyper-Realistic Zoom Call Screen-Sharing Stage */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-[#030305] border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.95)] overflow-hidden">
          {/* macOS Zoom Window Chrome */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-[#0a0a0f] border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50 shadow-sm inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50 shadow-sm inline-block" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50 shadow-sm inline-block" />
              <span className="ml-3 text-[11px] font-mono text-zinc-400 hidden md:inline truncate max-w-sm">
                Zoom Meeting #849-204-118 · Screen Share Active (Display 1)
              </span>
            </div>

            {/* Zoom Screen-Share Green Header Pill */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-medium shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>YOU ARE SHARING SCREEN</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30 hidden xs:inline">
                Stop Share
              </span>
            </div>
          </div>

          {/* Active Zoom Screen Area with Signature Green Border */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative w-full min-h-[490px] sm:min-h-[530px] bg-[#07070a] ring-2 ring-emerald-500/80 shadow-[inset_0_0_24px_rgba(16,185,129,0.08),0_0_30px_rgba(16,185,129,0.08)] overflow-hidden cursor-ew-resize touch-none select-none"
          >
            {/* ─────────────────────────────────────────────────────────────
                LAYER 1: Left / Base View — Interviewer's Zoom Feed
                (Pure authentic VS Code editor, 100% clean, ZERO overlay detected)
               ───────────────────────────────────────────────────────────── */}
            <div className="absolute inset-0 p-4 sm:p-7 font-mono text-xs sm:text-[13px] text-zinc-300 overflow-hidden bg-[#07070a]">
              {/* VS Code Tab Bar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFile("python");
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeFile === "python"
                        ? "bg-white/[0.08] text-white border border-white/15 font-medium"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                    <span>server_websocket.py</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveFile("go");
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeFile === "go"
                        ? "bg-white/[0.08] text-white border border-white/15 font-medium"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>cluster_router.go</span>
                  </button>
                  <span className="text-zinc-600 hidden sm:inline px-1">k8s_manifest.yaml</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 text-[9px] font-mono border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    ZOOM VIDEO BUFFER: CLEAN
                  </span>
                </div>
              </div>

              {/* Pristine Code Snippet */}
              {activeFile === "python" ? (
                <div className="space-y-1.5 leading-relaxed font-mono opacity-85 text-xs sm:text-[13px]">
                  <div className="text-zinc-600">
                    <span className="text-zinc-700 select-none mr-4">01</span># System Architecture: Distributed WebSocket Pub/Sub Hub
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">02</span>
                    <span className="text-purple-400">from</span> fastapi <span className="text-purple-400">import</span> FastAPI, WebSocket, WebSocketDisconnect
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">03</span>
                    <span className="text-purple-400">import</span> redis.asyncio <span className="text-purple-400">as</span> aioredis
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">04</span>
                    <span className="text-purple-400">from</span> typing <span className="text-purple-400">import</span> Dict, Set
                  </div>
                  <div className="h-1.5">
                    <span className="text-zinc-700 select-none mr-4">05</span>
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">06</span>app = FastAPI(title=<span className="text-emerald-300">&quot;ClusterGateway&quot;</span>)
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">07</span>redis_cluster = aioredis.from_url(<span className="text-emerald-300">&quot;redis://cluster-hub:6379&quot;</span>)
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">08</span>active_connections: Dict[str, Set[WebSocket]] = &#123;&#125;
                  </div>
                  <div className="h-1.5">
                    <span className="text-zinc-700 select-none mr-4">09</span>
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">10</span><span className="text-amber-400">@app.websocket</span>(<span className="text-emerald-300">&quot;/ws/channel/&#123;channel_id&#125;&quot;</span>)
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">11</span><span className="text-blue-400">async def</span> <span className="text-yellow-200">ws_channel_endpoint</span>(ws: WebSocket, channel_id: str):
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">12</span><span className="text-purple-400">await</span> ws.accept()
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">13</span>pubsub = redis_cluster.pubsub()
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">14</span><span className="text-purple-400">await</span> pubsub.subscribe(f<span className="text-emerald-300">&quot;ch:&#123;channel_id&#125;&quot;</span>)
                  </div>
                  <div className="pl-6 text-zinc-500">
                    <span className="text-zinc-700 select-none mr-4">15</span># Non-blocking cross-region event fanout loop
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">16</span><span className="text-purple-400">try</span>:
                  </div>
                  <div className="pl-12">
                    <span className="text-zinc-700 select-none mr-4">17</span><span className="text-purple-400">async for</span> message <span className="text-purple-400">in</span> pubsub.listen():
                  </div>
                  <div className="pl-16">
                    <span className="text-zinc-700 select-none mr-4">18</span><span className="text-purple-400">if</span> message[<span className="text-emerald-300">&quot;type&quot;</span>] == <span className="text-emerald-300">&quot;message&quot;</span>:
                  </div>
                  <div className="pl-20">
                    <span className="text-zinc-700 select-none mr-4">19</span><span className="text-purple-400">await</span> ws.send_text(message[<span className="text-emerald-300">&quot;data&quot;</span>])
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">20</span><span className="text-purple-400">except</span> WebSocketDisconnect:
                  </div>
                  <div className="pl-12">
                    <span className="text-zinc-700 select-none mr-4">21</span><span className="text-purple-400">await</span> pubsub.unsubscribe(f<span className="text-emerald-300">&quot;ch:&#123;channel_id&#125;&quot;</span>)
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 leading-relaxed font-mono opacity-85 text-xs sm:text-[13px]">
                  <div className="text-zinc-600">
                    <span className="text-zinc-700 select-none mr-4">01</span>// Zero-Allocation High-Throughput Event Broker
                  </div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">02</span>
                    <span className="text-purple-400">package</span> gateway
                  </div>
                  <div className="h-1.5"><span className="text-zinc-700 select-none mr-4">03</span></div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">04</span>
                    <span className="text-purple-400">import</span> (
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">05</span><span className="text-emerald-300">&quot;context&quot;</span>
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">06</span><span className="text-emerald-300">&quot;sync/atomic&quot;</span>
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">07</span><span className="text-emerald-300">&quot;github.com/segmentio/kafka-go&quot;</span>
                  </div>
                  <div><span className="text-zinc-700 select-none mr-4">08</span>)</div>
                  <div className="h-1.5"><span className="text-zinc-700 select-none mr-4">09</span></div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">10</span><span className="text-blue-400">type</span> EventBus <span className="text-blue-400">struct</span> &#123;
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">11</span>ringBuffer *RingBuffer
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">12</span>writer *kafka.Writer
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">13</span>activeCount int64
                  </div>
                  <div><span className="text-zinc-700 select-none mr-4">14</span>&#125;</div>
                  <div className="h-1.5"><span className="text-zinc-700 select-none mr-4">15</span></div>
                  <div>
                    <span className="text-zinc-700 select-none mr-4">16</span><span className="text-blue-400">func</span> (eb *EventBus) <span className="text-yellow-200">RoutePayload</span>(ctx context.Context, payload []<span className="text-blue-400">byte</span>) <span className="text-blue-400">error</span> &#123;
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">17</span>atomic.AddInt64(&amp;eb.activeCount, 1)
                  </div>
                  <div className="pl-6">
                    <span className="text-zinc-700 select-none mr-4">18</span><span className="text-purple-400">return</span> eb.writer.WriteMessages(ctx, kafka.Message&#123;Value: payload&#125;)
                  </div>
                  <div><span className="text-zinc-700 select-none mr-4">19</span>&#125;</div>
                </div>
              )}

              {/* Watermark badge on Interviewer side */}
              <div className="absolute bottom-5 left-6 pointer-events-none">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/85 border border-white/10 backdrop-blur-md text-[11px] text-zinc-400 font-mono shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-[0_0_8px_#34d399]" />
                  <span>ZOOM FEED: 100% CLEAN CODE · ZERO OVERLAYS DETECTED</span>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                LAYER 2: Right / Overlaid View — Your Physical Monitor
                (Exact same code + Floating Ghostboard Stealth HUD on top)
               ───────────────────────────────────────────────────────────── */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{
                clipPath: `inset(0 0 0 ${sliderPos}%)`,
                WebkitClipPath: `inset(0 0 0 ${sliderPos}%)`,
              }}
            >
              {/* Duplicate exact background code layer for pixel-perfect alignment */}
              <div className="absolute inset-0 p-4 sm:p-7 font-mono text-xs sm:text-[13px] text-zinc-300 overflow-hidden bg-[#07070a]">
                {/* VS Code Tab Bar */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <div
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                        activeFile === "python"
                          ? "bg-white/[0.08] text-white border border-white/15 font-medium"
                          : "text-zinc-500"
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5 text-yellow-400" />
                      <span>server_websocket.py</span>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                        activeFile === "go"
                          ? "bg-white/[0.08] text-white border border-white/15 font-medium"
                          : "text-zinc-500"
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>cluster_router.go</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 text-white text-[9px] font-mono font-bold border border-white/20">
                      <Sparkles className="w-3 h-3 text-white" />
                      PHYSICAL DISPLAY 1
                    </span>
                  </div>
                </div>

                {/* Identical Code Snippet */}
                {activeFile === "python" ? (
                  <div className="space-y-1.5 leading-relaxed font-mono opacity-85 text-xs sm:text-[13px]">
                    <div className="text-zinc-600">
                      <span className="text-zinc-700 select-none mr-4">01</span># System Architecture: Distributed WebSocket Pub/Sub Hub
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">02</span>
                      <span className="text-purple-400">from</span> fastapi <span className="text-purple-400">import</span> FastAPI, WebSocket, WebSocketDisconnect
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">03</span>
                      <span className="text-purple-400">import</span> redis.asyncio <span className="text-purple-400">as</span> aioredis
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">04</span>
                      <span className="text-purple-400">from</span> typing <span className="text-purple-400">import</span> Dict, Set
                    </div>
                    <div className="h-1.5">
                      <span className="text-zinc-700 select-none mr-4">05</span>
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">06</span>app = FastAPI(title=<span className="text-emerald-300">&quot;ClusterGateway&quot;</span>)
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">07</span>redis_cluster = aioredis.from_url(<span className="text-emerald-300">&quot;redis://cluster-hub:6379&quot;</span>)
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">08</span>active_connections: Dict[str, Set[WebSocket]] = &#123;&#125;
                    </div>
                    <div className="h-1.5">
                      <span className="text-zinc-700 select-none mr-4">09</span>
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">10</span><span className="text-amber-400">@app.websocket</span>(<span className="text-emerald-300">&quot;/ws/channel/&#123;channel_id&#125;&quot;</span>)
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">11</span><span className="text-blue-400">async def</span> <span className="text-yellow-200">ws_channel_endpoint</span>(ws: WebSocket, channel_id: str):
                    </div>
                    <div className="pl-6">
                      <span className="text-zinc-700 select-none mr-4">12</span><span className="text-purple-400">await</span> ws.accept()
                    </div>
                    <div className="pl-6">
                      <span className="text-zinc-700 select-none mr-4">13</span>pubsub = redis_cluster.pubsub()
                    </div>
                    <div className="pl-6">
                      <span className="text-zinc-700 select-none mr-4">14</span><span className="text-purple-400">await</span> pubsub.subscribe(f<span className="text-emerald-300">&quot;ch:&#123;channel_id&#125;&quot;</span>)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 leading-relaxed font-mono opacity-85 text-xs sm:text-[13px]">
                    <div className="text-zinc-600">
                      <span className="text-zinc-700 select-none mr-4">01</span>// Zero-Allocation High-Throughput Event Broker
                    </div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">02</span>
                      <span className="text-purple-400">package</span> gateway
                    </div>
                    <div className="h-1.5"><span className="text-zinc-700 select-none mr-4">03</span></div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">04</span>
                      <span className="text-purple-400">import</span> (
                    </div>
                    <div className="pl-6">
                      <span className="text-zinc-700 select-none mr-4">05</span><span className="text-emerald-300">&quot;context&quot;</span>
                    </div>
                    <div className="pl-6">
                      <span className="text-zinc-700 select-none mr-4">06</span><span className="text-emerald-300">&quot;sync/atomic&quot;</span>
                    </div>
                    <div className="pl-6">
                      <span className="text-zinc-700 select-none mr-4">07</span><span className="text-emerald-300">&quot;github.com/segmentio/kafka-go&quot;</span>
                    </div>
                    <div><span className="text-zinc-700 select-none mr-4">08</span>)</div>
                    <div className="h-1.5"><span className="text-zinc-700 select-none mr-4">09</span></div>
                    <div>
                      <span className="text-zinc-700 select-none mr-4">10</span><span className="text-blue-400">type</span> EventBus <span className="text-blue-400">struct</span> &#123;
                    </div>
                    <div className="pl-6">
                      <span className="text-zinc-700 select-none mr-4">11</span>ringBuffer *RingBuffer
                    </div>
                  </div>
                )}
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  THE GHOSTBOARD STEALTH HUD (VISIBLE ONLY ON PHYSICAL MONITOR)
                 ───────────────────────────────────────────────────────────── */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[94%] sm:w-[570px] p-4 sm:p-5 rounded-2xl bg-[#09090c]/95 backdrop-blur-2xl border border-white/[0.18] shadow-[0_25px_65px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.25),0_0_40px_rgba(255,255,255,0.06)] space-y-3 z-20 pointer-events-auto">
                {/* HUD Top Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    <span className="text-[10px] font-mono font-semibold text-white tracking-wider uppercase">
                      GHOSTBOARD HUD v2.5 · EYELINE PROMPTER
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      16kHz PCM · 1.18s
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hidden sm:inline">
                      F9: OCR
                    </span>
                    <span className="text-[9px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hidden md:inline">
                      Space: Freeze
                    </span>
                  </div>
                </div>

                {/* Detected Live Question */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                      Interviewer Speech Detected:
                    </span>
                    <span className="text-zinc-500 text-[9px]">00:14:22</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                    «{sampleQuestion}»
                  </div>
                </div>

                {/* Instant First-Sentence Hook */}
                <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.12] relative group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wide">
                      ⚡ FIRST SENTENCE CONVERSATIONAL HOOK:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyHook}
                      className="text-zinc-400 hover:text-white text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-100 font-sans italic leading-relaxed">
                    «{sampleHook}»
                  </p>
                </div>

                {/* Core Architecture Pillars */}
                <div className="space-y-1 pt-0.5">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase block tracking-wider">
                    KEY ARCHITECTURE PILLARS:
                  </span>
                  <ul className="space-y-1 text-xs text-zinc-200 font-sans">
                    {samplePoints.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Native Language Crib-Sheet */}
                <div className="p-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 text-[11px] font-mono text-zinc-200 flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="font-bold text-emerald-300 mr-1.5">СУТЬ:</span>
                    <span>{sampleCrib}</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                    [Q: Concise]
                  </span>
                </div>
              </div>

              {/* Watermark badge on Physical Monitor side */}
              <div className="absolute bottom-5 right-6 pointer-events-none">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/85 border border-white/20 backdrop-blur-md text-[11px] text-white font-mono shadow-xl">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>YOUR PHYSICAL MONITOR · FULL GHOSTBOARD OVERLAY</span>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                SIMULATED ZOOM PARTICIPANT AVATAR (BOTTOM-RIGHT CORNER)
               ───────────────────────────────────────────────────────────── */}
            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 pointer-events-auto">
              <div className="flex items-center gap-2.5 p-2 pr-3.5 rounded-xl bg-[#0b0b12]/92 border border-white/15 backdrop-blur-md shadow-2xl">
                <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-800 to-zinc-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-emerald-500/80 shadow-md">
                  AV
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-white leading-tight">
                      Alex Vance
                    </span>
                    {/* Live Speaking Indicator (3 mini equalizer bars) */}
                    <span className="inline-flex items-end gap-[1.5px] h-2.5">
                      <span className="w-[2px] h-2.5 bg-emerald-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
                      <span className="w-[2px] h-1.5 bg-emerald-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s]" />
                      <span className="w-[2px] h-2 bg-emerald-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.4s]" />
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 flex items-center gap-1">
                    <Mic className="w-2.5 h-2.5 text-emerald-400" />
                    Interviewer (Staff Infra)
                  </span>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                THE DRAGGABLE KINETIC DIVIDER HANDLE & LASER SCANNER
               ───────────────────────────────────────────────────────────── */}
            <div
              className="absolute top-0 bottom-0 z-40 cursor-ew-resize pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              {/* Vertical Laser Beam Line */}
              <div className="absolute top-0 bottom-0 -left-[1px] w-[2px] bg-gradient-to-b from-emerald-400 via-white to-emerald-400 shadow-[0_0_15px_rgba(255,255,255,0.9),0_0_30px_rgba(52,211,153,0.7)]" />

              {/* Glowing Center Handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -left-[18px] w-9 h-14 rounded-full bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.9),0_0_12px_rgba(52,211,153,0.5)] border border-white/60 flex flex-col items-center justify-center gap-1 cursor-ew-resize pointer-events-auto active:scale-95 transition-transform"
                onPointerDown={handlePointerDown}
              >
                <div className="flex items-center gap-0.5 text-black">
                  <div className="w-1.5 h-1.5 border-t-2 border-l-2 border-black -rotate-45" />
                  <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-black rotate-45" />
                </div>
                <div className="w-3.5 h-[2px] bg-black/40 rounded-full" />
              </div>

              {/* Dynamic Drag Tooltip Pill */}
              <div className="absolute top-4 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-full bg-black/90 border border-white/20 text-[10px] font-mono text-white backdrop-blur-md shadow-xl pointer-events-none">
                ↔ DRAG TO REVEAL
              </div>
            </div>
          </div>

          {/* Bottom Diagnostic Readout Strip */}
          <div className="px-4 sm:px-6 py-3 bg-[#050508] border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zoom / Meet Buffer Status: 100% Excluded</span>
              </span>
              <span className="text-zinc-600 hidden md:inline">|</span>
              <span className="text-zinc-500 hidden md:inline">
                Win32 WDA_EXCLUDEFROMCAPTURE · macOS NSWindowSharingNone
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Slider: <span className="text-white font-bold">{Math.round(sliderPos)}%</span> ·{" "}
              {sliderPos > 50 ? "Candidate Overlay View" : "Interviewer Video View"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
