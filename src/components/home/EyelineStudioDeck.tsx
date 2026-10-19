"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Crosshair,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Video,
  Radio,
  MousePointerClick,
  Laptop,
  Scan,
  Sliders,
  Activity,
} from "lucide-react";

export type EyelinePreset = "ghost" | "right_monitor" | "left_notes" | "down_table" | "free";
export type EyelineViewMode = "zoom" | "spatial" | "arkit";

interface EyelineStudioDeckProps {
  isUa: boolean;
  soundEnabled: boolean;
  isGhostEyelineActive: boolean;
  activeEyelinePreset: EyelinePreset;
  rawAngleX: number;
  rawAngleY: number;
  effAngleX: number;
  effAngleY: number;
  angularDistance: number;
  gazeSuspicionPercent: number;
  isBlinking: boolean;
  onPresetChange: (preset: EyelinePreset) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
  playClickSound: () => void;
  playLockSound: () => void;
  playAlertTone: (freq?: number, duration?: number) => void;
}

export function EyelineStudioDeck({
  isUa,
  soundEnabled: _soundEnabled,
  isGhostEyelineActive,
  activeEyelinePreset,
  rawAngleX: _rawAngleX,
  rawAngleY: _rawAngleY,
  effAngleX,
  effAngleY,
  angularDistance,
  gazeSuspicionPercent,
  isBlinking,
  onPresetChange,
  onPointerMove,
  stageRef,
  playClickSound,
  playLockSound: _playLockSound,
  playAlertTone: _playAlertTone,
}: EyelineStudioDeckProps) {
  // Sub-view mode switcher: "zoom" (Zoom call), "spatial" (Desk setup), "arkit" (Biometric cockpit)
  const [viewMode, setViewMode] = useState<EyelineViewMode>("zoom");

  // Trust score derived from suspicion
  const trustScore = Math.max(0, 100 - gazeSuspicionPercent);

  // Dynamic interviewer reaction based on gaze
  const getInterviewerSentiment = () => {
    if (gazeSuspicionPercent < 22) {
      return {
        status: isUa ? "Бездоганний зоровий контакт" : "Natural Direct Eye Contact",
        quote: isUa
          ? "«Кандидат виглядає надзвичайно впевнено. Дивиться прямо в камеру, відповіді звучать невимушено.»"
          : "«Candidate maintains solid, natural composure. Looking directly into the camera with zero hesitation.»",
        color: "text-emerald-400",
        badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      };
    }
    if (gazeSuspicionPercent < 55) {
      return {
        status: isUa ? "Розсіяний погляд убік" : "Distracted Lateral Gaze",
        quote: isUa
          ? "«Погляд відхиляється на 30° вліво/вниз. Схоже, переглядає власні нотатки під час відповіді.»"
          : "«Gaze is drifting 30° off-axis. Seems to be cross-referencing auxiliary notes while speaking.»",
        color: "text-amber-400",
        badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
      };
    }
    return {
      status: isUa ? "Очевидне читання шпаргалки" : "Cheating Detected · Reading Off-Screen",
      quote: isUa
        ? "«Зіниці повернуті на +36° вправо. Кандидат читає згенеровану ChatGPT відповідь на другому моніторі.»"
        : "«Pupils locked at +36° to the right. Candidate is visibly reading ChatGPT text on an external monitor.»",
      color: "text-rose-400 font-bold",
      badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    };
  };

  const sentiment = getInterviewerSentiment();

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. STUDIO HEADER & MULTI-VIEW WORKSPACE CONTROLLER */}
      {/* ========================================================================= */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tracking-wide uppercase">
              {isUa ? "Біометричний рушій фіксації сітківки" : "Eyeline Vector Engine · Biometric Retinal Lock"}
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-medium tracking-tight text-white mt-1">
            {isUa ? "Куди ви дивитесь — бачать усі в Zoom" : "Your Eye Gaze is Broadcast to Everyone on the Call"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mt-1 leading-relaxed">
            {isUa
              ? "Ghostboard проектує структуровані відповіді у вузький оптичний конус прямо під лінзою камери (0.8°), усуваючи зрадливе бігання зіниць по 2-му монітору."
              : "Ghostboard projects concise bullet points in a 0.8° micro-cone directly under your webcam, eliminating pupil darting to second monitors."}
          </p>
        </div>

        {/* View Perspective Switcher & Primary Comparison Toggle */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch xl:self-auto justify-between xl:justify-end">
          {/* Sub-view mode tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              onClick={() => {
                setViewMode("zoom");
                playClickSound();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "zoom"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title={isUa ? "Вигляд дзвінка в Zoom" : "Zoom Call View"}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isUa ? "Zoom Студія" : "Zoom Call"}</span>
            </button>

            <button
              onClick={() => {
                setViewMode("spatial");
                playClickSound();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "spatial"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title={isUa ? "Стіл: Ноутбук vs 2-й монітор" : "Desk Setup: Laptop vs Second Monitor"}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>{isUa ? "2 Монітори" : "Desk Setup"}</span>
            </button>

            <button
              onClick={() => {
                setViewMode("arkit");
                playClickSound();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "arkit"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
              title={isUa ? "ARKit Біометрична сітка" : "ARKit Biometric Wireframe"}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{isUa ? "ARKit Сітка" : "ARKit Telemetry"}</span>
            </button>
          </div>

          {/* Primary Quick Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10">
            <button
              onClick={() => onPresetChange("ghost")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                isGhostEyelineActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isUa ? "З Ghostboard" : "With Ghostboard"}</span>
            </button>
            <button
              onClick={() => onPresetChange("right_monitor")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                !isGhostEyelineActive
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>{isUa ? "2-й монітор (ChatGPT)" : "2nd Monitor (ChatGPT)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TACTICAL PRESET CONTROLLER BAR */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-500 mr-1 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>{isUa ? "Пресет погляду:" : "Gaze Target:"}</span>
          </span>

          <button
            onClick={() => onPresetChange("ghost")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeEyelinePreset === "ghost"
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-semibold shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>{isUa ? "Вебкамера (0.8° Фіксація)" : "Webcam Lock (0.8°)"}</span>
          </button>

          <button
            onClick={() => onPresetChange("right_monitor")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeEyelinePreset === "right_monitor"
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{isUa ? "Правий екран (+36° ChatGPT)" : "Right Display (+36° ChatGPT)"}</span>
          </button>

          <button
            onClick={() => onPresetChange("left_notes")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeEyelinePreset === "left_notes"
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>{isUa ? "Лівий дисплей (-34° Нотатки)" : "Left Display (-34° Notes)"}</span>
          </button>

          <button
            onClick={() => onPresetChange("down_table")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeEyelinePreset === "down_table"
                ? "bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold shadow-[0_0_15px_rgba(244,63,94,0.15)]"
                : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>{isUa ? "Стіл / Папери (-28° Вниз)" : "Desk / Paper (-28° Down)"}</span>
          </button>

          <button
            onClick={() => onPresetChange("free")}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
              activeEyelinePreset === "free"
                ? "bg-white/15 border-white/30 text-white font-semibold shadow-sm"
                : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <MousePointerClick className="w-3 h-3 text-zinc-300" />
            <span>{isUa ? "Вільне ведення мишею" : "Free Mouse Track"}</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>OPTICAL ZONE: &lt; 1.5° CONE</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: BENTO GRID (VIEWPORT + TELEMETRY HUB) */}
      {/* ========================================================================= */}
      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-6 items-stretch">
        {/* ======================================================================= */}
        {/* LEFT VIEWPORT STAGE */}
        {/* ======================================================================= */}
        <div
          ref={stageRef}
          onPointerMove={onPointerMove}
          className="relative min-h-[460px] rounded-2xl border border-white/10 bg-zinc-950/90 overflow-hidden select-none flex flex-col justify-between shadow-2xl group transition-all"
        >
          {/* Subtle Ambient Studio Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-emerald-500/[0.07] rounded-full blur-[80px] pointer-events-none" />
          {/* Fine Millimeter Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* --------------------------------------------------------------------- */}
          {/* SUB-VIEW 1: ZOOM VIDEO CALL STUDIO */}
          {/* --------------------------------------------------------------------- */}
          {viewMode === "zoom" && (
            <div className="relative w-full h-full flex flex-col justify-between p-5 z-10 space-y-4">
              {/* Zoom Title Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-white font-semibold">● REC</span>
                  <span className="text-zinc-600">|</span>
                  <span className="truncate">Zoom Call: Principal Staff Architect Interview</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">1080p 60fps</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    ENCRYPTED
                  </span>
                </div>
              </div>

              {/* Main Call Matrix (Split View: Candidate Screen + Interviewer PiP) */}
              <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/60 overflow-hidden flex flex-col justify-between p-4 backdrop-blur-md">
                {/* Physical MacBook Pro Camera Bezel & Notch at Top */}
                <div className="relative w-full flex flex-col items-center">
                  {/* Laptop Bezel Bar */}
                  <div className="px-5 py-1.5 rounded-full bg-zinc-900 border border-white/15 shadow-xl flex items-center gap-2.5 backdrop-blur-md z-20">
                    {/* Glowing FaceTime HD lens */}
                    <div className="relative flex items-center justify-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-700 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-950 border border-emerald-500/60 flex items-center justify-center">
                          <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-300 font-medium">FaceTime HD 1080p Lens</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-mono font-bold">
                      ACTIVE
                    </span>
                  </div>

                  {/* Dynamic Island Teleprompter directly under camera */}
                  {isGhostEyelineActive ? (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="mt-2.5 px-4 py-2 rounded-xl bg-zinc-950/95 border border-emerald-500/40 text-xs font-mono text-zinc-100 shadow-[0_0_30px_rgba(52,211,153,0.2)] flex items-center gap-2.5 backdrop-blur-2xl z-20 max-w-md"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                      <span className="font-bold text-emerald-400 shrink-0">[0.8° HUD LOCK]</span>
                      <span className="text-zinc-200 truncate text-[11px]">
                        "Lower autovacuum_vacuum_scale_factor to 0.05 and bump cost limit..."
                      </span>
                    </motion.div>
                  ) : (
                    <div className="mt-2 text-[10px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-lg">
                      ⚠️ HUD Disengaged · Reading 2nd Monitor at +36.4° Lateral Offset
                    </div>
                  )}

                  {/* Volumetric Optical Projection Cone */}
                  {isGhostEyelineActive && (
                    <div className="w-64 h-16 bg-gradient-to-b from-emerald-400/20 via-emerald-400/5 to-transparent pointer-events-none -mt-1 blur-[1px]" />
                  )}
                </div>

                {/* Candidate Biometric Avatar (High-Precision Face Tracking) */}
                <div className="relative my-auto flex flex-col items-center justify-center py-4">
                  {/* Optical Gaze Line */}
                  <div
                    className={`absolute top-1/2 left-1/2 w-0.5 h-36 bg-gradient-to-b ${
                      isGhostEyelineActive
                        ? "from-emerald-400/80 via-emerald-400/30 to-transparent"
                        : "from-rose-500/90 via-rose-500/30 to-transparent"
                    } pointer-events-none transition-transform duration-75 origin-top`}
                    style={{
                      transform: `translateX(-50%) translateY(-100%) rotate(${effAngleX * 0.45}deg)`,
                    }}
                  />

                  {/* Candidate Head & Eye Tracking Chassis */}
                  <div className="relative w-48 h-56 rounded-[3rem] border border-white/15 bg-gradient-to-b from-white/[0.08] via-white/[0.02] to-black/90 backdrop-blur-2xl shadow-2xl flex flex-col items-center justify-between p-4 overflow-hidden">
                    {/* Top Reticle Marker */}
                    <div className="flex items-center gap-2 opacity-60">
                      <div className="w-1 h-1 rounded-full bg-emerald-400" />
                      <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest">
                        ARKit Retinal Mesh
                      </span>
                      <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    </div>

                    {/* Dual Biometric Irises with Micro-Saccades */}
                    <div className="flex justify-center gap-6 my-auto">
                      {[0, 1].map((idx) => (
                        <div
                          key={idx}
                          className={`relative w-12 h-12 rounded-full bg-zinc-950 border border-white/25 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center transition-all ${
                            isBlinking ? "scale-y-[0.08]" : "scale-y-100"
                          }`}
                        >
                          {/* Outer Biometric Iris Ring */}
                          <div className="absolute inset-1 rounded-full border border-emerald-400/25 opacity-70" />
                          <div className="absolute inset-2 rounded-full border border-dashed border-zinc-700/60" />

                          {/* Dynamic Iris Core */}
                          <div
                            className={`w-6 h-6 rounded-full border shadow-lg relative flex items-center justify-center transition-transform duration-75 ease-out ${
                              isGhostEyelineActive
                                ? "bg-gradient-to-br from-zinc-900 via-emerald-950 to-zinc-950 border-emerald-400/70"
                                : "bg-gradient-to-br from-zinc-900 via-rose-950 to-zinc-950 border-rose-500/70"
                            }`}
                            style={{
                              transform: `translate(${effAngleX * 0.28}px, ${effAngleY * 0.24}px)`,
                            }}
                          >
                            {/* Glowing Pupil */}
                            <div
                              className={`w-3 h-3 rounded-full bg-black border ${
                                isGhostEyelineActive
                                  ? "border-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                  : "border-rose-500/80 shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                              }`}
                            />
                            {/* Specular Highlight */}
                            <div className="absolute top-1 left-1.5 w-1 h-1 rounded-full bg-white shadow-sm" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pitch & Yaw Real-time Coordinates */}
                    <div className="text-[9px] font-mono text-zinc-400 flex items-center gap-2 pb-1">
                      <span>PITCH: {effAngleY > 0 ? `+${effAngleY}` : effAngleY}°</span>
                      <span>·</span>
                      <span>YAW: {effAngleX > 0 ? `+${effAngleX}` : effAngleX}°</span>
                    </div>
                  </div>
                </div>

                {/* Floating Interviewer PiP Tile (Top-Right) */}
                <div className="absolute top-4 right-4 w-44 rounded-xl border border-white/15 bg-zinc-950/90 p-2.5 shadow-2xl backdrop-blur-xl space-y-1.5 z-30">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-emerald-400" />
                      <span>Interviewer (Google)</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-[11px] font-medium text-white truncate">Alex Mercer · Staff Lead</div>
                  <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border truncate ${sentiment.badgeBg}`}>
                    {sentiment.status}
                  </div>
                </div>

                {/* Bottom Status Bar in Call Matrix */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.08]">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Ghostboard Retinal Damper: {isGhostEyelineActive ? "ONLINE" : "BYPASSED"}</span>
                  </span>
                  <span className="text-zinc-400">
                    Lock: {isGhostEyelineActive ? "OPTIMAL (< 1.5°)" : "LOST (> 35°)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SUB-VIEW 2: SPATIAL DUAL-DISPLAY DESK SETUP (LAPTOP VS 2ND SCREEN) */}
          {/* --------------------------------------------------------------------- */}
          {viewMode === "spatial" && (
            <div className="relative w-full h-full flex flex-col justify-between p-6 z-10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white font-semibold">
                    {isUa ? "Просторовий сетап: Ноутбук vs Другий монітор" : "Spatial Desk Geometry: Laptop vs 2nd Screen"}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">Angle Delta: 36.4°</span>
              </div>

              {/* Spatial Desk Illustration */}
              <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/70 p-6 flex items-center justify-around gap-6 backdrop-blur-md overflow-hidden">
                {/* 1. Primary Laptop (MacBook Pro) - Safe Zone */}
                <div
                  onClick={() => onPresetChange("ghost")}
                  className={`relative flex-1 max-w-[200px] h-[190px] rounded-2xl border transition-all cursor-pointer p-3 flex flex-col justify-between ${
                    isGhostEyelineActive
                      ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_25px_rgba(52,211,153,0.15)]"
                      : "bg-white/[0.02] border-white/10 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      0.8° Zone
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  <div className="my-auto text-center space-y-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-black border border-emerald-400 mx-auto" />
                    <div className="text-xs font-medium text-white">{isUa ? "MacBook Pro" : "Primary Laptop"}</div>
                    <div className="text-[9px] font-mono text-emerald-300">
                      {isUa ? "Суфлер під вебкою" : "HUD under camera"}
                    </div>
                  </div>

                  <div className="text-[9px] font-mono text-zinc-400 text-center py-1 bg-black/40 rounded-lg">
                    {isUa ? "100% Контакт" : "Zero Darting"}
                  </div>
                </div>

                {/* Laser Gaze Trajectory Indicator */}
                <div className="relative flex flex-col items-center justify-center">
                  <div
                    className={`w-16 h-1 rounded-full transition-all duration-300 ${
                      isGhostEyelineActive
                        ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                        : "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)] rotate-[25deg]"
                    }`}
                  />
                  <span className="text-[9px] font-mono text-zinc-400 mt-2 whitespace-nowrap">
                    {isGhostEyelineActive ? "Laser: 0.8° Locked" : "Laser: +36.4° Lateral"}
                  </span>
                </div>

                {/* 2. External 27" Display (ChatGPT) - Danger Zone */}
                <div
                  onClick={() => onPresetChange("right_monitor")}
                  className={`relative flex-1 max-w-[200px] h-[210px] rounded-2xl border transition-all cursor-pointer p-3 flex flex-col justify-between ${
                    !isGhostEyelineActive
                      ? "bg-rose-500/10 border-rose-500/60 shadow-[0_0_25px_rgba(244,63,94,0.15)]"
                      : "bg-white/[0.02] border-white/10 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      +36° Threat
                    </span>
                    <span className="text-zinc-500">27" 4K</span>
                  </div>

                  <div className="my-auto text-center space-y-1">
                    <div className="text-xs font-medium text-white">{isUa ? "2-й Монітор" : "2nd Display"}</div>
                    <div className="text-[9px] font-mono text-rose-300">
                      {isUa ? "Вікно ChatGPT" : "ChatGPT / Notes"}
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">
                      {isUa ? "Зіниці бігають вбік" : "Lateral pupil dart"}
                    </div>
                  </div>

                  <div className="text-[9px] font-mono text-rose-400 text-center py-1 bg-rose-500/20 border border-rose-500/30 rounded-lg font-bold">
                    {isUa ? "Викриття за 2с" : "Caught in 2s"}
                  </div>
                </div>
              </div>

              {/* Spatial Takeaway Alert */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-sans text-zinc-400 leading-relaxed">
                {isGhostEyelineActive ? (
                  <p className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isUa
                        ? "У режимі Ghostboard очі зафіксовані в межах 0.8° від вічка камери — для співрозмовника ви дивитесь йому прямо в очі."
                        : "With Ghostboard, your pupils stay locked within 0.8° of the camera lens — the interviewer perceives 100% natural eye contact."}
                    </span>
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {isUa
                        ? "Читання другого монітора відхиляє зіниці на 36° вбік. Досвідчений лід помічає цей рух за 2 секунди."
                        : "Reading a second monitor turns pupils sideways at 36°. Experienced leads detect this movement instantly."}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------------- */}
          {/* SUB-VIEW 3: ARKIT BIOMETRIC WIREFRAME COCKPIT */}
          {/* --------------------------------------------------------------------- */}
          {viewMode === "arkit" && (
            <div className="relative w-full h-full flex flex-col justify-between p-6 z-10 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-2">
                  <Scan className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white font-semibold">
                    {isUa ? "ARKit Біометрична векторна сітка обличчя" : "ARKit Precision Biometric Wireframe"}
                  </span>
                </div>
                <span className="text-emerald-400 font-mono text-[11px]">468 FACE LANDMARKS</span>
              </div>

              {/* Vector SVG Face Mesh Arena */}
              <div className="relative flex-1 rounded-2xl border border-white/10 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md">
                <svg viewBox="0 0 400 320" className="w-full max-w-sm h-64 overflow-visible">
                  <defs>
                    <radialGradient id="meshGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Facial Symmetry Guideline */}
                  <line x1="200" y1="20" x2="200" y2="300" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
                  <line x1="80" y1="140" x2="320" y2="140" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

                  {/* Anatomical Polygonal Face Wireframe */}
                  <polygon
                    points="200,30 260,50 300,90 310,150 280,230 230,280 200,295 170,280 120,230 90,150 100,90 140,50"
                    fill="url(#meshGlow)"
                    stroke="rgba(52,211,153,0.35)"
                    strokeWidth="1.2"
                  />

                  {/* Forehead Vector Nodes */}
                  <line x1="140" y1="50" x2="260" y2="50" stroke="rgba(52,211,153,0.25)" />
                  <line x1="100" y1="90" x2="300" y2="90" stroke="rgba(52,211,153,0.2)" />
                  <line x1="120" y1="230" x2="280" y2="230" stroke="rgba(52,211,153,0.2)" />

                  {/* Left Eye Orbit */}
                  <circle cx="150" cy="135" r="24" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
                  <circle cx="150" cy="135" r="16" stroke="rgba(52,211,153,0.4)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  {/* Dynamic Pupil Left */}
                  <circle
                    cx={150 + effAngleX * 0.3}
                    cy={135 + effAngleY * 0.25}
                    r="6"
                    fill={isGhostEyelineActive ? "#34d399" : "#f43f5e"}
                    className="transition-all duration-75"
                  />

                  {/* Right Eye Orbit */}
                  <circle cx="250" cy="135" r="24" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
                  <circle cx="250" cy="135" r="16" stroke="rgba(52,211,153,0.4)" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  {/* Dynamic Pupil Right */}
                  <circle
                    cx={250 + effAngleX * 0.3}
                    cy={135 + effAngleY * 0.25}
                    r="6"
                    fill={isGhostEyelineActive ? "#34d399" : "#f43f5e"}
                    className="transition-all duration-75"
                  />

                  {/* Gaze Target Vector Ray */}
                  <line
                    x1="200"
                    y1="135"
                    x2={200 + effAngleX * 2.8}
                    y2={30 + effAngleY * 1.5}
                    stroke={isGhostEyelineActive ? "#34d399" : "#f43f5e"}
                    strokeWidth="1.8"
                    strokeDasharray="4 2"
                  />

                  {/* Nasal Bridge & Mouth Wireframe */}
                  <polyline points="200,90 200,180 190,195 210,195" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />
                  <ellipse cx="200" cy="240" rx="30" ry="8" fill="none" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />

                  {/* Precision Coordinates Stamp */}
                  <text x="20" y="30" fill="#34d399" fontSize="10" fontFamily="monospace">
                    PUPIL_VECTOR: {effAngleX > 0 ? `+${effAngleX}` : effAngleX}° Yaw
                  </text>
                  <text x="20" y="45" fill="#a1a1aa" fontSize="9" fontFamily="monospace">
                    STATUS: {isGhostEyelineActive ? "RETINAL LOCK ACTIVE" : "LOCK BROKEN"}
                  </text>
                </svg>
              </div>

              {/* Bottom Telemetry Footer */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Vector Damping: {isGhostEyelineActive ? "0.06x Sub-Pixel" : "1.0x Full Deviation"}</span>
                <span className={isGhostEyelineActive ? "text-emerald-400" : "text-rose-400"}>
                  Deflection: {angularDistance.toFixed(1)}°
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: BENTO INTELLIGENCE TELEMETRY HUB */}
        {/* ======================================================================= */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Bento Card 1: Interviewer Trust Score & Perception Gauge */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 border-b border-white/[0.06]">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isUa ? "СПРИЙНЯТТЯ РЕКРУТЕРОМ" : "INTERVIEWER TRUST"}</span>
              </span>
              <span className={`font-semibold tracking-wide ${sentiment.color}`}>
                {trustScore}% {isUa ? "ДОВІРА" : "TRUST SCORE"}
              </span>
            </div>

            {/* 10-Segment LED Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                <span>{isUa ? "Рівень підозри у списуванні:" : "Suspicion Meter:"}</span>
                <span className={sentiment.color}>{gazeSuspicionPercent}%</span>
              </div>

              <div className="grid grid-cols-10 gap-1.5 h-3">
                {Array.from({ length: 10 }).map((_, i) => {
                  const segThreshold = (i + 1) * 10;
                  const isLit = gazeSuspicionPercent >= segThreshold - 5;
                  const isDangerous = i >= 6;
                  const isWarning = i >= 3 && i < 6;

                  return (
                    <div
                      key={i}
                      className={`h-full rounded-sm transition-all duration-150 ${
                        isLit
                          ? isDangerous
                            ? "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                            : isWarning
                            ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"
                            : "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                          : "bg-zinc-800/80"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Dynamic Interviewer Assessment Quote */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-sans text-zinc-300 italic leading-relaxed">
              {sentiment.quote}
            </div>
          </div>

          {/* Bento Card 2: Polar Retinal Gaze Radar */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-around gap-4">
            <div className="relative w-28 h-28 rounded-full border border-white/15 flex items-center justify-center bg-zinc-950/90 shadow-inner">
              {/* Radar Concentric Rings */}
              <div className="absolute inset-3 rounded-full border border-dashed border-white/10" />
              <div className="absolute inset-7 rounded-full border border-emerald-500/25" />
              <div className="absolute w-full h-[1px] bg-white/10" />
              <div className="absolute h-full w-[1px] bg-white/10" />

              {/* Dynamic Gaze Blip */}
              <motion.div
                className={`w-3.5 h-3.5 rounded-full absolute shadow-md ${
                  gazeSuspicionPercent < 22
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                    : gazeSuspicionPercent < 55
                    ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]"
                    : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]"
                }`}
                style={{
                  transform: `translate(${effAngleX * 1.1}px, ${effAngleY * 0.9}px)`,
                }}
              />

              {/* Center 0.8° Target Lock Box */}
              <div className="w-6 h-6 border border-emerald-400/50 rounded-sm pointer-events-none" />
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {isUa ? "Координати погляду" : "Gaze Vector"}
              </div>
              <div className="text-white font-semibold">
                X: {effAngleX > 0 ? `+${effAngleX}` : effAngleX}° Yaw
              </div>
              <div className="text-white font-semibold">
                Y: {effAngleY > 0 ? `+${effAngleY}` : effAngleY}° Pitch
              </div>
              <div className="text-emerald-400 text-[11px] pt-1 font-bold">
                Lock: {isGhostEyelineActive ? "OPTIMAL (0.8°)" : "LOST (36.4°)"}
              </div>
            </div>
          </div>

          {/* Bento Card 3: Tactical Metrics Pair */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-zinc-500 block text-[10px] uppercase">
                {isUa ? "ВІДХИЛЕННЯ ЗІНИЦЬ" : "PUPIL DEVIATION"}
              </span>
              <span className="text-white text-sm font-semibold mt-0.5 block">
                {angularDistance.toFixed(1)}° arc
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-zinc-500 block text-[10px] uppercase">
                {isUa ? "ФІКСАЦІЯ КАМЕРИ" : "CAMERA ANCHOR"}
              </span>
              <span
                className={`text-sm font-semibold mt-0.5 block ${
                  isGhostEyelineActive ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isGhostEyelineActive ? "LOCKED (0.8°)" : "LOST (36.2°)"}
              </span>
            </div>
          </div>

          {/* Bento Card 4: Tactical Guidance Banner */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 leading-relaxed font-sans">
            {isGhostEyelineActive ? (
              <p className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {isUa
                    ? "Ghostboard проектує відповіді у вузький оптичний сектор (до 1.5°) прямо під лінзою камери. Для співрозмовника ви виглядаєте максимально впевнено й уважно."
                    : "Ghostboard renders answers directly within the 1.5-degree cone under your webcam lens. The interviewer perceives 100% genuine, confident eye contact."}
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  {isUa
                    ? "Читання другого монітора змушує зіниці відхилятися на 35° вбік. Кожен досвідчений Lead/Senior бачить цей рух за 2 секунди."
                    : "Glancing at ChatGPT on a second monitor darts your pupils sideways at 35°. Experienced hiring leads immediately flag this pattern."}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
