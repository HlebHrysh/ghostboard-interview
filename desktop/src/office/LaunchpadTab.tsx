import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ChevronRight,
  Clapperboard,
  Columns2,
  Cpu,
  Eye,
  FileText,
  FlaskConical,
  Headphones,
  LayoutGrid,
  Loader2,
  Rocket,
  Zap,
} from 'lucide-react';
import type { DesktopSettings } from '../lib/desktopSettings';
import type { CandidateProfile } from '../lib/profileStore';
import type { CopilotMode } from '../lib/tauriBridge';
import { LISTEN_MODE_META } from '../lib/audioSession';
import { Kbd, SPRING, stopDrag } from '../ui/primitives';
import { VuBars } from '../ui/VuMeter';
import type { OfficeTab } from './OfficeNavRail';

interface LaunchpadTabProps {
  settings: DesktopSettings;
  profile: CandidateProfile;
  isLaunching: boolean;
  launchError: string | null;
  onSelectMode: (mode: CopilotMode) => void;
  onLaunch: () => void;
  onRunDemo: () => void;
  onNavigateTab: (tab: OfficeTab) => void;
}

const CASCADE_LABEL: Record<DesktopSettings['aiModelCascade'], string> = {
  hedged_race: 'Gemini 3.8 + Groq Race',
  gemini_flash: 'Gemini 3.8 Flash',
  groq_llama: 'Groq Llama 3.3 Turbo',
};

const LANG_LABEL: Record<DesktopSettings['hintLanguage'], string> = {
  auto: 'Авто',
  uk: 'Українська',
  en: 'English',
  bilingual_uk: 'Білінгв EN+UA',
  bilingual_ru: 'Білінгв EN+RU',
  ru: 'Русский',
  pl: 'Polski',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
};

