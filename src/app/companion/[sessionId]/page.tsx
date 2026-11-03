'use client';

import React, { useEffect, useState, useRef, Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Radio,
  Globe,
  Copy,
  Check,
  Zap,
  HelpCircle,
  Code2,
  Maximize2,
  FlipHorizontal,
  Moon,
  Sun,
  Eye,
} from 'lucide-react';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { parseBilingualParts } from '@/lib/aiPromptCore';

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
}

export type TeleprompterFontSize = 'sm' | 'md' | 'xl';

export function stripRawAiTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<<<[A-Z0-9_]+>>>/gi, '')
    .replace(/<<<META[\s\S]*?>>>/gi, '')
    .replace(/<<<END[A-Z0-9_]*>>>/gi, '')
    .replace(/<<<[^>]*>>>/gi, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

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
  const [isPanic, setIsPanic] = useState<boolean>(false);
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
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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
            if (typeof data.payload.isPanic === 'boolean') {
              setIsPanic(data.payload.isPanic);
            }
          } else if (data.type === 'FREEZE_TOGGLE' && data.payload) {
            setIsFrozen(!!data.payload.isFrozen);
          } else if (data.type === 'PANIC_TOGGLE' && data.payload) {
            setIsPanic(!!data.payload.isPanic);
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
            if (typeof data.isPanic === 'boolean') setIsPanic(data.isPanic);

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

  const handleTogglePanic = () => {
    const next = !isPanic;
    setIsPanic(next);
    sendRemoteAction('PANIC_TOGGLE', { isPanic: next });
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

  if (isPanic) {
    return (
      <div
        onClick={handleTogglePanic}
        className="min-h-screen bg-black text-zinc-500 font-mono p-6 flex flex-col justify-center items-center text-center cursor-pointer select-none"
      >
        <div className="w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center mb-4 text-zinc-600 animate-pulse">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <p className="text-sm font-semibold tracking-wider text-zinc-400 uppercase">PANIC SHIELD ACTIVE</p>
        <p className="text-xs text-zinc-600 mt-2">Tap anywhere on the screen to restore teleprompter</p>
      </div>
    );
  }

  // Font sizing styles based on Eyeline distance selector
  const hookFontClass =
    fontSize === 'xl'
      ? 'text-[22px] sm:text-[26px] font-bold leading-snug tracking-tight'
      : fontSize === 'md'
      ? 'text-[18px] sm:text-[20px] font-semibold leading-relaxed tracking-tight'
      : 'text-[15px] sm:text-[16px] font-medium leading-normal';

  const pillarFontClass =
    fontSize === 'xl'
      ? 'text-[16px] sm:text-[18px] font-semibold'
      : fontSize === 'md'
      ? 'text-[14px] sm:text-[15px] font-medium'
      : 'text-[12px] sm:text-[13px] font-normal';

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
                isCapturing ? 'bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400 font-bold hidden xs:inline">
              {isCapturing ? 'LIVE' : 'STANDBY'}
            </span>
            {isConnected ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
                HUD SYNC
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                SYNCING
              </span>
            )}
            {isWakeLockActive && (
              <span
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                title="Screen WakeLock Active"
              >
                ● WAKE
              </span>
            )}
          </div>

          {/* Quick Toolbar: Font Scaling, OLED Mode, Mirror, TR */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Font Size Selector: A- / A+ / XL */}
            <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  fontSize === 'sm' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Compact font"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize('md')}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  fontSize === 'md' ? 'bg-white text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
                title="Standard font"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('xl')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black transition-all ${
                  fontSize === 'xl'
                    ? 'bg-amber-400 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
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
              className={`p-2 rounded-xl border text-xs flex items-center transition-all ${
                isOledMode
                  ? 'bg-white/15 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                  : 'bg-white/[0.03] border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
              title="OLED 100% Black Mode (Prevents screen glow on face)"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            {/* Mirror Mode (Flip Horizontal for teleprompter glass) */}
            <button
              type="button"
              onClick={() => setIsMirrorMode((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs flex items-center transition-all ${
                isMirrorMode
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'bg-white/[0.03] border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
              title="Mirror Mode (Horizontal Flip for Teleprompter Glass)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Translation Toggle */}
            <button
              type="button"
              onClick={() => setShowTranslation((prev) => !prev)}
              className={`px-2 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                showTranslation ? 'bg-white/10 border-white/20 text-white' : 'bg-white/[0.03] border-white/10 text-zinc-500'
              }`}
              title="Toggle native translation"
            >
              <Globe className="w-3 h-3" />
              <span className="text-[10px]">TR</span>
            </button>

            {/* Emergency Panic */}
            <button
              type="button"
              onClick={handleTogglePanic}
              className="p-2 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-400 hover:bg-rose-900/50 active:scale-95 transition-all"
              title="Emergency Panic Shield"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
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
              <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-400">
                <Eye className="w-5 h-5 animate-pulse text-amber-400" />
              </div>
              <p className="text-base font-bold font-mono tracking-widest text-zinc-300 uppercase">
                EYELINE TELEPROMPTER READY
              </p>
              <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                Встановіть телефон прямо під об'єктивом веб-камери. Суфлер автоматично покаже хук, тези та код.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Context Pill (Domain / Level) */}
              {activeQA?.meta && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{stripRawAiTags(activeQA.meta.domain)}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300">{stripRawAiTags(activeQA.meta.level)}</span>
                  </span>
                  {activeQA.tag && (
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 font-mono text-[10px] border border-white/5">
                      {stripRawAiTags(activeQA.tag)}
                    </span>
                  )}
                </div>
              )}

              {/* Active Question Title */}
              {activeQA && (
                <div className="border-l-2 border-white/20 pl-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold block mb-0.5">
                    ЗАПИТАННЯ
                  </span>
                  <h2 className="text-sm sm:text-base font-semibold text-zinc-200 leading-snug">
                    {stripRawAiTags(activeQA.question)}
                  </h2>
                </div>
              )}

              {/* ── Фаза 1: ХУК — Кажи вголос (Lead Hook) ── */}
              {cleanHook && (
                <div className="pl-4 pr-3.5 py-3.5 border-l-4 border-l-amber-400 rounded-r-2xl bg-white/[0.03] border-y border-r border-white/[0.07] shadow-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-black flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      Фаза 1 · ХУК — Кажи вголос
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">First 5 Seconds</span>
                  </div>
                  <div className={`${hookFontClass} text-white`}>
                    {parseBilingualParts(cleanHook).map((part, idx) =>
                      part.isTranslation ? (
                        <span
                          key={idx}
                          className="text-zinc-400 text-xs italic bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 ml-1.5 inline-block font-normal"
                        >
                          {part.text}
                        </span>
                      ) : (
                        <span key={idx}>{part.text}</span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Native Language Subtitle / Translation Crib-Sheet */}
              {showTranslation && activeQA?.nativeTranslation && (
                <div className="p-3 rounded-2xl bg-blue-950/20 border border-blue-500/25">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5 mb-1">
                    <Globe className="w-3 h-3 text-blue-400" />
                    Переклад / Суть (рідною мовою):
                  </span>
                  <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-sans">
                    {stripRawAiTags(activeQA.nativeTranslation)}
                  </p>
                </div>
              )}

              {/* ── Фаза 2: КЛЮЧОВІ ТЕЗИ (Pillars with keyword capsules) ── */}
              {activeQA?.hints && activeQA.hints.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-black block">
                    Фаза 2 · Ключові тези (Pillars)
                  </span>
                  <ul className="space-y-2">
                    {activeQA.hints.map((rawHint, i) => {
                      const hint = stripRawAiTags(rawHint);
                      if (!hint) return null;
                      const colonIdx = hint.indexOf(':');
                      const hasAnchor = colonIdx > 0 && colonIdx < 35;
                      const anchor = hasAnchor ? hint.slice(0, colonIdx) : null;
                      const rest = hasAnchor ? hint.slice(colonIdx + 1) : hint;
                      return (
                        <li
                          key={i}
                          className="text-zinc-100 flex items-start gap-2.5 bg-white/[0.03] p-3 rounded-2xl border border-white/[0.07]"
                        >
                          <span className="text-cyan-400 font-mono text-xs font-black shrink-0 mt-0.5">
                            {i + 1}.
                          </span>
                          <div className={`leading-relaxed ${pillarFontClass} flex-1`}>
                            {anchor && (
                              <span className="text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md mr-1.5 text-xs border border-cyan-500/20">
                                {anchor}
                              </span>
                            )}
                            {parseBilingualParts(rest).map((part, pIdx) =>
                              part.isTranslation ? (
                                <span
                                  key={pIdx}
                                  className="text-zinc-400 text-xs italic bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 ml-1.5 inline-block font-normal"
                                >
                                  {part.text}
                                </span>
                              ) : (
                                <span key={pIdx}>{part.text}</span>
                              )
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Delivery Tip */}
              {activeQA?.deliveryTip && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-amber-300 block mb-1">
                    💡 Delivery tip
                  </span>
                  <p>{stripRawAiTags(activeQA.deliveryTip)}</p>
                </div>
              )}

              {/* ── Фаза 3: КОД / ПРИКЛАД ── */}
              {activeQA?.codeSnippet && (
                <div className="p-3.5 rounded-2xl bg-black border border-white/15 font-mono text-xs overflow-x-auto text-zinc-200 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-black flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                      Фаза 3 · Код / Реалізація
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(activeQA.codeSnippet!)}
                      className="text-[10px] font-mono text-zinc-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 active:scale-95 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode ? 'Скопійовано' : 'Копіювати'}</span>
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-zinc-300 selection:bg-white/20">
                    {stripRawAiTags(activeQA.codeSnippet)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Floating Scroll Indicator */}
        {canScrollMoreDown && (
          <div className="absolute bottom-36 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ top: 180, behavior: 'smooth' })}
              className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-zinc-900/95 hover:bg-zinc-800 border border-amber-400/50 text-[11px] font-mono font-bold text-amber-300 shadow-[0_4px_24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-all active:scale-95 animate-bounce cursor-pointer"
            >
              <span>↓ Більше тез унизу</span>
            </button>
          </div>
        )}

        {/* ── Bottom Section: Remote Control Triggers & Navigation ── */}
        <footer className="pt-2 border-t border-white/[0.08] space-y-2.5 shrink-0">
          {/* Live Transcript ticker (if listening) */}
          {liveTranscript && (
            <div className="px-3 py-1.5 bg-black/80 rounded-xl border border-white/[0.08] backdrop-blur-md">
              <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                ЧУЮ ЗАРАЗ
              </div>
              <div className="text-xs text-zinc-300 italic truncate font-sans">{liveTranscript}</div>
            </div>
          )}

          {/* ── 4 Tactile Remote Trigger Buttons ── */}
          <div className="grid grid-cols-4 gap-2">
            {/* 1. Коротше */}
            <button
              type="button"
              onClick={() => sendRemoteAction('MAKE_CONCISE')}
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                activeRemoteAction === 'MAKE_CONCISE'
                  ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-200'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-mono font-bold leading-tight">Коротше</span>
            </button>

            {/* 2. Простіше */}
            <button
              type="button"
              onClick={() => sendRemoteAction('SIMPLIFY')}
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                activeRemoteAction === 'SIMPLIFY'
                  ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-200'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-mono font-bold leading-tight">Простіше</span>
            </button>

            {/* 3. Показати Код */}
            <button
              type="button"
              onClick={() => sendRemoteAction('SHOW_CODE')}
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                activeRemoteAction === 'SHOW_CODE'
                  ? 'bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-200'
              }`}
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-mono font-bold leading-tight">Код</span>
            </button>

            {/* 4. Пауза / Freeze */}
            <button
              type="button"
              onClick={handleToggleFreeze}
              className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                isFrozen
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-200'
              }`}
            >
              {isFrozen ? <Lock className="w-4 h-4 text-black" /> : <Unlock className="w-4 h-4 text-zinc-400" />}
              <span className="text-[11px] font-mono font-bold leading-tight">
                {isFrozen ? 'Заморожено' : 'Пауза'}
              </span>
            </button>
          </div>

          {/* Card Prev / Next Navigation Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handlePrevCard}
              disabled={!activeQA || qas.length <= 1}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-zinc-200 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>

            <span className="text-[10px] font-mono text-zinc-500">
              {activeQA && qas.length > 0
                ? `${qas.findIndex((q) => q.id === activeQA.id) + 1} / ${qas.length}`
                : '0 / 0'}
            </span>

            <button
              onClick={handleNextCard}
              disabled={!activeQA || qas.length <= 1}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-mono disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-zinc-200 cursor-pointer"
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


