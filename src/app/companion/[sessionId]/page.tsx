'use client';

import React, { useEffect, useState, useRef, Suspense, use, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Globe,
  Copy,
  Check,
  Zap,
  HelpCircle,
  Code2,
  FlipHorizontal,
  Moon,
  Eye,
} from 'lucide-react';
import {
  cleanStreamText,
  holdUnclosedTagBuffer,
  stripRawMarkdownAsterisks,
  splitBilingualSegments,
  extractCode,
  parseBlocks,
} from '../../../../desktop/src/lib/answerParser';
import { highlightCode, TOKEN_CLASS } from '../../../../desktop/src/lib/highlight';

export interface SyncQAItem {
  id: string;
  question: string;
  startHook?: string;
  quickAnswer: string;
  nativeTranslation?: string;
  hints?: string[];
  codeSnippet?: string;
  deliveryTip?: string;
  tag?: string;
  meta?: { domain: string; level: string; language: string; raw?: string };
  pillars?: string[];
  completedPillarIndices?: number[];
  activePillarIndex?: number;
  followUpTrap?: { question: string; answer: string };
  isContinuationMerged?: boolean;
  lineExplanations?: Record<number, string>;
}

export type TeleprompterFontSize = 'sm' | 'md' | 'xl';

export function stripRawAiTags(text: string): string {
  if (!text) return '';
  const buffered = holdUnclosedTagBuffer(text)
    .replace(/<<<META[\s\S]*?>>>/gi, '')
    .replace(/<<<[A-Z0-9_]+>>>/gi, '')
    .replace(/<<<END[A-Z0-9_]*>>>/gi, '')
    .replace(/<<<[^>]*>>>/gi, '');
  return stripRawMarkdownAsterisks(cleanStreamText(buffered))
    .replace(/\r\n/g, '\n')
    .trim();
}

function renderCompanionBilingual(text: string, isBilingual: boolean): React.ReactNode {
  const safe = stripRawAiTags(text);
  if (!safe) return null;
  const segments = splitBilingualSegments(safe, isBilingual);
  if (segments.length <= 1 && !segments[0]?.isHint) {
    return safe;
  }
  return segments.map((seg, idx) =>
    seg.isHint ? (
      <span key={idx} className="text-zinc-400 text-xs italic font-normal ml-1 inline-block">
        {seg.text}
      </span>
    ) : (
      <span key={idx}>{seg.text}</span>
    )
  );
}

const CompanionCodeBlock = React.memo(function CompanionCodeBlock({
  codeSnippet,
  copiedCode,
  onCopy,
}: {
  codeSnippet: string;
  copiedCode: boolean;
  onCopy: (code: string) => void;
}) {
  const cleanText = useMemo(() => stripRawAiTags(codeSnippet), [codeSnippet]);
  const blocks = useMemo(() => parseBlocks(cleanText), [cleanText]);
  const copyPayload = useMemo(() => extractCode(cleanText) || cleanText, [cleanText]);

  return (
    <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] space-y-3 text-zinc-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-zinc-200" />
          Фаза 3 · Код / Реалізація
        </span>
        {copyPayload && (
          <button
            type="button"
            onClick={() => onCopy(copyPayload)}
            className="text-xs font-mono text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-[#09090b] border border-white/[0.08] active:scale-95 transition flex items-center gap-1 cursor-pointer"
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
                className="overflow-hidden rounded-lg border border-white/10 bg-[#09090b]"
              >
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-white/[0.03]">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    {block.lang || 'code'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCopy(block.code)}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-zinc-200 hover:bg-white/[0.12] hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Скопійовано ✓' : 'Копіювати'}</span>
                  </button>
                </div>
                <pre className="bg-[#09090b] p-3 font-mono text-[13px] leading-relaxed overflow-x-auto text-zinc-200">
                  <code>
                    {lines.map((line, idx) => {
                      const tokens = highlightCode(line);
                      return (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="select-none text-zinc-600 w-6 text-right shrink-0 text-xs tabular-nums">
                            {idx + 1}
                          </span>
                          <span className="whitespace-pre flex-1">
                            {tokens.length > 0
                              ? tokens.map((t, j) => (
                                  <span key={j} className={TOKEN_CLASS[t.kind]}>
                                    {t.value}
                                  </span>
                                ))
                              : '\u00A0'}
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
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                <p className="min-w-0 flex-1">{text}</p>
              </div>
            );
          }
          if (block.type === 'h') {
            return (
              <h4 key={bIdx} className="text-xs font-mono font-semibold uppercase tracking-wider text-white">
                {text}
              </h4>
            );
          }
          return (
            <p key={bIdx} className="text-sm leading-relaxed text-zinc-200 font-sans">
              {text}
            </p>
          );
        })}
      </div>
    </div>
  );
});

