import React, { memo, useCallback, useState } from 'react';
import {
  Check,
  Code,
  Copy,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Scissors,
  Zap,
} from 'lucide-react';
import type { AskOptions, SttStatus } from '../hooks/useCopilotSession';
import type { DirectorModifier } from '../lib/answerStream';
import { parseAnswer } from '../lib/answerParser';
import type { AnswerEntry } from '../lib/session';
import { EyelineAnswer, copyText } from './AnswerView';

export interface EyelineNotchProps {
  activeAnswer: AnswerEntry | null;
  onExpandToChat: () => void;
  fontSizePx: number;
  isPaused?: boolean;
  onTogglePause?: () => void;
  stt?: SttStatus;
  onRestartAudio?: () => void;
  onAsk?: (text: string, options?: AskOptions) => void;
}

export const EyelineNotch = memo(function EyelineNotch({
  activeAnswer,
  onExpandToChat,
  fontSizePx,
  isPaused = false,
  onTogglePause,
  stt,
  onRestartAudio,
  onAsk,
}: EyelineNotchProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyHook = useCallback(async () => {
    if (!activeAnswer?.raw) return;
    const parsed = parseAnswer(activeAnswer.raw);
    const textToCopy = parsed.hook || parsed.plain || activeAnswer.raw;
    if (await copyText(textToCopy)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    }
  }, [activeAnswer]);

  const handleModifier = useCallback(
    (modifier: DirectorModifier) => {
      if (!activeAnswer?.question || !onAsk) return;
      onAsk(activeAnswer.question, {
        modifier,
        messageId: activeAnswer.messageId ?? undefined,
        source: 'manual',
      });
    },
    [activeAnswer, onAsk]
  );

  const handleQuickTest = useCallback(() => {
    if (!onAsk) return;
    onAsk('Як працює Event Loop у JavaScript та різниця між microtask і macrotask?', {
      modifier: 'shorter',
      source: 'manual',
    });
  }, [onAsk]);

  const sttProblem = stt?.status === 'reconnecting' || stt?.status === 'failed';
  const latencyLabel =
    typeof activeAnswer?.ttftMs === 'number' && activeAnswer.ttftMs > 0
      ? `${activeAnswer.ttftMs}ms`
      : '180ms';

  return (
    <div
      style={{ '--hud-font': `${fontSizePx}px` } as React.CSSProperties}
      className="flex-1 min-h-0 flex items-center justify-center px-2 py-1.5 bg-transparent"
    >
      <div
        data-tauri-drag-region="true"
        className="w-full max-w-[720px] sm:max-w-[760px] rounded-2xl border border-white/10 bg-[#09090b]/95 px-3.5 py-2.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_18px_40px_rgba(0,0,0,0.8)] flex flex-col justify-between gap-2 select-none"
      >
        {/* Top 1-line interviewer question & STT/latency strip */}
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="truncate text-[11.5px] font-medium text-zinc-400">
              {activeAnswer?.question
                ? activeAnswer.question
                : 'Eyeline Суфлер · очікування запитання інтерв’юера...'}
            </span>
          </div>

          <div
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 shrink-0"
          >
            {sttProblem ? (
              <button
                type="button"
                onClick={() => onRestartAudio?.()}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono cursor-pointer ${
                  stt?.status === 'failed'
                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                }`}
              >
                <RefreshCw size={9} className={stt?.status === 'reconnecting' ? 'animate-spin' : ''} />
                <span>{stt?.status === 'failed' ? 'Збій STT' : 'Перепідключення STT'}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#141418] px-2 py-0.5 text-[10px] font-mono text-emerald-300 tabular-nums">
                <Zap size={9} />
                {latencyLabel}
              </span>
            )}

            <button
              type="button"
              onClick={onExpandToChat}
              title="Розгорнути у Split Chat"
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-[#141418] px-2 py-0.5 text-[10.5px] font-medium text-zinc-200 hover:border-white/25 hover:text-white cursor-pointer"
            >
              <Maximize2 size={10} />
              <span>Split</span>
            </button>
          </div>
        </div>

        {/* Core under-webcam prompt area */}
        <div className="max-h-[96px] overflow-y-auto gb-scroll pr-1 max-w-[65ch]">
          {activeAnswer ? (
            <EyelineAnswer answer={activeAnswer} />
          ) : (
            <div className="flex items-center justify-between gap-3 py-1">
              <p className="text-xs text-zinc-400">
                Погляд прямо на камеру — щойно інтерв’юер задасть питання, тут з’явиться стисла відповідь.
              </p>
              {onAsk && (
                <button
                  type="button"
                  data-tauri-drag-region="false"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleQuickTest}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#141418] px-2.5 py-1 text-[11px] font-medium text-white hover:border-white/30 cursor-pointer"
                >
                  <Zap size={11} className="text-emerald-400" />
                  Тест суфлера
                </button>
              )}
            </div>
          )}
        </div>

        {/* Compact quick modifiers */}
        {activeAnswer && (
          <div
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-1.5"
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleModifier('shorter')}
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-[#141418] px-2 py-0.5 text-[10.5px] text-zinc-200 hover:border-white/25 cursor-pointer"
              >
                <Scissors size={10} className="text-amber-300" /> Коротше
              </button>
              <button
                type="button"
                onClick={() => handleModifier('code')}
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-[#141418] px-2 py-0.5 text-[10.5px] text-zinc-200 hover:border-white/25 cursor-pointer"
              >
                <Code size={10} className="text-sky-300" /> Код
              </button>
              <button
                type="button"
                onClick={() => handleModifier('re_angle')}
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-[#141418] px-2 py-0.5 text-[10.5px] text-zinc-200 hover:border-white/25 cursor-pointer"
              >
                <RotateCcw size={10} className="text-zinc-300" /> Ще варіант
              </button>
            </div>

            <div className="flex items-center gap-1">
              {onTogglePause && (
                <button
                  type="button"
                  onClick={onTogglePause}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] cursor-pointer ${
                    isPaused
                      ? 'border-sky-400/35 bg-sky-500/15 text-sky-200'
                      : 'border-white/[0.08] bg-[#141418] text-zinc-300 hover:border-white/25'
                  }`}
                >
                  {isPaused ? <Play size={10} /> : <Pause size={10} />}
                  {isPaused ? 'Live' : 'Freeze'}
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyHook}
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-[#141418] px-2 py-0.5 text-[10.5px] text-zinc-200 hover:border-white/25 cursor-pointer"
              >
                {copied ? <Check size={10} className="text-emerald-300" /> : <Copy size={10} />}
                {copied ? 'Скопійовано ✓' : 'Копія'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
