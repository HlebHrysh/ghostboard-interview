'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Mic, Award, Volume2, Zap, BookOpen } from 'lucide-react';
import { GhostDetective3D, BrandLogo } from '@/components/ui/GhostDetective3D';
import { useLocale } from '@/contexts/LocaleContext';
import type { SupportedLocale } from '@/lib/geoLang';

const HERO_BTNS: Record<SupportedLocale, { launch: string; soundcheck: string }> = {
  ua: { launch: '⚡ ЗАПУСТИТИ COPILOT', soundcheck: '🔊 Швидкий тест звуку (Soundcheck) →' },
  en: { launch: '⚡ LAUNCH LIVE COPILOT', soundcheck: '🔊 Quick Audio Soundcheck →' },
  pl: { launch: '⚡ URUCHOM COPILOT', soundcheck: '🔊 Szybki test dźwięku (Soundcheck) →' },
  de: { launch: '⚡ COPILOT STARTEN', soundcheck: '🔊 Schneller Audio-Soundcheck →' },
  fr: { launch: '⚡ LANCER COPILOT', soundcheck: '🔊 Test audio rapide (Soundcheck) →' },
  es: { launch: '⚡ INICIAR COPILOT', soundcheck: '🔊 Test rápido de audio (Soundcheck) →' },
  pt: { launch: '⚡ INICIAR COPILOT', soundcheck: '🔊 Teste rápido de áudio (Soundcheck) →' },
  it: { launch: '⚡ AVVIA COPILOT', soundcheck: '🔊 Test audio rapido (Soundcheck) →' },
  cs: { launch: '⚡ SPUSTIT COPILOT', soundcheck: '🔊 Rychlý test zvuku (Soundcheck) →' },
  nl: { launch: '⚡ COPILOT STARTEN', soundcheck: '🔊 Snelle audio-soundcheck →' },
};

export function NoirHero() {
  const { t, locale } = useLocale();
  const heroBtn = HERO_BTNS[locale] || HERO_BTNS.en;

  return (
    <section className="relative min-h-[92vh] lg:min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#09090b] px-6 sm:px-10 lg:px-14 pt-24 sm:pt-28 pb-10 select-none">
      {/* 3D WebGL Scene in background */}
      <GhostDetective3D />

      {/* Top Center: Brand Logo Header */}
      <div className="relative z-20 w-full flex justify-center items-center pointer-events-auto">
        <div className="w-[200px] sm:w-[240px] drop-shadow-[0_0_20px_rgba(200,241,53,0.12)]">
          <BrandLogo />
        </div>
      </div>

      {/* Main Content Row: Left Intelligence Column + Right Action Column */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto flex-1 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 sm:gap-14 py-8 sm:py-12 pointer-events-none">
        {/* Left Column: Intelligence & Navigation */}
        <div className="w-full lg:w-[420px] xl:w-[460px] pointer-events-auto flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C8F135]/10 border border-[#C8F135]/30 text-[#C8F135] font-mono text-[11px] font-bold tracking-[0.2em] uppercase backdrop-blur-md shadow-[0_0_15px_rgba(200,241,53,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#C8F135] shadow-[0_0_8px_#C8F135] animate-pulse" />
            {t.hero.noirBadge1}
          </div>

          <h1 className="font-hero-headline text-3xl sm:text-4xl md:text-5xl lg:text-[2.65rem] xl:text-[3.25rem] 2xl:text-[3.75rem] font-black tracking-[-0.035em] uppercase leading-[0.88] font-sans text-left select-text">
            <span className="block text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {t.hero.noirTitle1}
            </span>
            <span className="block text-[#C8F135] drop-shadow-[0_0_35px_rgba(200,241,53,0.35)]">
              {t.hero.noirTitle1Sub}
            </span>
          </h1>

          {/* Primary & Secondary Hero Action Buttons */}
          <div className="flex flex-col gap-2.5 w-full mt-2">
            {/* Primary Launch CTA */}
            <Link
              href="/interview"
              className="w-full px-5 py-3 rounded-2xl bg-[#C8F135] hover:bg-white text-black font-mono font-black text-xs tracking-wider uppercase flex items-center justify-between shadow-[0_0_30px_rgba(200,241,53,0.4)] transition-all active:scale-95 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 fill-black" />
                <span>{heroBtn.launch}</span>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Quick Modules Row */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <Link
                href="/mock-interview"
                className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-200 hover:text-white border border-white/10 hover:border-[#C8F135]/40 font-mono text-[11px] font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 justify-center"
              >
                <Mic className="w-3.5 h-3.5 text-[#C8F135]" />
                <span className="truncate">{t.nav.mockSimulator}</span>
              </Link>
              <Link
                href="/sandbox"
                className="px-3 py-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-white border border-violet-500/30 hover:border-violet-400 font-mono text-[11px] font-bold tracking-wide uppercase transition-all flex items-center gap-1.5 justify-center"
              >
                <Award className="w-3.5 h-3.5 text-violet-400" />
                <span className="truncate">{t.nav.arena}</span>
              </Link>
            </div>

            {/* Quick Audio Test Link */}
            <Link
              href="/interview?modal=soundcheck"
              className="inline-flex items-center gap-2 text-[11px] font-mono text-zinc-400 hover:text-[#C8F135] transition-colors py-1 group"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#C8F135] group-hover:scale-110 transition-transform" />
              <span>{heroBtn.soundcheck}</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Stealth Mode Offer & Quick Access */}
        <div className="w-full lg:w-[440px] xl:w-[480px] pointer-events-auto flex flex-col items-start lg:items-end text-left lg:text-right gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] font-mono text-[11px] font-bold tracking-[0.2em] uppercase backdrop-blur-md shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-pulse" />
            {t.hero.noirBadge2}
          </div>

          <div className="font-hero-headline text-3xl sm:text-4xl md:text-5xl lg:text-[2.65rem] xl:text-[3.25rem] 2xl:text-[3.75rem] font-black tracking-[-0.035em] uppercase leading-[0.88] font-sans text-left lg:text-right select-text">
            <span className="block text-white whitespace-pre-line drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {t.hero.noirTitle2}
            </span>
            <span className="block text-zinc-300 whitespace-pre-line drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              {t.hero.noirTitle2Sub}
            </span>
          </div>

          <p className="text-[11px] font-mono text-zinc-400 leading-relaxed max-w-xs text-left lg:text-right">
            {t.hero.noirDisclaimer}
          </p>

          {/* Quick links to Guide and Pricing */}
          <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end w-full">
            <Link
              href="/pricing"
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-[11px] font-bold tracking-wide uppercase transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.nav.pricing}</span>
            </Link>
            <Link
              href="/guide"
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 font-mono text-[11px] font-bold tracking-wide uppercase transition-all flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.nav.guide}</span>
            </Link>
          </div>

          {/* Socials */}
          <div className="flex items-center gap-3 mt-1">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C8F135] hover:text-[#C8F135] text-zinc-300 transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Discord"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C8F135] hover:text-[#C8F135] text-zinc-300 transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-[#C8F135] hover:text-[#C8F135] text-zinc-300 transition-all hover:-translate-y-0.5 shadow-sm"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

