import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Code2,
  Copy,
  Check,
  Layers,
  Clock,
  MessageSquare,
  Search,
  Cpu,
  ChevronDown,
  ChevronUp,
  Scale,
  Maximize2,
  Camera,
  Send,
} from 'lucide-react';
import type { DialogueMessage } from '../lib/audioEngine';
import type { StructuredAnswerOutput } from '../lib/streamClient';

export interface DualColumnChatProps {
  dialogueMessages: DialogueMessage[];
  liveInterlocutorText: string;
  liveCandidateText: string;
  activeAnswer: StructuredAnswerOutput | null;
  isStreaming: boolean;
  onApplyModifier: (modifier: 'shorter' | 'simpler' | 'code' | 're_angle' | 'more_technical' | 'code_example' | 'bridge' | 'tradeoffs') => void;
  onQuestionSelect?: (question: string) => void;
  onQuestionSubmit?: (question: string) => void;
  onTriggerScreenshot?: () => void;
  isCapturingScreen?: boolean;
  screenshotPreview?: string | null;
  onClearScreenshot?: () => void;
  isFrozen: boolean;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export interface MarkdownSection {
  type: 'text' | 'code';
  content: string;
  language?: string;
  isStreaming?: boolean;
}

/**
 * Streaming-resilient markdown parser.
 * Handles unclosed code fences during active token generation without layout shift (CLS = 0)
 * and preserves explanations before and after code blocks.
 */
export function parseStreamingMarkdown(raw: string, isStreaming: boolean): MarkdownSection[] {
  if (!raw || !raw.trim()) return [];
  const sections: MarkdownSection[] = [];

  // Opening fence: start of string or after newline, 0+ whitespace, 3+ backticks, optional language, and newline or end-of-string
  const openFenceRegex = /(?:^|(?<=\r?\n))[ \t]*(`{3,})([a-zA-Z0-9_-]*)[ \t]*(?:\r?\n|$)/g;
  let currentIndex = 0;

  while (currentIndex < raw.length) {
    openFenceRegex.lastIndex = currentIndex;
    const openMatch = openFenceRegex.exec(raw);

    if (!openMatch) {
      // No more code fences found; remaining text is markdown commentary
      const remainingText = raw.slice(currentIndex).trim();
      if (remainingText) {
        sections.push({ type: 'text', content: remainingText });
      }
      break;
    }

    // Text before the opening fence
    const beforeText = raw.slice(currentIndex, openMatch.index).trim();
    if (beforeText) {
      sections.push({ type: 'text', content: beforeText });
    }

    const fenceBackticks = openMatch[1];
    const fenceLen = fenceBackticks.length;
    const language = openMatch[2] || 'typescript';
    const matchedFull = openMatch[0];

    // Check if opening fence is at the trailing edge of an in-flight stream before newline arrives
    const hasNewline = /\r?\n$/.test(matchedFull);
    if (!hasNewline && openMatch.index + matchedFull.length >= raw.length) {
      if (isStreaming) {
        // Stabilize in-flight code fence: render code block immediately with empty content and active cursor (zero CLS)
        sections.push({
          type: 'code',
          language,
          content: '',
          isStreaming: true,
        });
      } else {
        // In non-streaming mode without trailing newline, treat as plain text per CommonMark
        const trailing = raw.slice(openMatch.index).trim();
        if (trailing) {
          sections.push({ type: 'text', content: trailing });
        }
      }
      break;
    }

    const contentStart = openMatch.index + matchedFull.length;

    // Search for matching closing fence: at least fenceLen backticks on its own line
    const closeFenceRegex = new RegExp(
      `(?:^|(?<=\\r?\\n))[ \\t]*\`{${fenceLen},}[ \\t]*(?:\\r?\\n|$)`,
      'g'
    );
    closeFenceRegex.lastIndex = contentStart;
    const closeMatch = closeFenceRegex.exec(raw);

    if (closeMatch) {
      const codeContent = raw.slice(contentStart, closeMatch.index);
      sections.push({
        type: 'code',
        language,
        content: codeContent.trimEnd(),
        isStreaming: false,
      });
      currentIndex = closeMatch.index + closeMatch[0].length;
    } else {
      // Unclosed code block extending to the current end of stream
      const codeContent = raw.slice(contentStart);
      sections.push({
        type: 'code',
        language,
        content: codeContent.trimEnd(),
        isStreaming: isStreaming,
      });
      break;
    }
  }

