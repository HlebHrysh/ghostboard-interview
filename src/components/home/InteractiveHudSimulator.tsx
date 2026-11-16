'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Code2,
  Copy,
  Check,
  Pause,
  Play,
  Send,
  Mic,
  MicOff,
  Volume2,
  AlertTriangle,
  Layers,
  Search,
  MessageSquare,
  Eye,
  Monitor,
  ShieldCheck,
  RefreshCw,
  Settings2,
  Camera,
  Columns,
  Crosshair,
  GitMerge,
  Lightbulb,
  Scale,
  MessageCircle,
  Webcam,
} from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';
import { parseStructuredGhostboardOutput, MetaTagInfo } from '@/lib/aiPromptCore';
import {
  cleanStreamText,
  holdUnclosedTagBuffer,
  stripRawMarkdownAsterisks,
  splitBilingualSegments,
  extractCode,
  parseBlocks,
} from '../../../desktop/src/lib/answerParser';
import { highlightCode, TOKEN_CLASS } from '../../../desktop/src/lib/highlight';

interface Props {
  t: HomeTranslations;
}

type DirectorModifier = 'normal' | 'shorter' | 'simpler' | 'code' | 're_angle';
type ViewMode = 'candidate' | 'recruiter';
type LanguageOption = 'auto' | 'bilingual' | 'uk' | 'en';
type FontScale = 'sm' | 'md' | 'lg';
type ChannelMode = 'interviewer' | 'dual';

interface DialogueMessage {
  id: string;
  speaker: 'interlocutor' | 'candidate';
  text: string;
  timestamp: number;
  qaItemId?: string;
}

interface QaSnapshot {
  id: string;
  question: string;
  hook: string;
  pillars: string[];
  deepDive: string;
  meta: MetaTagInfo | null;
  ttftMs: number | null;
  modifier: DirectorModifier;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

const QUICK_CHIPS = [
  'React + SQL',
  'Docker vs VM',
  'Event Loop у JS',
  'Проектування Rate Limiter',
  'REST vs gRPC',
] as const;

const MODIFIERS: Array<{
  id: DirectorModifier;
  keyHint: string;
  label: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  tint: string;
}> = [
  { id: 'shorter', keyHint: '1', label: 'Коротше', title: 'Клавіша 1 — Стиснути до 3 коротких тез', Icon: Zap, tint: 'text-amber-300' },
  { id: 'simpler', keyHint: '2', label: 'Простіше', title: 'Клавіша 2 — Пояснити без складного жаргону', Icon: Lightbulb, tint: 'text-emerald-300' },
  { id: 'code', keyHint: '3', label: 'Код', title: 'Клавіша 3 — Чистий робочий код + складність', Icon: Code2, tint: 'text-sky-300' },
  { id: 're_angle', keyHint: '4', label: 'Інший підхід', title: 'Клавіша 4 — Альтернативна архітектура', Icon: Scale, tint: 'text-violet-300' },
];

const BRIDGE_PHRASES: Record<LanguageOption, string> = {
  uk: '«Гарне питання — якщо подивитися на це з погляду продакшн-навантаження та компромісів, ключова механіка тут така…»',
  en: '"Great question — from a production architecture and trade-offs perspective, let me break this down into two layers…"',
  bilingual: '"Great question — looking at production trade-offs (з погляду продакшн-компромісів), I would break this into two layers…"',
  auto: '«Гарне питання — якщо розкласти це на архітектурні рівні та компроміси в продакшені, суть така…»',
};

const VU_MULTIPLIERS = [0.45, 0.85, 1.0, 0.72, 0.5] as const;

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent {
  error: string;
}

interface ISpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
  }
}

function sanitizeRenderText(raw: string): string {
  return stripRawMarkdownAsterisks(cleanStreamText(holdUnclosedTagBuffer(raw)));
}

/**
 * Format inline **bold** segments into high-contrast anchor pills while stripping any unclosed dangling asterisks.
 */
function renderInlineClean(text: string): React.ReactNode {
  const buffered = cleanStreamText(holdUnclosedTagBuffer(text));
  if (!buffered) return null;
  const parts = buffered.split(/(\*\*[^*\n]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return stripRawMarkdownAsterisks(part);
  });
}

/**
 * Renders spoken white text and muted italic parenthetical hints when bilingual mode is active.
 */
function renderBilingualPhrase(text: string, isBilingual: boolean): React.ReactNode {
  const buffered = cleanStreamText(holdUnclosedTagBuffer(text));
  if (!buffered) return null;
  const segments = splitBilingualSegments(buffered, isBilingual);
  if (segments.length <= 1 && !segments[0]?.isHint) {
    return <span>{renderInlineClean(buffered)}</span>;
  }
  return segments.map((seg, idx) =>
    seg.isHint ? (
      <span key={idx} className="text-zinc-400 text-xs italic font-normal ml-1 inline-block">
        {stripRawMarkdownAsterisks(seg.text)}
      </span>
    ) : (
      <span key={idx} className="text-white">
        {renderInlineClean(seg.text)}
      </span>
    )
  );
}

/**
 * Renders pillars with Bold Anchor pills (Rule of 2 Seconds).
 */
function renderPillarWithAnchor(text: string, isBilingual: boolean): React.ReactNode {
  const buffered = cleanStreamText(holdUnclosedTagBuffer(text));
  const colonIdx = buffered.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 48) {
    const cleanAnchor = stripRawMarkdownAsterisks(buffered.slice(0, colonIdx)).trim();
    const rest = buffered.slice(colonIdx + 1).trimStart();
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5">
          {cleanAnchor}
        </span>
        {renderBilingualPhrase(rest, isBilingual)}
      </>
    );
  }
  const dashMatch = buffered.match(/^([^-—]{3,38})\s*[-—]\s*(.*)$/);
  if (dashMatch) {
    const cleanAnchor = stripRawMarkdownAsterisks(dashMatch[1]).trim();
    return (
      <>
        <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5">
          {cleanAnchor}
        </span>
        <span className="text-zinc-500 mx-1">—</span>
        {renderBilingualPhrase(dashMatch[2], isBilingual)}
      </>
    );
  }
  return renderBilingualPhrase(buffered, isBilingual);
}

