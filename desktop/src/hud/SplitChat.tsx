import React, { memo, useEffect, useId, useRef, useState } from 'react';
import {
  ArrowDownCircle,
  Code,
  Lightbulb,
  Maximize2,
  MessageCircle,
  MessageSquare,
  Mic,
  MicOff,
  PanelLeftClose,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Scissors,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { SttStatus } from '../hooks/useCopilotSession';
import type { DirectorModifier } from '../lib/answerStream';
import {
  answerForMessage,
  isViewingHistory,
  latestAnswer,
  queuedAnswersCount,
  viewedAnswer,
  type ChatMessage,
  type SessionState,
} from '../lib/session';
import { AnswerView } from './AnswerView';
import { ChatMessageRow } from './ChatMessageRow';

export interface SplitChatProps {
  sessionState: SessionState;
  onSelectAnswer: (answerId: string | null) => void;
  onActivateMessage: (message: ChatMessage) => void;
  onAsk: (text: string, options?: { modifier?: DirectorModifier; messageId?: string | null }) => void;
  onTogglePillar?: (answerId: string, pillarIndex: number) => void;
  onExplainLine?: (answerId: string, lineIndex: number, lineText: string) => void;
  fontSizePx: number;
  outputLanguage?: string;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  isAudioActive?: boolean;
  onToggleAudio?: () => void;
  stt?: SttStatus;
  nativeError?: { code: string; message: string } | null;
  onRestartAudio?: () => void;
  isBridgeActive?: boolean;
  bridgePhrase?: string;
  onTriggerBridge?: () => void;
  onDismissBridge?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const MODIFIERS: Array<{
  label: string;
  keyHint: string;
  modifier: DirectorModifier;
  icon: React.ReactNode;
}> = [
  {
    label: 'Коротше',
    keyHint: '1',
    modifier: 'shorter',
    icon: <Scissors size={11} className="shrink-0 text-amber-300" />,
  },
  {
    label: 'Простіше',
    keyHint: '2',
    modifier: 'simpler',
    icon: <Lightbulb size={11} className="shrink-0 text-zinc-200" />,
  },
  {
    label: 'Дай код',
    keyHint: '3',
    modifier: 'code',
    icon: <Code size={11} className="shrink-0 text-sky-300" />,
  },
  {
    label: 'Інший підхід',
    keyHint: '4',
    modifier: 're_angle',
    icon: <RotateCcw size={11} className="shrink-0 text-zinc-300" />,
  },
];

export const SplitChat = memo(function SplitChat({
  sessionState,
  onSelectAnswer,
  onActivateMessage,
  onAsk,
  onTogglePillar,
  onExplainLine,
  fontSizePx,
  outputLanguage,
  focusMode,
  onToggleFocusMode,
  isPaused = false,
  onTogglePause,
  isAudioActive = true,
  onToggleAudio,
  stt,
  nativeError,
  onRestartAudio,
  isBridgeActive = false,
  bridgePhrase = '',
  onTriggerBridge,
  onDismissBridge,
  inputRef,
}: SplitChatProps) {
  const inputId = useId();
  const [manualInput, setManualInput] = useState('');
  const [localFocusMode, setLocalFocusMode] = useState(false);

  const isFullFocus = focusMode ?? localFocusMode;
  const toggleFocus = onToggleFocusMode ?? (() => setLocalFocusMode((prev) => !prev));

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const answerScrollRef = useRef<HTMLDivElement>(null);

  const activeAnswer = viewedAnswer(sessionState);
  const liveAnswer = latestAnswer(sessionState);
  const viewingHistory = isViewingHistory(sessionState);
  const queued = queuedAnswersCount(sessionState);

  // Contained scroll inside Transcript column only
  useEffect(() => {
    const el = transcriptScrollRef.current;
    if (!el || isFullFocus) return;
    el.scrollTop = el.scrollHeight;
  }, [sessionState.messages.length, sessionState.interim?.text, isFullFocus]);

  // Reset answer viewport cleanly when switching to another answer card
  useEffect(() => {
    const el = answerScrollRef.current;
    if (!el || !activeAnswer?.id) return;
    el.scrollTop = 0;
  }, [activeAnswer?.id]);

  // Tab shortcut toggles Focus mode when cursor is outside input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        toggleFocus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleFocus]);

  const handleSubmitQuestion = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = manualInput.trim();
    if (!trimmed) return;
    onAsk(trimmed);
    setManualInput('');
  };

  const handleModifier = (modifier: DirectorModifier) => {
    const q = activeAnswer?.question || liveAnswer?.question;
    if (!q) return;
    onAsk(q, {
      modifier,
      messageId: activeAnswer?.messageId ?? liveAnswer?.messageId ?? undefined,
    });
  };

  const handleQuickTest = () => {
    onAsk(
      'Як би ви спроєктували distributed rate limiter для мільйона RPS на Redis + Go/TypeScript?',
      { modifier: 'normal' }
    );
  };

  const sttProblem = stt?.status === 'reconnecting' || stt?.status === 'failed' || Boolean(nativeError);

  return (
    <div
      style={{ '--hud-font': `${fontSizePx}px` } as React.CSSProperties}
      className="flex flex-1 min-h-0 flex-col bg-transparent gap-1.5 pt-1.5"
    >
      {/* Main Columns: 26% Transcript / 74% Answer -> 0% / 100% in Focus Mode */}
      <div className="flex flex-1 min-h-0 gap-1.5">
        {/* LEFT COLUMN (26%) */}
        {!isFullFocus && (
          <section
            aria-label="Стрічка діалогу"
            className="flex basis-[26%] min-w-[200px] max-w-[290px] flex-col min-h-0 rounded-xl border border-white/[0.08] bg-[#09090b]/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09)] overflow-hidden"
          >
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/[0.07] px-3">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono font-semibold uppercase tracking-wider text-zinc-300">
                <MessageSquare size={11} className="text-emerald-400" />
                Діалог ({sessionState.messages.length})
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div
              ref={transcriptScrollRef}
              className="flex-1 min-h-0 overflow-y-auto gb-scroll p-2.5 space-y-2"
            >
              {sessionState.messages.length === 0 && !sessionState.interim?.text && (
                <div className="flex h-full flex-col items-center justify-center px-2 text-center select-none">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#141418] text-zinc-400">
                    <MessageCircle size={16} />
                  </div>
                  <p className="text-xs font-medium text-zinc-300">Слухаю інтерв’юера...</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-zinc-500">
                    Питання з’являться тут автоматично з прив’язкою до відповідей.
                  </p>
                </div>
              )}

              {sessionState.messages.map((msg) => {
                const linkedAns = answerForMessage(sessionState, msg);
                const isSelected = Boolean(
                  linkedAns && activeAnswer && linkedAns.id === activeAnswer.id
                );
                return (
                  <ChatMessageRow
                    key={msg.id}
                    message={msg}
                    answer={linkedAns}
                    isSelected={isSelected}
                    onSelect={(m) => onActivateMessage(m)}
                    onAsk={(m) => onAsk(m.text, { messageId: m.id })}
                  />
                );
              })}

              {sessionState.interim?.text && (
                <div className="rounded-xl border border-emerald-500/30 bg-[#141418] p-2.5 text-xs text-zinc-200 animate-pulse">
                  <span className="mr-1.5 font-mono text-[10px] font-semibold uppercase text-emerald-300">
                    LIVE:
                  </span>
                  {sessionState.interim.text}
                </div>
              )}
            </div>
          </section>
        )}

        {/* RIGHT COLUMN (74% -> 100% Focus Mode) */}
        <section
          aria-label="ШІ-Відповідь"
          className="relative flex flex-1 min-w-0 flex-col min-h-0 rounded-xl border border-white/[0.08] bg-[#09090b]/95 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden"
        >
          {/* Compact Answer Header */}
          <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/[0.07] px-3.5">
            <div className="min-w-0 flex items-center gap-2">
              <Sparkles size={12} className="shrink-0 text-emerald-400" />
              <span className="truncate text-[11.5px] font-medium text-zinc-200">
                {activeAnswer
                  ? activeAnswer.question
                  : 'Готовий генерувати 4-фазні відповіді'}
              </span>
            </div>

            <div
              data-tauri-drag-region="false"
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-2 shrink-0"
            >
              {activeAnswer && (
                <span className="font-mono text-[10.5px] text-zinc-400 tabular-nums">
                  #{activeAnswer.seq}
                </span>
              )}
              <button
                type="button"
                onClick={toggleFocus}
                title="Перемкнути режим Фокусу 100% (Tab)"
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-medium transition-colors cursor-pointer ${
                  isFullFocus
                    ? 'border-white/35 bg-white text-zinc-950'
                    : 'border-white/10 bg-[#141418] text-zinc-300 hover:border-white/25 hover:text-white'
                }`}
              >
                {isFullFocus ? <Maximize2 size={10} /> : <PanelLeftClose size={10} />}
                <span>◧ Фокус (Tab)</span>
              </button>
            </div>
          </div>

          {/* Inline STT Warning / Recovery Strip if needed */}
          {sttProblem && (
            <div className="flex items-center justify-between gap-2 border-b border-rose-500/25 bg-rose-500/10 px-3.5 py-1.5 text-[11px] text-rose-200">
              <span className="truncate">
                {nativeError?.message ||
                  stt?.message ||
                  (stt?.status === 'failed'
                    ? 'Збій каналу транскрипції STT'
                    : 'Перепідключення потоку STT...')}
              </span>
              {onRestartAudio && (
                <button
                  type="button"
                  onClick={onRestartAudio}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-400/35 bg-[#09090b] px-2 py-0.5 text-[10.5px] font-medium text-white hover:bg-rose-500/20 cursor-pointer"
                >
                  <RefreshCw size={10} /> Перезапустити
                </button>
              )}
            </div>
          )}

          {/* Answer Body Container */}
          <div
            ref={answerScrollRef}
            className="flex-1 min-h-0 overflow-y-auto gb-scroll p-3.5 sm:p-4"
          >
            {activeAnswer ? (
              <AnswerView
                answer={activeAnswer}
                outputLanguage={outputLanguage}
                onRetry={(ans) => onAsk(ans.question, { messageId: ans.messageId })}
                onTogglePillar={onTogglePillar}
                onExplainLine={onExplainLine}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center select-none">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#111114] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
                  <Sparkles size={20} className="text-zinc-200" />
                </div>
                <p className="text-sm font-semibold text-white">Очікую запитання</p>
                <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-400">
                  ШІ-суфлер слухає потік. Щойно прозвучить запитання — відповідь з’явиться у 4 фазах: Hook, тези, код та пастка інтерв’юера.
                </p>
                <button
                  type="button"
                  data-tauri-drag-region="false"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={handleQuickTest}
                  className="gb-nodrag mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#141418] px-3.5 py-2 text-xs font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] transition-colors hover:border-white/30 cursor-pointer"
                >
                  <Zap size={13} className="text-emerald-400" />
                  Згенерувати тестову відповідь
                </button>
              </div>
            )}
          </div>

          {/* Floating pill when viewing an archived question */}
          {viewingHistory && liveAnswer && (
            <button
              type="button"
              data-tauri-drag-region="false"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => onSelectAnswer(null)}
              className="gb-nodrag absolute bottom-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-[#111114] px-3 py-1.5 text-[11px] font-semibold text-emerald-200 shadow-[inset_0_1px_0_0_rgba(167,243,208,0.2),0_10px_28px_rgba(0,0,0,0.8)] hover:border-emerald-400 cursor-pointer"
            >
              <ArrowDownCircle size={13} className="text-emerald-400" />
              <span>🟢 Повернутися до поточної відповіді #{liveAnswer.seq}</span>
            </button>
          )}
        </section>
      </div>

      {/* Bridge Phrase Toast (Modifier [5]) */}
      {isBridgeActive && bridgePhrase && (
        <div
          data-tauri-drag-region="false"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onDismissBridge}
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-[#141418] px-3.5 py-2 text-xs text-emerald-100 shadow-[inset_0_1px_0_0_rgba(167,243,208,0.2)] cursor-pointer"
        >
          <span>
            <strong className="font-mono text-[10.5px] uppercase text-emerald-400 mr-1.5">
              ⏳ Пауза-місток:
            </strong>
            “{bridgePhrase}”
          </span>
          <span className="shrink-0 font-mono text-[10px] text-zinc-400">Клік щоб сховати</span>
        </div>
      )}

      {/* BOTTOM MODIFIER & QUICK INPUT DOCK */}
      <footer
        data-tauri-drag-region="false"
        onMouseDown={(e) => e.stopPropagation()}
        className="gb-nodrag shrink-0 flex flex-col gap-2 rounded-b-xl border border-white/[0.08] bg-[#09090b]/95 px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] select-none z-20"
      >
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            {MODIFIERS.map((m) => (
              <button
                key={m.modifier}
                type="button"
                onClick={() => handleModifier(m.modifier)}
                disabled={!activeAnswer && !liveAnswer}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#141418] px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40 cursor-pointer shrink-0"
              >
                <kbd className="rounded border border-white/10 bg-[#09090b] px-1 py-0.2 font-mono text-[9.5px] text-zinc-400">
                  {m.keyHint}
                </kbd>
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}

            {onTriggerBridge && (
              <button
                type="button"
                onClick={onTriggerBridge}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#141418] px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white cursor-pointer shrink-0"
              >
                <kbd className="rounded border border-white/10 bg-[#09090b] px-1 py-0.2 font-mono text-[9.5px] text-zinc-400">
                  5
                </kbd>
                <span>⏳ Пауза-місток</span>
              </button>
            )}
          </div>

          {/* Freeze (Space) & Mic Pause (Ctrl+M) controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleAudio && (
              <button
                type="button"
                onClick={onToggleAudio}
                title="Пауза / Старт мікрофона (Ctrl+M)"
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                  isAudioActive
                    ? 'border-white/[0.08] bg-[#141418] text-zinc-300 hover:border-white/25'
                    : 'border-rose-500/35 bg-rose-500/15 text-rose-200'
                }`}
              >
                {isAudioActive ? <Mic size={11} className="text-emerald-400" /> : <MicOff size={11} />}
                <span className="hidden md:inline">Ctrl+M</span>
              </button>
            )}

            {onTogglePause && (
              <button
                type="button"
                onClick={onTogglePause}
                title="Freeze / Розморозити екран (Space)"
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                  isPaused
                    ? 'border-sky-400/35 bg-sky-500/15 text-sky-200'
                    : 'border-white/[0.08] bg-[#141418] text-zinc-300 hover:border-white/25'
                }`}
              >
                {isPaused ? <Play size={11} /> : <Pause size={11} />}
                <span>{isPaused ? `Live${queued > 0 ? ` (+${queued})` : ''}` : 'Space · Freeze'}</span>
              </button>
            )}
          </div>
        </div>

        {/* IME-safe manual question input bar */}
        <form onSubmit={handleSubmitQuestion} className="flex items-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Ручний запит до ШІ-копайлота
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (e.nativeEvent.isComposing || e.keyCode === 229) {
                  return;
                }
                e.preventDefault();
                handleSubmitQuestion();
              }
            }}
            placeholder="Запитайте ШІ вручну або вставте текст задачі (Ctrl+K або /)..."
            className="gb-input h-8 flex-1 text-xs"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            aria-label="Надіслати запит"
            className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 disabled:opacity-40 cursor-pointer shrink-0"
          >
            <Send size={12} />
            <span className="hidden sm:inline">Запитати</span>
          </button>
        </form>
      </footer>
    </div>
  );
});
