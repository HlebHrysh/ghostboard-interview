import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ArrowDownCircle,
  Send,
  Scissors,
  Lightbulb,
  Code,
  RotateCcw,
  MessageSquare,
  Clock,
  Zap,
} from 'lucide-react';
import { ChatMessageRow } from './ChatMessageRow';
import { AnswerView } from './AnswerView';
import type {
  ChatMessage,
  AnswerEntry,
  SessionState,
} from '../lib/session';
import {
  viewedAnswer,
  latestAnswer,
  isViewingHistory,
  answerForMessage,
  queuedAnswersCount,
} from '../lib/session';
import type { DirectorModifier } from '../lib/answerStream';

export interface SplitChatProps {
  sessionState: SessionState;
  onSelectAnswer: (answerId: string | null) => void;
  onActivateMessage: (message: ChatMessage) => void;
  onAsk: (text: string, options?: { modifier?: DirectorModifier; messageId?: string | null }) => void;
  onTogglePillar?: (answerId: string, pillarIndex: number) => void;
  onExplainLine?: (answerId: string, lineIndex: number, lineText: string) => void;
  fontSizePx: number;
  isBridgeActive?: boolean;
  bridgePhrase?: string;
  onTriggerBridge?: () => void;
  onDismissBridge?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const MODIFIERS: Array<{ label: string; modifier: DirectorModifier; icon: React.ReactNode }> = [
  { label: '✂️ Коротше', modifier: 'shorter', icon: <Scissors size={11} /> },
  { label: '💡 Простіше', modifier: 'simpler', icon: <Lightbulb size={11} /> },
  { label: '💻 Дай код', modifier: 'code', icon: <Code size={11} /> },
  { label: '🔄 Інший підхід', modifier: 're_angle', icon: <RotateCcw size={11} /> },
  { label: '⚙️ Під капотом', modifier: 'under_the_hood', icon: <Zap size={11} /> },
];

export const SplitChat = memo(function SplitChat({
  sessionState,
  onSelectAnswer,
  onActivateMessage,
  onAsk,
  onTogglePillar,
  onExplainLine,
  fontSizePx,
  isBridgeActive = false,
  bridgePhrase = '',
  onTriggerBridge,
  onDismissBridge,
  inputRef,
}: SplitChatProps) {
  const [manualInput, setManualInput] = useState('');
  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef || internalInputRef;
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const answerScrollRef = useRef<HTMLDivElement>(null);

  const viewed = viewedAnswer(sessionState);
  const latest = latestAnswer(sessionState);
  const viewingHistory = isViewingHistory(sessionState);
  const queuedCount = queuedAnswersCount(sessionState);

  // Auto-scroll left chat when new messages or interim arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [sessionState.messages.length, sessionState.interim?.text]);

  // Reset scroll to top when switching viewed answer cards
  useEffect(() => {
    if (answerScrollRef.current && viewed?.status !== 'streaming') {
      answerScrollRef.current.scrollTop = 0;
    }
  }, [viewed?.id]);

  // Auto-scroll right answer view when new streaming answer arrives or changes
  useEffect(() => {
    if (answerScrollRef.current && viewed?.status === 'streaming') {
      answerScrollRef.current.scrollTop = answerScrollRef.current.scrollHeight;
    }
  }, [viewed?.raw, viewed?.status]);

  const handleManualSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = manualInput.trim();
    if (!q) return;
    onAsk(q);
    setManualInput('');
  };

  const handleApplyModifier = (mod: DirectorModifier) => {
    const targetQuestion = viewed?.question || latest?.question || 'Поясни це питання';
    onAsk(targetQuestion, { modifier: mod });
  };

  const handleQuickTest = () => {
    onAsk('Як працює Event Loop у JavaScript та черги microtask vs macrotask?');
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-[#09090b] text-zinc-100 select-none overflow-hidden"
      style={{ ['--hud-font' as string]: `${fontSizePx}px` }}
    >
      {/* 2-COLUMN MAIN CONTENT (38% Left / 62% Right) */}
      <div className="flex-1 flex min-h-0 divide-x divide-white/[0.08]">
        {/* LEFT COLUMN: ЖИВИЙ ДІАЛОГ (38%) */}
        <section className="w-[38%] min-w-[260px] flex flex-col min-h-0 bg-[#09090b]">
          {/* Header */}
          <div className="h-8 px-3 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              <MessageSquare size={12} className="text-zinc-500" />
              <span>Живий діалог</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {sessionState.messages.length} реплік
            </span>
          </div>

          {/* Messages List */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto gb-scroll p-2.5 space-y-2 select-text"
          >
            {sessionState.messages.length === 0 && !sessionState.interim && (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-emerald-400/80 animate-ping mb-2" />
                <p className="text-xs font-mono">СЛУХАЮ АУДІО...</p>
                <p className="text-xs mt-1 text-zinc-400">
                  Запитання інтерв'юера з'являться тут автоматично
                </p>
              </div>
            )}

            {sessionState.messages.map((msg) => {
              const answer = answerForMessage(sessionState, msg);
              const isSelected = viewed?.id === msg.answerId;
              return (
                <ChatMessageRow
                  key={msg.id}
                  message={msg}
                  answer={answer}
                  isSelected={isSelected}
                  onSelect={onActivateMessage}
                  onAsk={(m) => onAsk(m.text, { messageId: m.id })}
                />
              );
            })}

            {/* Interim live transcription preview */}
            {sessionState.interim && (
              <div className="rounded-xl p-2.5 bg-white/[0.02] border border-dashed border-white/10 text-zinc-400 text-xs italic animate-pulse">
                <span className="font-mono text-[10px] uppercase text-zinc-500 not-italic mr-1.5">
                  [Транскрибування...]
                </span>
                {sessionState.interim.text}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: ШІ-СУФЛЕР (62%) */}
        <section className="flex-1 flex flex-col min-h-0 bg-[#0c0d10] relative">
          {/* Header */}
          <div className="h-8 px-3.5 flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 shrink-0">
                <Sparkles size={12} />
                <span>ШІ-суфлер</span>
              </span>

              {sessionState.paused && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/35 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                  ЗАМОРОЖЕНО
                </span>
              )}

              {queuedCount > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/35 animate-pulse shrink-0">
                  +{queuedCount} в черзі
                </span>
              )}

              {viewed && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 shrink-0">
                  #{viewed.seq}
                </span>
              )}

              {viewed?.isContinuationMerged && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/35 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                  ⚡ Уточнено
                </span>
              )}

              {viewed?.modifier && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 shrink-0">
                  {viewed.modifier}
                </span>
              )}