const SimulatorDialogueRow = React.memo(function SimulatorDialogueRow({
  msg,
  isSelected,
  isMounted,
  onSelect,
}: {
  msg: DialogueMessage;
  isSelected: boolean;
  isMounted: boolean;
  onSelect: (msg: DialogueMessage) => void;
}) {
  const isInterlocutor = msg.speaker === 'interlocutor';
  return (
    <button
      type="button"
      onClick={() => onSelect(msg)}
      className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer ${
        isSelected
          ? 'liquid-glass-card liquid-glass-card-active text-white'
          : isInterlocutor
          ? 'liquid-glass-card hover:border-white/25 text-zinc-100'
          : 'liquid-glass-card opacity-90 hover:border-white/25 text-zinc-200'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1.5 text-xs font-mono">
        {isInterlocutor ? (
          <span className="liquid-glass-pill text-zinc-100 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.85)]" />
            <span>Інтерв&apos;юер</span>
          </span>
        ) : (
          <span className="liquid-glass-pill text-zinc-200 px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1.5 text-xs">
            <Mic className="w-3 h-3 text-emerald-300" />
            <span>Ви</span>
          </span>
        )}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 tabular-nums">
          {msg.qaItemId ? (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Zap className="w-3 h-3" />
              <span>Відповідь</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-zinc-300">
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>Запитати</span>
            </span>
          )}
          <span suppressHydrationWarning>
            {isMounted
              ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '12:00'}
          </span>
        </div>
      </div>
      <p className="leading-relaxed whitespace-pre-wrap text-xs sm:text-sm font-medium text-zinc-100">
        {msg.text}
      </p>
    </button>
  );
});

const SimulatorCodeBlock = React.memo(function SimulatorCodeBlock({
  rawDeepDive,
  isGenerating,
  copiedCode,
  onCopy,
}: {
  rawDeepDive: string;
  isGenerating: boolean;
  copiedCode: boolean;
  onCopy: (code: string) => void;
}) {
  const cleanText = useMemo(() => cleanStreamText(holdUnclosedTagBuffer(rawDeepDive)).trim(), [rawDeepDive]);
  const blocks = useMemo(() => parseBlocks(cleanText), [cleanText]);
  const copyPayload = useMemo(() => extractCode(cleanText) || stripRawMarkdownAsterisks(cleanText), [cleanText]);

  return (
    <div className="liquid-glass-card rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <span className="text-xs font-mono uppercase tracking-wider text-sky-300 font-semibold flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-sky-300" /> Фаза 3 · Код / Deep Dive
        </span>
        {copyPayload && (
          <button
            type="button"
            onClick={() => onCopy(copyPayload)}
            className="liquid-glass-pill text-xs font-mono text-zinc-200 hover:text-white px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Скопійовано ✓' : 'Копіювати'}</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {blocks.map((block, bIdx) => {
          if (block.type === 'code') {
            const lines = block.code.split('\n');
            return (
              <div
                key={bIdx}
                className="overflow-hidden rounded-lg border border-white/10 bg-[#09090b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
              >
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/[0.03]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400/75" />
                    <span className="w-2 h-2 rounded-full bg-amber-400/75" />
                    <span className="w-2 h-2 rounded-full bg-emerald-400/75" />
                    <span className="ml-2 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                      {block.lang || 'code'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(block.code)}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Скопійовано ✓' : 'Копіювати'}</span>
                  </button>
                </div>
                <pre className="bg-[#09090b] p-3 font-mono text-[13px] leading-relaxed overflow-x-auto text-zinc-100">
                  <code>
                    {lines.map((line, i) => {
                      const tokens = highlightCode(line);
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <span className="select-none text-zinc-500 w-6 text-right shrink-0 text-xs tabular-nums">
                            {i + 1}
                          </span>
                          <span className="whitespace-pre flex-1">
                            {tokens.length > 0
                              ? tokens.map((t, j) => (
                                  <span key={j} className={TOKEN_CLASS[t.kind]}>
                                    {t.value}
                                  </span>
                                ))
                              : '\u00A0'}
                            {isGenerating && bIdx === blocks.length - 1 && i === lines.length - 1 && (
                              <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-300 animate-pulse align-middle" />
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </code>
                </pre>
              </div>
            );
          }

          const text = block.tokens.map((t) => t.value).join('');
          if (block.type === 'li') {
            return (
              <div key={bIdx} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-200 font-sans">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/80" />
                <p className="min-w-0 flex-1">{renderInlineClean(text)}</p>
              </div>
            );
          }
          if (block.type === 'h') {
            return (
              <h4 key={bIdx} className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-100">
                {renderInlineClean(text)}
              </h4>
            );
          }
          return (
            <p key={bIdx} className="text-sm leading-relaxed text-zinc-200 font-sans">
              {renderInlineClean(text)}
            </p>
          );
        })}
      </div>
    </div>
  );
});

const SimulatorAnswerView = React.memo(function SimulatorAnswerView({
  displayedHook,
  displayedPillars,
  displayedDeepDive,
  isGenerating,
  isBilingual,
  fontScale,
  copiedCode,
  onCopyCode,
}: {
  displayedHook: string;
  displayedPillars: string[];
  displayedDeepDive: string;
  isGenerating: boolean;
  isBilingual: boolean;
  fontScale: FontScale;
  copiedCode: boolean;
  onCopyCode: (code: string) => void;
}) {
  const hookSizeClass =
    fontScale === 'lg'
      ? 'text-[20px] leading-[30px]'
      : fontScale === 'sm'
      ? 'text-[16px] leading-[25px]'
      : 'text-[18px] leading-[28px]';

  const pillarSizeClass =
    fontScale === 'lg'
      ? 'text-[16px] leading-[26px]'
      : fontScale === 'sm'
      ? 'text-[14px] leading-[22px]'
      : 'text-[15px] leading-[24px]';

  return (
    <div className="space-y-4 pb-6">
      {displayedHook && (
        <div className="liquid-glass-card liquid-glass-card-active p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-300" /> Фаза 1 · Hook (Кажи одразу)
            </span>
          </div>
          <div className={`border-l-2 border-emerald-400/80 pl-3.5 font-medium text-[#ffffff] font-sans ${hookSizeClass}`}>
            {renderBilingualPhrase(displayedHook, isBilingual)}
            {isGenerating && displayedPillars.length === 0 && (
              <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-emerald-300 animate-pulse align-middle" />
            )}
          </div>
        </div>
      )}

      {displayedPillars.length > 0 && (
        <div className="liquid-glass-card rounded-2xl p-4 space-y-2.5">
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 font-semibold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-300" /> Фаза 2 · Ключові тези (Pillars)
          </span>
          <div className="grid grid-cols-1 gap-2">
            {displayedPillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.09] hover:border-white/20 flex items-start gap-3 transition-colors"
              >
                <span className="w-5 h-5 rounded-md bg-white/[0.08] text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0 border border-white/[0.12] mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <div className={`flex-1 text-zinc-100 font-sans ${pillarSizeClass}`}>
                  {renderPillarWithAnchor(pillar, isBilingual)}
                  {isGenerating && idx === displayedPillars.length - 1 && !displayedDeepDive && (
                    <span className="inline-block w-1.5 h-4 ml-1 rounded-sm bg-cyan-300 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {displayedDeepDive && (
        <SimulatorCodeBlock
          rawDeepDive={displayedDeepDive}
          isGenerating={isGenerating}
          copiedCode={copiedCode}
          onCopy={onCopyCode}
        />
      )}
    </div>
  );
});

export function InteractiveHudSimulator({ t }: Props) {
  const { locale } = useLocale();

  // Mode and Views
  const [viewMode, setViewMode] = useState<ViewMode>('candidate');
  const [isFrozen, setIsFrozen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isHudFocused, setIsHudFocused] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Settings & Language
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>('uk');
  const [activeModifier, setActiveModifier] = useState<DirectorModifier>('normal');
  const [channelMode, setChannelMode] = useState<ChannelMode>('interviewer');
  const [hudOpacity, setHudOpacity] = useState<number>(100);
  const [fontScale, setFontScale] = useState<FontScale>('md');
  const [bridgePhrase, setBridgePhrase] = useState<string | null>(null);
  const [screenshotNotice, setScreenshotNotice] = useState<string | null>(null);

  // Input & Dialogue State
  const [isMounted, setIsMounted] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [searchDialogue, setSearchDialogue] = useState('');
  const [dialogueMessages, setDialogueMessages] = useState<DialogueMessage[]>([
    {
      id: 'init-msg',
      speaker: 'interlocutor',
      text: 'Як влаштовані B-Tree індекси в PostgreSQL і коли вони стають неефективними?',
      timestamp: 1710000000000,
      qaItemId: 'qa-init',
    },
  ]);
  const [liveInterim, setLiveInterim] = useState('');
  const [activeQuestion, setActiveQuestion] = useState('Як влаштовані B-Tree індекси в PostgreSQL?');

  // Voice Recognition & CSS-variable VU meter (zero React re-renders per frame)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const vuMeterRef = useRef<HTMLDivElement>(null);

  // Real AI Streaming State & History Linking
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttftMs, setTtftMs] = useState<number | null>(180);
  const [liveTtftCounter, setLiveTtftCounter] = useState('0.18s');
  const [aiMeta, setAiMeta] = useState<MetaTagInfo | null>({
    domain: 'Backend',
    level: 'Senior',
    language: 'UK',
    raw: 'Databases • PostgreSQL • Senior',
  });
  const [hudError, setHudError] = useState<{ code: string; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHook, setCopiedHook] = useState(false);

  const initialHook =
    'Індекси в Postgres — це окремі збалансовані B-Tree структури, що вказують на TID сторінок Heap за O(log N).';
  const initialPillars = [
    '**B-Tree Механіка**: Швидкий бінарний пошук діапазонів значень без повного сканування таблиці.',
    '**HOT Updates**: Heap-Only Tuples дозволяють уникнути оновлення індексу при зміні неіндексованих полів.',
    '**Write Overhead**: Кожен INSERT/UPDATE оновлює сторінки індексу та створює Table Bloat.',
  ];
  const initialDeepDive =
    '```sql\nCREATE INDEX CONCURRENTLY idx_users_org ON users (org_id)\nWHERE deleted_at IS NULL;\n```';

  const [qaHistory, setQaHistory] = useState<Record<string, QaSnapshot>>({
    'qa-init': {
      id: 'qa-init',
      question: 'Як влаштовані B-Tree індекси в PostgreSQL і коли вони стають неефективними?',
      hook: initialHook,
      pillars: initialPillars,
      deepDive: initialDeepDive,
      meta: {
        domain: 'Backend',
        level: 'Senior',
        language: 'UK',
        raw: 'Databases • PostgreSQL • Senior',
      },
      ttftMs: 180,
      modifier: 'normal',
    },
  });
  const [latestQaId, setLatestQaId] = useState<string>('qa-init');
  const [activeQaId, setActiveQaId] = useState<string>('qa-init');
  const [isAnswerFocused, setIsAnswerFocused] = useState<boolean>(true);
  const [queuedQueries, setQueuedQueries] = useState<Array<{ query: string; modifier: DirectorModifier; lang: LanguageOption; messageId?: string }>>([]);

  // Typewriter progressive display state
  const [displayedHook, setDisplayedHook] = useState(initialHook);
  const [displayedPillars, setDisplayedPillars] = useState<string[]>(initialPillars);
  const [displayedDeepDive, setDisplayedDeepDive] = useState(initialDeepDive);

  // Targets from real streaming parser
  const targetAnswerRef = useRef<{
    hook: string;
    pillars: string[];
    deepDive: string;
  }>({
    hook: initialHook,
    pillars: initialPillars,
    deepDive: initialDeepDive,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const pacerTimerRef = useRef<number | null>(null);
  const ttftTimerRef = useRef<number | null>(null);
  const frozenRef = useRef(false);
  const dialogueScrollRef = useRef<HTMLDivElement>(null);
  const answerScrollRef = useRef<HTMLDivElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    frozenRef.current = isFrozen;
  }, [isFrozen]);

  // Close options popover on outside click
  useEffect(() => {
    if (!isOptionsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOptionsOpen]);

  // Direct CSS-variable VU meter updates via DOM ref (zero React state re-renders)
  useEffect(() => {
    const el = vuMeterRef.current;
    if (!el) return;
    if (!isListening && !isGenerating) {
      el.style.setProperty('--vu-level', '0');
      return;
    }
    const interval = window.setInterval(() => {
      const level = isListening
        ? Math.floor(Math.random() * 65 + 30)
        : Math.floor(Math.random() * 30 + 15);
      el.style.setProperty('--vu-level', String(level));
    }, 100);
    return () => {
      clearInterval(interval);
      el.style.setProperty('--vu-level', '0');
    };
  }, [isListening, isGenerating]);

  // Direct scrollTop auto-scroll inside dialogue container (zero page jump)
  useEffect(() => {
    if (dialogueScrollRef.current) {
      dialogueScrollRef.current.scrollTop = dialogueScrollRef.current.scrollHeight;
    }
  }, [dialogueMessages, liveInterim]);

  /**
   * Smooth Token Pacer: High-frequency client loop (13ms tick)
   * Progressively reveals characters into Hook -> Pillars -> Deep Dive
   * Spacebar Freeze halts typing instantly
   */
  const startSmoothPacer = useCallback(() => {
    if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);

    pacerTimerRef.current = window.setInterval(() => {
      if (frozenRef.current) return;

      const target = targetAnswerRef.current;
      const targetHook = target.hook;
      const targetPillars = target.pillars;
      const targetDeepDive = target.deepDive;

      // 1. Advance Hook
      let hookDone = false;
      setDisplayedHook((prev) => {
        if (prev.length < targetHook.length) {
          return targetHook.slice(0, prev.length + 2);
        }
        hookDone = true;
        return prev;
      });

      if (!hookDone) return;

      // 2. Advance Pillars
      let pillarsDone = false;
      setDisplayedPillars((prevPillars) => {
        const next = [...prevPillars];
        for (let i = 0; i < targetPillars.length; i++) {
          const cur = next[i] || '';
          const tgt = targetPillars[i] || '';
          if (cur.length < tgt.length) {
            next[i] = tgt.slice(0, cur.length + 2);
            return next;
          }
        }
        pillarsDone = true;
        return next;
      });

      if (!pillarsDone) return;

      // 3. Advance Deep Dive
      setDisplayedDeepDive((prev) => {
        if (prev.length < targetDeepDive.length) {
          return targetDeepDive.slice(0, prev.length + 3);
        }
        return prev;
      });
    }, 13);
  }, []);

  /**
   * REAL SSE Streaming: Calls /api/ai/dual-stream without fake canned fallbacks!
   * When Teleprompter is frozen, queues incoming queries into +N в черзі badge.
   */
  const triggerAiQuery = useCallback(
    async (
      queryText: string,
      modifier: DirectorModifier = activeModifier,
      lang: LanguageOption = selectedLanguage,
      linkedMessageId?: string
    ) => {
      const q = queryText.trim();
      if (!q) return;

      if (frozenRef.current) {
        setQueuedQueries((prev) => [...prev, { query: q, modifier, lang, messageId: linkedMessageId }]);
        return;
      }

      // Abort previous stream if active
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const qaId = `qa-${Date.now()}`;
      setActiveQaId(qaId);
      setLatestQaId(qaId);
      setIsAnswerFocused(true);
      setBridgePhrase(null);
      setActiveQuestion(q);
      setIsGenerating(true);
      setHudError(null);
      setTtftMs(null);

      if (linkedMessageId) {
        setDialogueMessages((prev) =>
          prev.map((m) => (m.id === linkedMessageId ? { ...m, qaItemId: qaId } : m))
        );
      }

      // Clear previous output targets
      targetAnswerRef.current = { hook: '', pillars: [], deepDive: '' };
      setDisplayedHook('');
      setDisplayedPillars([]);
      setDisplayedDeepDive('');

      // Start live TTFT millisecond stopwatch
      const requestStartMs = performance.now();
      setLiveTtftCounter('0.02s');
      if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
      ttftTimerRef.current = window.setInterval(() => {
        if (frozenRef.current) return;
        const elapsed = ((performance.now() - requestStartMs) / 1000).toFixed(2) + 's';
        setLiveTtftCounter(elapsed);
      }, 16);

      // Start token pacer loop
      startSmoothPacer();

      trackFunnelEvent('simulator_question_triggered', {
        locale,
        questionId: q.slice(0, 32),
        mode: viewMode,
      });

      let latestMeta: MetaTagInfo | null = aiMeta;
      let capturedTtft: number | null = null;

      try {
        const response = await fetch('/api/ai/dual-stream?demo=1', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ghostboard-demo': 'true',
          },
          body: JSON.stringify({
            question: q,
            directorModifier: modifier,
            outputLanguage: lang,
            helperLanguage: 'uk',
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}: Помилка з'єднання з ШІ-сервісом`);
        }

        if (!response.body) {
          throw new Error('Отримано порожнє тіло відповіді від сервера.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let firstTokenTime: number | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = 'chunk';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.replace(/^event:\s*/, '').trim();
              continue;
            }

            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const parsed = JSON.parse(jsonStr);

                if (currentEvent === 'telemetry') {
                  const ms = parsed.ttftMs || Math.round(performance.now() - requestStartMs);
                  capturedTtft = ms;
                  setTtftMs(ms);
                  setLiveTtftCounter(`${(ms / 1000).toFixed(2)}s`);
                  if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
                } else if (currentEvent === 'meta') {
                  latestMeta = {
                    domain: parsed.domain || 'Engineering',
                    level: parsed.level || 'Senior',
                    language: parsed.language || 'UA',
                    raw: parsed.raw || `${parsed.domain} • ${parsed.level}`,
                  };
                  setAiMeta(latestMeta);
                } else if (currentEvent === 'chunk' && parsed.text) {
                  fullText += parsed.text;

                  // Parse structured phases from buffered text (zero raw tag or dangling ** flicker)
                  const safeAccumulated = holdUnclosedTagBuffer(fullText);
                  const structured = parseStructuredGhostboardOutput(safeAccumulated);
                  const cleanHook = cleanStreamText(structured.hook);
                  const cleanPillars = structured.pillars.map((p) => cleanStreamText(p)).filter(Boolean);
                  const cleanDeepDive = cleanStreamText(structured.deepDive);

                  // Visible TTFT: moment first human-readable hook token is ready for render
                  if (!firstTokenTime && (cleanHook.length > 0 || (!fullText.startsWith('<') && fullText.trim().length > 0))) {
                    firstTokenTime = performance.now();
                    const ms = Math.round(firstTokenTime - requestStartMs);
                    capturedTtft = ms;
                    setTtftMs(ms);
                    setLiveTtftCounter(`${(ms / 1000).toFixed(2)}s`);
                    if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
                  }
                  targetAnswerRef.current = {
                    hook: cleanHook,
                    pillars: cleanPillars,
                    deepDive: cleanDeepDive,
                  };
                  if (structured.meta) {
                    latestMeta = structured.meta;
                    setAiMeta(structured.meta);
                  }
                } else if (currentEvent === 'error') {
                  throw new Error(parsed.message || 'Помилка генерації відповіді ШІ.');
                }
              } catch (e: unknown) {
                if ((e as Error)?.message?.includes('Помилка')) throw e;
              }
            }
          }
        }

        // Finalize parsed structured content cleanly
        const finalStructured = parseStructuredGhostboardOutput(cleanStreamText(fullText));
        const finalHook = cleanStreamText(finalStructured.hook) || sanitizeRenderText(fullText.slice(0, 160));
        const finalPillars =
          finalStructured.pillars.length > 0
            ? finalStructured.pillars.map((p) => cleanStreamText(p)).filter(Boolean)
            : [sanitizeRenderText(fullText.slice(160, 320))].filter(Boolean);
        const finalDeepDive = cleanStreamText(finalStructured.deepDive);

        targetAnswerRef.current = {
          hook: finalHook,
          pillars: finalPillars,
          deepDive: finalDeepDive,
        };

        setQaHistory((prev) => ({
          ...prev,
          [qaId]: {
            id: qaId,
            question: q,
            hook: finalHook,
            pillars: finalPillars,
            deepDive: finalDeepDive,
            meta: finalStructured.meta || latestMeta,
            ttftMs: capturedTtft,
            modifier,
          },
        }));
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') return;
        const msg = (err as Error)?.message || 'Не вдалося отримати відповідь від ШІ. Спробуйте ще раз.';
        setHudError({ code: 'AI_STREAM_ERROR', message: msg });
      } finally {
        setIsGenerating(false);
        if (ttftTimerRef.current) clearInterval(ttftTimerRef.current);
      }
    },
    [activeModifier, aiMeta, locale, selectedLanguage, startSmoothPacer, viewMode]
  );

  // Toggle Freeze + process latest queued question on unfreeze
  const toggleFreeze = useCallback(() => {
    setIsFrozen((prevFrozen) => {
      const nextFrozen = !prevFrozen;
      frozenRef.current = nextFrozen;
      if (!nextFrozen) {
        setQueuedQueries((pending) => {
          if (pending.length > 0) {
            const latest = pending[pending.length - 1];
            setTimeout(() => {
              triggerAiQuery(latest.query, latest.modifier, latest.lang, latest.messageId);
            }, 0);
          }
          return [];
        });
      }
      return nextFrozen;
    });
  }, [triggerAiQuery]);

  // Select dialogue message: jump to linked QA or generate new AI answer
  const handleSelectDialogueMessage = useCallback(
    (msg: DialogueMessage) => {
      setIsAnswerFocused(true);
      setBridgePhrase(null);
      if (msg.qaItemId && qaHistory[msg.qaItemId]) {
        const snap = qaHistory[msg.qaItemId];
        if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);
        setActiveQaId(snap.id);
        setActiveQuestion(snap.question);
        setAiMeta(snap.meta);
        setTtftMs(snap.ttftMs);
        setActiveModifier(snap.modifier);
        targetAnswerRef.current = {
          hook: snap.hook,
          pillars: snap.pillars,
          deepDive: snap.deepDive,
        };
        setDisplayedHook(snap.hook);
        setDisplayedPillars(snap.pillars);
        setDisplayedDeepDive(snap.deepDive);
        if (answerScrollRef.current) {
          answerScrollRef.current.scrollTop = 0;
        }
        return;
      }
      triggerAiQuery(msg.text, activeModifier, selectedLanguage, msg.id);
    },
    [activeModifier, qaHistory, selectedLanguage, triggerAiQuery]
  );

  // Return to latest answer pill handler
  const handleReturnToCurrent = useCallback(() => {
    const snap = qaHistory[latestQaId];
    if (!snap) return;
    if (pacerTimerRef.current) clearInterval(pacerTimerRef.current);
    setActiveQaId(snap.id);
    setIsAnswerFocused(true);
    setBridgePhrase(null);
    setActiveQuestion(snap.question);
    setAiMeta(snap.meta);
    setTtftMs(snap.ttftMs);
    targetAnswerRef.current = {
      hook: snap.hook,
      pillars: snap.pillars,
      deepDive: snap.deepDive,
    };
    setDisplayedHook(snap.hook);
    setDisplayedPillars(snap.pillars);
    setDisplayedDeepDive(snap.deepDive);
  }, [latestQaId, qaHistory]);

  // Submit manual text question
  const handleManualSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!manualInput.trim() || isGenerating) return;

      const q = manualInput.trim();
      const msgId = `user-${Date.now()}`;
      setDialogueMessages((prev) => [
        ...prev,
        {
          id: msgId,
          speaker: 'candidate',
          text: q,
          timestamp: Date.now(),
        },
      ]);
      setManualInput('');
      triggerAiQuery(q, activeModifier, selectedLanguage, msgId);
    },
    [activeModifier, isGenerating, manualInput, selectedLanguage, triggerAiQuery]
  );

  // Click quick chip
  const handleChipClick = useCallback(
    (chip: string) => {
      const msgId = `chip-${Date.now()}`;
      setDialogueMessages((prev) => [
        ...prev,
        {
          id: msgId,
          speaker: 'interlocutor',
          text: chip,
          timestamp: Date.now(),
        },
      ]);
      triggerAiQuery(chip, activeModifier, selectedLanguage, msgId);
    },
    [activeModifier, selectedLanguage, triggerAiQuery]
  );

  // Modifier click
  const handleModifierClick = useCallback(
    (mod: DirectorModifier) => {
      setActiveModifier(mod);
      setBridgePhrase(null);
      triggerAiQuery(activeQuestion, mod, selectedLanguage);
    },
    [activeQuestion, selectedLanguage, triggerAiQuery]
  );

  // Bridge Phrase ("5 — Тягнути час")
  const handleTriggerBridge = useCallback(() => {
    setIsAnswerFocused(true);
    setBridgePhrase((prev) => (prev ? null : BRIDGE_PHRASES[selectedLanguage] || BRIDGE_PHRASES.uk));
  }, [selectedLanguage]);

  // Language switch
  const handleLanguageChange = (lang: LanguageOption) => {
    setSelectedLanguage(lang);
    triggerAiQuery(activeQuestion, activeModifier, lang);
  };

  // Web Speech API Voice Recognition Toggle
  const toggleSpeech = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setHudError({
        code: 'SPEECH_UNSUPPORTED',
        message: 'Розпізнавання голосу не підтримується цим браузером. Використовуйте Chrome, Edge або текстовий ввід.',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.lang = selectedLanguage === 'en' ? 'en-US' : 'uk-UA';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setHudError(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }
        const text = finalTrans || interimTrans;
        if (text) {
          setLiveInterim(text);
        }
      };

      recognition.onerror = (e: ISpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setHudError({
            code: 'MIC_DENIED',
            message: 'Доступ до мікрофона заблоковано в браузері. Дозвольте доступ для запитань голосом.',
          });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setLiveInterim((latest) => {
          if (latest.trim().length > 3) {
            const spoken = latest.trim();
            const msgId = `voice-${Date.now()}`;
            setDialogueMessages((prev) => [
              ...prev,
              {
                id: msgId,
                speaker: 'interlocutor',
                text: spoken,
                timestamp: Date.now(),
              },
            ]);
            triggerAiQuery(spoken, activeModifier, selectedLanguage, msgId);
          }
          return '';
        });
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [activeModifier, isListening, selectedLanguage, triggerAiQuery]);

  // Keyboard Shortcuts: 1-5, Space (Freeze), Ctrl+M (Mic), Ctrl+K or / (Focus Input), Tab (Focus)
  useEffect(() => {
    if (!hovered && !isHudFocused) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        manualInputRef.current?.focus();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleSpeech();
        return;
      }

      if (e.key === 'Escape') {
        if (isInputFocused) {
          target.blur();
          return;
        }
        if (isOptionsOpen) {
          setIsOptionsOpen(false);
          return;
        }
        return;
      }

      if (isInputFocused) return;

      if (e.key === '/') {
        e.preventDefault();
        manualInputRef.current?.focus();
      } else if (e.code === 'Space') {
        e.preventDefault();
        toggleFreeze();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setIsFocusMode((f) => !f);
      } else if (e.key === '1') {
        e.preventDefault();
        handleModifierClick('shorter');
      } else if (e.key === '2') {
        e.preventDefault();
        handleModifierClick('simpler');
      } else if (e.key === '3') {
        e.preventDefault();
        handleModifierClick('code');
      } else if (e.key === '4') {
        e.preventDefault();
        handleModifierClick('re_angle');
      } else if (e.key === '5') {
        e.preventDefault();
        handleTriggerBridge();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    handleModifierClick,
    handleTriggerBridge,
    hovered,
    isHudFocused,
    isOptionsOpen,
    toggleFreeze,
    toggleSpeech,
  ]);

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, []);

  const handleCopyHook = useCallback((hook: string) => {
    navigator.clipboard.writeText(sanitizeRenderText(hook));
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  }, []);

  const filteredDialogue = dialogueMessages.filter((m) =>
    m.text.toLowerCase().includes(searchDialogue.toLowerCase())
  );

  const isStreamingOrFocused = isGenerating || isAnswerFocused;
  const isViewingHistory = Boolean(activeQaId && latestQaId && activeQaId !== latestQaId);

  return (
    <section id="simulator" className="relative py-16 sm:py-24 px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        {/* Section Header + Mode Segmented Switcher */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="liquid-glass-pill inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono text-zinc-200 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
            <span>GHOSTBOARD COPILOT · SPATIAL EYELINE SIMULATOR</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            {t.simulator.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-300 leading-relaxed">
            Живий редактор коду під вебкамерою та плаваючий Eyeline-суфлер Ghostboard. Перемкніть режим, щоб побачити, як{' '}
            <code className="font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">WDA_EXCLUDEFROMCAPTURE</code>{' '}
            приховує суфлер для рекрутера.
          </p>

          {/* Prominent Candidate <-> Recruiter Hardware Switcher */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-[#0b0d12]/90 border border-white/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
              {[
                {
                  id: 'candidate' as ViewMode,
                  label: '👁 Режим кандидата',
                },
                {
                  id: 'recruiter' as ViewMode,
                  label: '🖥 Режим рекрутера (Zoom / Meet)',
                },
              ].map((item) => {
                const isSelected = viewMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setViewMode(item.id);
                      trackFunnelEvent('stealth_toggle_switched', { locale, mode: item.id });
                    }}
                    className={`relative px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      isSelected ? 'text-zinc-950' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="sim-view-mode-pill"
                        transition={SPRING_PHYSICS}
                        className="absolute inset-0 rounded-xl bg-white shadow-[0_0_24px_rgba(255,255,255,0.25)]"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Realistic Desktop Workspace Frame (IDE Layer Behind + Floating Eyeline HUD Over) */}
        <div className="relative rounded-3xl border border-white/12 bg-[#07090e]/85 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_32px_90px_rgba(0,0,0,0.88)] p-2.5 sm:p-4 overflow-hidden">
          {/* Simulated Webcam Notch & IDE Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 mb-2 border-b border-white/[0.08] text-xs font-mono">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-2 text-zinc-300">VS Code · payment_service.ts</span>
            </div>

            {/* Hardware Eyeline Webcam Sensor Notch */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 border border-white/12 text-zinc-200">
              <Webcam className="w-3.5 h-3.5 text-emerald-400" />
              <span>Webcam Eyeline Zone</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            </div>

            <div className="hidden md:flex items-center gap-2 text-zinc-400">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zoom Screen Share: payment_service.ts</span>
              </span>
            </div>
          </div>

          {/* Background Realistic Code Editor Sheet (Always visible in Recruiter screen share!) */}
          <div
            aria-hidden={viewMode === 'candidate'}
            className={`transition-all duration-500 rounded-2xl border border-white/[0.08] bg-[#05070b] p-4 sm:p-6 font-mono text-xs sm:text-sm leading-relaxed overflow-hidden ${
              viewMode === 'recruiter'
                ? 'opacity-100 scale-100 relative z-10'
                : 'hidden'
            }`}
          >
            <div className="rounded-2xl border border-white/10 bg-[#080b12] p-4 overflow-x-auto">
              <div className="flex items-center justify-between text-xs text-zinc-400 pb-3 mb-3 border-b border-white/[0.07]">
                <span>src/services/payment_service.ts</span>
                <span className="text-emerald-400">✓ Recruiter sees clean IDE</span>
              </div>
              <pre className="text-zinc-200 font-mono text-xs sm:text-[13px] leading-6 overflow-x-auto">
{`export async function processIdempotentPayment(
  orderId: string,
  idempotencyKey: string,
  amountCents: number
): Promise<PaymentReceipt> {
  // 1. Atomic Redis lock to eliminate race conditions
  const lock = await redis.set(\`lock:pay:\${idempotencyKey}\`, '1', 'NX', 'PX', 15000);
  if (!lock) throw new ConflictError('Duplicate in-flight checkout');

  // 2. Serializable ledger commit inside PostgreSQL tx
  return await db.transaction(async (tx) => {
    const existing = await tx.payments.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    return await tx.payments.create({ data: { orderId, idempotencyKey, amountCents, status: 'SETTLED' } });
  });
}`}
              </pre>
            </div>
          </div>

          {/* Floating Eyeline HUD Window Container */}
          <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setIsHudFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setIsHudFocused(false);
              }
            }}
            style={{ opacity: viewMode === 'recruiter' ? 1 : hudOpacity / 100 }}
            className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
              viewMode === 'recruiter'
                ? 'mt-3 border-2 border-dashed border-emerald-400/50 bg-[#05080f]/60 backdrop-blur-sm shadow-[0_0_40px_rgba(16,185,129,0.12)]'
                : 'liquid-glass-panel shadow-[0_28px_80px_rgba(0,0,0,0.85)]'
            }`}
          >
            {/* Optical Laser Scan Filter overlay when toggling Recruiter hardware exclusion */}
            <AnimatePresence>
              {viewMode === 'recruiter' && (
                <motion.div
                  key="wda-scanline"
                  initial={{ top: '-12%', opacity: 0 }}
                  animate={{ top: '112%', opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.8, ease: 'easeInOut' }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent border-y border-emerald-300/40 z-30"
                />
              )}
            </AnimatePresence>

            {/* Recruiter Stealth Mode Banner */}
            <AnimatePresence initial={false}>
              {viewMode === 'recruiter' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={SPRING_PHYSICS}
                  className="overflow-hidden bg-emerald-500/10 border-b border-emerald-400/25 text-white"
                >
                  <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span>
                        Recruiter Screen Share Filter — суфлер розчинено через <code className="font-mono text-emerald-300">WDA_EXCLUDEFROMCAPTURE</code>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs bg-emerald-500/15 text-emerald-200 px-2.5 py-0.5 rounded-md border border-emerald-400/30">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>100% INVISIBLE TO RECRUITER</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          {/* 1. DECLUTTERED TOP ISLAND (4 core items + Опції popover) */}
          <div className="min-h-[42px] flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-white/[0.10] bg-white/[0.025] backdrop-blur-xl select-none">
            {/* Core Item 1: Audio Equalizer (CSS var ref) + Channel Mode */}
            <div className="flex items-center gap-2 min-w-0">
              <div
                ref={vuMeterRef}
                style={{ '--vu-level': '0' } as React.CSSProperties}
                className="liquid-glass-pill inline-flex items-center gap-[3px] min-h-7 px-2.5 py-1 rounded-lg"
                title="Рівень аудіосигналу"
                aria-label="Audio level meter"
              >
                {VU_MULTIPLIERS.map((mult, idx) => (
                  <span
                    key={idx}
                    className={`w-[2.5px] rounded-full transition-[height] duration-75 ${
                      isListening || isGenerating ? 'bg-emerald-300' : 'bg-zinc-500'
                    }`}
                    style={{
                      height:
                        isListening || isGenerating
                          ? `calc(4px + var(--vu-level, 0) * ${(0.12 * mult).toFixed(3)}px)`
                          : '4px',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setChannelMode((m) => (m === 'interviewer' ? 'dual' : 'interviewer'))}
                className="liquid-glass-pill px-2.5 py-1 rounded-lg hover:bg-white/[0.12] text-xs font-mono text-zinc-100 inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                title="Перемкнути режим аудіоканалів"
              >
                {channelMode === 'interviewer' ? (
                  <>
                    <Crosshair className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Інтерв&apos;юер</span>
                  </>
                ) : (
                  <>
                    <GitMerge className="w-3.5 h-3.5 text-sky-300" />
                    <span>2 Канали</span>
                  </>
                )}
              </button>
            </div>

            {/* Core Item 2: Live State & Latency (+ Freeze queue pill) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="liquid-glass-pill inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono text-zinc-100 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isFrozen ? 'bg-cyan-300' : isGenerating ? 'bg-sky-300 animate-ping' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'}`} />
                  <span>
                    {isListening
                      ? 'Слухаю'
                      : isGenerating
                      ? 'Стрімінг'
                      : isFrozen
                      ? 'Пауза'
                      : 'Готово'}
                  </span>
                </span>
                <span className="text-zinc-500">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold">
                  <Zap className="w-3 h-3" />
                  <span>{ttftMs ? `${ttftMs}ms` : liveTtftCounter}</span>
                </span>
              </span>

              {queuedQueries.length > 0 && (
                <button
                  type="button"
                  onClick={toggleFreeze}
                  className="px-2.5 py-1 rounded-full bg-cyan-300 text-zinc-950 text-xs font-mono font-bold transition cursor-pointer tabular-nums"
                  title="Натисніть або Space щоб розморозити та обробити чергу"
                >
                  +{queuedQueries.length} в черзі
                </button>
              )}
            </div>

            {/* Core Item 3 + 4: Layout Switcher and Опції popover */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsFocusMode((f) => !f)}
                title="Фокус на телесуфлері (Tab)"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition cursor-pointer ${
                  isFocusMode
                    ? 'bg-white text-zinc-950 border-white font-semibold shadow-[0_0_16px_rgba(255,255,255,0.2)]'
                    : 'liquid-glass-pill text-zinc-100 hover:bg-white/[0.12]'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Фокус (Tab)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const next = viewMode === 'candidate' ? 'recruiter' : 'candidate';
                  setViewMode(next);
                  trackFunnelEvent('stealth_toggle_switched', { locale, mode: next });
                }}
                title={viewMode === 'candidate' ? 'Перемкнути на Режим рекрутера' : 'Повернути вигляд кандидата'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition cursor-pointer ${
                  viewMode === 'recruiter'
                    ? 'bg-white text-zinc-950 font-semibold border-white'
                    : 'liquid-glass-pill text-zinc-100 hover:bg-white/[0.12]'
                }`}
              >
                {viewMode === 'candidate' ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-cyan-300" />
                    <span className="hidden sm:inline">Кандидат</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Рекрутер</span>
                  </>
                )}
              </button>

              {/* Secondary Controls inside Опції popover */}
              <div className="relative" ref={optionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsOptionsOpen((o) => !o)}
                  aria-expanded={isOptionsOpen}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition cursor-pointer ${
                    isOptionsOpen
                      ? 'bg-white text-zinc-950 border-white font-semibold'
                      : 'liquid-glass-pill text-zinc-200 hover:text-white hover:bg-white/[0.12]'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Опції</span>
                </button>

                {isOptionsOpen && (
                  <div className="liquid-glass-dock absolute right-0 mt-2 w-72 p-4 rounded-2xl shadow-2xl z-40 space-y-3.5 text-xs">
                    {/* Мова */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider block">
                        Мова відповіді
                      </span>
                      <div className="grid grid-cols-3 gap-1 bg-black/35 p-1 rounded-xl border border-white/[0.10]">
                        {(['uk', 'en', 'bilingual'] as const).map((lng) => (
                          <button
                            key={lng}
                            type="button"
                            onClick={() => handleLanguageChange(lng)}
                            className={`px-2 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                              selectedLanguage === lng
                                ? 'bg-white text-zinc-950 font-semibold'
                                : 'text-zinc-300 hover:text-white'
                            }`}
                          >
                            {lng === 'uk' ? 'UA' : lng === 'en' ? 'EN' : 'Білінгв'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Розмір шрифту */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-mono text-zinc-300 uppercase tracking-wider block">
                        Розмір шрифту
                      </span>
                      <div className="grid grid-cols-3 gap-1 bg-black/35 p-1 rounded-xl border border-white/[0.10]">
                        {(['sm', 'md', 'lg'] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setFontScale(sz)}
                            className={`px-2 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                              fontScale === sz
                                ? 'bg-white text-zinc-950 font-semibold'
                                : 'text-zinc-300 hover:text-white'
                            }`}
                          >
                            {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : 'A+'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Прозорість */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                        <span className="uppercase tracking-wider">Прозорість</span>
                        <span className="text-white tabular-nums">{hudOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={65}
                        max={100}
                        value={hudOpacity}
                        onChange={(e) => setHudOpacity(Number(e.target.value))}
                        className="w-full accent-cyan-300 cursor-pointer"
                      />
                    </div>

                    {/* Скріншот + Freeze */}
                    <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/[0.10]">
                      <button
                        type="button"
                        onClick={() => {
                          setScreenshotNotice('Екран проаналізовано • контекст оновлено');
                          setTimeout(() => setScreenshotNotice(null), 2600);
                          setIsOptionsOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.10] text-xs font-mono text-zinc-100 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-300" />
                        <span>Скріншот</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          toggleFreeze();
                          setIsOptionsOpen(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.10] text-xs font-mono text-zinc-100 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        {isFrozen ? <Play className="w-3.5 h-3.5 text-emerald-300" /> : <Pause className="w-3.5 h-3.5 text-cyan-300" />}
                        <span>{isFrozen ? 'Далі' : 'Пауза'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {screenshotNotice && (
            <div className="px-4 py-1.5 bg-white/[0.04] border-b border-white/[0.10] text-xs font-mono text-zinc-200 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-300" />
                <span>{screenshotNotice}</span>
              </span>
              <button
                type="button"
                onClick={() => setScreenshotNotice(null)}
                className="text-zinc-400 hover:text-white cursor-pointer text-xs"
              >
                Закрити
              </button>
            </div>
          )}

          {/* 2. MAIN AUTO-BREATHING TWO-COLUMN DISPLAY */}
          <div className={`relative ${viewMode === 'recruiter' ? 'min-h-[150px]' : 'min-h-[490px]'} bg-transparent`}>
            {viewMode === 'recruiter' ? (
              /* Recruiter Hardware Capture Exclusion Optical Dissolution */
              <motion.div
                initial={{ opacity: 0.9, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING_PHYSICS}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-8 min-h-[150px] bg-emerald-950/10 select-none relative overflow-hidden"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-base sm:text-lg font-bold text-white">
                      Суфлер Ghostboard виключено з кадру (WDA_EXCLUDEFROMCAPTURE)
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                      Композитор ОС (Windows DWM / macOS <code className="font-mono text-emerald-300">NSWindowSharingNone</code>) вирізає вікно телесуфлера до передачі в Zoom або Google Meet. Інтервʼюер бачить лише редактор коду вище.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('candidate')}
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-[0_0_24px_rgba(255,255,255,0.2)]"
                >
                  Повернутися до режиму кандидата
                </button>
              </motion.div>
            ) : (
              /* Auto-breathing 26% / 74% Split Layout + 100% Focus Toggle */
              <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] min-h-[490px]">
                {/* ── LEFT COLUMN: LIVE DIALOGUE (26% when streaming/focused, hidden in 100% Focus) ── */}
                {!isFocusMode && (
                  <div
                    className={`w-full flex flex-col min-h-0 p-4 bg-white/[0.015] transition-all duration-200 ease-out ${
                      isStreamingOrFocused ? 'lg:w-[26%]' : 'lg:w-[38%]'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] shrink-0">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-cyan-300" />
                        <span className="font-display text-xs font-bold tracking-wider uppercase text-zinc-200">
                          Живий діалог
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono tabular-nums">
                        {dialogueMessages.length}
                      </span>
                    </div>

                    {/* Search within dialogue */}
                    <div className="py-2.5 border-b border-white/[0.08]">
                      <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5" />
                        <input
                          type="text"
                          value={searchDialogue}
                          onChange={(e) => setSearchDialogue(e.target.value)}
                          placeholder="Пошук у репліках..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.10] rounded-xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>

                    {/* Dialogue Messages Container (click any message -> jump or generate) */}
                    <div
                      ref={dialogueScrollRef}
                      className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1 text-xs select-text max-h-[300px] lg:max-h-[340px] custom-scrollbar"
                    >
                      {filteredDialogue.map((msg) => (
                        <SimulatorDialogueRow
                          key={msg.id}
                          msg={msg}
                          isSelected={Boolean(msg.qaItemId && msg.qaItemId === activeQaId)}
                          isMounted={isMounted}
                          onSelect={handleSelectDialogueMessage}
                        />
                      ))}

                      {liveInterim && (
                        <div className="liquid-glass-card p-3.5 rounded-2xl border-dashed border-cyan-400/35 text-xs text-zinc-100 animate-pulse">
                          <div className="flex items-center gap-2 mb-1 text-xs font-mono text-cyan-300 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping" />
                            <span>Розпізнавання наживо...</span>
                          </div>
                          <p className="italic text-xs text-zinc-200">{liveInterim}▍</p>
                        </div>
                      )}
                    </div>

                    {/* 1-Click Quick Speed Chips */}
                    <div className="pt-2.5 border-t border-white/[0.08] mt-auto">
                      <div className="text-xs font-mono text-zinc-400 mb-1.5 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-300" />
                        <span>Тест в 1 клік:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleChipClick(chip)}
                            className="liquid-glass-pill px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-white/[0.12] text-zinc-200 hover:text-white transition cursor-pointer whitespace-nowrap"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── RIGHT COLUMN: AI TELEPROMPTER (74% when streaming/focused, 100% in Focus mode) ── */}
                <div
                  className={`w-full flex flex-col min-h-0 p-4 sm:p-5 bg-transparent transition-all duration-200 ease-out ${
                    isFocusMode
                      ? 'lg:w-full'
                      : isStreamingOrFocused
                      ? 'lg:w-[74%]'
                      : 'lg:w-[62%]'
                  }`}
                >
                  {/* Right Header: Title, Meta, Return to Latest, Copy */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08] shrink-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span className="font-display text-xs font-bold tracking-wider uppercase text-white">
                        AI Teleprompter
                      </span>
                      {aiMeta && (
                        <span className="liquid-glass-pill hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-zinc-200 font-mono text-xs">
                          <span>{aiMeta.domain}</span>
                          <span className="text-zinc-500">•</span>
                          <span>{aiMeta.level}</span>
                        </span>
                      )}
                      {activeModifier !== 'normal' && (
                        <span className="liquid-glass-pill text-xs uppercase font-mono px-2.5 py-0.5 rounded-full text-cyan-200">
                          {activeModifier}
                        </span>
                      )}
                      {isGenerating && (
                        <span className="liquid-glass-pill px-2.5 py-0.5 rounded-full text-xs font-mono text-cyan-200 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span>STREAMING</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {isViewingHistory && (
                        <button
                          type="button"
                          onClick={handleReturnToCurrent}
                          className="liquid-glass-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-emerald-400/35 text-xs font-mono text-white transition cursor-pointer"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Повернутися до поточної відповіді</span>
                        </button>
                      )}
                      {displayedHook && (
                        <button
                          type="button"
                          onClick={() => handleCopyHook(displayedHook)}
                          className="liquid-glass-pill flex items-center gap-1.5 text-xs text-zinc-200 hover:text-white px-2.5 py-1 rounded-lg transition cursor-pointer"
                        >
                          {copiedHook ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedHook ? 'Скопійовано' : 'Копіювати хук'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Question Bar */}
                  {activeQuestion && (
                    <div className="py-2 text-xs font-mono text-zinc-300 border-l-2 border-cyan-400/50 pl-3 my-2 truncate">
                      «{activeQuestion}»
                    </div>
                  )}

                  {/* Instant Bridge Phrase Banner (Key 5) */}
                  {bridgePhrase && (
                    <div className="liquid-glass-card mb-3 p-4 rounded-2xl border-cyan-400/30 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-xs font-mono uppercase tracking-wider text-cyan-300 inline-flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Пауза-місток (читайте одразу, поки формулюєте думку)</span>
                        </span>
                        <p className="text-[15px] leading-[24px] font-medium text-white">
                          {bridgePhrase}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBridgePhrase(null)}
                        className="liquid-glass-pill text-xs font-mono text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg shrink-0 cursor-pointer"
                      >
                        Прибрати
                      </button>
                    </div>
                  )}

                  {/* Content Area */}
                  <div
                    ref={answerScrollRef}
                    className="flex-1 overflow-y-auto space-y-4 pr-1 select-text max-h-[380px] custom-scrollbar"
                  >
                    {hudError ? (
                      <div className="liquid-glass-card p-4 rounded-2xl border-amber-400/30 text-zinc-200 space-y-3">
                        <div className="flex items-center gap-2 text-white font-semibold text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
                          <span>Помилка генерації ({hudError.code})</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap bg-black/40 p-3 rounded-xl border border-white/[0.08]">
                          {hudError.message}
                        </p>
                        <button
                          type="button"
                          onClick={() => triggerAiQuery(activeQuestion, activeModifier, selectedLanguage)}
                          className="px-3.5 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Спробувати знову</span>
                        </button>
                      </div>
                    ) : !displayedHook && !isGenerating ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
                        <Sparkles className="w-9 h-9 mb-3 text-cyan-300/60" />
                        <p className="text-sm font-medium text-zinc-200">Готовий генерувати відповіді</p>
                        <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                          Задайте запитання нижче (`Ctrl+K` або `/`) чи клікніть будь-яку репліку зліва.
                        </p>
                      </div>
                    ) : (
                      <SimulatorAnswerView
                        displayedHook={displayedHook}
                        displayedPillars={displayedPillars}
                        displayedDeepDive={displayedDeepDive}
                        isGenerating={isGenerating}
                        isBilingual={selectedLanguage === 'bilingual'}
                        fontScale={fontScale}
                        copiedCode={copiedCode}
                        onCopyCode={handleCopyCode}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. BOTTOM CONTROLS & MANUAL PROMPT BAR */}
          <div className="p-3.5 border-t border-white/[0.10] bg-white/[0.02] backdrop-blur-xl flex flex-col gap-2.5 select-none">
            {/* Quick Modifiers Row (1-5 keyboard shortcuts) */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 flex-wrap">
                {MODIFIERS.map((mod) => {
                  const Icon = mod.Icon;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => handleModifierClick(mod.id)}
                      disabled={isGenerating}
                      title={mod.title}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5 ${
                        activeModifier === mod.id
                          ? 'bg-white text-zinc-950 border-white font-semibold shadow-sm'
                          : 'liquid-glass-pill text-zinc-100 hover:bg-white/[0.12] hover:text-white'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${activeModifier === mod.id ? 'text-zinc-900' : mod.tint}`} />
                      <span>{mod.label}</span>
                      <span className="font-mono text-[11px] opacity-65">[{mod.keyHint}]</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleTriggerBridge}
                  title="Клавіша 5 — Миттєва пауза-місток"
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                    bridgePhrase
                      ? 'bg-white text-zinc-950 border-white font-semibold'
                      : 'liquid-glass-pill text-zinc-100 hover:bg-white/[0.12] hover:text-white'
                  }`}
                >
                  <MessageCircle className={`w-3.5 h-3.5 ${bridgePhrase ? 'text-zinc-900' : 'text-cyan-300'}`} />
                  <span>Тягнути час</span>
                  <span className="font-mono text-[11px] opacity-65">[5]</span>
                </button>
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-400 shrink-0">
                <span>Space Пауза</span>
                <span className="text-zinc-600">•</span>
                <span>Ctrl+M Мікрофон</span>
                <span className="text-zinc-600">•</span>
                <span>Ctrl+K Ввід</span>
              </div>
            </div>

            {/* Manual Prompt Input with Mic inside HUD */}
            <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                  placeholder="Запитати ШІ або перевірити своє питання... (Ctrl+K або /)"
                  className="w-full bg-white/[0.045] border border-white/[0.11] rounded-xl pl-3.5 pr-10 py-2 text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-cyan-400/45 transition"
                />
                <button
                  type="button"
                  onClick={toggleSpeech}
                  title={isListening ? 'Зупинити запис (Ctrl+M)' : 'Запитати голосом (Ctrl+M)'}
                  className={`absolute right-2 p-1.5 rounded-lg transition cursor-pointer ${
                    isListening
                      ? 'bg-emerald-400 text-zinc-950 animate-pulse'
                      : 'text-zinc-300 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleManualSubmit()}
                disabled={!manualInput.trim() || isGenerating}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 disabled:bg-white/[0.05] disabled:text-zinc-500 disabled:border disabled:border-white/[0.08] text-zinc-950 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Запитати</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
        </div>

        {/* Post-Stream Conversion Banner */}
        <AnimatePresence>
          {!isGenerating && displayedHook && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              transition={SPRING_PHYSICS}
              className="liquid-glass-card mt-4 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-zinc-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="liquid-glass-pill w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="text-xs leading-snug">
                  <span className="font-semibold text-white tabular-nums">
                    Перший токен за {ttftMs ? `${(ttftMs / 1000).toFixed(2)}с` : liveTtftCounter} • Відповідь надруковано наживо.
                  </span>
                  <span className="block text-xs text-zinc-300">
                    У десктопній версії Ghostboard це працює автоматично через захоплення аудіо поверх Zoom/Meet.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <a
                  href="/download"
                  className="flex-1 sm:flex-initial text-center px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs transition cursor-pointer"
                >
                  Завантажити Ghostboard Desktop
                </a>
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'recruiter' ? 'candidate' : 'recruiter')}
                  className="liquid-glass-pill flex-1 sm:flex-initial px-3.5 py-2 rounded-xl hover:bg-white/[0.12] text-white font-medium text-xs transition cursor-pointer"
                >
                  {viewMode === 'recruiter' ? 'Вигляд кандидата' : 'Перевірити Режим рекрутера'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
export default InteractiveHudSimulator;
