import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Columns2,
  Cpu,
  FileText,
  FlaskConical,
  Headphones,
  LayoutGrid,
  Loader2,
  Zap,
} from 'lucide-react';
import type { DesktopSettings } from '../lib/desktopSettings';
import type { CandidateProfile } from '../lib/profileStore';
import type { CopilotMode } from '../lib/tauriBridge';
import { LISTEN_MODE_META } from '../lib/audioSession';
import { LevitatingGhostMascot, type GhostMascotMode } from '../ui/LevitatingGhostMascot';
import { SPRING, stopDrag } from '../ui/primitives';
import { STUDIO_VIDEO_CLIPS, VideoPreviewCapsule } from '../ui/VideoPreviewCapsule';
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
  hedged_race: 'Gemini 2.5 + Groq Race',
  gemini_flash: 'Gemini 2.5 Flash',
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
  const [hoveredMode, setHoveredMode] = useState<GhostMascotMode | null>(null);

  // Sync mascot state dynamically with active selection or user hover
  const defaultMascotMode: GhostMascotMode = useMemo(() => {
    if (settings.copilotMode === 'top_bar') return 'notch';
    if (settings.listenMode === 'interviewer' && settings.stealth) return 'split';
    return 'stealth';
  }, [settings.copilotMode, settings.listenMode, settings.stealth]);

  const [manualMascotMode, setManualMascotMode] = useState<GhostMascotMode | null>(null);
  const mascotMode = hoveredMode ?? manualMascotMode ?? defaultMascotMode;

  const audioMeta = LISTEN_MODE_META[settings.listenMode];
  const vuChannel = settings.listenMode === 'mic' ? 'candidate' : 'interviewer';

  return (
    <div className="space-y-5 pb-4">
      {/* Top Row: 3 Interactive 1-Click Readiness Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* 1. Audio Channel Readiness + Mini Live Equalizer */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          onMouseEnter={() => setHoveredMode('audio')}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onNavigateTab('audio')}
          className="group rounded-2xl border border-white/[0.08] bg-[#111114] p-3.5 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors hover:border-white/20 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <Headphones className="h-3.5 w-3.5 text-emerald-400" />
              Аудіо Джерело
            </span>
            <VuBars channel={vuChannel} bars={6} tone="ok" />
          </div>
          <div className="mt-2 truncate text-xs font-semibold text-white">
            {audioMeta.badge}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-zinc-500 group-hover:text-zinc-400">
            {settings.listenMode === 'interviewer'
              ? 'Мікрофон фізично вимкнено'
              : 'Змінити канали →'}
          </div>
        </motion.button>

        {/* 2. AI Engine Cascade Readiness */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          onMouseEnter={() => setHoveredMode('turbo')}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onNavigateTab('ai')}
          className="group rounded-2xl border border-white/[0.08] bg-[#111114] p-3.5 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors hover:border-white/20 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <Cpu className="h-3.5 w-3.5 text-zinc-200" />
              ШІ-Ядро
            </span>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[9.5px] font-mono text-emerald-300">
              {settings.answerSpeed === 'fast' ? '<180ms' : 'DEEP'}
            </span>
          </div>
          <div className="mt-2 truncate text-xs font-semibold text-white">
            {CASCADE_LABEL[settings.aiModelCascade]}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-zinc-500 group-hover:text-zinc-400">
            Мова: {LANG_LABEL[settings.hintLanguage]}
          </div>
        </motion.button>

        {/* 3. Candidate Context Readiness */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          onMouseEnter={() => setHoveredMode('stealth')}
          onMouseLeave={() => setHoveredMode(null)}
          onClick={() => onNavigateTab('context')}
          className="group rounded-2xl border border-white/[0.08] bg-[#111114] p-3.5 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors hover:border-white/20 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <FileText className="h-3.5 w-3.5 text-zinc-200" />
              Контекст Кандидата
            </span>
            <span className="rounded border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-zinc-300">
              {profile.experienceLevel}
            </span>
          </div>
          <div className="mt-2 truncate text-xs font-semibold text-white">
            {profile.role || 'Software Engineer'}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-zinc-500 group-hover:text-zinc-400">
            Стек: {profile.techStack.slice(0, 3).join(', ') || 'Налаштувати CV →'}
          </div>
        </motion.button>
      </div>

      {/* Hero Stage: Levitating Mascot + Interactive HUD Mode Selector with Live Mini-Videos */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#111114] p-4 sm:p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-white/[0.07] pb-4 sm:flex-row">
          <div className="space-y-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#09090b] px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.1em] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Командний Центр Запуску
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Оберіть формат Stealth HUD
            </h1>
            <p className="text-xs leading-relaxed text-zinc-400 max-w-md">
              Вікно копайлота запускається миттєво поверх Zoom, Meet або Teams і не потрапляє у захоплення екрана.
            </p>
          </div>

          <LevitatingGhostMascot
            mode={mascotMode}
            onModeChange={(next) => setManualMascotMode(next)}
            size="md"
            showModePills
          />
        </div>

        {/* Mode Selector Cards with Embedded Live Video Capsules */}
        <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {/* Option 1: Split AI Copilot */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setManualMascotMode('split');
              onSelectMode('chat');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setManualMascotMode('split');
                onSelectMode('chat');
              }
            }}
            onMouseEnter={() => setHoveredMode('split')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`group rounded-xl border p-3 transition-all cursor-pointer space-y-3 ${
              settings.copilotMode === 'chat'
                ? 'border-white/35 bg-[#16161b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]'
                : 'border-white/[0.08] bg-[#0c0c0f] hover:border-white/20'
            }`}
          >
            <VideoPreviewCapsule
              clip={STUDIO_VIDEO_CLIPS.mascot}
              compact
              actionLabel="Протестувати вигляд"
              onAction={() => {
                onSelectMode('chat');
                onLaunch();
              }}
            />

            <div className="flex items-start justify-between gap-2 px-0.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Columns2 className="h-3.5 w-3.5 text-zinc-300" />
                  Двоколонковий ШІ-Копайлот
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  Транскрипт розмови (26%) + 4-фазна відповідь з кодом та пасткою (74%).
                </p>
              </div>
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border flex items-center justify-center ${
                  settings.copilotMode === 'chat'
                    ? 'border-white bg-white'
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
            onClick={() => {
              setManualMascotMode('notch');
              onSelectMode('top_bar');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setManualMascotMode('notch');
                onSelectMode('top_bar');
              }
            }}
            onMouseEnter={() => setHoveredMode('notch')}
            onMouseLeave={() => setHoveredMode(null)}
            className={`group rounded-xl border p-3 transition-all cursor-pointer space-y-3 ${
              settings.copilotMode === 'top_bar'
                ? 'border-white/35 bg-[#16161b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]'
                : 'border-white/[0.08] bg-[#0c0c0f] hover:border-white/20'
            }`}
          >
            <VideoPreviewCapsule
              clip={STUDIO_VIDEO_CLIPS.notch}
              compact
              actionLabel="Протестувати вигляд"
              onAction={() => {
                onSelectMode('top_bar');
                onLaunch();
              }}
            />

            <div className="flex items-start justify-between gap-2 px-0.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <LayoutGrid className="h-3.5 w-3.5 text-zinc-300" />
                  Верхній Суфлер Eyeline Notch
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
                  Ультра-вузька капсула 680×160px прямо під веб-камерою для 100% контакту очей.
                </p>
              </div>
              <span
                className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border flex items-center justify-center ${
                  settings.copilotMode === 'top_bar'
                    ? 'border-white bg-white'
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
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.975 }}
          transition={SPRING}
          onClick={onLaunch}
          disabled={isLaunching}
          className="flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_14px_34px_rgba(255,255,255,0.08)] transition-colors hover:bg-zinc-100 disabled:opacity-65 cursor-pointer"
        >
          {isLaunching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          <span>⚡ Запустити Копайлот</span>
          <kbd className="rounded-md border border-black/15 bg-black/[0.06] px-1.5 py-0.5 font-mono text-[11px] font-medium text-zinc-700">
            Ctrl+Enter
          </kbd>
        </motion.button>

        <motion.button
          type="button"
          data-tauri-drag-region="false"
          onMouseDown={stopDrag}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.975 }}
          transition={SPRING}
          onClick={onRunDemo}
          disabled={isLaunching}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-[#111114] px-4 py-3.5 text-xs font-medium text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors hover:border-white/25 hover:bg-[#18181d] disabled:opacity-60 cursor-pointer"
        >
          <FlaskConical className="h-4 w-4 text-emerald-400" />
          <span>🧪 Демо-симуляція в 1 клік</span>
        </motion.button>
      </div>
    </div>
  );
};