  return sections;
}

/**
 * Spring Typewriter reveal component for token-by-token rendering
 * with tuned spring dynamics and active cyan cybernetic pulse cursor.
 */
export const SpringTypewriter: React.FC<{
  text: string;
  isStreaming?: boolean;
  className?: string;
}> = ({ text, isStreaming = false, className = '' }) => {
  const words = text.split(/(\s+)/);

  return (
    <span className={className}>
      {words.map((chunk, idx) => (
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 3, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 450, damping: 26, mass: 0.5 }}
          className="inline"
        >
          {chunk}
        </motion.span>
      ))}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse align-middle" />
      )}
    </span>
  );
};

/**
 * Helper to render inline formatting like **bold** highlights as HTML <strong>.
 */
export function renderFormattedInlineText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Renders bilingual phrases: primary spoken phrase in bright text with bold markdown parsing,
 * translation in parentheses in muted italic capsule pill.
 */
export function renderBilingualPhrase(text: string): React.ReactNode {
  if (!text) return null;
  const regex = /(\([^)]*[а-яА-ЯёЁіІїЇєЄґҐ][^)]*\))/g;
  const parts = text.split(regex);
  if (parts.length === 1) {
    return <span>{renderFormattedInlineText(text)}</span>;
  }
  return parts.map((part, idx) => {
    if (regex.test(part)) {
      regex.lastIndex = 0;
      return (
        <span
          key={idx}
          className="text-zinc-400 text-xs italic bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 ml-1.5 inline-block font-normal"
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{renderFormattedInlineText(part)}</span>;
  });
}

/**
 * Renders pillars with bold anchor keywords at the beginning (Rule of 2 Seconds).
 */
function renderPillarWithAnchor(text: string): React.ReactNode {
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 45) {
    const rawAnchor = text.slice(0, colonIdx).trim();
    const cleanAnchor = rawAnchor.replace(/^\*\*|\*\*$/g, '').trim();
    const rest = text.slice(colonIdx + 1);
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5 text-xs border border-white/10">
          {cleanAnchor}
        </span>
        {renderBilingualPhrase(rest)}
      </>
    );
  }
  const dashMatch = text.match(/^([^-—]{3,35})\s*[-—]\s*(.*)$/);
  if (dashMatch) {
    const cleanAnchor = dashMatch[1].replace(/^\*\*|\*\*$/g, '').trim();
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5 text-xs border border-white/10">
          {cleanAnchor}
        </span>
        <span className="text-zinc-400 mx-1">—</span>
        {renderBilingualPhrase(dashMatch[2])}
      </>
    );
  }
  return renderBilingualPhrase(text);
}

