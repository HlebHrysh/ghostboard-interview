'use client';

import React from 'react';
import { Mic, Zap, CornerDownLeft, Lock, ShieldCheck, Sparkles, Keyboard } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';

interface LiveTranscriptHUDProps {
  isCapturing: boolean;
  liveTranscript: string;
  isCopilotGenerating: boolean;
  isFrozen?: boolean;
  triggerMode?: 'auto' | 'enter';
  onToggleTriggerMode?: () => void;
  onAnswerNow: () => void;
  bufferedWordCount?: number;
  hasQuestions?: boolean;
  hasTabAudio?: boolean;
  onRepickTabAudio?: () => void;
}

export const LiveTranscriptHUD: React.FC<LiveTranscriptHUDProps> = ({
  isCapturing,
  liveTranscript,
  isCopilotGenerating,
  isFrozen = false,
  triggerMode = 'auto',
  onToggleTriggerMode,
  onAnswerNow,
  bufferedWordCount = 0,
  hasQuestions = false,
  hasTabAudio = true,
  onRepickTabAudio,
}) => {
  const { locale } = useLocale();
  const hud = getHudTranslations(locale).transcript;

  if (!isCapturing && !liveTranscript) return null;
  if (isCapturing && !hasQuestions) return null;

  const currentWords = liveTranscript ? liveTranscript.split(/\s+/).filter(Boolean).length : 0;
  const totalWords = Math.max(currentWords, bufferedWordCount);
  const isClearSpeech = totalWords >= 3;
  const hasTextToAnswer = !!(liveTranscript?.trim() || bufferedWordCount > 0);

  return (
    <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] inset-x-0 z-30 pointer-events-none flex justify-center px-3 sm:px-4 transition-all select-none">
      <div
        className={`pointer-events-auto w-full max-w-[680px] rounded-xl p-3 border backdrop-blur-2xl transition-all shadow-[0_12px_32px_rgba(0,0,0,0.7)] bg-[#0D0D10]/95 ${
          isCopilotGenerating
            ? 'border-white/20'
            : isFrozen
            ? 'border-cyan-500/30'
            : liveTranscript
            ? 'border-white/15'
            : 'border-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono mb-1.5 text-zinc-400">
          {/* Left: Ear status */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCopilotGenerating
                    ? 'bg-white animate-pulse'
                    : isFrozen
                    ? 'bg-cyan-400'
                    : 'bg-[#C8F135]'
                }`}
              />
              <span className="font-semibold uppercase tracking-wider text-zinc-300">
                {isCopilotGenerating ? (
                  <span>{hud.aiGenerating}...</span>
                ) : isFrozen ? (
                  <span className="text-cyan-300">{hud.frozenHeader}</span>
                ) : (
                  <span>Interviewer Speech</span>
                )}
              </span>
            </span>

            <span className="px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-400">
              {triggerMode === 'enter' ? 'Manual [↵]' : 'Auto Stream'}
            </span>
          </div>

          {/* Right: Tab Audio Warning / Speech clear */}
          <div className="flex items-center gap-2">
            {!hasTabAudio && onRepickTabAudio && (
              <button
                type="button"
                onClick={onRepickTabAudio}
                className="text-[10px] font-mono text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>⚠️ {locale === 'ua' ? 'Вкладка без звуку' : 'No tab audio'}</span>
              </button>
            )}

            {isClearSpeech && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-400">
                <ShieldCheck className="w-3 h-3 text-[#C8F135]" />
                <span>Audio Clean</span>
              </span>
            )}
          </div>
        </div>

        {/* Live Transcript Content */}
        <div className="min-h-[22px] flex items-center justify-between gap-3">
          <p className="text-xs sm:text-sm font-sans font-medium text-white leading-relaxed truncate flex-1">
            {liveTranscript ? (
              <span>
                «{liveTranscript}»
                <span className="inline-block w-1.5 h-3.5 bg-[#C8F135] ml-1.5 align-middle animate-pulse" />
              </span>
            ) : (
              <span className="text-zinc-500 font-mono text-xs">
                {hud.listeningPlaceholder}
              </span>
            )}
          </p>

          {/* Manual Answer Button if Enter mode or text buffered */}
          {hasTextToAnswer && (
            <button
              type="button"
              onClick={onAnswerNow}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
              title={hud.answerNowBtn}
            >
              <span>Answer</span>
              <CornerDownLeft className="w-3 h-3 text-[#C8F135]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
