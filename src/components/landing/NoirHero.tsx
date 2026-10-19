'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Mic, Award, Volume2, Zap, BookOpen } from 'lucide-react';
import { GhostDetective3D, BrandLogo } from '@/components/ui/GhostDetective3D';
import { useLocale } from '@/contexts/LocaleContext';
import type { SupportedLocale } from '@/lib/geoLang';

const HERO_BTNS: Record<SupportedLocale, { launch: string; soundcheck: string }> = {
  ua: { launch: 'Запустити Live Copilot', soundcheck: 'Швидкий тест звуку (Soundcheck) →' },
  en: { launch: 'Launch Live Copilot', soundcheck: 'Quick Audio Soundcheck →' },
  pl: { launch: 'Uruchom Live Copilot', soundcheck: 'Szybki test dźwięku (Soundcheck) →' },
  de: { launch: 'Live Copilot Starten', soundcheck: 'Schneller Audio-Soundcheck →' },
  fr: { launch: 'Lancer Live Copilot', soundcheck: 'Test audio rapide (Soundcheck) →' },
  es: { launch: 'Iniciar Live Copilot', soundcheck: 'Test rápido de audio (Soundcheck) →' },
  pt: { launch: 'Iniciar Live Copilot', soundcheck: 'Teste rápido de áudio (Soundcheck) →' },
  it: { launch: 'Avvia Live Copilot', soundcheck: 'Test audio rapido (Soundcheck) →' },
  cs: { launch: 'Spustit Live Copilot', soundcheck: 'Rychlý test zvuku (Soundcheck) →' },
  nl: { launch: 'Live Copilot Starten', soundcheck: 'Snelle audio-soundcheck →' },
};

function Socials() {
  return (
    <div className="flex items-center gap-2">
      <a
        href="https://github.com"
        target="_blank"
        rel="noreferrer"
        aria-label="GitHub"
        className="glass flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      </a>
      <a
        href="https://discord.com"
        target="_blank"
        rel="noreferrer"
        aria-label="Discord"
        className="glass flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      </a>
      <a
        href="https://x.com"
        target="_blank"
        rel="noreferrer"
        aria-label="X (Twitter)"
        className="glass flex size-9 items-center justify-center rounded-lg text-zinc-400 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    </div>
  );
}

const CHIP_CLASS =
  'glass h-9 px-3.5 rounded-lg inline-flex items-center justify-center gap-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:border-white/20 hover:text-white';

export function NoirHero() {
  const { t, locale } = useLocale();
  const b = HERO_BTNS[locale] || HERO_BTNS.en;

  return (
    <section className="relative isolate min-h-[92vh] w-full overflow-hidden bg-black px-6 pt-28 pb-12 sm:px-10 lg:px-14 select-none">
      <div aria-hidden className="bg-grid absolute inset-0 -z-10" />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <GhostDetective3D />

      <div className="relative z-20 mx-auto flex max-w-[1200px] flex-col items-center gap-8 text-center">
        <div className="w-[200px] opacity-90">
          <BrandLogo />
        </div>

        <div className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-xs text-zinc-400">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          {t.hero.noirBadge1}
          <span className="h-3 w-px bg-white/10" />
          {t.hero.noirBadge2}
        </div>

        <h1 className="select-text text-4xl font-semibold tracking-tight leading-[1.05] sm:text-6xl lg:text-7xl bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          {t.hero.noirTitle1} <span className="block">{t.hero.noirTitle1Sub}</span>
        </h1>

        <p className="max-w-xl select-text text-base leading-relaxed text-zinc-400 whitespace-pre-line">
          {t.hero.noirTitle2} {t.hero.noirTitle2Sub}
        </p>

        <div className="flex w-full max-w-md flex-col gap-3">
          <Link
            href="/interview"
            className="group inline-flex h-11 items-center justify-between rounded-lg bg-white px-4 text-sm font-medium text-black shadow-[inset_0_1px_0_rgb(255_255_255),0_0_40px_rgb(255_255_255/.12)] transition hover:bg-zinc-200"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="size-4" />
              {b.launch}
            </span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/mock-interview" className={CHIP_CLASS}>
              <Award className="size-4" />
              <span className="truncate">{t.nav.arena}</span>
            </Link>
            <Link
              href="/interview?modal=soundcheck"
              className={CHIP_CLASS}
            >
              <Volume2 className="size-4" />
              <span className="truncate">{b.soundcheck}</span>
            </Link>
          </div>
        </div>

        <p className="max-w-sm text-xs leading-relaxed text-zinc-500">
          {t.hero.noirDisclaimer}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/pricing" className={CHIP_CLASS}>
            <Zap className="size-4" />
            {t.nav.pricing}
          </Link>
          <Link href="/guide" className={CHIP_CLASS}>
            <BookOpen className="size-4" />
            {t.nav.guide}
          </Link>
          <Socials />
        </div>
      </div>
    </section>
  );
}