export const DualColumnChat: React.FC<DualColumnChatProps> = ({
  dialogueMessages,
  liveInterlocutorText,
  liveCandidateText,
  activeAnswer,
  isStreaming,
  onApplyModifier,
  onQuestionSelect,
  onQuestionSubmit,
  onTriggerScreenshot,
  isCapturingScreen = false,
  isFrozen,
}) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [isCodeExpanded, setIsCodeExpanded] = useState(true);
  const [manualQuestion, setManualQuestion] = useState('');

  const handleSendManualQuestion = () => {
    if (!manualQuestion.trim() || isStreaming) return;
    const q = manualQuestion.trim();
    setManualQuestion('');
    if (onQuestionSubmit) {
      onQuestionSubmit(q);
    }
  };

  // Proximity scroll references & states
  const dialogueContainerRef = useRef<HTMLDivElement | null>(null);
  const answerContainerRef = useRef<HTMLDivElement | null>(null);
  const [isUserScrolledUpDialogue, setIsUserScrolledUpDialogue] = useState(false);
  const [isUserScrolledUpAnswer, setIsUserScrolledUpAnswer] = useState(false);

  // Left Column Proximity Scroll
  const handleDialogueScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setIsUserScrolledUpDialogue(scrollHeight - scrollTop - clientHeight > 60);
  };

  useEffect(() => {
    if (!isFrozen && !isUserScrolledUpDialogue && dialogueContainerRef.current) {
      dialogueContainerRef.current.scrollTo({
        top: dialogueContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [dialogueMessages, liveInterlocutorText, liveCandidateText, isFrozen, isUserScrolledUpDialogue]);

  // Right Column Proximity Scroll
  const handleAnswerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setIsUserScrolledUpAnswer(scrollHeight - scrollTop - clientHeight > 60);
  };

  useEffect(() => {
    if (!isFrozen && !isUserScrolledUpAnswer && answerContainerRef.current && isStreaming) {
      answerContainerRef.current.scrollTo({
        top: answerContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [activeAnswer, isStreaming, isFrozen, isUserScrolledUpAnswer]);

  // 1-Click Code Copy with fallback
  const handleCopy = async (text: string, index?: number) => {
    let success = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        success = true;
      }
    } catch {
      // fallback
    }

    if (!success && typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {}
    }

    if (typeof index === 'number') {
      setCopiedCodeIndex(index);
      setTimeout(() => setCopiedCodeIndex(null), 2000);
    } else {
      setCopiedHook(true);
      setTimeout(() => setCopiedHook(false), 2000);
    }
    return success;
  };

  const filteredDialogue = dialogueMessages.filter((msg) =>
    msg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deepDiveSections = parseStreamingMarkdown(activeAnswer?.deepDive || '', isStreaming);

  return (
    <div className="grid grid-cols-12 gap-3 h-full overflow-hidden select-text relative min-h-0">
      {/* ── LEFT COLUMN: Live Dialogue Stream (condensed in Focus Mode) ── */}
      <div className={`${isFocusMode ? 'col-span-3' : 'col-span-5'} transition-all duration-300 ease-out flex flex-col h-full bg-[#09090b] border border-white/10 shadow-xl rounded-2xl overflow-hidden relative min-h-0`}>
        {/* Subtle Ambient Radial Mesh Glow */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

        {/* Left Column Header */}
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
              Живий діалог
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono">
              {filteredDialogue.length} реплік
            </span>
          </div>
        </div>

        {/* Focus Mode Condensed Live Ticker */}
        {isFocusMode && (
          <div className="px-3 py-2 bg-cyan-950/20 border-b border-cyan-500/20 text-xs">
            <div className="flex items-center gap-1.5 mb-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live Ticker
            </div>
            <p className="truncate italic text-zinc-300 text-[11px]">
              {liveInterlocutorText || (dialogueMessages.length > 0 ? dialogueMessages[dialogueMessages.length - 1].text : 'Очікуємо репліку...')}
            </p>
          </div>
        )}

        {/* Search bar within dialogue */}
        <div className="px-3 py-2 border-b border-white/[0.05] bg-black/20">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук у репліках..."
              className="w-full pl-8 pr-3 py-1 text-xs bg-white/[0.03] border border-white/[0.06] rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Dialogue Scroll Area */}
        <div
          ref={dialogueContainerRef}
          onScroll={handleDialogueScroll}
          className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/20 relative min-h-0"
        >
          {/* Empty states: awaiting speech vs search with zero matches */}
          {dialogueMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <HeadphonesIcon className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
              <p className="text-xs font-medium text-zinc-400">Очікування мовлення...</p>
              <p className="text-xs text-zinc-400 mt-1">
                Голос співрозмовника або ваш мікрофон з'являться тут автоматично.
              </p>
            </div>
          ) : searchQuery.trim().length > 0 && filteredDialogue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <Search className="w-8 h-8 mb-2 opacity-30 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-400">Нічого не знайдено</p>
              <p className="text-xs text-zinc-400 mt-1">
                За запитом "{searchQuery}" немає збігів.
              </p>
            </div>
          ) : null}

          {filteredDialogue.map((msg) => {
            // Speaker normalization: both 'interlocutor' and 'interviewer' are left-aligned
            const isInterlocutor = msg.speaker === 'interlocutor' || msg.speaker === 'interviewer';

            return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING_PHYSICS}
                onClick={() => isInterlocutor && onQuestionSelect?.(msg.text)}
                className={`flex flex-col group ${
                  isInterlocutor ? 'items-start' : 'items-end'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {isInterlocutor ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                      <span>{msg.label || "Інтерв'юер"}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)] ml-auto">
                      <span>{msg.label || 'Ви'}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    </span>
                  )}
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-xl max-w-[90%] text-xs leading-relaxed transition-all ${
                    isInterlocutor
                      ? 'bg-[#101014] border border-white/10 text-zinc-100 shadow-md hover:border-cyan-500/30 cursor-pointer'
                      : 'bg-white/[0.05] border border-white/[0.08] text-zinc-300 ml-auto'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{renderFormattedInlineText(msg.text)}</p>
                </div>
              </motion.div>
            );
          })}

          {/* Live Interim Transcription for Interlocutor */}
          {liveInterlocutorText && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-start"
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  Інтерв&apos;юер (наживо...)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101014]/90 border border-dashed border-cyan-500/30 text-xs text-zinc-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <p className="italic">{liveInterlocutorText}...</p>
              </div>
            </motion.div>
          )}

          {/* Live Interim Transcription for Candidate */}
          {liveCandidateText && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-end"
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                  Ви (наживо...)
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-dashed border-emerald-500/30 text-xs text-zinc-400 ml-auto">
                <p className="italic">{liveCandidateText}...</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Floating Return to Bottom CTA for Dialogue */}
        <AnimatePresence>
          {isUserScrolledUpDialogue && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={SPRING_PHYSICS}
              onClick={() => {
                setIsUserScrolledUpDialogue(false);
                dialogueContainerRef.current?.scrollTo({
                  top: dialogueContainerRef.current.scrollHeight,
                  behavior: 'smooth',
                });
              }}
              className="absolute bottom-14 right-4 z-20 px-3 py-1.5 rounded-full bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-medium shadow-lg flex items-center gap-1.5 transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" /> Нові повідомлення
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Quick Manual Prompt & Vision Screenshot Bar ── */}
        <div className="p-2 border-t border-white/[0.08] bg-black/40 flex items-center gap-2 shrink-0">
          {onTriggerScreenshot && (
            <button
              type="button"
              onClick={onTriggerScreenshot}
              disabled={isCapturingScreen}
              title="Зробити знімок екрана та проаналізувати код (Ctrl+Shift+S)"
              className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-xs transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Camera className={`w-3.5 h-3.5 ${isCapturingScreen ? 'animate-spin' : ''}`} />
            </button>
          )}
          <input
            type="text"
            value={manualQuestion}
            onChange={(e) => setManualQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualQuestion.trim()) {
                handleSendManualQuestion();
              }
            }}
            placeholder="Задати запитання вручну..."
            className="flex-1 px-3 py-1.5 text-xs bg-white/[0.03] border border-white/[0.08] rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="button"
            onClick={handleSendManualQuestion}
            disabled={!manualQuestion.trim() || isStreaming}
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center justify-center"
            title="Надіслати запитання"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Streaming AI Answers (75% width in Focus Mode) ── */}
      <div className={`${isFocusMode ? 'col-span-9' : 'col-span-7'} transition-all duration-300 ease-out flex flex-col h-full bg-[#09090b] border border-white/10 shadow-xl rounded-2xl overflow-hidden relative min-h-0`}>
        {/* Subtle Ambient Radial Mesh Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-tr from-cyan-500/10 via-transparent to-violet-500/10 rounded-full blur-3xl" />

        {/* Right Column Header: Telemetry & Status */}
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
              AI Copilot Teleprompter
            </h2>
            {activeAnswer?.meta && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-[9px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>{activeAnswer.meta.domain}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">{activeAnswer.meta.level}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-cyan-300 uppercase">{activeAnswer.meta.language}</span>
              </span>
            )}
            {isStreaming && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                STREAMING
              </span>
            )}
            {isFrozen && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                FROZEN [Space]
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
            {/* Focus Mode button */}
            <button
              onClick={() => setIsFocusMode((prev) => !prev)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                isFocusMode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10'
              }`}
              title="Focus Mode (75% Teleprompter Width)"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Focus</span>
            </button>

            {/* Typography Controls */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded p-0.5">
              <button
                onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                className="px-1 py-0.2 rounded hover:bg-white/10 text-zinc-400 hover:text-white font-bold cursor-pointer"
                title="Зменшити шрифт"
              >
                A-
              </button>
              <span className="w-4 text-center text-zinc-300">{fontSize}</span>
              <button
                onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                className="px-1 py-0.2 rounded hover:bg-white/10 text-zinc-400 hover:text-white font-bold cursor-pointer"
                title="Збільшити шрифт"
              >
                A+
              </button>
            </div>

            {activeAnswer && (
              <span className="bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded text-emerald-300 font-semibold flex items-center gap-1 text-[10px] font-mono">
                <Zap className="w-2.5 h-2.5 text-emerald-400" />
                TTFT {activeAnswer.ttftMs}ms
              </span>
            )}
            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">
              {activeAnswer?.model || 'Gemini 3.8 Flash / Groq'}
            </span>
          </div>
        </div>

        {/* 1-Click AI Modifiers Bar with Framer Motion Spring Dynamics */}
        <div className="px-3 py-2 border-b border-white/[0.06] bg-black/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onQuestionSubmit?.('Як влаштовані B-Tree індекси в PostgreSQL і коли вони неефективні?')}
            title="⚡ Тест генерації відповіді ШІ"
            className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            ⚡ Тест ШІ
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('shorter')}
            title="⚡ Коротше: стиснути до 3 коротких тез"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            ⚡ Коротше
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('simpler')}
            title="💡 Простіше: пояснити на пальцях без важкого жаргону"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            💡 Простіше
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('code')}
            title="</> Код: одразу чистий робочий код + O(n)"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <Code2 className="w-3 h-3 text-emerald-400" />
            &lt;/&gt; Код
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('re_angle')}
            title="🔄 Інший підхід: альтернативна архітектура та компроміси"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
          >
            <Scale className="w-3 h-3 text-violet-400" />
            🔄 Інший підхід
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('bridge')}
            title="Instant Bridge Phrase: виграти 10 секунд"
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ml-auto"
          >
            <Clock className="w-3 h-3 text-amber-400" />
            Bridge [B]
          </motion.button>
        </div>

        {/* AI Answer Content Area */}
        <div
          ref={answerContainerRef}
          onScroll={handleAnswerScroll}
          style={{ fontSize }}
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 relative min-h-0"
        >
          {!activeAnswer && !isStreaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <Sparkles className="w-10 h-10 mb-3 opacity-30 text-amber-400" />
              <p className="text-sm font-medium text-zinc-300">Готовий генерувати відповіді</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                Коли співрозмовник задасть запитання, підказка миттєво з'явиться тут у трьох фазах.
              </p>
            </div>
          ) : (
            <>
              {/* PHASE 1: Spoken Start Hook with Spring Typewriter (Rule of 2 Seconds) */}
              {activeAnswer?.hook && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING_PHYSICS}
                  className="pl-4 pr-3.5 py-3 border-l-4 border-l-amber-400/90 rounded-r-xl bg-white/[0.02] border-y border-r border-white/[0.05] shadow-[0_4px_20px_rgba(245,158,11,0.06)] relative group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Фаза 1: Голосовий старт (Hook)
                    </span>
                    <button
                      onClick={() => handleCopy(activeAnswer.hook)}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                      title="Копіювати"
                    >
                      {copiedHook ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="text-[16px] sm:text-[18px] font-semibold text-white leading-relaxed tracking-tight font-sans">
                    {renderBilingualPhrase(activeAnswer.hook)}
                    {isStreaming && (!activeAnswer.pillars || activeAnswer.pillars.length === 0) && (
                      <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse align-middle" />
                    )}
                  </div>
                </motion.div>
              )}

              {/* PHASE 2: Core Pillars (Spacious with Anchor Keyword Bolding) */}
              {activeAnswer?.pillars && activeAnswer.pillars.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING_PHYSICS}
                  className="space-y-2.5"
                >
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5 px-1">
                    <Layers className="w-3.5 h-3.5" /> Фаза 2: Ключові тези (Pillars)
                  </span>

                  <div className="grid grid-cols-1 gap-2.5">
                    {activeAnswer.pillars.map((pillar, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04, ...SPRING_PHYSICS }}
                        className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] text-xs sm:text-sm leading-relaxed text-zinc-200 flex items-start gap-2.5 transition-all"
                      >
                        <span className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-cyan-500/30 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 text-zinc-100 font-medium">
                          {renderPillarWithAnchor(pillar)}
                          {isStreaming && idx === activeAnswer.pillars.length - 1 && (!activeAnswer.deepDive || activeAnswer.deepDive.length === 0) && (
                            <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.9)] animate-pulse align-middle" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* PHASE 3: Deep Dive & Code Blocks (Collapsible, Zero CLS) */}
              {deepDiveSections.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5 px-1">
                    <Code2 className="w-3.5 h-3.5" /> Фаза 3: Deep Dive & Код
                  </span>

                  {deepDiveSections.map((section, idx) => {
                    if (section.type === 'code') {
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={SPRING_PHYSICS}
                          className="rounded-xl overflow-hidden border border-white/[0.1] bg-[#050607] relative group"
                        >
                          <div className="px-3.5 py-1.5 bg-white/[0.03] border-b border-white/[0.08] flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => setIsCodeExpanded((p) => !p)}
                              className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 hover:text-white uppercase font-semibold cursor-pointer"
                            >
                              <span>{section.language}</span>
                              <span className="text-zinc-500 font-normal">
                                ({section.content.split('\n').length} рядків)
                              </span>
                              {isCodeExpanded ? <ChevronUp className="w-3 h-3 text-zinc-400" /> : <ChevronDown className="w-3 h-3 text-zinc-400" />}
                            </button>
                            <button
                              onClick={() => handleCopy(section.content, idx)}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                            >
                              {copiedCodeIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" /> Скопійовано
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> Копіювати код
                                </>
                              )}
                            </button>
                          </div>

                          {isCodeExpanded && (
                            <pre className="p-3 text-[11px] font-mono leading-relaxed text-emerald-200/90 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 max-h-[300px]">
                              <code>{section.content}</code>
                              {section.isStreaming && (
                                <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                              )}
                            </pre>
                          )}
                        </motion.div>
                      );
                    }

                    // Text section before or after code blocks
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-300 leading-relaxed"
                      >
                        <p className="whitespace-pre-wrap">{renderFormattedInlineText(section.content)}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Active streaming typewriter indicator */}
              {isStreaming && (
                <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-mono py-1 px-1">
                  <span className="inline-block w-2 h-4 bg-cyan-400 animate-pulse" />
                  <span>Генерую відповідь...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating Return to Bottom CTA for AI Answers */}
        <AnimatePresence>
          {isUserScrolledUpAnswer && isStreaming && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={SPRING_PHYSICS}
              onClick={() => {
                setIsUserScrolledUpAnswer(false);
                answerContainerRef.current?.scrollTo({
                  top: answerContainerRef.current.scrollHeight,
                  behavior: 'smooth',
                });
              }}
              className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-medium shadow-lg flex items-center gap-1.5 transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" /> До нових відповідей
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function HeadphonesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
