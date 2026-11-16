'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Apple,
  Monitor,
  Terminal,
  Zap,
} from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

type ClientPlatform = 'mac-arm' | 'mac-intel' | 'windows' | 'linux';

const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 300, damping: 26 };

const AMBIENT_MOTES = [
  { id: 1, x: '16%', y: '72%', delay: 0, duration: 5.2, size: 'w-1.5 h-1.5 bg-violet-400/75' },
  { id: 2, x: '82%', y: '66%', delay: 1.1, duration: 6.0, size: 'w-1.5 h-1.5 bg-emerald-400/75' },
  { id: 3, x: '24%', y: '30%', delay: 0.7, duration: 5.8, size: 'w-1 h-1 bg-sky-300/80' },
  { id: 4, x: '76%', y: '26%', delay: 2.0, duration: 6.4, size: 'w-1.5 h-1.5 bg-violet-300/70' },
  { id: 5, x: '48%', y: '14%', delay: 1.5, duration: 5.5, size: 'w-1 h-1 bg-emerald-300/80' },
  { id: 6, x: '64%', y: '80%', delay: 0.4, duration: 6.2, size: 'w-1 h-1 bg-white/60' },
];

export function LandingHero({ t }: Props) {
  const { locale } = useLocale();
  const isUa = locale === 'ua';

  const [platform, setPlatform] = useState<ClientPlatform>('windows');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  // Interactive 3D Pointer Parallax & Cursor Halo for Open Ghost Logo Stage
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const springX = useSpring(pointerX, { stiffness: 220, damping: 24 });
  const springY = useSpring(pointerY, { stiffness: 220, damping: 24 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-16, 16]);
  const ghostShiftX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const ghostShiftY = useTransform(springY, [-0.5, 0.5], [-16, 16]);
  const ringShiftX = useTransform(springX, [-0.5, 0.5], [14, -14]);
  const ringShiftY = useTransform(springY, [-0.5, 0.5], [12, -12]);
  const badgeShiftX = useTransform(springX, [-0.5, 0.5], [24, -24]);
  const badgeShiftY = useTransform(springY, [-0.5, 0.5], [16, -16]);
  const haloLeft = useTransform(springX, [-0.5, 0.5], ['25%', '75%']);
  const haloTop = useTransform(springY, [-0.5, 0.5], ['25%', '75%']);

  useEffect(() => {
    setMounted(true);
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) {
      setPlatform('mac-arm');
    } else if (ua.includes('linux')) {
      setPlatform('linux');
    } else {
      setPlatform('windows');
    }
  }, []);

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    pointerX.set(Math.max(-0.5, Math.min(0.5, nx)));
    pointerY.set(Math.max(-0.5, Math.min(0.5, ny)));
  };

  const handleStageMouseLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const getPlatformLabel = () => {
    switch (platform) {
      case 'mac-arm':
        return t.downloadCta.osNames.macArm;
      case 'mac-intel':
        return t.downloadCta.osNames.macIntel;
      case 'linux':
        return t.downloadCta.osNames.linux;
      default:
        return t.downloadCta.osNames.windows;
    }
  };

  const getPlatformDownloadUrl = (plat: ClientPlatform) => {
    switch (plat) {
      case 'mac-arm':
        return '/api/download?os=mac-arm64';
      case 'mac-intel':
        return '/api/download?os=mac-intel';
      case 'linux':
        return '/api/download?os=linux';
      default:
        return '/api/download?os=win';
    }
  };

  const handleDownloadClick = (plat: ClientPlatform) => {
    trackFunnelEvent('hero_cta_download_clicked', {
      locale,
      os: plat,
      target: getPlatformDownloadUrl(plat),
    });
  };

  return (
    <section className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
      {/* Ambient Radial Aura keeping global BlackHoleCanvas background visible */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[960px] h-[520px] bg-gradient-to-b from-violet-500/12 via-emerald-500/8 to-transparent blur-[130px] -z-10"
      />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center">
          {/* LEFT COLUMN: Precision Editorial Copy & Magnetic Actions */}
          <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Stealth Status Pill */}
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SNAPPY}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/12 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_8px_24px_rgba(0,0,0,0.45)] text-xs text-zinc-200 mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="font-mono tracking-tight font-medium">
                {t.hero.badge}
              </span>
            </motion.div>

            {/* High-Contrast Typographic H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.05 }}
              className="font-display text-4xl sm:text-5xl xl:text-[3.75rem] font-extrabold tracking-[-0.035em] text-white leading-[1.05]"
            >
              {t.hero.title}{' '}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">
                {t.hero.titleAccent}
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.1 }}
              className="mt-5 text-base sm:text-lg text-zinc-300 max-w-xl leading-relaxed"
            >
              <span className="block font-medium text-zinc-100">
                {isUa
                  ? 'Невидимий для рекрутерів телесуфлер на рівні ядра ОС.'
                  : 'Undetectable OS-level prompter for live technical interviews.'}
              </span>
              <span className="block text-zinc-400 mt-1.5">
                {isUa
                  ? 'Миттєві відповіді за вашим резюме за ~180 мс прямо під вебкамерою.'
                  : 'Instant resume-tailored answers in ~180ms right under your webcam.'}
              </span>
            </motion.p>

            {/* Primary Magnetic Actions */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.15 }}
              className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto"
            >
              {/* Action 1: Smart OS-Aware Download Button with Dropdown */}
              <div className="relative">
                <motion.div
                  data-magnetic
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_SNAPPY}
                  className="flex items-center rounded-2xl bg-white text-zinc-950 shadow-[0_0_40px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_0_56px_rgba(255,255,255,0.3)] transition-shadow"
                >
                  <a
                    href={getPlatformDownloadUrl(platform)}
                    onClick={() => handleDownloadClick(platform)}
                    className="flex-1 flex items-center justify-center sm:justify-start gap-3 px-5 py-3.5 font-semibold text-sm cursor-pointer"
                  >
                    {platform.startsWith('mac') ? (
                      <Apple className="w-5 h-5 text-zinc-950 shrink-0" />
                    ) : platform === 'linux' ? (
                      <Terminal className="w-5 h-5 text-zinc-950 shrink-0" />
                    ) : (
                      <Monitor className="w-5 h-5 text-zinc-950 shrink-0" />
                    )}
                    <div className="text-left">
                      <span className="block text-[11px] uppercase tracking-wider text-zinc-600 font-mono leading-none">
                        {t.downloadCta.detectedOsPrefix}
                      </span>
                      <span className="font-display text-sm sm:text-base font-bold text-zinc-950 leading-tight">
                        {mounted ? getPlatformLabel() : t.hero.ctaPrimary}
                      </span>
                    </div>
                  </a>

                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="px-3.5 py-4 border-l border-zinc-200 hover:bg-zinc-100 rounded-r-2xl transition-colors cursor-pointer text-zinc-700"
                    aria-label="Select alternative platform"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </motion.div>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={SPRING_SNAPPY}
                      className="absolute top-full left-0 right-0 sm:right-auto sm:w-72 mt-2 py-2 bg-[#0b0d12]/95 border border-white/12 rounded-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl z-50 text-left"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                        {t.downloadCta.secondaryDownloadsLabel}
                      </div>
                      {(['mac-arm', 'mac-intel', 'windows', 'linux'] as ClientPlatform[]).map((p) => (
                        <a
                          key={p}
                          href={getPlatformDownloadUrl(p)}
                          onClick={() => {
                            setPlatform(p);
                            setDropdownOpen(false);
                            handleDownloadClick(p);
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/[0.08] transition-colors ${
                            platform === p ? 'text-emerald-400 font-semibold' : 'text-zinc-200'
                          }`}
                        >
                          {p.startsWith('mac') ? (
                            <Apple className="w-4 h-4" />
                          ) : p === 'linux' ? (
                            <Terminal className="w-4 h-4" />
                          ) : (
                            <Monitor className="w-4 h-4" />
                          )}
                          <span>
                            {p === 'mac-arm'
                              ? t.downloadCta.osNames.macArm
                              : p === 'mac-intel'
                              ? t.downloadCta.osNames.macIntel
                              : p === 'linux'
                              ? t.downloadCta.osNames.linux
                              : t.downloadCta.osNames.windows}
                          </span>
                        </a>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action 2: Launch Copilot in Browser */}
              <motion.div
                data-magnetic
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING_SNAPPY}
              >
                <Link
                  href="/interview"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/14 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_12px_32px_rgba(0,0,0,0.45)] text-sm font-semibold text-white transition-colors backdrop-blur-xl cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{isUa ? 'Запустити Копайлот' : 'Launch Copilot'}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Safety Subtext */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs text-zinc-400"
            >
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {t.hero.proofSafety}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 font-mono">{t.downloadCta.versionInfo}</span>
            </motion.div>

            {/* Compact Telemetry Strip */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.3 }}
              className="mt-8 w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5"
            >
              {[
                {
                  val: t.hero.proofCounters.metric1Value,
                  label: t.hero.proofCounters.metric1Label,
                },
                {
                  val: t.hero.proofCounters.metric2Value,
                  label: t.hero.proofCounters.metric2Label,
                },
                {
                  val: t.hero.proofCounters.metric3Value,
                  label: t.hero.proofCounters.metric3Label,
                },
                {
                  val: t.hero.proofCounters.metric4Value,
                  label: t.hero.proofCounters.metric4Label,
                },
              ].map((metric, idx) => (
                <div
                  key={idx}
                  className="bento-card p-3 sm:p-3.5 rounded-2xl text-center lg:text-left"
                >
                  <div className="font-display tabular-nums text-lg sm:text-xl font-extrabold tracking-tight text-white">
                    {metric.val}
                  </div>
                  <div className="text-xs font-medium text-zinc-400 mt-0.5 leading-snug">
                    {metric.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Open Monumental Ghost Logo Mascot with Spatial Orbitals & Interactive Effects */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <div
              ref={stageRef}
              onMouseMove={handleStageMouseMove}
              onMouseLeave={handleStageMouseLeave}
              onClick={() => setPulseCount((c) => c + 1)}
              title={isUa ? 'Клікніть по Ghostboard для імпульсу стелсу' : 'Click for stealth spectral pulse'}
              className="relative w-full max-w-[500px] h-[390px] sm:h-[470px] lg:h-[520px] flex items-center justify-center cursor-pointer select-none"
              style={{ perspective: 1200 }}
            >
              {/* Reactive Cursor-Tracking Spectral Nebula Halo */}
              <motion.div
                aria-hidden="true"
                style={{ left: haloLeft, top: haloTop }}
                animate={{
                  scale: [1, 1.12, 1],
                  opacity: [0.55, 0.78, 0.55],
                }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] rounded-full bg-gradient-to-tr from-violet-600/30 via-fuchsia-500/20 to-emerald-400/25 blur-[90px]"
              />

              {/* Gyroscope Outer Orbit Ring (Depth Layer -1) */}
              <motion.div
                aria-hidden="true"
                style={{ x: ringShiftX, y: ringShiftY }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
                  className="relative w-[300px] h-[300px] sm:w-[390px] sm:h-[390px] rounded-full border border-white/[0.08]"
                >
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.95)]" />
                  <span className="absolute bottom-8 right-6 w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.95)]" />
                </motion.div>

                {/* Counter-rotating Inner Dashed Scanner Circle */}
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute w-[240px] h-[240px] sm:w-[310px] sm:h-[310px] rounded-full border border-dashed border-violet-300/18"
                />

                {/* Inclined 3D Orbital Belt */}
                <motion.div
                  animate={{ rotateZ: [-14, -10, -14] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ rotateX: 72 }}
                  className="absolute w-[330px] h-[330px] sm:w-[420px] sm:h-[420px] rounded-full border border-emerald-400/20 shadow-[0_0_30px_rgba(52,211,153,0.1)]"
                />
              </motion.div>

              {/* Ambient Spectral Particle Motes */}
              {AMBIENT_MOTES.map((mote) => (
                <motion.span
                  key={mote.id}
                  aria-hidden="true"
                  style={{ left: mote.x, top: mote.y }}
                  animate={{
                    y: [0, -34, -64],
                    opacity: [0, 0.9, 0],
                    scale: [0.6, 1.15, 0.4],
                  }}
                  transition={{
                    duration: mote.duration,
                    delay: mote.delay,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                  className={`pointer-events-none absolute rounded-full blur-[0.5px] ${mote.size}`}
                />
              ))}

              {/* Interactive Click Spectral Shockwave Ripples */}
              <AnimatePresence>
                {pulseCount > 0 && (
                  <motion.div
                    key={pulseCount}
                    aria-hidden="true"
                    initial={{ scale: 0.4, opacity: 0.75 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-violet-300/60 shadow-[0_0_40px_rgba(167,139,250,0.45)]"
                  />
                )}
              </AnimatePresence>

              {/* Main Large 3D Ghost PNG Logo Subject */}
              <motion.div
                style={{
                  x: ghostShiftX,
                  y: ghostShiftY,
                  rotateX,
                  rotateY,
                  transformStyle: 'preserve-3d',
                }}
                whileTap={{ scale: 0.96 }}
                className="relative z-10 flex flex-col items-center justify-center"
              >
                <motion.div
                  animate={{
                    y: [0, -18, 4, -12, 0],
                    rotateZ: [-2.2, 2.2, -1.2, 1.8, -2.2],
                    rotateY: [-5, 5, -3, 4, -5],
                    scale: [1, 1.028, 0.995, 1.02, 1],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="relative"
                >
                  {/* Chromatic aura bloom tightly hugging the ghost PNG */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-8 rounded-full bg-gradient-to-tr from-violet-500/35 via-indigo-400/20 to-emerald-400/25 blur-3xl opacity-80"
                  />

                  <img
                    src="/ghost-transparent.png"
                    alt="Ghostboard Holographic Mascot Logo"
                    draggable={false}
                    className="relative z-10 w-64 h-64 sm:w-80 sm:h-80 lg:w-[410px] lg:h-[410px] object-contain drop-shadow-[0_32px_65px_rgba(139,92,246,0.42)]"
                  />
                </motion.div>

                {/* Synchronized Floor Levitation Shadow */}
                <motion.div
                  animate={{
                    scale: [1, 0.78, 1.02, 0.84, 1],
                    opacity: [0.6, 0.25, 0.55, 0.3, 0.6],
                  }}
                  transition={{
                    duration: 7,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  aria-hidden="true"
                  className="w-48 sm:w-64 h-6 rounded-full bg-gradient-to-r from-violet-500/45 via-emerald-400/30 to-sky-400/40 blur-xl -mt-3"
                />
              </motion.div>

              {/* Minimal Parallax Telemetry Badges (Open Floating Glass Pills) */}
              <motion.div
                style={{ x: badgeShiftX, y: badgeShiftY }}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0c0f16]/75 border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_14px_34px_rgba(0,0,0,0.6)] absolute top-10 left-2 sm:left-4 z-20 pointer-events-none"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono text-zinc-100">~180ms Edge Stream</span>
              </motion.div>

              <motion.div
                style={{ x: ringShiftX, y: badgeShiftY }}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#0c0f16]/75 border border-white/15 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_14px_34px_rgba(0,0,0,0.6)] absolute bottom-16 right-0 sm:right-2 z-20 pointer-events-none"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-violet-300" />
                <span className="text-xs font-mono text-zinc-100">0% Screen Capture</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
