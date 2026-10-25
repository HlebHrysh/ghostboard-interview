'use client';

import React from 'react';
import {
  Play,
  Square,
  Zap,
  Code2,
  Cpu,
  Scale,
  ShieldAlert,
  CornerDownLeft,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';

interface StealthCommandDockProps {
  isCapturing: boolean;
  isAnalyzingScreenshot?: boolean;
  questionCount?: number;
  isFrozen?: boolean;
  pendingNewCount?: number;
  isConcise?: boolean;
  triggerMode?: 'auto' | 'enter';
  sessionMode?: 'interview' | 'meeting';
  audioSource?: 'tab' | 'mic';
  onToggleAudioSource?: () => void;
  onToggleTriggerMode?: () => void;
  onToggleSessionMode?: () => void;
  onAnswerNow?: () => void;
  onStartCapture: (source?: 'tab' | 'mic') => void;
  onStopCapture: () => void;
  onToggleFreeze?: () => void;
  onTriggerScreenshot?: () => void;
  onToggleHistory?: () => void;
  onToggleQuickTests?: () => void;
  onToggleConcise?: () => void;
  onTogglePanic?: () => void;
  onOpenSoundCheck?: () => void;
  sessionDuration?: number;
  onRefineQA?: (modifier: 'shorter' | 'code' | 'under_the_hood' | 're_angle') => void;
  isRefining?: boolean;
  hasActiveQA?: boolean;
}

export const StealthCommandDock: React.FC<StealthCommandDockProps> = ({
  isCapturing,
  triggerMode = 'auto',
  audioSource = 'tab',
  onToggleAudioSource,
  onAnswerNow,
  onStartCapture,
  onStopCapture,
  onTogglePanic,
  sessionDuration = 0,
  onRefineQA,
  isRefining = false,
  hasActiveQA = false,
}) => {
  const { locale } = useLocale();
  const hud = getHudTranslations(locale).dock;

  const fmtTime = (secs: number) =>
    `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-40 flex justify-center px-2 sm:px-4 pointer-events-none pb-safe select-none">
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 max-w-full">
        {/* ── MAIN COMBAT DOCK BAR (Rule of 2 Seconds) ── */}
        <div className="px-3 py-1.5 rounded-full bg-[#0D0D10]/95 border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex items-center gap-2 backdrop-blur-2xl max-w-[calc(100vw-16px)] overflow-x-auto no-scrollbar">
          {/* 1. Main Capture Control: Start / Stop */}
          {!isCapturing ? (
            <button
              type="button"
              onClick={() => onStartCapture(audioSource)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-black font-extrabold text-xs font-mono transition-all cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.25)] active:scale-95 shrink-0"
              title={hud.startSession}
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>{hud.startSession}</span>
              <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/15 font-bold">
                Space
              </kbd>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStopCapture}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
              title={hud.stopSession}
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Stop</span>
              {sessionDuration > 0 && (
                <span className="text-[10px] text-rose-200 tabular-nums font-normal opacity-90 border-l border-white/20 pl-1.5">
                  {fmtTime(sessionDuration)}
                </span>
              )}
            </button>
          )}

          {/* Audio Source Switcher */}
          {onToggleAudioSource && (
            <button
              type="button"
              onClick={onToggleAudioSource}
              className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              title={audioSource === 'tab' ? hud.audioSourceTabTooltip : hud.audioSourceMicTooltip}
            >
              <span>{audioSource === 'tab' ? '🌐' : '🎙️'}</span>
              <span className="hidden sm:inline">{audioSource === 'tab' ? 'Tab+Mic' : 'Mic Only'}</span>
            </button>
          )}

          {/* Manual Enter Mode Answer Button */}
          {isCapturing && triggerMode === 'enter' && onAnswerNow && (
            <button
              type="button"
              onClick={onAnswerNow}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shrink-0"
              title={hud.answerNow}
            >
              <span>Answer</span>
              <CornerDownLeft className="w-3 h-3 text-white" />
            </button>
          )}

          {/* 2. Four Quick Response Modification Buttons (Combat Core) */}
          <div className="flex items-center gap-1 pl-1 border-l border-white/[0.08]">
            {/* Shorter / Blitz */}
            <button
              type="button"
              disabled={!hasActiveQA || isRefining}
              onClick={() => onRefineQA?.('shorter')}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-35 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Shorter / Blitz (2-3 punchy bullet points) [Q]"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Shorter</span>
            </button>

            {/* Code */}
            <button
              type="button"
              disabled={!hasActiveQA || isRefining}
              onClick={() => onRefineQA?.('code')}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-35 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Code snippet example"
            >
              <Code2 className="w-3 h-3 text-emerald-400" />
              <span>Code</span>
            </button>

            {/* Under the hood */}
            <button
              type="button"
              disabled={!hasActiveQA || isRefining}
              onClick={() => onRefineQA?.('under_the_hood')}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-35 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Under the hood / Deep Dive"
            >
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span className="hidden md:inline">Under the hood</span>
              <span className="md:hidden">Deep</span>
            </button>

            {/* Re-angle */}
            <button
              type="button"
              disabled={!hasActiveQA || isRefining}
              onClick={() => onRefineQA?.('re_angle')}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-35 disabled:pointer-events-none text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer shrink-0"
              title="Re-angle / Trade-offs"
            >
              <Scale className="w-3 h-3 text-violet-400" />
              <span>Re-angle</span>
            </button>
          </div>

          {/* 3. Panic Shield (F12) - Visually Isolated on the Right */}
          {onTogglePanic && (
            <div className="ml-2 pl-2.5 border-l border-white/15 shrink-0">
              <button
                type="button"
                onClick={onTogglePanic}
                className="px-3 py-1 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 hover:text-white text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all cursor-pointer active:scale-95"
                title="Emergency Panic Shield (F12 / Esc)"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Panic</span>
                <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/40 border border-rose-500/30 text-rose-300">
                  F12
                </kbd>
              </button>
            </div>
          )}
        </div>

        {/* ── KEYCAPS LEGEND ROW ── */}
        <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-2 select-none tracking-wider">
          <span className="flex items-center gap-1">
            <kbd className="kbd-obsidian !h-4 !min-w-[1.2rem] !text-[9px]">Space</kbd> {isCapturing ? 'Stop' : 'Start'}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <kbd className="kbd-obsidian !h-4 !min-w-[1.2rem] !text-[9px]">Q</kbd> Shorter
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <kbd className="kbd-obsidian !h-4 !min-w-[1.2rem] !text-[9px]">B</kbd> Bridge
          </span>
          <span>·</span>
          <span className="flex items-center gap-1 text-rose-400/90 font-medium">
            <kbd className="kbd-obsidian !h-4 !min-w-[1.2rem] !text-[9px] !border-rose-500/30">F12</kbd> Panic Shield
          </span>
        </div>
      </div>
    </div>
  );
};