              {viewed?.question && (
                <span className="text-xs text-zinc-400 truncate max-w-[280px]" title={viewed.question}>
                  — {viewed.question}
                </span>
              )}
            </div>

            {/* Timings */}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 shrink-0">
              {viewed?.ttftMs && <span>TTFT: {viewed.ttftMs}ms</span>}
              {viewed?.totalMs && <span>Total: {viewed.totalMs}ms</span>}
            </div>
          </div>

          {/* Emergency Bridge Banner */}
          {isBridgeActive && bridgePhrase && (
            <div className="mx-3.5 mt-2.5 px-3 py-2 rounded-xl bg-[#19150d] border border-amber-500/40 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200 shadow-lg shadow-amber-950/20 z-20">
              <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-300 mb-0.5 flex items-center justify-between">
                  <span>⚡ Speak Now · Фраза для виграшу часу (Bridge):</span>
                  <span className="text-[9px] text-amber-400/70 font-mono">Автозникнення 8с</span>
                </div>
                <p className="text-xs text-amber-100 font-medium leading-relaxed select-text font-sans">
                  {bridgePhrase}
                </p>
              </div>
              {onDismissBridge && (
                <button
                  type="button"
                  onClick={onDismissBridge}
                  className="text-amber-400/60 hover:text-amber-200 text-xs px-1 -mr-1 -mt-0.5 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Floating pill: Return to latest answer when viewing history (placed at bottom right to avoid covering phase 1 copy button) */}
          {viewingHistory && (
            <div className="absolute bottom-4 right-4 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                data-tauri-drag-region="false"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onSelectAnswer(null)}
                className="gb-nodrag inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0a1b14] hover:bg-[#0e241b] border border-emerald-400/50 text-emerald-300 text-xs font-semibold shadow-lg transition-all active:scale-95"
              >
                <ArrowDownCircle size={13} className="text-emerald-400 animate-bounce" />
                <span>До останньої відповіді{queuedCount > 0 ? ` (+${queuedCount})` : ''}</span>
              </button>
            </div>
          )}

          {/* Teleprompter Answer Content */}
          <div
            ref={answerScrollRef}
            className="flex-1 overflow-y-auto gb-scroll p-4 select-text"
          >
            {viewed ? (
              <AnswerView
                answer={viewed}
                onRetry={(ans) => onAsk(ans.question)}
                onTogglePillar={onTogglePillar}
                onExplainLine={onExplainLine}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 select-none">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                  <Sparkles size={18} />
                </div>
                <p className="text-sm font-semibold text-zinc-200">Очікую запитання</p>
                <p className="text-xs text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
                  ШІ-суфлер слухає діалог. Щойно прозвучить запитання — тут з'явиться відповідь у 3 фазах: швидкий старт, опорні тези та код.
                </p>
                <button
                  type="button"
                  data-tauri-drag-region="false"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleQuickTest}
                  className="gb-nodrag mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 border border-white/10 text-xs text-zinc-200 font-medium transition-all shadow-sm"
                >
                  <Zap size={13} className="text-amber-400" />
                  <span>Згенерувати тестову відповідь</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* BOTTOM ACTION DOCK */}
      <footer
        data-tauri-drag-region="false"
        onMouseDown={(e) => e.stopPropagation()}
        className="border-t border-white/[0.08] bg-[#0c0d10] px-3 py-2 flex flex-col gap-2 shrink-0 select-none z-20 gb-nodrag"
      >
        {/* Modifier buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1 shrink-0">
            Режими:
          </span>
          {MODIFIERS.map((m, idx) => (
            <button
              key={m.modifier}
              type="button"
              data-tauri-drag-region="false"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => handleApplyModifier(m.modifier)}
              className="gb-nodrag inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 active:scale-95 px-2.5 py-1 rounded-md transition-all shrink-0"
            >
              <span>{m.label}</span>
              <kbd className="text-[9px] font-mono text-zinc-500 bg-white/[0.04] px-1 rounded">{idx + 1}</kbd>
            </button>
          ))}
          <button
            type="button"
            data-tauri-drag-region="false"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleQuickTest}
            title="Миттєвий тест генерації відповіді ШІ"
            className="gb-nodrag inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 active:scale-95 border border-amber-400/30 px-2.5 py-1 rounded-md transition-all shrink-0 ml-1"
          >
            <Zap size={11} className="text-amber-400" />
            <span>Тест ШІ</span>
          </button>
          {onTriggerBridge && (
            <button
              type="button"
              data-tauri-drag-region="false"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onTriggerBridge}
              title="Фраза для виграшу часу [B]"
              className={`gb-nodrag inline-flex items-center gap-1.5 text-[11px] font-semibold border active:scale-95 px-2.5 py-1 rounded-md transition-all shrink-0 ml-1 ${
                isBridgeActive
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border-amber-400/30'
              }`}
            >
              <Zap size={11} className="text-amber-400 fill-amber-400" />
              <span>Брідж</span>
              <kbd className="text-[9px] font-mono text-amber-400/80 bg-white/[0.04] px-1 rounded">B</kbd>
            </button>
          )}
        </div>

        {/* Manual question input */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <input
            ref={activeInputRef}
            type="text"
            data-tauri-drag-region="false"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Введіть запитання або задачу... (Enter або Ctrl+K)"
            className="gb-nodrag flex-1 bg-white/[0.03] hover:bg-white/[0.05] focus:bg-white/[0.06] border border-white/10 focus:border-white/30 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition-all select-text"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            title="Надіслати запитання [Enter]"
            className="gb-nodrag inline-flex items-center justify-center gap-1 bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:hover:bg-white text-zinc-950 font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all active:scale-95 shrink-0 shadow-sm"
          >
            <Send size={12} />
            <span>ШІ</span>
          </button>
        </form>
      </footer>
    </div>
  );
});
