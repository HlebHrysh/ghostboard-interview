'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Zap,
  Headphones,
  MicOff,
  Mic,
  Smartphone,
  Webcam,
  ArrowUpRight,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { useLocale } from '@/contexts/LocaleContext';
import { SpatialVideoCapsule } from '@/components/ui/SpatialVideoCapsule';

interface Props {
  t: HomeTranslations;
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 26 };

function setSpotlightCoords(e: React.PointerEvent<HTMLElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
}

export function EngineeringBentoGrid({ t }: Props) {
  const { locale } = useLocale();
  const isUa = locale === 'ua';

  // Widget 1: Latency Race state
  const [raceSeed, setRaceSeed] = useState(1);

  // Widget 2: Audio Router state
  const [audioMode, setAudioMode] = useState<'loopback' | 'dual'>('loopback');

  // Widget 3: Companion preview font size state
  const [phoneFontLg, setPhoneFontLg] = useState(false);

  return (
    <section id="features" className="relative py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t.bento.badge}</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            {t.bento.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-300 leading-relaxed">
            {t.bento.subtitle}
          </p>
        </div>

        {/* Interactive Awwwards Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* CARD 1: OS Kernel Stealth + Live Video PiP Switcher (Span 7) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={SPRING}
            onPointerMove={setSpotlightCoords}
            className="bento-card lg:col-span-7 rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-300 font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t.bento.cardKernel.tag}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {t.bento.cardKernel.badge}
                </span>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                {t.bento.cardKernel.title}
              </h3>

              <p className="text-sm text-zinc-300 leading-relaxed">
                {isUa
                  ? 'Суфлер апаратно виключено з відеопотоку Zoom, Google Meet, Teams і Discord — на шарингу екрана видно лише ваш редактор коду.'
                  : 'Hardware-excluded from Zoom, Google Meet, Teams, and Discord screen captures while staying razor-sharp to your eyes.'}
              </p>
            </div>

            <SpatialVideoCapsule
              videos={[
                {
                  id: 'bento-ghost',
                  src: '/videos/ghost.mp4',
                  label: isUa ? 'Stealth Overlay Preview' : 'Stealth Overlay Preview',
                  caption: 'WDA_EXCLUDEFROMCAPTURE · NSWindowSharingNone',
                },
                {
                  id: 'bento-ghost2',
                  src: '/videos/ghost2.mp4',
                  label: isUa ? 'Демо обходу запису' : 'Zero Screen Share Leak',
                  caption: isUa ? 'Повна ізоляція композитора ОС' : 'OS Compositor Window Isolation',
                },
              ]}
              layoutGroupId="bento-stealth-video"
              aspectClassName="h-44 sm:h-48"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{t.bento.cardKernel.metric}</span>
              </div>
              <span className="text-xs font-mono text-zinc-400">WS_EX_TRANSPARENT Click-Through</span>
            </div>
          </motion.div>

          {/* CARD 2: WIDGET 1 — Live Latency Race Comparison (Span 5) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: 0.05 }}
            onPointerMove={setSpotlightCoords}
            className="bento-card lg:col-span-5 rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25">
                  <Zap className="w-3.5 h-3.5" />
                  Edge Latency Race
                </span>
                <button
                  type="button"
                  onClick={() => setRaceSeed((s) => s + 1)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-xs font-mono text-white cursor-pointer transition-colors"
                >
                  <RotateCw className="w-3 h-3 text-emerald-300" />
                  <span>{isUa ? 'Повторити тест' : 'Replay Race'}</span>
                </button>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isUa ? 'Реакція за 180 мс без незручних пауз' : '180ms TTFT Before You Finish Exhaling'}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isUa
                  ? 'Стрімінг Deepgram Nova-3 + Gemini Flash починає друкувати Phase 1 (Hook) доки стандартні інструменти лише чекають кінця фрази.'
                  : 'Deepgram Nova-3 + Gemini Flash edge streaming displays Phase 1 before traditional tools even finish buffering.'}
              </p>
            </div>

            {/* Interactive Comparison Bars */}
            <div
              key={raceSeed}
              className="rounded-2xl bg-black/50 border border-white/10 p-4 space-y-4 shadow-inner"
            >
              {/* Ghostboard track */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                    Ghostboard Engine
                  </span>
                  <span className="text-emerald-300 font-bold tabular-nums">⚡ 180 ms</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden p-0.5 border border-white/[0.08]">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 shadow-[0_0_14px_rgba(52,211,153,0.65)]"
                  />
                </div>
                <div className="text-xs font-mono text-emerald-300/90">
                  ✓ Phase 1 (Hook) готовий — читайте вголос
                </div>
              </div>

              {/* Legacy AI track */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Звичайний ChatGPT / Whisper</span>
                  <span className="text-zinc-400 tabular-nums">2 400+ ms</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/[0.04] overflow-hidden p-0.5 border border-white/[0.06]">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '78%' }}
                    transition={{ duration: 2.4, ease: 'linear' }}
                    className="h-full rounded-full bg-zinc-600"
                  />
                </div>
                <div className="text-xs font-mono text-zinc-500">
                  ⏳ Чекає завершення тиші та повної відповіді…
                </div>
              </div>
            </div>

            <div className="text-xs font-mono text-zinc-400">
              Deepgram Nova-3 16kHz PCM · Gemini Edge Streaming
            </div>
          </motion.div>

          {/* CARD 3: WIDGET 2 — Interactive Audio Router + /videos/headphones.mp4 (Span 6) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: 0.1 }}
            onPointerMove={setSpotlightCoords}
            className="bento-card lg:col-span-6 rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-300 font-semibold px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25">
                  <Headphones className="w-3.5 h-3.5" />
                  Audio Router
                </span>

                {/* Spring Channel Switcher */}
                <div className="inline-flex p-1 rounded-xl bg-black/50 border border-white/10">
                  {[
                    { id: 'loopback' as const, label: 'Interviewer Loopback' },
                    { id: 'dual' as const, label: 'Dual Channel' },
                  ].map((opt) => {
                    const active = audioMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAudioMode(opt.id)}
                        className={`relative px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                          active ? 'text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="bento-audio-router-pill"
                            transition={SPRING}
                            className="absolute inset-0 rounded-lg bg-white"
                          />
                        )}
                        <span className="relative z-10">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isUa ? 'Чує тільки рекрутера — ігнорує ваш голос' : 'Hears Only the Interviewer — Ignores Your Voice'}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {audioMode === 'loopback'
                  ? isUa
                    ? 'Системний loopback забирає потік із навушників/вкладки Zoom, а ваш мікрофон ізольовано — ШІ ніколи не реагує на ваші відповіді.'
                    : 'Loopback captures the meeting audio stream cleanly while isolating your own mic to prevent self-triggers.'
                  : isUa
                  ? 'Опціональний режим 2 каналів для запису повного діалогу у ваш особистий Post-Interview скоркард.'
                  : 'Optional dual-channel stream logs both speakers directly into your Post-Interview scorecard.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
              {/* Interactive Channel Meters */}
              <div className="sm:col-span-7 rounded-2xl bg-black/50 border border-white/10 p-4 flex flex-col justify-between gap-3">
                {/* Interviewer Channel */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="inline-flex items-center gap-1.5 text-sky-300 font-semibold">
                      <Headphones className="w-3.5 h-3.5" />
                      Interviewer (System)
                    </span>
                    <span className="text-emerald-300">ACTIVE STREAM</span>
                  </div>
                  <div className="flex items-end gap-1 h-7 px-2 rounded-lg bg-white/[0.03] border border-white/[0.06] py-1">
                    {[38, 72, 95, 64, 88, 52, 90, 44, 78, 60, 82, 46].map((h, i) => (
                      <motion.span
                        key={i}
                        animate={{ height: [`${Math.max(20, h * 0.4)}%`, `${h}%`, `${Math.max(25, h * 0.5)}%`] }}
                        transition={{ duration: 0.9 + i * 0.08, repeat: Infinity, ease: 'easeInOut' }}
                        className="flex-1 rounded-full bg-gradient-to-t from-sky-400 to-emerald-300"
                      />
                    ))}
                  </div>
                </div>

                {/* Candidate Mic Channel */}
                <div className="space-y-1.5 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="inline-flex items-center gap-1.5 text-zinc-300">
                      {audioMode === 'loopback' ? (
                        <MicOff className="w-3.5 h-3.5 text-zinc-400" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-emerald-300" />
                      )}
                      Candidate Mic
                    </span>
                    <span className={audioMode === 'loopback' ? 'text-zinc-400' : 'text-emerald-300'}>
                      {audioMode === 'loopback' ? 'MUTED FOR AI' : 'LOGGED ONLY'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        audioMode === 'loopback' ? 'w-[4%] bg-zinc-500' : 'w-[58%] bg-emerald-400/75'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Embedded Headphones Mini-Video PiP */}
              <div className="sm:col-span-5">
                <SpatialVideoCapsule
                  videos={[
                    {
                      id: 'audio-headphones',
                      src: '/videos/headphones.mp4',
                      label: 'Loopback Capture',
                    },
                  ]}
                  layoutGroupId="bento-headphones-video"
                  compact
                  aspectClassName="h-32 sm:h-full min-h-[120px]"
                />
              </div>
            </div>
          </motion.div>

          {/* CARD 4: WIDGET 3 — Mobile Eyeline Companion OLED Frame (Span 6) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...SPRING, delay: 0.15 }}
            onPointerMove={setSpotlightCoords}
            className="bento-card lg:col-span-6 rounded-3xl p-6 sm:p-7 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-violet-300 font-semibold px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25">
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile Eyeline Companion
                </span>

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPhoneFontLg((v) => !v)}
                    className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-xs font-mono text-zinc-200 hover:text-white cursor-pointer transition-colors"
                  >
                    {phoneFontLg ? 'Text: Large' : 'Text: Normal'}
                  </button>
                </div>
              </div>

              <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isUa ? 'Смартфон прямо під камерою — 100% зоровий контакт' : 'Phone Under Your Webcam — Zero Gaze Drift'}
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {isUa
                  ? 'Синхронізуйте OLED-суфлер зі смартфоном по QR-коду за 2 секунди: під час важких питань текст підказок пливе прямо біля обʼєктива.'
                  : 'Pair your phone via QR in 2 seconds: high-contrast OLED teleprompter phrases mirror instantaneously right beneath your camera lens.'}
              </p>
            </div>

            {/* Interactive Webcam + OLED Smartphone Preview */}
            <div className="rounded-2xl bg-black/55 border border-white/10 p-4 flex flex-col items-center gap-3 relative overflow-hidden">
              {/* Simulated Webcam Sensor */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 text-xs font-mono text-zinc-300">
                <Webcam className="w-3.5 h-3.5 text-emerald-400" />
                <span>Webcam Lens · 0.8° Gaze Angle</span>
              </div>

              {/* OLED Phone Frame */}
              <div className="w-full max-w-md rounded-2xl bg-[#020305] border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_16px_40px_rgba(0,0,0,0.9)] p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SYNCED · 12ms
                  </span>
                  <span className="text-zinc-500">OLED Black Mode</span>
                </div>
                <p
                  className={`font-sans font-medium text-white leading-snug border-l-2 border-emerald-400 pl-3 transition-all ${
                    phoneFontLg ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
                  }`}
                >
                  {isUa
                    ? '«Ми використовуємо Redis NX-блокування з TTL + SERIALIZABLE транзакцію в PostgreSQL, щоб гарантувати ідемпотентність.»'
                    : '"We combine a Redis NX lock with a SERIALIZABLE PostgreSQL transaction to enforce strict idempotency."'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs font-mono text-zinc-400">Real-time SSE Sync · WebSocket Fallback</span>
              <Link
                href="/download"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-white hover:text-emerald-300 transition-colors"
              >
                <span>{isUa ? 'Підключити телефон' : 'Pair Mobile Companion'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
