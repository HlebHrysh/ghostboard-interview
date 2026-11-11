import React from 'react';
import {
  Zap,
  Play,
  FlaskConical,
  Volume2,
  Cpu,
  UserCheck,
  Check,
  Layers,
  Eye,
  Sparkles,
} from 'lucide-react';
import { Card, Pill, StatusDot, SectionTitle, Button, Shortcut, stopDrag } from '../ui/primitives';
import { VuBars } from '../ui/VuMeter';
import { SHORTCUTS } from '../lib/platform';
import { LISTEN_MODE_META } from '../lib/audioSession';
import type { DesktopSettings } from '../lib/desktopSettings';
import type { CandidateProfile } from '../lib/profileStore';
import type { CopilotMode } from '../lib/tauriBridge';

interface LaunchpadTabProps {
  settings: DesktopSettings;
  profile: CandidateProfile;
  isLaunching: boolean;
  launchError: string | null;
  onSelectMode: (mode: CopilotMode) => void;
  onLaunch: () => void;
  onRunDemo: () => void;
  onNavigateTab: (tab: 'audio' | 'ai' | 'context' | 'stealth') => void;
}

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
  const audioMeta = LISTEN_MODE_META[settings.listenMode] || LISTEN_MODE_META.interviewer;

  return (
    <div className="space-y-6 pb-6 select-none">
      <SectionTitle
        eyebrow="КОМАНДНИЙ ЦЕНТР"
        title="Запуск та Готовність"
        hint="Перевірте параметри сесії, оберіть формат суфлера та запустіть Копайлот"
      />

      {/* ─────────────────────────────────────────────────────────────
          1. PRE-FLIGHT READINESS BAR (3 Interactive Status Cards)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Audio Source */}
        <Card
          onClick={() => onNavigateTab('audio')}
          className="cursor-pointer p-3.5 transition-all hover:border-white/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
              <span>Аудіо Джерело</span>
            </span>
            <VuBars channel="interviewer" bars={4} />
          </div>
          <div className="text-xs font-semibold text-white truncate mb-1">
            {audioMeta.badge}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {settings.listenMode === 'interviewer'
              ? 'Мікрофон фізично вимкнений'
              : settings.listenMode === 'dual'
              ? '2 роздільні канали'
              : 'Один мікрофон'}
          </div>
        </Card>

        {/* Card 2: AI Engine */}
        <Card
          onClick={() => onNavigateTab('ai')}
          className="cursor-pointer p-3.5 transition-all hover:border-white/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-300" />
              <span>ШІ-Ядро</span>
            </span>
            <StatusDot tone="ok" ping />
          </div>
          <div className="text-xs font-semibold text-white truncate mb-1">
            Gemini 3.5 Flash • &lt;220ms
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {settings.hintLanguage === 'bilingual_uk'
              ? 'Білінгв (EN + UA підказка)'
              : settings.hintLanguage === 'uk'
              ? 'Українська'
              : settings.hintLanguage === 'en'
              ? 'English'
              : 'Авто-мова запитання'}
          </div>
        </Card>

        {/* Card 3: Candidate Context */}
        <Card
          onClick={() => onNavigateTab('context')}
          className="cursor-pointer p-3.5 transition-all hover:border-white/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-zinc-300" />
              <span>Контекст Кандидата</span>
            </span>
            <Pill tone="neutral" className="h-4 px-1 text-[9px] uppercase">
              {profile.experienceLevel}
            </Pill>
          </div>
          <div className="text-xs font-semibold text-white truncate mb-1">
            {profile.role || 'Software Engineer'}
          </div>
          <div className="text-[11px] text-zinc-500 truncate">
            {profile.techStack?.slice(0, 3).join(', ') || 'React, Node, SQL'}
            {(profile.techStack?.length || 0) > 3 ? ` +${profile.techStack.length - 3}` : ''}
          </div>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. INTERACTIVE HUD MODE SELECTOR (With Live Visual Previews)
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Оберіть формат відображення суфлера
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card A: Split AI Chat */}
          <div
            data-tauri-drag-region="false"
            onMouseDown={stopDrag}
            onClick={() => onSelectMode('chat')}
            className={`group relative rounded-xl border p-4 transition-all cursor-pointer select-none ${
              settings.copilotMode === 'chat'
                ? 'border-white bg-white/[0.05] ring-1 ring-white/20 shadow-lg'
                : 'border-white/[0.08] bg-[#111114] hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    settings.copilotMode === 'chat'
                      ? 'bg-white text-zinc-950 font-bold'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Двоколонковий Копайлот</div>
                  <div className="text-[10px] text-zinc-400">Split AI Chat (Діалог 38% | Суфлер 62%)</div>
                </div>
              </div>
              {settings.copilotMode === 'chat' && (
                <div className="w-5 h-5 rounded-full bg-white text-zinc-950 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Visual Mini Mockup */}
            <div className="h-24 rounded-lg bg-black/60 border border-white/[0.06] p-2 flex gap-2 overflow-hidden pointer-events-none">
              {/* Left Column (38%) */}
              <div className="w-[38%] border-r border-white/[0.06] pr-2 space-y-1.5 flex flex-col justify-center">
                <div className="w-3/4 h-2 rounded bg-zinc-700/60" />
                <div className="w-full h-3 rounded bg-zinc-600/40" />
                <div className="w-1/2 h-2 rounded bg-zinc-700/60" />
              </div>
              {/* Right Column (62%) */}
              <div className="flex-1 pl-1 space-y-1.5 flex flex-col justify-center">
                <div className="w-full h-3.5 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center px-1">
                  <div className="w-3/4 h-1.5 rounded bg-emerald-400/80" />
                </div>
                <div className="space-y-1">
                  <div className="w-5/6 h-2 rounded bg-zinc-600/50" />
                  <div className="w-4/6 h-2 rounded bg-zinc-600/50" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="text-zinc-500">Глибина: Hook + 3 Pillars + Code</span>
              <span className="font-mono text-[10px] text-zinc-400">780x460 px</span>
            </div>
          </div>

          {/* Card B: Eyeline Notch */}
          <div
            data-tauri-drag-region="false"
            onMouseDown={stopDrag}
            onClick={() => onSelectMode('top_bar')}
            className={`group relative rounded-xl border p-4 transition-all cursor-pointer select-none ${
              settings.copilotMode === 'top_bar'
                ? 'border-white bg-white/[0.05] ring-1 ring-white/20 shadow-lg'
                : 'border-white/[0.08] bg-[#111114] hover:border-white/20 hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    settings.copilotMode === 'top_bar'
                      ? 'bg-white text-zinc-950 font-bold'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Верхній Суфлер</div>
                  <div className="text-[10px] text-zinc-400">Eyeline Notch (Під вебкамерою)</div>
                </div>
              </div>
              {settings.copilotMode === 'top_bar' && (
                <div className="w-5 h-5 rounded-full bg-white text-zinc-950 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Visual Mini Mockup */}
            <div className="h-24 rounded-lg bg-black/60 border border-white/[0.06] p-2 flex flex-col justify-center items-center overflow-hidden pointer-events-none relative">
              {/* Mock Webcam Notch */}
              <div className="w-8 h-2 rounded-full bg-zinc-800 border border-zinc-700 mb-2" />
              {/* Notch Bar */}
              <div className="w-full max-w-[200px] h-9 rounded-lg bg-zinc-900 border border-white/15 p-1.5 space-y-1">
                <div className="w-1/2 h-1.5 rounded bg-zinc-500" />
                <div className="w-5/6 h-2.5 rounded bg-white/90" />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="text-zinc-500">100% зоровий контакт із камерою</span>
              <span className="font-mono text-[10px] text-zinc-400">680x160 px</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. PRIMARY LAUNCH BAR (CTA Button + 1-Click Demo)
      ───────────────────────────────────────────────────────────── */}
      <div className="pt-2 space-y-3">
        {launchError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            Помилка запуску: {launchError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="primary"
            size="lg"
            onClick={onLaunch}
            disabled={isLaunching}
            className="w-full sm:flex-1 h-13 text-sm font-semibold tracking-tight shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className={`w-4 h-4 fill-current ${isLaunching ? 'animate-spin' : ''}`} />
            <span>Запустити Копайлот</span>
            <Shortcut spec={SHORTCUTS.launch} />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={onRunDemo}
            disabled={isLaunching}
            className="w-full sm:w-auto h-13 px-5 text-xs font-semibold text-zinc-300 hover:text-white flex items-center justify-center gap-2 cursor-pointer"
            title="Запустити демонстраційний сценарій співбесіди для перевірки HUD без звуку"
          >
            <FlaskConical className="w-4 h-4 text-emerald-400" />
            <span>Демо в 1 клік</span>
          </Button>
        </div>

        <p className="text-[11px] text-zinc-500 text-center font-mono">
          Працює автоматично у фоні • Невидимий для Zoom/Meet/Teams • Завжди поверх інших вікон
        </p>
      </div>
    </div>
  );
};
