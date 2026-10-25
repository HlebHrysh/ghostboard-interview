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
  ChevronDown,
} from 'lucide-react';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { SpotlightCard } from '@/components/ui/SpotlightCard';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { useLocale } from '@/contexts/LocaleContext';
import { getGuideTranslations } from '@/lib/guideI18n';
import { ReadingSpine } from '@/components/singularity/ReadingSpine';

type MainSection = 'audio' | 'stealth' | 'psychology';
type AudioOsTab = 'browser' | 'windows' | 'macos' | 'linux';

export default function GuidePage() {
  const { locale } = useLocale();
  const g = getGuideTranslations(locale);

  const [mainSection, setMainSection] = useState<MainSection>('audio');
  const [audioOs, setAudioOs] = useState<AudioOsTab>('browser');

  // Interactive pre-flight checklist state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const checklistCount = Object.values(checkedItems).filter(Boolean).length;
  const totalItems = Math.min(g.checklistItems.length, 5);

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-white/20 selection:text-white font-sans">
      <ReadingSpine />
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="blueprint" className="flex-1 py-10 sm:py-16 px-4 sm:px-6">
        <main className="max-w-5xl mx-auto space-y-10">
          {/* Header Hero */}
          <div className="text-center max-w-3xl mx-auto">
            {/* 3D Book Mascot Animation */}
            <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 mb-4 overflow-hidden rounded-2xl">
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

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-zinc-300 font-mono text-[11px] font-bold tracking-[0.2em] uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{g.heroBadge}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-sans tracking-tight leading-tight">
              {g.heroTitlePrefix}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-white to-zinc-400">
                {g.heroTitleHighlight}
              </span>
              {g.heroTitleSuffix}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-400 mt-3 leading-relaxed font-sans max-w-xl mx-auto">
              {g.heroDesc}
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              TASK 3.1: PRE-FLIGHT CHECKLIST AT THE VERY TOP
          ═══════════════════════════════════════════════════════════════════════ */}
          <section className="bento-card p-6 sm:p-8 space-y-5 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-[#0c0d12] to-black">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Передпольотний чек-лист (5 хвилин до старту)</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Готовність до інтервʼю
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold border transition-colors ${
                    checklistCount === totalItems
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-white/10 border-white/20 text-zinc-300'
                  }`}
                >
                  {checklistCount} / {totalItems} Готово до старту
                </span>
              </div>
            </div>

            {/* 5 Key Checkbox Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
              {g.checklistItems.slice(0, 5).map((item) => {
                const isChecked = !!checkedItems[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleCheck(item.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isChecked
                        ? 'bg-emerald-950/25 border-emerald-500/30 text-white shadow-sm'
                        : 'bg-white/[0.02] border-white/5 text-zinc-300 hover:border-white/15'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-emerald-400 border-emerald-400 text-black font-black'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5 fill-black text-black" />}
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isChecked ? 'text-white' : 'text-zinc-200'}`}>
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
          </section>

          {/* ═══════════════════════════════════════════════════════════════════════
              TASK 3.2: 3 INTERACTIVE TAB CARDS (AUDIO, STEALTH, PSYCHOLOGY)
          ═══════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* Category Segmented Control */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#0c0d12] border border-white/10 max-w-2xl mx-auto font-mono text-xs">
              <button
                type="button"
                onClick={() => setMainSection('audio')}
                className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                  mainSection === 'audio'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{g.tabAudio}</span>
              </button>
              <button
                type="button"
                onClick={() => setMainSection('stealth')}
                className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                  mainSection === 'stealth'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{g.tabStealth}</span>
              </button>
              <button
                type="button"
                onClick={() => setMainSection('psychology')}
                className={`py-2.5 px-3 rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
                  mainSection === 'psychology'
                    ? 'bg-white text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>{g.tabPsychology}</span>
              </button>
            </div>

            {/* TAB 1: AUDIO & LOOPBACK */}
            {mainSection === 'audio' && (
              <div className="bento-card p-6 sm:p-8 space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c0d12] to-black">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Аудіопотік & Захоплення співрозмовника</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    1-клік налаштування перехоплення голосу
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Оберіть вашу робочу конфігурацію для миттєвої передачі мови в Deepgram Nova-3:
                  </p>
                </div>

                {/* Audio OS Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setAudioOs('browser')}
                    className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                      audioOs === 'browser'
                        ? 'bg-white text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Браузер (Meet / Zoom)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioOs('windows')}
                    className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                      audioOs === 'windows'
                        ? 'bg-white text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Windows (WASAPI)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioOs('macos')}
                    className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                      audioOs === 'macos'
                        ? 'bg-white text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>macOS (Loopback)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioOs('linux')}
                    className={`py-2 px-3.5 rounded-lg transition-all cursor-pointer font-semibold flex items-center gap-1.5 ${
                      audioOs === 'linux'
                        ? 'bg-white text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Linux (PipeWire)</span>
                  </button>
                </div>

                {/* Sub-Tab Guide Card */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3 font-sans text-xs">
                  {audioOs === 'browser' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                        <Radio className="w-4 h-4 text-cyan-400" />
                        <span>Google Meet, Zoom Web, Microsoft Teams у браузері Chrome / Brave:</span>
                      </div>
                      <ol className="list-decimal pl-5 space-y-1.5 text-zinc-300 leading-relaxed">
                        <li>Натисніть <strong>«Запустити в браузері»</strong> у кабінеті Ghostboard та надайте доступ до мікрофона.</li>
                        <li>Під час початку дзвінка запустіть шеринг: оберіть <strong>«Вкладка Chrome»</strong> із дзвінком та поставте прапорець <strong>«Ділитися аудіо вкладки»</strong>.</li>
                        <li>Ghostboard миттєво розділить ваш голос та репліки інтервʼюера з точністю 98%+.</li>
                      </ol>
                    </div>
                  )}

                  {audioOs === 'windows' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                        <Laptop className="w-4 h-4 text-blue-400" />
                        <span>Ghostboard Desktop на Windows 10 / 11:</span>
                      </div>
                      <ol className="list-decimal pl-5 space-y-1.5 text-zinc-300 leading-relaxed">
                        <li>Запустіть <code className="font-mono text-white bg-white/10 px-1 py-0.5 rounded">Ghostboard.exe</code>.</li>
                        <li>Системний WASAPI Loopback автоматично слухає звук співрозмовника з навушників чи колонок.</li>
                        <li>Жодних віртуальних кабелів (VB-Audio) не потрібно — затримка становить менше 14мс.</li>
                      </ol>
                    </div>
                  )}

                  {audioOs === 'macos' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                        <Monitor className="w-4 h-4 text-emerald-400" />
                        <span>Ghostboard Desktop на macOS (Apple Silicon M1-M4 / Intel):</span>
                      </div>
                      <ol className="list-decimal pl-5 space-y-1.5 text-zinc-300 leading-relaxed">
                        <li>Запустіть <code className="font-mono text-white bg-white/10 px-1 py-0.5 rounded">Ghostboard.dmg</code>.</li>
                        <li>Додаток автоматично інтегрується з CoreAudio для прямого перехоплення вихідного сигналу дзвінка.</li>
                        <li>BlackHole не потрібен — захист від виявлення працює автоматично на системному рівні.</li>
                      </ol>
                    </div>
                  )}

                  {audioOs === 'linux' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                        <Terminal className="w-4 h-4 text-purple-400" />
                        <span>Ghostboard AppImage на Linux (Ubuntu, Arch, Fedora):</span>
                      </div>
                      <ol className="list-decimal pl-5 space-y-1.5 text-zinc-300 leading-relaxed">
                        <li>Запустіть <code className="font-mono text-white bg-white/10 px-1 py-0.5 rounded">./Ghostboard.AppImage</code>.</li>
                        <li>PipeWire monitor sink вловлює звук із будь-якого вікна без навантаження на CPU (&lt;0.5%).</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Troubleshooting Accordion */}
                <details className="group/trouble bento-card p-4 sm:p-5 rounded-2xl border border-white/10 bg-black/50">
                  <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-mono text-zinc-300 hover:text-white transition-colors">
                    <span className="flex items-center gap-2 font-bold">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <span>Що робити, якщо не чути співрозмовника (Troubleshooting)</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform group-open/trouble:rotate-180" />
                  </summary>
                  <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2 text-xs text-zinc-400 font-sans leading-relaxed">
                    <p>• <strong>У браузері:</strong> переконайтеся, що під час вибору вкладки встановлено галочку «Поділитися аудіо вкладки» (Share tab audio).</p>
                    <p>• <strong>Пристрій за замовчуванням:</strong> звук конференції має виводитися на той самий аудіопристрій, який встановлено основним у системі.</p>
                    <p>• <strong>Sound Check:</strong> запустіть перевірку звуку, щоб переконатися, що Deepgram отримує стабільний PCM-потік.</p>
                  </div>
                </details>
              </div>
            )}

            {/* TAB 2: STEALTH SETUP */}
            {mainSection === 'stealth' && (
              <div className="bento-card p-6 sm:p-8 space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c0d12] to-black">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Стелс-архітектура & 100% невидимість</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    3 головні правила непомітного використання
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Як зчитувати підказки під час демонстрації всього екрана без найменших підозр:
                  </p>
                </div>

                {/* 3 Core Rules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                      01
                    </div>
                    <h4 className="text-sm font-bold text-white font-mono">Eyeline-позиція</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Розмістіть вікно суфлера або телефон впритул під вічком вебкамери. Погляд спрямований прямо на інтервʼюера, без бігаючих очей.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-mono font-bold text-xs">
                      02
                    </div>
                    <h4 className="text-sm font-bold text-white font-mono flex items-center justify-between">
                      <span>Панік-щит</span>
                      <kbd className="kbd-obsidian text-rose-300 text-[10px]">Esc</kbd>
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Одне натискання клавіші <code className="font-mono text-white">Esc</code> миттєво згортає всі вікна суфлера та очищує екранний буфер без сліду.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                      03
                    </div>
                    <h4 className="text-sm font-bold text-white font-mono flex items-center justify-between">
                      <span>Click-through</span>
                      <kbd className="kbd-obsidian text-cyan-300 text-[10px]">Ctrl+Alt+T</kbd>
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Напівпрозоре скло дозволяє взаємодіяти з кодом у VS Code прямо під суфлером. Кліки миші проходять крізь інтерфейс підказок.
                    </p>
                  </div>
                </div>

                {/* Technical details accordion */}
                <details className="group/stealth-tech bento-card p-4 sm:p-5 rounded-2xl border border-white/10 bg-black/50">
                  <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-mono text-zinc-400 hover:text-white transition-colors">
                    <span className="flex items-center gap-2 font-bold">
                      <Lock className="w-4 h-4 text-zinc-400" />
                      <span>Під капотом: системні прапорці виключення з показу екрана</span>
                    </span>
                    <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform group-open/stealth-tech:rotate-180" />
                  </summary>
                  <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2 text-xs text-zinc-400 font-mono leading-relaxed">
                    <p>• <strong>Windows:</strong> Використовує апаратний прапорець <code className="text-zinc-200">SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)</code> — вікно стає чорною або прозорою діркою для будь-якого софту запису екрана.</p>
                    <p>• <strong>macOS:</strong> <code className="text-zinc-200">NSWindow.sharingType = .none</code> блокує зчитування пікселів через ScreenCaptureKit та Quartz Display Services.</p>
                  </div>
                </details>
              </div>
            )}

            {/* TAB 3: PSYCHOLOGY & SENIOR DELIVERY */}
            {mainSection === 'psychology' && (
              <div className="bento-card p-6 sm:p-8 space-y-6 rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c0d12] to-black">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{g.psychologyBadge}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    3 правила природної подачі відповіді
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    Як звучати як впевнений Staff-інженер, використовуючи AI як опорні тези, а не сценарій для начитки:
                  </p>
                </div>

                {/* 3 Advice Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-mono font-bold text-xs">
                      01
                    </div>
                    <h4 className="text-sm font-bold text-white font-mono">Пауза 2 секунди</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Не починайте говорити в ту ж мілісекунду. Зробіть плавний вдих, кивніть і почніть: «Гарне запитання, якщо глянути на системні компроміси...».
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                      02
                    </div>
                    <h4 className="text-sm font-bold text-white font-mono">Своїми словами</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Не зачитуйте текст дослівно монотонним тоном. Вихоплюйте поглядом ключові концепції та формулюйте відповідь живою розмовною мовою.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
                      03
                    </div>
                    <h4 className="text-sm font-bold text-white font-mono">Погляд у камеру</h4>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Під час озвучення висновків дивіться прямо в обʼєктив вебкамери. Це створює відчуття глибокої особистої експертизи та впевненості.
                    </p>
                  </div>
                </div>

                {/* Bridge Key Helper Card */}
                {g.bridgeFeatureTitle && (
                  <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-300 uppercase">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>{g.bridgeFeatureTitle}</span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono border border-purple-500/30 ml-auto">
                        [B] KEY
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {g.bridgeFeatureDesc}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              BOTTOM CTA: 30-SEC READINESS CHECK & COMPANION QR
          ═══════════════════════════════════════════════════════════════════════ */}
          <SpotlightCard
            enableTilt={true}
            glowColor="rgba(255,255,255, 0.15)"
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-950 to-[#0e1017] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6"
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
