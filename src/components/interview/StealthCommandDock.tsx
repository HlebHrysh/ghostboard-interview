'use client';

import React from 'react';
import {
  Play,
  Square,
  Lock,
  Unlock,
  Camera,
  History,
  CornerDownLeft,
  Volume2,
  Sparkles,
  Zap,
  Briefcase,
  Keyboard,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';

interface StealthCommandDockProps {
  isCapturing: boolean;
  isAnalyzingScreenshot: boolean;
  questionCount: number;
  isFrozen: boolean;
  pendingNewCount: number;
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
  onTriggerScreenshot: () => void;
  onToggleHistory: () => void;
  onToggleQuickTests?: () => void;
  onToggleConcise?: () => void;
  onTogglePanic?: () => void;
  onOpenSoundCheck?: () => void;
  sessionDuration?: number;
}

export const StealthCommandDock: React.FC<StealthCommandDockProps> = ({
  isCapturing,
  isAnalyzingScreenshot,
  questionCount,
  isFrozen,
  pendingNewCount,
  isConcise = false,
  triggerMode = 'auto',
  sessionMode = 'interview',
  audioSource = 'tab',
  onToggleAudioSource,
  onToggleTriggerMode,
  onToggleSessionMode,
  onAnswerNow,
  onStartCapture,
  onStopCapture,
  onToggleFreeze,
  onTriggerScreenshot,
  onToggleHistory,
  onToggleQuickTests,
  onToggleConcise,
  onTogglePanic,
  onOpenSoundCheck,
  sessionDuration = 0,
}) => {
  const { locale } = useLocale();
  const hud = getHudTranslations(locale).dock;

  const fmtTime = (secs: number) =>
    `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-40 flex justify-center px-2 sm:px-4 pointer-events-none pb-safe select-none">
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 max-w-full">
        {/* ── MAIN RAYCAST / LINEAR COMMAND BAR ── */}
        <div className="px-2.5 py-1.5 rounded-full bg-[#0D0D10]/95 border border-white/[0.08] shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex items-center gap-1.5 sm:gap-2 backdrop-blur-2xl max-w-[calc(100vw-16px)] overflow-x-auto no-scrollbar">
          {!isCapturing ? (
            /* ── PRE-FLIGHT / IDLE BAR ── */
            <>
              <button
                type="button"
                onClick={() => onStartCapture(audioSource)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C8F135] hover:bg-white text-black font-extrabold text-xs font-mono transition-all cursor-pointer shadow-[0_0_20px_rgba(200,241,53,0.3)] active:scale-95"
                title={hud.startSession}
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>{hud.startSession}</span>
                <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/15 font-bold">
                  Space
                </kbd>
              </button>

              {onToggleAudioSource && (
                <button
                  type="button"
                  onClick={onToggleAudioSource}
                  className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title={audioSource === 'tab' ? hud.audioSourceTabTooltip : hud.audioSourceMicTooltip}
                >
                  <span className="text-zinc-400">{audioSource === 'tab' ? '🌐' : '🎙️'}</span>
                  <span>{audioSource === 'tab' ? hud.tabAndMic : hud.micOnly}</span>
                </button>
              )}

              {onOpenSoundCheck && (
                <button
                  type="button"
                  onClick={onOpenSoundCheck}
                  className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title={hud.soundcheckTooltip}
                >
                  <Volume2 className="w-3 h-3 text-zinc-400" />
                  <span className="hidden sm:inline">{hud.soundcheckBtn}</span>
                </button>
              )}

              {questionCount > 0 && (
                <button
                  type="button"
                  onClick={onToggleHistory}
                  className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title={hud.history}
                >
                  <History className="w-3 h-3 text-zinc-400" />
                  <span>{hud.history} ({questionCount})</span>
                </button>
              )}
            </>
          ) : (
            /* ── IN-FLIGHT ACTIVE FOCUS BAR ── */
            <>
              {/* 1. Stop Session Button with Tabular Timer */}
              <button
                type="button"
                onClick={onStopCapture}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                title={hud.stopSession}
              >
                <Square className="w-3 h-3 fill-white" />
                <span>Stop</span>
                {sessionDuration > 0 && (
                  <span className="text-[10px] text-rose-200 tabular-nums w-[36px] text-center font-normal opacity-90 border-l border-white/20 pl-1.5">
                    {fmtTime(sessionDuration)}
                  </span>
                )}
              </button>

              {/* 2. Manual Trigger if in Enter Mode */}
              {triggerMode === 'enter' && onAnswerNow && (
                <button
                  type="button"
                  onClick={onAnswerNow}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-mono font-bold transition-all cursor-pointer active:scale-95"
                  title={hud.answerNow}
                >
                  <span>Answer</span>
                  <CornerDownLeft className="w-3 h-3 text-[#C8F135]" />
                </button>
              )}

              {/* 3. Freeze / Pin Mode (Space) */}
              {onToggleFreeze && (
                <button
                  type="button"
                  onClick={onToggleFreeze}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition-all cursor-pointer active:scale-95 ${
                    isFrozen
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-bold'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300 hover:text-white'
                  }`}
                  title={isFrozen ? hud.frozenBtn : hud.freezeBtn}
                >
                  {isFrozen ? (
                    <>
                      <Lock className="w-3 h-3 text-cyan-300" />
                      <span>{hud.frozenBtn}{pendingNewCount > 0 ? ` (+${pendingNewCount})` : ''}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-zinc-400" />
                      <span>{hud.freezeBtn}</span>
                    </>
                  )}
                  <kbd className="text-[9px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-black/40 border border-white/10">
                    Space
                  </kbd>
                </button>
              )}

              {/* 4. Mode Switcher (Interview vs Meeting) */}
              {onToggleSessionMode && (
                <button
                  type="button"
                  onClick={onToggleSessionMode}
                  className="px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Toggle mode"
                >
                  <Briefcase className="w-3 h-3 text-zinc-400" />
                  <span className="hidden sm:inline">
                    {sessionMode === 'meeting' ? 'Meeting' : 'Interview'}
                  </span>
                </button>
              )}

              {/* 5. Utility Caps (Screenshot F9, Concise Q, History) */}
              <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.08] rounded-full p-0.5">
                <button
                  type="button"
                  onClick={onTriggerScreenshot}
                  disabled={isAnalyzingScreenshot}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isAnalyzingScreenshot
                      ? 'bg-amber-500/20 text-amber-200 animate-pulse'
                      : 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={hud.screenshotBtn}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>

                {onToggleConcise && (
                  <button
                    type="button"
                    onClick={onToggleConcise}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      isConcise
                        ? 'bg-white/15 text-white font-bold'
                        : 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200'
                    }`}
                    title={isConcise ? hud.detailedBtn : hud.conciseBtn}
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleHistory}
                  className="px-2 py-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                  title={hud.history}
                >
                  <History className="w-3 h-3 text-zinc-400" />
                  <span className="text-zinc-200">{questionCount}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── KEYCAPS LEGEND ROW ── */}
        <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-2 select-none tracking-wider">
          <span><kbd className="px-1 py-0.2 rounded bg-black/40 border border-white/10 text-zinc-400">Space</kbd> Freeze</span>
          <span>·</span>
          <span><kbd className="px-1 py-0.2 rounded bg-black/40 border border-white/10 text-zinc-400">Q</kbd> Concise</span>
          <span>·</span>
          <span><kbd className="px-1 py-0.2 rounded bg-black/40 border border-white/10 text-zinc-400">F9</kbd> Screen OCR</span>
          <span>·</span>
          {onTogglePanic ? (
            <button
              type="button"
              onClick={onTogglePanic}
              className="hover:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1 pointer-events-auto"
              title="Esc: Privacy Shield"
            >
              <kbd className="px-1 py-0.2 rounded bg-black/40 border border-white/10 text-zinc-400">Esc</kbd> Privacy
            </button>
          ) : (
            <span><kbd className="px-1 py-0.2 rounded bg-black/40 border border-white/10 text-zinc-400">Esc</kbd> Privacy</span>
          )}
        </div>
      </div>
    </div>
  );
};
