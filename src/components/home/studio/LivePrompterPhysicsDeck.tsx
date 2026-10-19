"use client";

import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Crosshair,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Move,
  Maximize2,
  Eye,
  Activity,
  Terminal,
  ShieldCheck,
  MousePointerClick,
  Sparkles,
} from "lucide-react";

interface LivePrompterPhysicsDeckProps {
  isUa: boolean;
  soundEnabled: boolean;
  playClickSound: () => void;
  playLockSound: () => void;
}

export function LivePrompterPhysicsDeck({
  isUa,
  soundEnabled: _soundEnabled,
  playClickSound,
  playLockSound,
}: LivePrompterPhysicsDeckProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for physical draggable prompter
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for eye tracking reaction
  const springX = useSpring(x, { stiffness: 220, damping: 20 });
  const springY = useSpring(y, { stiffness: 220, damping: 20 });

  // Map HUD coordinates to gaze angle degrees (-45° to +45°)
  const gazeAngleX = useTransform(springX, [-220, 220], [-36, 36]);
  const gazeAngleY = useTransform(springY, [-100, 160], [-18, 28]);

  // HUD opacity state (15% to 100%)
  const [hudOpacity, setHudOpacity] = useState(85);
  // Click through state
  const [isClickThrough, setIsClickThrough] = useState(false);
  // Panic disguise toggle
  const [isPanic, setIsPanic] = useState(false);
  // Is snapped to top webcam anchor
  const [isSnapped, setIsSnapped] = useState(true);

  // Snap HUD directly back under webcam
  const snapToWebcam = () => {
    x.set(0);
    y.set(0);
    setIsSnapped(true);
    playLockSound();
  };

  // On drag update
  const handleDrag = () => {
    const curX = x.get();
    const curY = y.get();
    const distFromCenter = Math.hypot(curX, curY);

    if (distFromCenter < 35) {
      if (!isSnapped) {
        setIsSnapped(true);
        playLockSound();
      }
    } else {
      if (isSnapped) {
        setIsSnapped(false);
        playClickSound();
      }
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header Hook */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-mono text-emerald-400 flex items-center gap-2 uppercase tracking-wider">
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isUa ? "Фізика погляду та розташування вікна" : "Gaze Physics & Magnetic Window Anchoring"}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-white mt-1">
            {isUa ? "Перетягніть суфлер: перевірте магнітний замок 0.8°" : "Drag the Teleprompter: Test 0.8° Magnetic Snapping"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">
            {isUa
              ? "Спробуйте схопити вікно суфлера мишкою та перемістити. Поки воно примагнічене під камерою — контакт з інтерв'юером сталевий (100%). Відведіть убік — і погляд миттєво видасть вас."
              : "Grab and drag the floating HUD. When snapped under the camera, your eye contact is 100% natural. Drag it sideways and see your pupils dart off-axis."}
          </p>
        </div>

        {/* Snap to Webcam Reset Button */}
        <button
          onClick={snapToWebcam}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 border ${
            isSnapped
              ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
              : "bg-white text-black hover:bg-zinc-200 shadow-md"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isSnapped ? (isUa ? "0.8° Замок активний" : "0.8° Locked Under Camera") : (isUa ? "Примагнітити до камери" : "Snap to Camera")}</span>
        </button>
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-stretch">
        {/* Stage Viewport */}
        <div
          ref={containerRef}
          className="relative min-h-[440px] rounded-2xl border border-white/10 bg-zinc-950/90 overflow-hidden flex flex-col justify-between p-6 shadow-2xl"
        >
          {/* Subtle Grid Backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* 1. TOP MACBOOK BEZEL & WEBCAM */}
          <div className="relative w-full flex flex-col items-center z-10 pointer-events-none">
            <div className="px-5 py-1.5 rounded-full bg-black/90 border border-white/15 flex items-center gap-3 shadow-xl backdrop-blur-md">
              <div className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-700 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-950 border border-emerald-500/60 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                </div>
              </div>
              <span className="text-[11px] font-mono text-zinc-300 font-semibold tracking-wide">
                FaceTime HD 1080p Lens
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                ACTIVE
              </span>
            </div>

            {/* Target Snap Zone Guide */}
            <div
              className={`mt-2 px-3 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                isSnapped
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-semibold shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                  : "bg-white/[0.02] border-dashed border-white/10 text-zinc-500"
              }`}
            >
              {isSnapped
                ? (isUa ? "✓ 0.8° Оптичний конус: погляд точно в очі співрозмовника" : "✓ 0.8° Optical Cone: Direct Natural Eye Contact")
                : (isUa ? "Піднесіть суфлер сюди для магнітного замка" : "Drag prompter here to snap under webcam")}
            </div>
          </div>

          {/* 2. DRAGGABLE FLOATING PROMPTER WINDOW (PHYSICS) */}
          <div className="relative flex-1 flex items-center justify-center my-4 z-20">
            <motion.div
              drag
              dragConstraints={containerRef}
              dragElastic={0.08}
              style={{ x, y }}
              onDrag={handleDrag}
              className={`w-full max-w-md rounded-2xl border transition-shadow cursor-grab active:cursor-grabbing ${
                isSnapped
                  ? "border-emerald-500/50 shadow-[0_0_35px_rgba(52,211,153,0.2)]"
                  : "border-white/20 shadow-2xl"
              }`}
              animate={{
                backgroundColor: isPanic
                  ? "rgba(0, 0, 0, 0.98)"
                  : `rgba(9, 9, 11, ${hudOpacity / 100})`,
                backdropFilter: `blur(${Math.round((hudOpacity / 100) * 24)}px)`,
              }}
            >
              {/* Window Titlebar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.03] text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="ml-2 font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Move className="w-3 h-3 text-zinc-400" />
                    <span>{isPanic ? "Terminal — cargo build" : "Ghostboard Live HUD"}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      isSnapped
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {isSnapped ? "0.8° LOCKED" : "OFF-AXIS"}
                  </span>
                </div>
              </div>

              {/* Window Content */}
              {!isPanic ? (
                <div className="p-4 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="text-emerald-400 font-semibold">PostgreSQL MVCC & Autovacuum</span>
                    <span className="text-zinc-500 text-[10px]">600ms STREAM</span>
                  </div>

                  <div className="space-y-1.5 text-zinc-200 text-[11px] leading-relaxed pt-1">
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-400 shrink-0">•</span>
                      <span><b>Autovacuum scale factor:</b> знизити з 0.20 до 0.05, вакуумний cost_limit = 2000.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-400 shrink-0">•</span>
                      <span><b>HOT Updates:</b> усувають спліт B-Tree сторінок при зміні неіндексованих колонок.</span>
                    </p>
                    <p className="flex items-start gap-1.5">
                      <span className="text-emerald-400 shrink-0">•</span>
                      <span><b>Online Repack:</b> використовувати pg_repack без ексклюзивних ACCESS EXCLUSIVE локів.</span>
                    </p>
                  </div>

                  {/* Window Bottom Micro-Controls */}
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/[0.08] text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3 h-3 text-zinc-400" />
                      <span>{isUa ? "Прозорість:" : "Opacity:"} {hudOpacity}%</span>
                    </span>
                    <button
                      onClick={() => {
                        setIsPanic(true);
                        playLockSound();
                      }}
                      className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      {isUa ? "Тест паніки [ESC]" : "Panic Disguise [ESC]"}
                    </button>
                  </div>
                </div>
              ) : (
                /* Panic Disguise Terminal Output */
                <div className="p-4 space-y-1 text-[11px] font-mono text-green-400 bg-black/90">
                  <div className="text-zinc-500 pb-1">$ cargo test --workspace --release</div>
                  <div>running 42 tests</div>
                  <div>test storage::mvcc::tests::test_vacuum_scale_factor ... <span className="text-emerald-400 font-bold">ok</span></div>
                  <div>test cluster::consensus::tests::test_redlock_quorum ... <span className="text-emerald-400 font-bold">ok</span></div>
                  <div className="pt-2 text-zinc-400 flex items-center justify-between">
                    <span>test result: ok. 42 passed; 0 failed</span>
                    <button
                      onClick={() => setIsPanic(false)}
                      className="px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/40 cursor-pointer text-[10px]"
                    >
                      {isUa ? "Відновити суфлер" : "Restore HUD"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* 3. BOTTOM WORKSPACE FOOTER */}
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pt-3 border-t border-white/[0.08] z-10">
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSnapped ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span>{isSnapped ? (isUa ? "Позиція: прямо під вебкою" : "Snapped: Sub-bezel Sweetspot") : (isUa ? "Позиція: зміщено вбік" : "Position: Off-Axis")}</span>
            </span>
            <span className="text-[11px] text-zinc-500">
              {isUa ? "Спробуйте потягнути вікно мишкою" : "Drag prompter anywhere with physics"}
            </span>
          </div>
        </div>

        {/* Right Telemetry & Logic Panel */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Card 1: Interviewer Trust & Gaze Angle Gauge */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 border-b border-white/[0.06]">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isUa ? "ДОВІРА ІНТЕРВ'ЮЕРА" : "INTERVIEWER TRUST"}</span>
              </span>
              <span className={`font-bold ${isSnapped ? "text-emerald-400" : "text-amber-400"}`}>
                {isSnapped ? "99% ВПЕВНЕНО" : "24% ПІДОЗРА"}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>{isUa ? "Відхилення зіниць від камери:" : "Pupil Gaze Deviation:"}</span>
                <span className={`font-bold ${isSnapped ? "text-emerald-400" : "text-amber-400"}`}>
                  {isSnapped ? "0.8° (Ідеально)" : "34.2° (Читання вбік)"}
                </span>
              </div>

              {/* Progress Meter */}
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className={`h-full transition-all duration-200 ${
                    isSnapped ? "w-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "w-1/4 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                  }`}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-sans text-zinc-300 italic leading-relaxed">
              {isSnapped
                ? (isUa
                    ? "«Кандидат виглядає бездоганно. Прямий спокійний зоровий контакт прямо у камеру, без жодних бігань очима.»"
                    : "«Candidate maintains solid, direct eye contact. Zero pupil darting or unnatural head turns.»")
                : (isUa
                    ? "«Зіниці відхилені вбік. Кандидат читає підказки з іншого вікна або другого монітора.»"
                    : "«Pupils darting off-axis. Candidate seems to be glancing at external notes or browser.»")}
            </div>
          </div>

          {/* Card 2: Interactive Tactile Sliders */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-4">
            <span className="text-xs font-mono text-zinc-400 block pb-2 border-b border-white/[0.06] uppercase">
              {isUa ? "Тактильні налаштування скла" : "Tactile HUD Adjustments"}
            </span>

            {/* Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-400">{isUa ? "Прозорість Obsidian Glass:" : "Obsidian Glass Opacity:"}</span>
                <span className="text-white font-bold">{hudOpacity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={hudOpacity}
                onChange={(e) => setHudOpacity(Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            {/* Click-Through Toggle */}
            <div className="flex items-center justify-between pt-2 text-xs font-mono">
              <div>
                <div className="text-white font-medium">{isUa ? "Режим наскрізного кліку" : "Click-Through Mode"}</div>
                <div className="text-[10px] text-zinc-500">{isUa ? "Кліки проходять у код під HUD" : "Clicks pass through to IDE"}</div>
              </div>
              <button
                onClick={() => {
                  setIsClickThrough(!isClickThrough);
                  playClickSound();
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isClickThrough ? "bg-emerald-500" : "bg-zinc-800"
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    isClickThrough ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 3: Key Takeaway */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 font-sans leading-relaxed">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {isUa
                  ? "Ghostboard проектує тези в межах 0.8° під лінзою. Ви читаєте підказки, а співрозмовник бачить 100% впевнений погляд."
                  : "Ghostboard projects prompts within 0.8° under the webcam. You read answers while looking 100% confident."}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
