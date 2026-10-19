'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Smartphone,
  Monitor,
  Laptop,
  Sparkles,
  Volume2,
  Eye,
  Keyboard,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Terminal,
  Layers,
  HelpCircle,
  Clock,
  Radio,
  Share2,
} from 'lucide-react';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { useLocale } from '@/contexts/LocaleContext';
import { getGuideTranslations } from '@/lib/guideI18n';
import { ReadingSpine } from "@/components/singularity/ReadingSpine";

type MainSection = 'stealth' | 'audio' | 'psychology' | 'checklist';
type OsTab = 'acoustic' | 'universal' | 'macos' | 'windows' | 'linux';

export default function GuidePage() {
  const { locale } = useLocale();
  const g = getGuideTranslations(locale);

  const [mainSection, setMainSection] = useState<MainSection>('stealth');
  const [osTab, setOsTab] = useState<OsTab>('acoustic');

  // Interactive pre-flight checklist state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-white/20 selection:text-white font-sans">
      <ReadingSpine />
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="blueprint" className="flex-1 py-10 sm:py-16 px-4 sm:px-6">
        <main className="max-w-5xl mx-auto">
          {/* Header Hero */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            {/* 3D Book Mascot Animation */}
            <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 mb-6 overflow-hidden rounded-[1.9rem] sm:rounded-[2.2rem]">
              <video
                src="/videos/book.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-zinc-300 font-mono text-[11px] font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(255,255,255,0.08)] mb-4">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
              <span>{g.heroBadge}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white font-sans tracking-tight leading-tight">
              {g.heroTitlePrefix}
              <span className="text-zinc-300">{g.heroTitleHighlight}</span>
              {g.heroTitleSuffix}
            </h1>

            <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed font-sans max-w-2xl mx-auto">
              {g.heroDesc}
            </p>
          </div>

          {/* Zero-Install Universal Highlight Banner */}
          <div className="mb-10 p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-[#10121a] via-[#0d0f15] to-[#12141c] border border-white/15 shadow-[0_16px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-[90px] pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{g.zeroInstallHeroBadge || '⚡ 100% В БРАУЗЕРІ · 0 ЗАВАНТАЖЕНЬ'}</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                macOS · Windows · Linux · ChromeOS
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-bold text-white mb-2 font-sans">
              {g.zeroInstallHeroTitle || 'Запуск за 30 секунд на будь-якій ОС'}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 mb-5 leading-relaxed max-w-3xl">
              {g.zeroInstallHeroDesc || 'Вам більше не потрібно завантажувати сторонні десктопні програми чи налаштовувати віртуальні аудіокабелі. Оберіть один із способів:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => { setMainSection('audio'); setOsTab('acoustic'); }}
                className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-400/40 transition-all text-left flex items-center gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    {g.zeroInstallPill1 || '🔊 Динаміки + Мікрофон'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    0 завантажень · Будь-який Zoom/Teams
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setMainSection('audio'); setOsTab('universal'); }}
                className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-400/40 transition-all text-left flex items-center gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {g.zeroInstallPill2 || '⚡ Вкладка Chrome'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Google Meet · Zoom Web
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setMainSection('stealth'); }}
                className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-400/40 transition-all text-left flex items-center gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {g.zeroInstallPill3 || '🪟 Always-on-Top PiP'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Плаваючий суфлер над дзвінком
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Major Category Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[#0c0d12] border border-white/10 mb-10 max-w-3xl mx-auto font-mono text-xs">
            <button
              type="button"
              onClick={() => setMainSection('stealth')}
              className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                mainSection === 'stealth'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{g.tabStealth}</span>
            </button>

            <button
              type="button"
              onClick={() => setMainSection('audio')}
              className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                mainSection === 'audio'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{g.tabAudio}</span>
            </button>

            <button
              type="button"
              onClick={() => setMainSection('psychology')}
              className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                mainSection === 'psychology'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{g.tabPsychology}</span>
            </button>

            <button
              type="button"
              onClick={() => setMainSection('checklist')}
              className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                mainSection === 'checklist'
                  ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{g.tabChecklist}</span>
            </button>
          </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 1: TELEPROMPTER SETUP & ARCHITECTURE
        ═══════════════════════════════════════════════════════════════════════ */}
        {mainSection === 'stealth' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Critical Eye Level Secret Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/30 via-zinc-950 to-black border-2 border-amber-500/40 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-2.5 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{g.eyeSecretBadge}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans mb-3">
                {g.eyeSecretTitle}
              </h2>

              <p className="text-sm text-zinc-300 leading-relaxed font-sans mb-6">
                {g.eyeSecretDesc}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs">
                  <div className="flex items-center gap-2 text-rose-400 font-mono font-bold mb-1.5 uppercase">
                    <span>{g.badSetupTitle}</span>
                  </div>
                  <p className="text-zinc-300">
                    {g.badSetupDesc}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold mb-1.5 uppercase">
                    <span>{g.goodSetupTitle}</span>
                  </div>
                  <p className="text-zinc-300">
                    {g.goodSetupDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Scenario 1: WITH SCREEN SHARING */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-zinc-300 font-mono text-xs font-bold uppercase">
                <Laptop className="w-3.5 h-3.5" />
                <span>{g.scenarioABadge}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                {g.scenarioATitle}
              </h2>

              <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                {g.scenarioADesc}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Desktop 1 */}
                <div className="p-5 rounded-2xl bg-transparent/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-300 uppercase">
                      {g.desktop1Title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {g.desktop1Badge}
                    </span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                    {g.desktop1Points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-zinc-400">◆</span>
                        <span>{point}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-emerald-400 font-semibold">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{g.desktop1ShareWarning}</span>
                    </li>
                  </ul>
                </div>

                {/* Desktop 2 */}
                <div className="p-5 rounded-2xl bg-transparent/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-zinc-200 uppercase">
                      {g.desktop2Title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/20">
                      {g.desktop2Badge}
                    </span>
                  </div>
                  <ul className="text-xs text-zinc-400 space-y-2 font-mono">
                    {g.desktop2Points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-zinc-400">◆</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Step-by-Step for Phone Connection */}
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
                <span className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider block">
                  {g.phoneStreamStepsTitle}
                </span>
                <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-2 font-sans">
                  {g.phoneStreamSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Scenario 2: WITHOUT SCREEN SHARING */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold uppercase">
                <Monitor className="w-3.5 h-3.5" />
                <span>{g.scenarioBBadge}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                {g.scenarioBTitle}
              </h2>

              <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                {g.scenarioBDesc}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-transparent/40 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-bold uppercase">
                    <Eye className="w-4 h-4" />
                    <span>{g.eyelineTitle}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {g.eyelineDesc}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-transparent/40 border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase">
                    <Terminal className="w-4 h-4" />
                    <span>{g.panicTitle}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {g.panicDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* PiP Floating Window Prompter Feature */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#0e1017] via-[#090b10] to-black border border-white/15 space-y-5 shadow-2xl relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>{g.pipFeatureBadge || 'Always-on-Top Суфлер [Новинка]'}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white font-sans">
                {g.pipFeatureTitle || 'Document Picture-in-Picture: плаваюче вікно над Zoom і Teams'}
              </h2>

              <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                {g.pipFeatureDesc || 'Працює у Chrome та Edge на будь-якій системі без стороннього десктопного софту. Натисніть кнопку [PiP] або скористайтеся плаваючим суфлером — він залишається Always-on-Top поверх вікон Zoom, Teams чи CoderPad, навіть коли ви друкуєте в редакторі.'}
              </p>

              {g.pipFeatureSteps && (
                <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider block">
                    Як увімкнути плаваючий суфлер за 5 секунд:
                  </span>
                  <ol className="list-decimal list-inside text-xs text-zinc-300 space-y-2 font-sans">
                    {g.pipFeatureSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: AUDIO ROUTING (ПІДКЛЮЧЕННЯ ЗВУКУ СПІВРОЗМОВНИКА)
        ═══════════════════════════════════════════════════════════════════════ */}
        {mainSection === 'audio' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* OS Selector Sub-Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-[#111113] border border-white/10 mb-6 max-w-2xl mx-auto font-mono text-xs">
              <button
                type="button"
                onClick={() => setOsTab('acoustic')}
                className={`py-2 px-4 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  osTab === 'acoustic'
                    ? 'bg-amber-400 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{g.tabAcoustic || '🔊 Динаміки (0 Програм)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setOsTab('universal')}
                className={`py-2 px-4 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                  osTab === 'universal'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{g.tabUniversal}</span>
              </button>
              <button
                type="button"
                onClick={() => setOsTab('macos')}
                className={`py-2 px-4 rounded-xl transition-all cursor-pointer font-bold ${
                  osTab === 'macos'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🍎 macOS
              </button>
              <button
                type="button"
                onClick={() => setOsTab('windows')}
                className={`py-2 px-4 rounded-xl transition-all cursor-pointer font-bold ${
                  osTab === 'windows'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🪟 Windows
              </button>
              <button
                type="button"
                onClick={() => setOsTab('linux')}
                className={`py-2 px-4 rounded-xl transition-all cursor-pointer font-bold ${
                  osTab === 'linux'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                🐧 Linux
              </button>
            </div>

            {/* Sub-Tab 0: Acoustic Mode (0 Downloads, Any OS) */}
            {osTab === 'acoustic' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-amber-500/30 space-y-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{g.acousticBadge || 'Найпростіший запуск для будь-якої ОС'}</span>
                </div>

                <h2 className="text-2xl font-bold text-white font-sans">
                  {g.acousticTitle || 'Акустичний режим: Звук інтервʼюера з динаміків ноутбука'}
                </h2>

                <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                  {g.acousticDesc || 'Працює з абсолютно БУДЬ-ЯКИМ додатком для дзвінків (Zoom Desktop, Microsoft Teams, Slack, Telegram, Skype). Жодних віртуальних аудіокабелів (VB-Cable / BlackHole) чи драйверів встановлювати НЕ потрібно!'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-mono font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      {g.acousticStep1Title || '1. Увімкніть звук через динаміки'}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {g.acousticStep1Desc || 'Зніміть навушники та налаштуйте гучність дзвінка в Zoom або Teams так, щоб ви добре чули співрозмовника з динаміків ноутбука.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-mono font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      {g.acousticStep2Title || '2. У Ghostboard оберіть «Мікрофон»'}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {g.acousticStep2Desc || 'Натисніть «ПОЧАТИ СПІВБЕСІДУ» та оберіть джерело «Мікрофон». Ghostboard захоплює звук співрозмовника прямо з динаміків через ваш вбудований мікрофон.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-mono font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      {g.acousticStep3Title || '3. ШІ миттєво підказує тези'}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {g.acousticStep3Desc || 'Deepgram Nova-3 розпізнає мову інтервʼюера за 0.3 сек, фільтрує шум, а Gemini за 1 секунду видає структуру відповіді та перший хук.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/25 text-xs text-amber-200 font-mono flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {g.acousticTip || 'Порада: Встановіть помірну гучність динаміків (50–70%), щоб мікрофон чисто чув інтервʼюера.'}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-Tab 1: Universal 1-Click Method */}
            {osTab === 'universal' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-5 shadow-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{g.universalBadge}</span>
                </div>

                <h2 className="text-2xl font-bold text-white font-sans">
                  {g.universalTitle}
                </h2>

                <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                  {g.universalDesc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-white text-black font-mono font-black text-xs flex items-center justify-center">
                      1
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      {g.universalStep1Title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {g.universalStep1Desc}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-white text-black font-mono font-black text-xs flex items-center justify-center">
                      2
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      {g.universalStep2Title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {g.universalStep2Desc}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="w-6 h-6 rounded-full bg-white text-black font-mono font-black text-xs flex items-center justify-center">
                      3
                    </span>
                    <h3 className="font-bold text-sm text-white">
                      {g.universalStep3Title}
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {g.universalStep3Desc}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 text-xs text-emerald-300 font-mono flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {g.universalPersistenceNote}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: macOS */}
            {osTab === 'macos' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-5">
                <h2 className="text-2xl font-bold text-white font-sans">
                  {g.macosTitle}
                </h2>

                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="text-xs font-mono text-zinc-200 font-bold uppercase">
                      {g.macosOpt1Title}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {g.macosOpt1Desc}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-3">
                    <span className="text-xs font-mono text-zinc-400 font-bold uppercase">
                      {g.macosOpt2Title}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {g.macosOpt2Intro}{' '}
                      <a href="https://github.com/ExistentialAudio/BlackHole" target="_blank" rel="noopener noreferrer" className="text-white underline font-mono">
                        BlackHole 2ch ↗
                      </a>
                    </p>
                    <CodeBlock
                      language="bash"
                      filename="macOS Terminal"
                      code={`# Install virtual audio driver via Homebrew\nbrew install blackhole-2ch\n\n# Or download pkg from ExistentialAudio and open Audio MIDI Setup`}
                    />
                    <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-1.5 font-sans">
                      {g.macosOpt2Steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Windows */}
            {osTab === 'windows' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-5">
                <h2 className="text-2xl font-bold text-white font-sans">
                  {g.windowsTitle}
                </h2>

                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                    <span className="text-xs font-mono text-zinc-200 font-bold uppercase">
                      {g.windowsOpt1Title}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {g.windowsOpt1Desc}
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-3">
                    <span className="text-xs font-mono text-zinc-400 font-bold uppercase">
                      {g.windowsOpt2Title}
                    </span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {g.windowsOpt2Intro}{' '}
                      <a href="https://vb-audio.com/Cable/" target="_blank" rel="noopener noreferrer" className="text-white underline font-mono">
                        VB-Audio Virtual Cable ↗
                      </a>
                    </p>
                    <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-1.5 font-sans">
                      {g.windowsOpt2Steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 4: Linux */}
            {osTab === 'linux' && (
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-5">
                <h2 className="text-2xl font-bold text-white font-sans">
                  {g.linuxTitle}
                </h2>

                <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-3">
                  <span className="text-xs font-mono text-zinc-200 font-bold uppercase">
                    {g.linuxSinkTitle}
                  </span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {g.linuxSinkDesc}
                  </p>
                  <CodeBlock
                    language="bash"
                    filename="Linux Terminal (PulseAudio / PipeWire)"
                    code={`# 1. Create a virtual null sink for lossless sound capture\npactl load-module module-null-sink sink_name=ghostboard_sink sink_properties=device.description=Ghostboard_Audio\n\n# 2. Redirect meeting sound output to ghostboard_sink and listen simultaneously\npactl load-module module-loopback source=ghostboard_sink.monitor`}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 3: SENIOR DELIVERY & PSYCHOLOGY (ПСИХОЛОГІЯ ТА ПОДАЧА)
        ═══════════════════════════════════════════════════════════════════════ */}
        {mainSection === 'psychology' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{g.psychologyBadge}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase">
                    <span>{g.psychRule1Title}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {g.psychRule1Desc}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-300 uppercase">
                    <span>{g.psychRule2Title}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {g.psychRule2Desc}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-300 uppercase">
                    <span>{g.psychRule3Title}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {g.psychRule3Desc}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-transparent/50 border border-white/10 space-y-2">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-zinc-200 uppercase">
                    <span>{g.psychRule4Title}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {g.psychRule4Desc}
                  </p>
                </div>

                {g.bridgeFeatureTitle && (
                  <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2 md:col-span-2">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-300 uppercase">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>{g.bridgeFeatureTitle}</span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30 ml-auto">
                        [B] KEY
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {g.bridgeFeatureDesc}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 4: PRE-FLIGHT CHECKLIST (ЧЕК-ЛИСТ ЗА 5 ХВИЛИН)
        ═══════════════════════════════════════════════════════════════════════ */}
        {mainSection === 'checklist' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0d12] border border-white/10 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2 text-zinc-200 font-mono text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-zinc-300" />
                  <span>{g.checklistTitle}</span>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  {g.checklistReadyLabel(Object.values(checkedItems).filter(Boolean).length, g.checklistItems.length)}
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                {g.checklistItems.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                        isChecked
                          ? 'bg-white/10 border-white/30 text-white'
                          : 'bg-transparent/40 border-white/5 text-zinc-300 hover:border-white/15'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-white border-white text-black font-black'
                            : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="w-4 h-4 fill-black text-black" />}
                      </div>
                      <div>
                        <div className={`font-bold ${isChecked ? 'text-white' : 'text-zinc-200'}`}>
                          {item.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            BOTTOM CTA: 30-SEC READINESS CHECK & COMPANION QR
        ═══════════════════════════════════════════════════════════════════════ */}
        <SpotlightCard
          enableTilt={true}
          glowColor="rgba(255,255,255, 0.15)"
          className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-950 to-[#0e1017] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-mono text-zinc-300 font-bold">
              <Volume2 className="w-4 h-4" />
              <span>{g.ctaBadge}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white">
              {g.ctaTitle}
            </h3>
            <p className="text-xs text-zinc-400 font-sans max-w-md">
              {g.ctaDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/interview?modal=soundcheck"
              className="py-3 px-5 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95 flex items-center gap-2"
            >
              <Volume2 className="w-4 h-4 fill-black" />
              <span>{g.ctaSoundcheckBtn}</span>
            </Link>

            <Link
              href="/interview?modal=companion"
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-200 hover:text-white border border-white/20 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4 text-zinc-300" />
              <span>{g.ctaPairPhoneBtn}</span>
            </Link>
          </div>
        </SpotlightCard>
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}

