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
  Scale,
} from 'lucide-react';
import type { DialogueMessage } from '../lib/audioEngine';
import type { StructuredAnswerOutput } from '../lib/streamClient';

export interface DualColumnChatProps {
  dialogueMessages: DialogueMessage[];
  liveInterlocutorText: string;
  liveCandidateText: string;
  activeAnswer: StructuredAnswerOutput | null;
  isStreaming: boolean;
  onApplyModifier: (modifier: 'shorter' | 'more_technical' | 'code_example' | 'bridge' | 'tradeoffs') => void;
  onQuestionSelect?: (question: string) => void;
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
 * Helper to render inline formatting like **bold** highlights.
 */
function renderFormattedInlineText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
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

export const DualColumnChat: React.FC<DualColumnChatProps> = ({
  dialogueMessages,
  liveInterlocutorText,
  liveCandidateText,
  activeAnswer,
  isStreaming,
  onApplyModifier,
  onQuestionSelect,
  isFrozen,
}) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const [copiedHook, setCopiedHook] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* ── LEFT COLUMN: Live Dialogue Stream (45% width on desktop) ── */}
      <div className="col-span-5 flex flex-col h-full bg-[#0d0f14] border border-white/15 shadow-xl rounded-2xl overflow-hidden relative min-h-0">
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
              <p className="text-[10px] text-zinc-600 mt-1">
                Голос співрозмовника або ваш мікрофон з'являться тут автоматично.
              </p>
            </div>
          ) : searchQuery.trim().length > 0 && filteredDialogue.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <Search className="w-8 h-8 mb-2 opacity-30 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-400">Нічого не знайдено</p>
              <p className="text-[10px] text-zinc-600 mt-1">
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
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                      <span className="text-[10px] font-semibold tracking-wider text-cyan-300">
                        {msg.label || 'Співрозмовник'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold tracking-wider text-violet-300">
                        {msg.label || 'Ви'}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
                    </>
                  )}
                  <span className="text-[9px] text-zinc-600 font-mono">
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
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] font-semibold text-cyan-300">
                  Співрозмовник (мовлення...)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#101014]/90 border border-cyan-500/30 text-xs text-cyan-100/90 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
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
                <span className="text-[10px] font-semibold text-violet-300">Ви (мовлення...)</span>
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
              </div>
              <div className="p-2.5 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs text-violet-100/90 ml-auto">
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
              className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all"
            >
              <ChevronDown className="w-3.5 h-3.5" /> Нові повідомлення
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT COLUMN: Streaming AI Answers (58% width on desktop) ── */}
      <div className="col-span-7 flex flex-col h-full bg-[#0d0f14] border border-white/15 shadow-xl rounded-2xl overflow-hidden relative min-h-0">
        {/* Subtle Ambient Radial Mesh Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-tr from-cyan-500/10 via-transparent to-violet-500/10 rounded-full blur-3xl" />

        {/* Right Column Header: Telemetry & Status */}
        <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
              AI Copilot Teleprompter
            </h2>
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
            {activeAnswer && (
              <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5">
                TTFT: <span className="text-emerald-400 font-semibold">{activeAnswer.ttftMs}ms</span>
              </span>
            )}
            <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-300">
              {activeAnswer?.model || 'Gemini 3.8 Flash'}
            </span>
          </div>
        </div>

        {/* 1-Click AI Modifiers Bar with Framer Motion Spring Dynamics */}
        <div className="px-3 py-2 border-b border-white/[0.06] bg-black/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('bridge')}
            title="Instant Bridge Phrase: buys 10 seconds of thinking time"
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          >
            <Clock className="w-3 h-3 text-amber-400" />
            Bridge [B]
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('shorter')}
            title="Blitz Mode: 2-3 punchy bullet points"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            Blitz / Shorter [Q]
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('more_technical')}
            title="Deep Dive: OS memory, kernel primitives, asymptotic complexity"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          >
            <Cpu className="w-3 h-3 text-violet-400" />
            Under-the-hood
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('code_example')}
            title="Code Snippet: Idiomatic implementation"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          >
            <Code2 className="w-3 h-3 text-emerald-400" />
            Code Example
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onApplyModifier('tradeoffs')}
            title="Tradeoffs [T]: Latency vs throughput, consistency vs availability"
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          >
            <Scale className="w-3 h-3 text-amber-400" />
            Tradeoffs [T]
          </motion.button>
        </div>

        {/* AI Answer Content Area */}
        <div
          ref={answerContainerRef}
          onScroll={handleAnswerScroll}
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
              {/* PHASE 1: Spoken Start Hook with Spring Typewriter */}
              {activeAnswer?.hook && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={SPRING_PHYSICS}
                  className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/[0.04] to-transparent border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.06)] relative group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Фаза 1: Голосовий старт (Hook)
                    </span>
                    <button
                      onClick={() => handleCopy(activeAnswer.hook)}
                      className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                      title="Копіювати"
                    >
                      {copiedHook ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-amber-100/90 leading-snug">
                    "<SpringTypewriter text={activeAnswer.hook} isStreaming={isStreaming && !activeAnswer.pillars.length} />"
                  </p>
                </motion.div>
              )}

              {/* PHASE 2: Core Pillars */}
              {activeAnswer?.pillars && activeAnswer.pillars.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING_PHYSICS}
                  className="space-y-2"
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5 px-1">
                    <Layers className="w-3 h-3" /> Фаза 2: Ключові тези (Pillars)
                  </span>

                  <div className="grid grid-cols-1 gap-2">
                    {activeAnswer.pillars.map((pillar, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04, ...SPRING_PHYSICS }}
                        className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] text-xs leading-relaxed text-zinc-200 flex items-start gap-2.5 transition-all"
                      >
                        <span className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-cyan-500/20">
                          {idx + 1}
                        </span>
                        <div className="flex-1 text-zinc-200">
                          {renderFormattedInlineText(pillar)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* PHASE 3: Deep Dive & Code Blocks (Streaming Resilient, Zero CLS) */}
              {deepDiveSections.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5 px-1">
                    <Code2 className="w-3 h-3" /> Фаза 3: Deep Dive & Код
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
                            <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                              {section.language}
                            </span>
                            <button
                              onClick={() => handleCopy(section.content, idx)}
                              className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-all"
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

                          <pre className="p-3 text-[11px] font-mono leading-relaxed text-emerald-200/90 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                            <code>{section.content}</code>
                            {section.isStreaming && (
                              <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                            )}
                          </pre>
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
              className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all"
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
