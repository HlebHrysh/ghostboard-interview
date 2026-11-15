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
  Zap,
  Sparkles,
  Apple,
  Monitor,
  Terminal,
  Code2,
  AudioLines,
  Cpu,
  EyeOff,
} from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';
import { SpatialVideoCapsule, type SpatialVideoItem } from '@/components/ui/SpatialVideoCapsule';

interface Props {
  t: HomeTranslations;
}

type ClientPlatform = 'mac-arm' | 'mac-intel' | 'windows' | 'linux';

interface GhostModeItem {
  id: 'stealth' | 'coding' | 'voice' | 'speed' | 'hud';
  label: string;
  image: string;
  isHudFrame?: boolean;
  chipTitle: string;
  chipMetric: string;
  glowClass: string;
  icon: React.ReactNode;
}

const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 300, damping: 26 };

export function LandingHero({ t }: Props) {
  const { locale } = useLocale();
  const isUa = locale === 'ua';

  const [platform, setPlatform] = useState<ClientPlatform>('windows');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeModeIndex, setActiveModeIndex] = useState(0);

  // 3D Pointer Parallax for Levitating Ghost Stage
  const stageRef = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const springX = useSpring(pointerX, { stiffness: 300, damping: 26 });
  const springY = useSpring(pointerY, { stiffness: 300, damping: 26 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-12, 12]);
  const ghostShiftX = useTransform(springX, [-0.5, 0.5], [-14, 14]);
  const ghostShiftY = useTransform(springY, [-0.5, 0.5], [-10, 10]);
  const badgeShiftX = useTransform(springX, [-0.5, 0.5], [18, -18]);
  const badgeShiftY = useTransform(springY, [-0.5, 0.5], [12, -12]);

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

  const ghostModes: GhostModeItem[] = [
    {
      id: 'stealth',
      label: 'Stealth',
      image: '/ghost-transparent.png',
      chipTitle: isUa ? 'Апаратна невидимість' : 'Hardware Stealth',
      chipMetric: 'WDA_EXCLUDEFROMCAPTURE',
      glowClass: 'from-violet-500/35 via-indigo-500/20 to-emerald-500/25',
      icon: <EyeOff className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'coding',
      label: 'Coding',
      image: '/hero-ghost.png',
      chipTitle: isUa ? 'Алгоритми та Live Code' : 'Live Code & LeetCode',
      chipMetric: 'DOM + OCR Instant',
      glowClass: 'from-fuchsia-500/35 via-violet-500/25 to-cyan-500/20',
      icon: <Code2 className="w-3.5 h-3.5 text-violet-300" />,
    },
    {
      id: 'voice',
      label: 'Voice',
      image: '/hero-ghost.jpg',
      isHudFrame: true,
      chipTitle: isUa ? 'Тільки голос інтервʼюера' : 'Interviewer Loopback',
      chipMetric: 'Deepgram Nova-3 16kHz',
      glowClass: 'from-sky-500/30 via-indigo-500/20 to-emerald-500/20',
      icon: <AudioLines className="w-3.5 h-3.5 text-sky-400" />,
    },
    {
      id: 'speed',
      label: 'AI Speed',
      image: '/hud_minimal_retina.png',
      isHudFrame: true,
      chipTitle: isUa ? 'Реакція телесуфлера' : 'Sub-Second TTFT',
      chipMetric: '⚡ 180ms Edge Stream',
      glowClass: 'from-emerald-500/30 via-teal-500/20 to-sky-500/20',
      icon: <Zap className="w-3.5 h-3.5 text-amber-300" />,
    },
    {
      id: 'hud',
      label: 'Spatial HUD',
      image: '/hud_minimal_banner.png',
      isHudFrame: true,
      chipTitle: isUa ? 'Eyeline-суфлер під камерою' : 'Retina Eyeline HUD',
      chipMetric: '0% Screen Share Leak',
      glowClass: 'from-cyan-500/25 via-emerald-500/20 to-indigo-500/25',
      icon: <Cpu className="w-3.5 h-3.5 text-cyan-300" />,
    },
  ];

  const heroVideos: SpatialVideoItem[] = [
    {
      id: 'mascot',
      src: '/videos/ghost-mascot.mp4',
      label: isUa ? 'Ghostboard 3D Core' : 'Ghostboard 3D Core',
      caption: isUa ? 'Адаптивний суфлер нового покоління' : 'Next-gen adaptive spatial copilot',
    },
    {
      id: 'stealth',
      src: '/videos/ghost.mp4',
      label: isUa ? 'Stealth Режим' : 'Stealth Mode',
      caption: isUa ? 'Прозорість для Zoom, Meet та Discord' : 'Invisible across Zoom, Meet & Discord',
    },
    {
      id: 'loopback',
      src: '/videos/headphones.mp4',
      label: isUa ? 'Audio Loopback' : 'Audio Loopback',
      caption: isUa ? 'Чисте перехоплення системного аудіо' : 'Clean system loopback transcription',
    },
    {
      id: 'capture',
      src: '/videos/ghost2.mp4',
      label: isUa ? 'Обхід захоплення' : 'Capture Bypass',
      caption: isUa ? 'Ізоляція шару на рівні драйвера ОС' : 'OS compositor capture isolation',
    },
  ];

  const activeMode = ghostModes[activeModeIndex] || ghostModes[0];

  const cycleGhostMode = () => {
    setActiveModeIndex((prev) => (prev + 1) % ghostModes.length);
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
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

          {/* RIGHT COLUMN: Levitating 3D Ghost Stage + Mode Switcher + PiP Video */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div
              ref={stageRef}
              onMouseMove={handleStageMouseMove}
              onMouseLeave={handleStageMouseLeave}
              className="relative rounded-3xl bg-[#0a0c11]/70 backdrop-blur-2xl border border-white/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_32px_80px_-16px_rgba(0,0,0,0.85)] p-5 sm:p-7 overflow-hidden"
              style={{ perspective: 1100 }}
            >
              {/* Soft optical radial aura behind ghost */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-6 rounded-full bg-gradient-to-tr ${activeMode.glowClass} blur-3xl opacity-65 transition-all duration-700`}
              />

              {/* Top Stage Status Bar */}
              <div className="relative z-10 flex items-center justify-between gap-3 mb-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] text-xs font-mono text-zinc-200">
                  {activeMode.icon}
                  <span>{activeMode.chipTitle}</span>
                </div>
                <span className="text-xs font-mono text-emerald-300/90 hidden sm:inline">
                  {activeMode.chipMetric}
                </span>
              </div>

              {/* 3D Interactive Levitation Container */}
              <motion.div
                style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                onClick={cycleGhostMode}
                title={isUa ? 'Клікніть, щоб змінити образ Ghostboard' : 'Click to switch Ghostboard mode'}
                className="relative z-10 h-[255px] sm:h-[300px] flex flex-col items-center justify-center cursor-pointer select-none"
              >
                {/* Floating Orbital Badge Left */}
                <motion.div
                  style={{ x: badgeShiftX, y: badgeShiftY }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0e1118]/85 border border-white/12 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.65)] absolute top-5 left-2 z-20"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono text-zinc-200">⚡ 180ms Edge</span>
                </motion.div>

                {/* Floating Orbital Badge Right */}
                <motion.div
                  style={{ x: ghostShiftX, y: badgeShiftY }}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#0e1118]/85 border border-white/12 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_12px_30px_rgba(0,0,0,0.65)] absolute bottom-12 right-2 z-20"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-300" />
                  <span className="text-xs font-mono text-zinc-200">0% Screen Share</span>
                </motion.div>

                {/* Levitating Ghost / Visual Render */}
                <motion.div
                  style={{ x: ghostShiftX, y: ghostShiftY }}
                  className="relative flex items-center justify-center w-full h-full"
                >
                  <motion.div
                    animate={{
                      y: [0, -16, 0],
                      rotateZ: [-1.5, 1.5, -1.5],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="relative flex items-center justify-center"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeMode.id}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: -10 }}
                        transition={SPRING_SNAPPY}
                        className="flex items-center justify-center"
                      >
                        {activeMode.isHudFrame ? (
                          <div className="relative max-w-[330px] sm:max-w-[380px] rounded-2xl overflow-hidden border border-white/15 bg-black/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_28px_70px_rgba(0,0,0,0.8)]">
                            <img
                              src={activeMode.image}
                              alt={`Ghostboard ${activeMode.label}`}
                              className="w-full h-auto max-h-[210px] object-contain"
                            />
                          </div>
                        ) : (
                          <img
                            src={activeMode.image}
                            alt={`Ghostboard ${activeMode.label} mascot`}
                            className="w-52 h-52 sm:w-64 sm:h-64 object-contain drop-shadow-[0_24px_45px_rgba(139,92,246,0.35)]"
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </motion.div>

                {/* Synchronized Dynamic Shadow / Floor Glow */}
                <motion.div
                  animate={{
                    scale: [1, 0.82, 1],
                    opacity: [0.55, 0.24, 0.55],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  aria-hidden="true"
                  className="w-40 h-5 rounded-full bg-gradient-to-r from-violet-500/45 via-emerald-400/35 to-sky-400/45 blur-xl mt-1"
                />
              </motion.div>

              {/* Interactive 5-State Image Switcher Pills */}
              <div className="relative z-10 mt-3 p-1.5 rounded-2xl bg-black/45 border border-white/[0.08] flex flex-wrap sm:flex-nowrap items-center justify-center gap-1">
                {ghostModes.map((mode, idx) => {
                  const isSelected = idx === activeModeIndex;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setActiveModeIndex(idx)}
                      className={`relative flex-1 min-w-[78px] flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer ${
                        isSelected ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="hero-ghost-mode-pill"
                          transition={SPRING_SNAPPY}
                          className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]"
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1.5">
                        {mode.icon}
                        <span>{mode.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Embedded Spatial PiP Mini-Video Capsule Strip (/public/videos/) */}
            <SpatialVideoCapsule
              videos={heroVideos}
              layoutGroupId="hero-pip-video-tabs"
              aspectClassName="h-36 sm:h-40"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
