'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Square,
  Zap,
  Code2,
  Lightbulb,
  Scale,
  MessageCircle,
  Snowflake,
  CornerDownLeft,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';

export interface StealthCommandDockProps {
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
  onTriggerBridge?: () => void;
  onTriggerScreenshot?: () => void;
  onToggleHistory?: () => void;
  onToggleQuickTests?: () => void;
  onToggleConcise?: () => void;
  onOpenSoundCheck?: () => void;
  sessionDuration?: number;
  onRefineQA?: (modifier: 'shorter' | 'simpler' | 'code' | 'under_the_hood' | 're_angle') => void;
  isRefining?: boolean;
  hasActiveQA?: boolean;
}

const SPRING = { type: 'spring' as const, stiffness: 350, damping: 28, mass: 0.6 };

export const StealthCommandDock: React.FC<StealthCommandDockProps> = ({
  isCapturing,
  isFrozen = false,
  pendingNewCount = 0,
  triggerMode = 'auto',
  audioSource = 'tab',
  onAnswerNow,
  onStartCapture,
  onStopCapture,
  onToggleFreeze,
  onTriggerBridge,
  sessionDuration = 0,
  onRefineQA,
  isRefining = false,
  hasActiveQA = false,
}) => {
  const { locale } = useLocale();
  const hud = getHudTranslations(locale).dock;
  const isUa = locale === 'ua';

  const fmtTime = (secs: number) =>
    `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  const modifierButtons: {
    key: 'shorter' | 'simpler' | 'code' | 're_angle';
    label: string;
    hotkey: string;
    tooltip: string;
    Icon: React.ComponentType<{ className?: string }>;
    tint: string;
  }[] = [
    {
      key: 'shorter',
      label: isUa ? 'Коротше' : 'Shorter',
      hotkey: '1',
      tooltip: isUa ? 'Стиснути до 3 тез [1]' : 'Shorten answer [1]',
      Icon: Zap,
      tint: 'text-amber-300',
    },
    {
      key: 'simpler',
      label: isUa ? 'Простіше' : 'Simpler',
      hotkey: '2',
      tooltip: isUa ? 'Простішою мовою [2]' : 'Simpler phrasing [2]',
      Icon: Lightbulb,
      tint: 'text-emerald-300',
    },
    {
      key: 'code',
      label: isUa ? 'Код' : 'Code',
      hotkey: '3',
      tooltip: isUa ? 'Додати чистий код + O(n) [3]' : 'Code example [3]',
      Icon: Code2,
      tint: 'text-sky-300',
    },
    {
      key: 're_angle',
      label: isUa ? 'Інший підхід' : 'Re-angle',
      hotkey: '4',
      tooltip: isUa ? 'Альтернативний підхід та компроміси [4]' : 'Trade-offs / alternative [4]',
      Icon: Scale,
      tint: 'text-violet-300',
    },
  ];

  return (
    <div className="fixed bottom-[calc(0.85rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-40 flex justify-center px-2 sm:px-4 pointer-events-none pb-safe select-none">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="pointer-events-auto liquid-glass-dock px-3 sm:px-4 py-2 rounded-2xl border border-white/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_24px_60px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 w-fit max-w-[calc(100vw-16px)]"
      >
        {/* 1. Primary Capture Control: Start / Stop */}
        {!isCapturing ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => onStartCapture(audioSource)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs font-mono transition-colors cursor-pointer shrink-0 shadow-[0_0_24px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.9)]"
            title={hud.startSession}
          >
            <Play className="w-3.5 h-3.5 fill-zinc-950" />
            <span>{hud.startSession}</span>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onStopCapture}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/85 hover:bg-rose-500 border border-rose-300/35 text-white font-mono text-xs font-semibold transition-colors cursor-pointer shadow-[0_0_24px_rgba(244,63,94,0.3)] shrink-0"
            title={hud.stopSession}
          >
            <Square className="w-3 h-3 fill-white" />
            <span>Stop</span>
            {sessionDuration > 0 && (
              <span className="text-xs text-rose-100 tabular-nums border-l border-white/25 pl-2">
                {fmtTime(sessionDuration)}
              </span>
            )}
          </motion.button>
        )}

        {/* Manual Answer Trigger in Enter mode */}
        {isCapturing && triggerMode === 'enter' && onAnswerNow && (
          <button
            type="button"
            onClick={onAnswerNow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-300/35 text-cyan-50 text-xs font-mono font-semibold transition-colors cursor-pointer shrink-0"
            title={hud.answerNow}
          >
            <span>{isUa ? 'Відповісти' : 'Answer'}</span>
            <CornerDownLeft className="w-3.5 h-3.5 text-cyan-200" />
          </button>
        )}

        {/* 2. Freeze Teleprompter (Space) */}
        {onToggleFreeze && (
          <button
            type="button"
            onClick={onToggleFreeze}
            className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isFrozen
                ? 'bg-cyan-500/25 border-cyan-300/45 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                : 'bg-white/[0.05] hover:bg-white/[0.12] border-white/10 text-zinc-200 hover:text-white'
            }`}
            title={isUa ? 'Заморозити / розморозити суфлер [Space]' : 'Freeze / Unfreeze prompter [Space]'}
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">{isFrozen ? 'Frozen' : 'Freeze'}</span>
            <kbd className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300 leading-none">
              Space
            </kbd>
            {pendingNewCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-300 text-zinc-950 font-bold text-[11px] tabular-nums leading-none">
                +{pendingNewCount}
              </span>
            )}
          </button>
        )}

        {/* 3. Unified 1-5 Modifiers */}
        <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-white/[0.12] flex-wrap justify-center">
          {modifierButtons.map((mod) => {
            const Icon = mod.Icon;
            return (
              <button
                key={mod.key}
                type="button"
                disabled={!hasActiveQA || isRefining}
                onClick={() => onRefineQA?.(mod.key)}
                title={mod.tooltip}
                className="px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.13] border border-white/10 hover:border-white/25 disabled:opacity-35 disabled:pointer-events-none text-zinc-100 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Icon className={`w-3.5 h-3.5 ${mod.tint}`} />
                <span className="hidden md:inline">{mod.label}</span>
                <kbd className="text-[11px] font-mono text-zinc-300 bg-white/[0.08] px-1.5 py-0.5 rounded leading-none">
                  {mod.hotkey}
                </kbd>
              </button>
            );
          })}

          {onTriggerBridge && (
            <button
              type="button"
              onClick={onTriggerBridge}
              title={isUa ? 'Миттєва фраза для виграшу часу [5]' : 'Bridge phrase to stall smoothly [5]'}
              className="px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.13] border border-white/10 hover:border-white/25 text-zinc-100 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 text-cyan-300" />
              <span className="hidden md:inline">{isUa ? 'Тягнути час' : 'Bridge'}</span>
              <kbd className="text-[11px] font-mono text-zinc-300 bg-white/[0.08] px-1.5 py-0.5 rounded leading-none">
                5
              </kbd>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
