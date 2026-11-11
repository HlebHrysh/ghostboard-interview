import React, { memo, useState, useCallback } from 'react';
import { Maximize2, Scissors, Code, Copy, Check, Zap } from 'lucide-react';
import { EyelineAnswer, copyText } from './AnswerView';
import type { AnswerEntry } from '../lib/session';
import type { DirectorModifier } from '../lib/answerStream';
import type { AskOptions } from '../hooks/useCopilotSession';
import { parseAnswer } from '../lib/answerParser';

export interface EyelineNotchProps {
  activeAnswer: AnswerEntry | null;
  onExpandToChat: () => void;
  fontSizePx: number;
  onAsk?: (text: string, options?: AskOptions) => void;
}

export const EyelineNotch = memo(function EyelineNotch({
  activeAnswer,
  onExpandToChat,
  fontSizePx,
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
    onAsk('Як працює Event Loop у JavaScript та черги microtask vs macrotask?', {
      modifier: 'shorter',
      source: 'manual',
    });
  }, [onAsk]);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-zinc-100 select-none px-3.5 py-2 overflow-hidden justify-between"
      style={{ ['--hud-font' as string]: `${fontSizePx}px` }}
    >
      {/* Top line: Question context + Quick Modifiers + Copy + Expand button */}
      <div className="flex items-center justify-between gap-2 text-xs border-b border-white/[0.06] pb-1.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
            {activeAnswer ? `Відповідь #${activeAnswer.seq}` : 'Суфлер'}
          </span>
          <p className="text-zinc-400 truncate text-[11px] font-medium" title={activeAnswer?.question}>
            {activeAnswer?.question || "Очікування запитання інтерв'юера..."}
          </p>
        </div>

        {/* Action buttons (guaranteed no-drag, stops mousedown propagation) */}
        <div className="flex items-center gap-1 shrink-0 gb-nodrag">
          {activeAnswer ? (
            <>
              {onAsk && (
                <>
                  <button
                    type="button"
                    data-tauri-drag-region="false"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => handleModifier('shorter')}
                    title="Коротше [1]"
                    className="gb-nodrag inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 px-2 py-0.5 rounded border border-white/[0.08] transition-all"
                  >
                    <Scissors size={10} className="text-zinc-400" />
                    <span>Коротше</span>
                  </button>

                  <button
                    type="button"
                    data-tauri-drag-region="false"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => handleModifier('code')}
                    title="Дай код [3]"
                    className="gb-nodrag inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 px-2 py-0.5 rounded border border-white/[0.08] transition-all"
                  >
                    <Code size={10} className="text-zinc-400" />
                    <span>Код</span>
                  </button>
                </>
              )}

              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleCopyHook}
                title="Скопіювати вступ у буфер обміну"
                className="gb-nodrag inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 px-2 py-0.5 rounded border border-emerald-500/25 transition-all"
              >
                {copied ? <Check size={10} className="text-emerald-300" /> : <Copy size={10} />}
                <span>{copied ? 'Скопійовано' : 'Копія'}</span>
              </button>
            </>
          ) : (
            onAsk && (
              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleQuickTest}
                title="Перевірити генерацію відповіді ШІ [Alt+T]"
                className="gb-nodrag inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 active:scale-95 px-2 py-0.5 rounded border border-amber-400/25 transition-all"
              >
                <Zap size={10} className="text-amber-400" />
                <span>Тест ШІ</span>
              </button>
            )
          )}

          <button
            type="button"
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onExpandToChat}
            title="Розгорнути у двоколонковий чат [Ctrl+L]"
            className="gb-nodrag inline-flex items-center gap-1 text-[10.5px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 px-2 py-0.5 rounded border border-white/[0.08] transition-all ml-0.5"
          >
            <Maximize2 size={10} />
            <span>Розгорнути</span>
          </button>
        </div>
      </div>

      {/* Main prompter stream: Large Bold Hook + Key Pillars for direct eye contact */}
      <div className="flex-1 overflow-y-auto gb-scroll pt-1.5 pb-0.5 select-text">
        {activeAnswer ? (
          <EyelineAnswer answer={activeAnswer} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 text-xs px-4">
            <p className="text-zinc-400 font-medium">Дивіться в камеру. Підказка з'явиться щойно прозвучить запитання.</p>
            {onAsk && (
              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleQuickTest}
                className="gb-nodrag mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 active:scale-95 border border-amber-400/25 transition-all"
              >
                <Zap size={11} className="text-amber-400" />
                <span>Згенерувати тестову відповідь (або Alt+T)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