const CompanionTeleprompterCard = React.memo(function CompanionTeleprompterCard({
  activeQA,
  cleanHook,
  hookFontClass,
  pillarFontClass,
  showTranslation,
  copiedCode,
  onCopyCode,
}: {
  activeQA: SyncQAItem;
  cleanHook: string;
  hookFontClass: string;
  pillarFontClass: string;
  showTranslation: boolean;
  copiedCode: boolean;
  onCopyCode: (code: string) => void;
}) {
  const isBilingual = activeQA.meta?.language?.toLowerCase() === 'bilingual' || showTranslation;

  return (
    <div className="space-y-4">
      {/* Context Pill (Domain / Level) */}
      {activeQA.meta && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#111113] border border-white/[0.08] text-zinc-200 font-mono text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>{stripRawAiTags(activeQA.meta.domain)}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-300">{stripRawAiTags(activeQA.meta.level)}</span>
          </span>
          {activeQA.tag && (
            <span className="px-2 py-0.5 rounded-md bg-[#111113] text-zinc-400 font-mono text-xs border border-white/[0.08]">
              {stripRawAiTags(activeQA.tag)}
            </span>
          )}
        </div>
      )}

      {/* Active Question Title */}
      <div className="border-l-2 border-white/25 pl-3">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 font-semibold block">
            ЗАПИТАННЯ
          </span>
          {activeQA.isContinuationMerged && (
            <span className="px-1.5 py-0.5 rounded bg-[#111113] border border-white/[0.08] text-xs font-mono font-semibold text-zinc-200">
              ⚡ Уточнено
            </span>
          )}
        </div>
        <h2 className="text-sm sm:text-base font-semibold text-zinc-200 leading-snug">
          {stripRawAiTags(activeQA.question)}
        </h2>
      </div>

      {/* ── Фаза 1: ХУК — Кажи вголос (Lead Hook) ── */}
      {cleanHook && (
        <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-widest text-zinc-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              Фаза 1 · ХУК — Кажи вголос
            </span>
            <span className="text-xs font-mono text-zinc-500 uppercase">First 5s</span>
          </div>
          <div className={`${hookFontClass} text-[#ffffff] border-l-2 border-white pl-3.5`}>
            {renderCompanionBilingual(cleanHook, isBilingual)}
          </div>
        </div>
      )}

      {/* Native Language Subtitle / Translation Crib-Sheet */}
      {showTranslation && activeQA.nativeTranslation && (
        <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08]">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5 mb-1.5">
            <Globe className="w-3.5 h-3.5 text-zinc-300" />
            Переклад / Суть (рідною мовою):
          </span>
          <p className="text-xs sm:text-sm text-zinc-300 italic leading-relaxed font-sans">
            {stripRawAiTags(activeQA.nativeTranslation)}
          </p>
        </div>
      )}

      {/* ── Фаза 2: КЛЮЧОВІ ТЕЗИ (Pillars with Bold Anchors) ── */}
      {activeQA.hints && activeQA.hints.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
            Фаза 2 · Ключові тези (Pillars)
          </span>
          <ul className="space-y-2">
            {activeQA.hints.map((rawHint, i) => {
              const hint = stripRawAiTags(rawHint);
              if (!hint) return null;
              const isCompleted = activeQA.completedPillarIndices?.includes(i);
              const isActive = !isCompleted && activeQA.activePillarIndex === i;
              const colonIdx = hint.indexOf(':');
              const hasAnchor = colonIdx > 0 && colonIdx < 40;
              const anchor = hasAnchor ? hint.slice(0, colonIdx).trim() : null;
              const rest = hasAnchor ? hint.slice(colonIdx + 1).trimStart() : hint;
              return (
                <li
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                    isActive
                      ? 'bg-[#111113] border-white/30 text-white'
                      : 'bg-[#111113] border-white/[0.08] text-zinc-200'
                  }`}
                >
                  <span
                    className={`font-mono text-xs font-semibold shrink-0 mt-0.5 w-6 h-6 rounded-md border flex items-center justify-center ${
                      isCompleted || isActive
                        ? 'bg-white/10 border-white/25 text-white'
                        : 'bg-[#09090b] border-white/[0.08] text-zinc-300'
                    }`}
                  >
                    {isCompleted ? '✓' : `${i + 1}`}
                  </span>
                  <div className={`${pillarFontClass} text-zinc-200 flex-1 ${isCompleted ? 'line-through opacity-75' : ''}`}>
                    {anchor && (
                      <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5">
                        {anchor}
                      </span>
                    )}
                    {renderCompanionBilingual(rest, isBilingual)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Delivery Tip */}
      {activeQA.deliveryTip && (
        <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] text-xs text-zinc-200 leading-relaxed">
          <span className="font-mono font-semibold uppercase tracking-wider text-xs text-zinc-400 block mb-1">
            💡 Порада подачі
          </span>
          <p className="text-sm text-zinc-200">{stripRawAiTags(activeQA.deliveryTip)}</p>
        </div>
      )}

      {/* ── Фаза 3: КОД / ПРИКЛАД ── */}
      {activeQA.codeSnippet && (
        <CompanionCodeBlock
          codeSnippet={activeQA.codeSnippet}
          copiedCode={copiedCode}
          onCopy={onCopyCode}
        />
      )}

      {/* ── Фаза 4: ПАСТКА ІНТЕРВʼЮЕРА (Follow-Up Trap Shield) ── */}
      {activeQA.followUpTrap && (activeQA.followUpTrap.question || activeQA.followUpTrap.answer) && (
        <div className="p-4 rounded-xl bg-[#111113] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-zinc-300">
              Фаза 4 · Пастка інтервʼюера (Follow-Up Shield)
            </span>
          </div>
          {activeQA.followUpTrap.question && (
            <div className="text-[15px] leading-[24px] font-medium text-white">
              <strong className="text-zinc-300 font-semibold mr-1.5">Q:</strong>
              {stripRawAiTags(activeQA.followUpTrap.question)}
            </div>
          )}
          {activeQA.followUpTrap.answer && (
            <div className="text-[15px] leading-[24px] text-zinc-200 bg-[#09090b] p-3 rounded-xl border border-white/[0.08]">
              <strong className="text-white font-semibold mr-1.5">A:</strong>
              {stripRawAiTags(activeQA.followUpTrap.answer)}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

function CompanionContent({ params }: PageProps) {
  const { sessionId } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || sessionId;

  const [activeQA, setActiveQA] = useState<SyncQAItem | null>(null);
  const [qas, setQas] = useState<SyncQAItem[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Eyeline Teleprompter Customization Modes
  const [fontSize, setFontSize] = useState<TeleprompterFontSize>('xl');
  const [isOledMode, setIsOledMode] = useState<boolean>(true); // OLED #000000 pure black default
  const [isMirrorMode, setIsMirrorMode] = useState<boolean>(false); // Physical beam-splitter mirror glass
  const [isWakeLockActive, setIsWakeLockActive] = useState<boolean>(false);
  const [activeRemoteAction, setActiveRemoteAction] = useState<string | null>(null);

  const lastUpdatedRef = useRef<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollMoreDown, setCanScrollMoreDown] = useState<boolean>(false);

  const checkScrollOverflow = () => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    const hasMore = el.scrollHeight - el.scrollTop - el.clientHeight > 24;
    setCanScrollMoreDown(hasMore);
  };

  // Auto-scroll reset on new question arrival and detect overflow
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      checkScrollOverflow();
    }, 120);
    return () => clearTimeout(timer);
  }, [activeQA?.id]);

  useEffect(() => {
    window.addEventListener('resize', checkScrollOverflow);
    return () => window.removeEventListener('resize', checkScrollOverflow);
  }, []);

  // Screen WakeLock API: prevents phone screen from sleeping during the interview
  useEffect(() => {
    let wakeLockObj: { release: () => Promise<void> } | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockObj = await (
            navigator as unknown as {
              wakeLock: { request: (type: string) => Promise<{ release: () => Promise<void> }> };
            }
          ).wakeLock.request('screen');
          setIsWakeLockActive(true);
        }
      } catch {
        setIsWakeLockActive(false);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockObj) void wakeLockObj.release();
    };
  }, []);

  // Primary: Real-Time SSE Stream with instant event push
  useEffect(() => {
    if (!token) return;

    let sse: EventSource | null = null;
    try {
      const sseUrl = `/api/companion/stream?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}&device=phone`;
      sse = new EventSource(sseUrl);
      eventSourceRef.current = sse;

      sse.onopen = () => {
        setIsConnected(true);
      };

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_QA' && data.payload) {
            setActiveQA(data.payload);
            setQas((prev) => {
              const existingIdx = prev.findIndex((q) => q.id === data.payload.id);
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = data.payload;
                return next;
              }
              return [data.payload, ...prev];
            });
            if (typeof data.isFrozen === 'boolean') {
              setIsFrozen(data.isFrozen);
            }
          } else if (data.type === 'STATUS' && data.payload) {
            setIsCapturing(!!data.payload.isCapturing);
            if (typeof data.payload.isFrozen === 'boolean') {
              setIsFrozen(data.payload.isFrozen);
            }
          } else if (data.type === 'FREEZE_TOGGLE' && data.payload) {
            setIsFrozen(!!data.payload.isFrozen);
          }
        } catch {}
      };

      sse.onerror = () => {
        setIsConnected(false);
      };
    } catch {}

    // Fallback polling loop (in case SSE drops on mobile networks)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/ai/interview-sync?token=${encodeURIComponent(token)}&since=${lastUpdatedRef.current}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.hasUpdate) {
            lastUpdatedRef.current = data.lastUpdated;
            setIsCapturing(data.isCapturing);
            setLiveTranscript(data.liveTranscript || '');
            if (typeof data.isFrozen === 'boolean') setIsFrozen(data.isFrozen);

            if (data.qas && Array.isArray(data.qas)) {
              setQas(data.qas);
              const active = data.qas.find((q: { id?: string }) => q.id === data.activeId) || data.qas[0];
              if (active) setActiveQA(active);
            }
          }
        }
      } catch {}
    }, 600);

    return () => {
      if (sse) sse.close();
      clearInterval(pollInterval);
    };
  }, [token, sessionId]);

  // Remote Action Dispatcher: sends commands from phone to companion stream & sync store
  const sendRemoteAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!token) return;
    setActiveRemoteAction(action);
    setTimeout(() => setActiveRemoteAction(null), 800);

    // 1. Send to /api/companion/stream POST
    fetch(`/api/companion/stream?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, activeId: activeQA?.id, ...payload }),
    }).catch(() => {});

    // 2. Also forward to /api/ai/interview-sync for cross-device desktop HUD update
    fetch(`/api/ai/interview-sync?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, activeId: activeQA?.id, ...payload }),
    }).catch(() => {});
  };

  const handleToggleFreeze = () => {
    const next = !isFrozen;
    setIsFrozen(next);
    sendRemoteAction('FREEZE_TOGGLE', { isFrozen: next });
  };

  const handlePrevCard = () => {
    if (!activeQA || qas.length <= 1) return;
    const currentIdx = qas.findIndex((q) => q.id === activeQA.id);
    if (currentIdx > 0) {
      const prev = qas[currentIdx - 1];
      setActiveQA(prev);
      sendRemoteAction('SELECT_QA', { activeId: prev.id });
    }
  };

  const handleNextCard = () => {
    if (!activeQA || qas.length <= 1) return;
    const currentIdx = qas.findIndex((q) => q.id === activeQA.id);
    if (currentIdx >= 0 && currentIdx < qas.length - 1) {
      const next = qas[currentIdx + 1];
      setActiveQA(next);
      sendRemoteAction('SELECT_QA', { activeId: next.id });
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Font sizing styles based on Eyeline distance selector (strict minimum >= 14px)
  const hookFontClass =
    fontSize === 'xl'
      ? 'text-[22px] leading-[32px] font-medium tracking-tight'
      : fontSize === 'md'
      ? 'text-[18px] leading-[28px] font-medium tracking-tight'
      : 'text-[16px] leading-[25px] font-medium';

  const pillarFontClass =
    fontSize === 'xl'
      ? 'text-[17px] leading-[27px] font-normal'
      : fontSize === 'md'
      ? 'text-[15px] leading-[24px] font-normal'
      : 'text-[14px] leading-[22px] font-normal';

  const rawHook = activeQA?.startHook || activeQA?.quickAnswer || '';
  const cleanHook = stripRawAiTags(rawHook);

  const containerBgClass = isOledMode ? 'bg-[#000000]' : 'bg-[#09090b]';

  return (
    <div
      className={`font-sans select-none h-screen min-h-screen overflow-hidden ${containerBgClass} ${
        isMirrorMode ? 'scale-x-[-1]' : ''
      }`}
    >
      <div className="flex flex-col h-screen p-3 sm:p-4 justify-between relative overflow-hidden">
        {/* ── Top Header Controls & Eyeline Modes Bar ── */}
        <header className="flex items-center justify-between pb-2.5 border-b border-white/[0.08] shrink-0 gap-2">
          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isCapturing ? 'bg-white animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs font-mono tracking-widest uppercase text-zinc-400 font-bold hidden xs:inline">
              {isCapturing ? 'LIVE' : 'STANDBY'}
            </span>
            {isConnected ? (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#111113] text-zinc-200 border border-white/[0.08] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                HUD SYNC
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-[#111113] text-zinc-200 border border-white/[0.08] flex items-center gap-1 animate-pulse">
                SYNCING
              </span>
            )}
            {isWakeLockActive && (
              <span
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono bg-[#111113] text-zinc-200 border border-white/[0.08]"
                title="Screen WakeLock Active"
              >
                ● WAKE
              </span>
            )}
          </div>

          {/* Quick Toolbar: Font Scaling, OLED Mode, Mirror, TR */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Font Size Selector: A- / A+ / XL */}
            <div className="flex items-center bg-[#111113] border border-white/[0.08] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  fontSize === 'sm' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Compact font"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize('md')}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  fontSize === 'md' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Standard font"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('xl')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                  fontSize === 'xl'
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="50cm Eyeline Teleprompter XL font"
              >
                XL
              </button>
            </div>

            {/* OLED Deep Black Toggle */}
            <button
              type="button"
              onClick={() => setIsOledMode((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs flex items-center transition-all cursor-pointer ${
                isOledMode
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111113] border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
              title="OLED 100% Black Mode (Prevents screen glow on face)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            {/* Mirror Mode (Flip Horizontal for teleprompter glass) */}
            <button
              type="button"
              onClick={() => setIsMirrorMode((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs flex items-center transition-all cursor-pointer ${
                isMirrorMode
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111113] border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
              title="Mirror Mode (Horizontal Flip for Teleprompter Glass)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Translation Toggle */}
            <button
              type="button"
              onClick={() => setShowTranslation((prev) => !prev)}
              className={`px-2 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                showTranslation
                  ? 'bg-white/10 border-white/25 text-white'
                  : 'bg-[#111113] border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
              title="Toggle native translation"
            >
              <Globe className="w-3 h-3" />
              <span className="text-xs">TR</span>
            </button>
          </div>
        </header>

        {/* ── Main Content Area: 3-Phase Teleprompter ── */}
        <main
          ref={scrollContainerRef}
          onScroll={checkScrollOverflow}
          className="flex-1 overflow-y-auto overscroll-contain py-3.5 pr-1 relative"
        >
          {!isCapturing && !activeQA ? (
            <div className="text-center flex flex-col items-center justify-center gap-4 py-20">
              <div className="w-10 h-10 rounded-xl bg-[#111113] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                <Eye className="w-5 h-5 animate-pulse text-zinc-200" />
              </div>
              <p className="text-base font-bold font-mono tracking-widest text-zinc-300 uppercase">
                EYELINE TELEPROMPTER READY
              </p>
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Встановіть телефон прямо під об&apos;єктивом веб-камери. Суфлер автоматично покаже хук, тези та код.
              </p>
            </div>
          ) : activeQA ? (
            <CompanionTeleprompterCard
              activeQA={activeQA}
              cleanHook={cleanHook}
              hookFontClass={hookFontClass}
              pillarFontClass={pillarFontClass}
              showTranslation={showTranslation}
              copiedCode={copiedCode}
              onCopyCode={handleCopyCode}
            />
          ) : null}
        </main>

        {/* Floating Scroll Indicator */}
        {canScrollMoreDown && (
          <div className="absolute bottom-36 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTop += 180;
                }
              }}
              className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111113] hover:bg-white/[0.08] border border-white/[0.12] text-xs font-mono font-bold text-zinc-200 shadow-[0_4px_24px_rgba(0,0,0,0.9)] transition-all active:scale-95 animate-bounce cursor-pointer"
            >
              <span>↓ Більше тез унизу</span>
            </button>
          </div>
        )}

        {/* ── Bottom Section: Remote Control Triggers & Navigation ── */}
        <footer className="pt-2 border-t border-white/[0.08] space-y-2.5 shrink-0">
          {/* Live Transcript ticker (if listening) */}
          {liveTranscript && (
            <div className="px-3 py-1.5 bg-[#111113] rounded-xl border border-white/[0.08]">
              <div className="text-xs font-mono text-zinc-400 flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                ЧУЮ ЗАРАЗ
              </div>
              <div className="text-xs text-zinc-200 italic truncate font-sans">{liveTranscript}</div>
            </div>
          )}

          {/* ── 4 Tactile Remote Trigger Buttons ── */}
          <div className="grid grid-cols-4 gap-2">
            {/* 1. Коротше */}
            <button
              type="button"
              onClick={() => sendRemoteAction('MAKE_CONCISE')}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                activeRemoteAction === 'MAKE_CONCISE'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111113] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200'
              }`}
            >
              <Zap className={`w-4 h-4 ${activeRemoteAction === 'MAKE_CONCISE' ? 'text-black' : 'text-zinc-200'}`} />
              <span className="text-xs font-mono font-bold leading-tight">Коротше</span>
            </button>

            {/* 2. Простіше */}
            <button
              type="button"
              onClick={() => sendRemoteAction('SIMPLIFY')}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                activeRemoteAction === 'SIMPLIFY'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111113] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200'
              }`}
            >
              <HelpCircle className={`w-4 h-4 ${activeRemoteAction === 'SIMPLIFY' ? 'text-black' : 'text-zinc-200'}`} />
              <span className="text-xs font-mono font-bold leading-tight">Простіше</span>
            </button>

            {/* 3. Показати Код */}
            <button
              type="button"
              onClick={() => sendRemoteAction('SHOW_CODE')}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                activeRemoteAction === 'SHOW_CODE'
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111113] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200'
              }`}
            >
              <Code2 className={`w-4 h-4 ${activeRemoteAction === 'SHOW_CODE' ? 'text-black' : 'text-zinc-200'}`} />
              <span className="text-xs font-mono font-bold leading-tight">Код</span>
            </button>

            {/* 4. Пауза / Freeze */}
            <button
              type="button"
              onClick={handleToggleFreeze}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                isFrozen
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111113] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200'
              }`}
            >
              {isFrozen ? <Lock className="w-4 h-4 text-black" /> : <Unlock className="w-4 h-4 text-zinc-400" />}
              <span className="text-xs font-mono font-bold leading-tight">
                {isFrozen ? 'Заморожено' : 'Пауза'}
              </span>
            </button>
          </div>

          {/* Card Prev / Next Navigation Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handlePrevCard}
              disabled={!activeQA || qas.length <= 1}
              className="px-3.5 py-1.5 rounded-xl bg-[#111113] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-zinc-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>

            <span className="text-xs font-mono text-zinc-500">
              {activeQA && qas.length > 0
                ? `${qas.findIndex((q) => q.id === activeQA.id) + 1} / ${qas.length}`
                : '0 / 0'}
            </span>

            <button
              type="button"
              onClick={handleNextCard}
              disabled={!activeQA || qas.length <= 1}
              className="px-3.5 py-1.5 rounded-xl bg-[#111113] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-zinc-200 cursor-pointer"
            >
              <span>Вперед</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function CompanionPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs">
          CONNECTING EYELINE TELEPROMPTER...
        </div>
      }
    >
      <CompanionContent params={params} />
    </Suspense>
  );
}


