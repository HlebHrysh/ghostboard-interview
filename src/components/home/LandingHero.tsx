'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Download,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Zap,
  Volume2,
  Sparkles,
  Apple,
  Monitor,
  Terminal,
} from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

type ClientPlatform = 'mac-arm' | 'mac-intel' | 'windows' | 'linux';

export function LandingHero({ t }: Props) {
  const { locale } = useLocale();
  const [platform, setPlatform] = useState<ClientPlatform>('windows');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-4 sm:px-6 overflow-hidden">
      {/* Ambient Dark Luxury Background Radial Mesh Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-indigo-500/15 via-emerald-500/10 to-transparent blur-[120px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -left-48 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -z-10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -right-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10"
      />

      <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
        {/* Top Stealth Status Pill */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.12)] text-xs text-zinc-300 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-zinc-200 tracking-tight font-medium">
            {t.hero.badge}
          </span>
        </motion.div>

        {/* High-Contrast Typographic H1 */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl"
        >
          {t.hero.title}{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
            {t.hero.titleAccent}
          </span>
        </motion.h1>

        {/* Subtitle - 2 short punchy lines */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 text-base sm:text-xl text-zinc-300 max-w-2xl leading-relaxed font-normal"
        >
          <span className="block font-medium text-zinc-200">
            {locale === 'ua'
              ? 'Невидимий для рекрутерів телесуфлер на рівні ядра ОС.'
              : 'Undetectable OS-level prompter for live technical interviews.'}
          </span>
          <span className="block text-zinc-400 mt-1">
            {locale === 'ua'
              ? 'Миттєві відповіді за твоїм резюме за 350 мс прямо під час дзвінка.'
              : 'Instant resume-tailored answers in 350ms right under your webcam.'}
          </span>
        </motion.p>

        {/* Primary Actions: Exactly 2 Main Actions (Download Desktop & Launch in Browser) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
        >
          {/* Action 1: Smart OS-Aware Download Dropdown Button */}
          <div className="relative w-full sm:w-auto">
            <div className="flex items-center rounded-xl bg-white text-zinc-950 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.3)] transition-all">
              <a
                href={getPlatformDownloadUrl(platform)}
                onClick={() => handleDownloadClick(platform)}
                className="flex items-center gap-3 px-6 py-4 font-semibold text-sm transition-transform active:scale-[0.98] cursor-pointer"
              >
                {platform.startsWith('mac') ? (
                  <Apple className="w-5 h-5 text-zinc-950" />
                ) : platform === 'linux' ? (
                  <Terminal className="w-5 h-5 text-zinc-950" />
                ) : (
                  <Monitor className="w-5 h-5 text-zinc-950" />
                )}
                <div className="text-left">
                  <span className="block text-[11px] uppercase tracking-wider text-zinc-500 font-mono leading-none">
                    {t.downloadCta.detectedOsPrefix}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-zinc-950 leading-tight">
                    {mounted ? getPlatformLabel() : t.hero.ctaPrimary}
                  </span>
                </div>
              </a>

              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3.5 py-4 border-l border-zinc-200 hover:bg-zinc-100 rounded-r-xl transition-colors cursor-pointer text-zinc-700"
                aria-label="Select alternative platform"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>

            {/* Platform Selection Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 sm:right-auto sm:w-72 mt-2 py-2 bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl z-50 text-left">
                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
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
                      platform === p ? 'text-emerald-400 font-semibold' : 'text-zinc-300'
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
              </div>
            )}
          </div>

          {/* Action 2: Launch in Browser */}
          <Link
            href="/interview"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.15] text-sm font-semibold text-white transition-all backdrop-blur-md cursor-pointer hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{locale === 'ua' ? 'Запустити в браузері' : 'Launch in Browser'}</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </Link>
        </motion.div>

        {/* Safety Proof Subtext (Without redundant links) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-400"
        >
          <span className="inline-flex items-center gap-1.5 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {t.hero.proofSafety}
          </span>
          <span className="text-zinc-700">•</span>
          <span className="text-zinc-500 font-mono">{t.downloadCta.versionInfo}</span>
        </motion.div>

        {/* Proof Counters Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-14 w-full grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
        >
          {[
            {
              val: t.hero.proofCounters.metric1Value,
              label: t.hero.proofCounters.metric1Label,
              sub: t.hero.proofCounters.metric1Sub,
            },
            {
              val: t.hero.proofCounters.metric2Value,
              label: t.hero.proofCounters.metric2Label,
              sub: t.hero.proofCounters.metric2Sub,
            },
            {
              val: t.hero.proofCounters.metric3Value,
              label: t.hero.proofCounters.metric3Label,
              sub: t.hero.proofCounters.metric3Sub,
            },
            {
              val: t.hero.proofCounters.metric4Value,
              label: t.hero.proofCounters.metric4Label,
              sub: t.hero.proofCounters.metric4Sub,
            },
          ].map((metric, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-md flex flex-col items-center justify-center text-center"
            >
              <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
                {metric.val}
              </div>
              <div className="text-xs sm:text-sm font-medium text-zinc-300 mt-1">
                {metric.label}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{metric.sub}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