export const LaunchpadTab: React.FC<LaunchpadTabProps> = ({
  settings,
  profile,
  isLaunching,
  launchError,
  onSelectMode,
  onLaunch,
  onRunDemo,
  onNavigateTab,
}) => {
  const audioMeta = LISTEN_MODE_META[settings.listenMode];
  const vuChannel = settings.listenMode === 'mic' ? 'candidate' : 'interviewer';

  return (
    <div className="space-y-5 pb-4">
      {/* Unified Page Header Band */}
      <div className="flex items-center justify-between gap-3 pb-0.5">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-emerald-400/25 bg-[#0e0f12] shadow-[inset_0_1px_0_0_rgba(167,243,208,0.18),0_10px_28px_-8px_rgba(16,185,129,0.25)] overflow-hidden">
            <Rocket className="h-5 w-5 text-emerald-300" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.1] via-transparent to-transparent" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold tracking-tight text-white truncate">
              Командний центр запуску
            </h1>
            <p className="text-xs text-zinc-400 truncate">
              Перевірте стан каналів і оберіть макет бойового Stealth HUD перед виходом в ефір
            </p>
          </div>
        </div>

        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.1em] text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
          Pre-Flight · OK
        </span>
      </div>

      {/* Top Row: 3 Interactive Cockpit Readiness Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* 1. Audio Channel Readiness + Mini Live Equalizer */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.985 }}
          transition={SPRING}
          onClick={() => onNavigateTab('audio')}
          className="group relative rounded-2xl border border-white/[0.08] bg-[#111114] p-3.5 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_28px_-14px_rgba(0,0,0,0.75)] transition-colors hover:border-white/20 hover:bg-[#141419] cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                <Headphones className="h-3 w-3" />
              </span>
              Аудіо Джерело
            </span>
            <VuBars channel={vuChannel} bars={6} tone="ok" />
          </div>
          <div className="mt-2.5 truncate text-[13px] font-semibold text-white">
            {audioMeta.badge}
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span className="truncate">
              {settings.listenMode === 'interviewer'
                ? 'Мікрофон фізично ізольовано'
                : 'Налаштувати канали'}
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </motion.button>

        {/* 2. AI Engine Cascade Readiness */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.985 }}
          transition={SPRING}
          onClick={() => onNavigateTab('ai')}
          className="group relative rounded-2xl border border-white/[0.08] bg-[#111114] p-3.5 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_28px_-14px_rgba(0,0,0,0.75)] transition-colors hover:border-white/20 hover:bg-[#141419] cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/12 bg-white/[0.05] text-zinc-200">
                <Cpu className="h-3 w-3" />
              </span>
              ШІ-Ядро
            </span>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-mono tabular-nums text-emerald-300">
              {settings.answerSpeed === 'fast' ? '<180ms' : 'DEEP'}
            </span>
          </div>
          <div className="mt-2.5 truncate text-[13px] font-semibold text-white">
            {CASCADE_LABEL[settings.aiModelCascade]}
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span className="truncate">Мова: {LANG_LABEL[settings.hintLanguage]}</span>
            <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </motion.button>

        {/* 3. Candidate Context Readiness */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.985 }}
          transition={SPRING}
          onClick={() => onNavigateTab('context')}
          className="group relative rounded-2xl border border-white/[0.08] bg-[#111114] p-3.5 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_28px_-14px_rgba(0,0,0,0.75)] transition-colors hover:border-white/20 hover:bg-[#141419] cursor-pointer overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-zinc-400">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-white/12 bg-white/[0.05] text-zinc-200">
                <FileText className="h-3 w-3" />
              </span>
              Профіль
            </span>
            <span className="rounded border border-white/10 bg-[#09090b] px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-zinc-300">
              {profile.experienceLevel}
            </span>
          </div>
          <div className="mt-2.5 truncate text-[13px] font-semibold text-white">
            {profile.role || 'Software Engineer'}
          </div>
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <span className="truncate">
              Стек: {profile.techStack.slice(0, 3).join(', ') || 'Налаштувати CV'}
            </span>
            <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </motion.button>
      </div>

      {/* Mode Selection Card (Precision schematic mockups + real video demo slots — zero ghost photos/videos) */}
      <div className="gb-hairline-top relative rounded-2xl border border-white/[0.08] bg-[#111114] p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.6)] space-y-4">
        <div className="flex flex-col gap-1.5 border-b border-white/[0.07] pb-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white">
              Формат бойового Stealth HUD
            </h2>
            <p className="text-xs text-zinc-400">
              Оберіть розкладку оверлея — вікно працює поверх Zoom, Meet і Teams та невидиме на записі.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/[0.09] bg-[#09090b] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.09em] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            2 Layouts
          </span>
        </div>

        {/* 2 Clean HUD Layout Mode Cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Option 1: Split AI Copilot */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectMode('chat')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMode('chat');
              }
            }}
            className={`group rounded-2xl border p-3.5 transition-all cursor-pointer space-y-3 ${
              settings.copilotMode === 'chat'
                ? 'border-emerald-400/40 bg-[#15171c] shadow-[inset_0_1px_0_0_rgba(167,243,208,0.2)]'
                : 'border-white/[0.08] bg-[#0c0c0f] hover:border-white/20'
            }`}
          >
            {/* Artist-Crafted Miniature Split HUD UI Illustration */}
            <div className="gb-stage-dots relative flex min-h-[192px] flex-col justify-between gap-2 overflow-hidden rounded-xl border border-white/[0.08] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="whitespace-nowrap inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#121216] px-2 py-0.5 font-mono text-[9.5px] text-zinc-400">
                  <Clapperboard className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                  SPLIT · 26/74
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMode('chat');
                    onLaunch();
                  }}
                  className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 rounded-md border border-white/12 bg-[#141418] px-2 py-0.5 text-[10px] font-medium text-white hover:border-emerald-400/45 cursor-pointer"
                >
                  <Eye className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                  Відкрити
                </button>
              </div>

              {/* Miniature Interactive Cockpit Mockup */}
              <div className="my-1.5 rounded-lg border border-white/[0.09] bg-[#0c0c0f] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.65)] space-y-1.5">
                {/* Mini TopIsland */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-1">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                    <span className="h-1.5 w-3 rounded-full bg-zinc-800 ml-0.5" />
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px">
                    <span className="h-1 w-1 rounded-full bg-emerald-400 gb-pulse-soft" />
                    <span className="font-mono text-[7.5px] text-emerald-300">142ms</span>
                  </div>
                  <span className="h-1.5 w-4 rounded bg-zinc-800" />
                </div>

                {/* Mini 26% Transcript / 74% Answer Split */}
                <div className="grid grid-cols-12 gap-1.5">
                  <div className="col-span-4 rounded-md border border-white/[0.07] bg-[#111114] p-1.5 space-y-1">
                    <div className="h-1 w-6 rounded bg-zinc-600" />
                    <div className="rounded border border-white/[0.06] bg-[#0a0a0c] p-1 space-y-0.5">
                      <div className="h-1 w-full rounded bg-zinc-700" />
                      <div className="h-1 w-3/4 rounded bg-zinc-800" />
                    </div>
                    <div className="rounded border border-emerald-500/35 bg-[#15181c] p-1 space-y-0.5">
                      <div className="h-1 w-full rounded bg-zinc-300/75" />
                      <div className="h-1 w-4/5 rounded bg-zinc-500/60" />
                    </div>
                  </div>

                  <div className="col-span-8 rounded-md border border-white/[0.07] bg-[#111114] p-1.5 space-y-1.5">
                    {/* Phase 1 Hook strip */}
                    <div className="rounded border border-emerald-500/30 border-l-2 border-l-emerald-400 bg-[#15171b] p-1.5 space-y-1">
                      <div className="h-1.5 w-11/12 rounded bg-white/85 gb-type" />
                      <div className="h-1 w-3/4 rounded bg-zinc-400/50" />
                    </div>
                    {/* Phase 2 + Mini Syntax-colored code block */}
                    <div className="grid grid-cols-2 gap-1">
                      <div className="rounded border border-white/[0.06] bg-[#0d0d10] p-1 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-sm bg-emerald-400" />
                          <span className="h-1 w-full rounded bg-zinc-400/55" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-sm bg-zinc-700" />
                          <span className="h-1 w-4/5 rounded bg-zinc-600/55" />
                        </div>
                      </div>
                      <div className="rounded border border-white/[0.07] bg-[#09090b] p-1 space-y-1">
                        <div className="flex gap-1">
                          <span className="h-1 w-3 rounded bg-violet-400/70" />
                          <span className="h-1 w-5 rounded bg-sky-400/70" />
                        </div>
                        <div className="flex gap-1 pl-1.5">
                          <span className="h-1 w-6 rounded bg-emerald-400/65" />
                          <span className="h-1 w-3 rounded bg-zinc-500/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9.5px] font-mono text-zinc-500">
                <span className="truncate">slot: demo-split-copilot.mp4</span>
                <span className="text-zinc-600">780×460</span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 px-0.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Columns2 className="h-3.5 w-3.5 text-emerald-400" />
                  Двоколонковий ШІ-Копайлот
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  Транскрипт розмови (26%) + 4-фазна відповідь з кодом та пасткою (74%).
                </p>
              </div>
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  settings.copilotMode === 'chat'
                    ? 'border-emerald-400 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]'
                    : 'border-white/25 bg-transparent'
                }`}
              >
                {settings.copilotMode === 'chat' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
                )}
              </span>
            </div>
          </div>

          {/* Option 2: Eyeline Notch */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectMode('top_bar')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectMode('top_bar');
              }
            }}
            className={`group rounded-2xl border p-3.5 transition-all cursor-pointer space-y-3 ${
              settings.copilotMode === 'top_bar'
                ? 'border-emerald-400/40 bg-[#15171c] shadow-[inset_0_1px_0_0_rgba(167,243,208,0.2)]'
                : 'border-white/[0.08] bg-[#0c0c0f] hover:border-white/20'
            }`}
          >
            {/* Artist-Crafted Under-Webcam Optical Alignment Illustration */}
            <div className="gb-stage-dots relative flex min-h-[192px] flex-col justify-between gap-2 overflow-hidden rounded-xl border border-white/[0.08] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="whitespace-nowrap inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#121216] px-2 py-0.5 font-mono text-[9.5px] text-zinc-400">
                  <Clapperboard className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                  NOTCH · 720×160
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMode('top_bar');
                    onLaunch();
                  }}
                  className="whitespace-nowrap shrink-0 inline-flex items-center gap-1 rounded-md border border-white/12 bg-[#141418] px-2 py-0.5 text-[10px] font-medium text-white hover:border-emerald-400/45 cursor-pointer"
                >
                  <Eye className="h-2.5 w-2.5 shrink-0 text-emerald-400" />
                  Відкрити
                </button>
              </div>

              {/* Camera Lens & Eyeline Optical Ray Diagram */}
              <div className="relative my-1.5 flex flex-col items-center justify-center">
                {/* Hardware Bezel + Webcam Lens */}
                <div className="flex items-center gap-1.5 rounded-b-lg border border-t-0 border-white/15 bg-[#121216] px-3 py-1 shadow-md">
                  <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white/20 bg-black">
                    <span className="h-1 w-1 rounded-full bg-sky-400/80" />
                  </span>
                  <span className="h-1 w-1 rounded-full bg-emerald-400 gb-pulse-soft" />
                </div>

                {/* Subtle Eye-line Alignment Projection Guide */}
                <svg className="h-3 w-36 overflow-visible" viewBox="0 0 144 12" aria-hidden="true">
                  <line
                    x1="72"
                    y1="0"
                    x2="16"
                    y2="12"
                    stroke="rgba(52,211,153,0.32)"
                    strokeWidth="1"
                    strokeDasharray="2 2.5"
                  />
                  <line
                    x1="72"
                    y1="0"
                    x2="128"
                    y2="12"
                    stroke="rgba(52,211,153,0.32)"
                    strokeWidth="1"
                    strokeDasharray="2 2.5"
                  />
                </svg>

                {/* Suspended Eyeline Notch Capsule */}
                <div className="w-[88%] rounded-xl border border-emerald-500/35 bg-[#0e0f13] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.75)] space-y-1.5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-1">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="h-1 w-20 rounded bg-zinc-400/60" />
                    </span>
                    <span className="font-mono text-[7.5px] text-emerald-300">EYELINE</span>
                  </div>
                  <div className="border-l-2 border-emerald-400 pl-2 space-y-1">
                    <div className="h-1.5 w-11/12 rounded bg-white/85" />
                    <div className="h-1 w-3/4 rounded bg-zinc-400/60" />
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex gap-1">
                      <span className="h-2 w-7 rounded bg-white/[0.06]" />
                      <span className="h-2 w-6 rounded bg-white/[0.06]" />
                    </div>
                    <span className="h-2 w-8 rounded bg-emerald-500/20" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[9.5px] font-mono text-zinc-500">
                <span className="truncate">slot: demo-eyeline-notch.mp4</span>
                <span className="text-zinc-600">720×160</span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-2 px-0.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <LayoutGrid className="h-3.5 w-3.5 text-emerald-400" />
                  Верхній Суфлер Eyeline Notch
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  Ультра-вузька капсула прямо під веб-камерою для 100% контакту очей.
                </p>
              </div>
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  settings.copilotMode === 'top_bar'
                    ? 'border-emerald-400 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]'
                    : 'border-white/25 bg-transparent'
                }`}
              >
                {settings.copilotMode === 'top_bar' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Launch Bar */}
      {launchError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{launchError}</span>
        </div>
      )}

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <motion.button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={stopDrag}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          onClick={onLaunch}
          disabled={isLaunching}
          className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-white to-zinc-200 px-5 py-3.5 text-sm font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_36px_rgba(255,255,255,0.09)] transition-colors hover:to-white disabled:opacity-65 cursor-pointer"
        >
          {isLaunching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          <span>Запустити Копайлот</span>
          <span className="inline-flex items-center gap-1 ml-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>↵</Kbd>
          </span>
        </motion.button>

        <motion.button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={stopDrag}
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          onClick={onRunDemo}
          disabled={isLaunching}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-[#111114] px-4 py-3.5 text-xs font-medium text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors hover:border-white/25 hover:bg-[#18181d] disabled:opacity-60 cursor-pointer"
        >
          <FlaskConical className="h-4 w-4 text-emerald-400" />
          <span>Демо-симуляція в HUD</span>
        </motion.button>
      </div>
    </div>
  );
};
