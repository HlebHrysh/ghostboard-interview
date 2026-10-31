'use client';

import React, { useEffect, useState, useRef, Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Unlock, ChevronLeft, ChevronRight, ShieldAlert, Sparkles, Radio, Globe, Copy, Check } from 'lucide-react';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { parseBilingualParts } from '@/lib/aiPromptCore';

interface SyncQAItem {
  id: string;
  question: string;
  startHook?: string;
  quickAnswer: string;
  nativeTranslation?: string;
  hints?: string[];
  codeSnippet?: string;
  deliveryTip?: string;
  meta?: { domain: string; level: string; language: string; raw?: string };
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

  // Screen WakeLock API: prevents phone screen from turning off during the interview
  useEffect(() => {
    let wakeLock: { release: () => Promise<void> } | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
        }
      } catch {
        // Silently ignore if not permitted
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
      if (wakeLock) void wakeLock.release();
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

    // Fallback polling loop (in case SSE is terminated by mobile browser network drops)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/interview-sync?token=${encodeURIComponent(token)}&since=${lastUpdatedRef.current}`);
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

  // Remote Action Dispatcher: sends commands from phone to desktop and web
  const sendAction = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!token) return;
    try {
      await fetch(`/api/ai/interview-sync?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch {}
  };

  const handleToggleFreeze = () => {
    const next = !isFrozen;
    setIsFrozen(next);
    sendAction('SET_FREEZE', { isFrozen: next });
  };

  const handleTogglePanic = () => {
    const next = !isPanic;
    setIsPanic(next);
    sendAction('SET_PANIC', { isPanic: next });
  };

  const handlePrevCard = () => {
    if (!activeQA || qas.length <= 1) return;
    const currentIdx = qas.findIndex((q) => q.id === activeQA.id);
    if (currentIdx > 0) {
      const prev = qas[currentIdx - 1];
      setActiveQA(prev);
      sendAction('SELECT_QA', { activeId: prev.id });
    }
  };

  const handleNextCard = () => {
    if (!activeQA || qas.length <= 1) return;
    const currentIdx = qas.findIndex((q) => q.id === activeQA.id);
    if (currentIdx >= 0 && currentIdx < qas.length - 1) {
      const next = qas[currentIdx + 1];
      setActiveQA(next);
      sendAction('SELECT_QA', { activeId: next.id });
    }
  };

  if (isPanic) {
    return (
      <div
        onClick={handleTogglePanic}
        className="min-h-screen bg-transparent text-zinc-500 font-mono p-6 flex flex-col justify-center items-center text-center cursor-pointer select-none"
      >
        <div className="w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center mb-4 text-zinc-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold tracking-wider text-zinc-400">PANIC SHIELD ACTIVE</p>
        <p className="text-xs text-zinc-600 mt-2">Tap anywhere to restore teleprompter</p>
      </div>
    );
  }

  return (
    <SubpageStripesContainer pattern="spine" className="font-sans select-none h-screen min-h-screen overflow-hidden">
      <div className="flex flex-col h-screen p-4 justify-between relative overflow-hidden">
        {/* Top Status Bar & Controls */}
        <header className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-zinc-600'}`} />
            <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400 font-semibold">
              {isCapturing ? 'LIVE AUDIO' : 'READY'}
            </span>
            {isConnected && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-zinc-400 border border-white/10">
                LAN SYNC
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Translation Toggle */}
            <button
              onClick={() => setShowTranslation((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all ${
                showTranslation
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'btn-resend-glass !p-2 text-zinc-500'
              }`}
              title="Toggle native translation"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono font-bold">TR</span>
            </button>

            {/* Freeze Button */}
            <button
              onClick={handleToggleFreeze}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                isFrozen
                  ? 'bg-white/20 border-white/40 text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                  : 'btn-resend-glass !py-1.5 !px-3'
              }`}
            >
              {isFrozen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {isFrozen ? 'FROZEN' : 'FREEZE'}
            </button>

            {/* Panic Trigger */}
            <button
              onClick={handleTogglePanic}
              className="p-2 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-400 hover:bg-rose-900/40 active:scale-95 transition-all"
              title="Emergency Panic"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Main Content Area (Scrollable with ref) */}
        <main
          ref={scrollContainerRef}
          onScroll={checkScrollOverflow}
          className="flex-1 overflow-y-auto overscroll-contain py-4 pr-1 relative"
        >
          {!isCapturing && !activeQA ? (
            <div className="text-center opacity-60 flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-6 h-6 rounded-full border-2 border-t-white border-zinc-800 animate-spin" />
              <p className="text-lg font-bold font-mono tracking-widest text-zinc-400">
                WAITING FOR INTERVIEW SPEECH...
              </p>
              <p className="text-xs text-zinc-500 max-w-xs">
                Place phone right below your webcam for natural eyeline contact.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Context Badge from <<<META>>> */}
              {activeQA?.meta && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 font-mono text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>{activeQA.meta.domain}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-300">{activeQA.meta.level}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-cyan-300 uppercase">{activeQA.meta.language}</span>
                  </span>
                </div>
              )}

              {/* Active Question Title */}
              {activeQA && (
                <div className="border-l-2 border-white/20 pl-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                    QUESTION
                  </span>
                  <h2 className="text-base sm:text-lg font-semibold text-zinc-200 leading-snug">
                    {activeQA.question}
                  </h2>
                </div>
              )}

              {/* Phase 1: Lead Hook / Opening Statement (17-19px font-medium, border-l-4) */}
              {activeQA && (activeQA.startHook || activeQA.quickAnswer) && (
                <div className="pl-3.5 pr-3 py-3 border-l-4 border-l-amber-400/90 rounded-r-xl bg-white/[0.03] border-y border-r border-white/[0.06] shadow-[0_4px_20px_rgba(245,158,11,0.05)]">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1.5">
                    Фаза 1 · Голосовий старт (Hook)
                  </span>
                  <div className="text-[17px] sm:text-[19px] font-medium text-white leading-relaxed tracking-tight">
                    {parseBilingualParts(activeQA.startHook || activeQA.quickAnswer).map((part, idx) =>
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
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/25">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5 mb-1">
                    <Globe className="w-3 h-3 text-blue-400" />
                    ПЕРЕВОД / СУТЬ (РОДНОЙ ЯЗЫК):
                  </span>
                  <p className="text-sm text-blue-100/90 leading-relaxed font-sans">
                    {activeQA.nativeTranslation}
                  </p>
                </div>
              )}

              {/* Phase 2: Key Pillars (Pillars with bold keyword chips) */}
              {activeQA?.hints && activeQA.hints.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                    Фаза 2 · Ключові тези (Pillars)
                  </span>
                  <ul className="space-y-2">
                    {activeQA.hints.map((hint, i) => {
                      const colonIdx = hint.indexOf(':');
                      const hasAnchor = colonIdx > 0 && colonIdx < 35;
                      const anchor = hasAnchor ? hint.slice(0, colonIdx) : null;
                      const rest = hasAnchor ? hint.slice(colonIdx + 1) : hint;
                      return (
                        <li key={i} className="text-sm text-zinc-200 flex items-start gap-2.5 bg-white/[0.03] p-2.5 rounded-xl border border-white/[0.06]">
                          <span className="text-cyan-400 font-mono text-xs font-bold shrink-0 mt-0.5">{i + 1}.</span>
                          <div className="leading-relaxed font-medium flex-1">
                            {anchor && (
                              <span className="text-white font-semibold bg-white/10 px-1.5 py-0.5 rounded mr-1.5 text-xs border border-white/10">
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
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-200 leading-relaxed">
                  <span className="font-mono font-bold uppercase tracking-wider text-[10px] text-cyan-400 block mb-1">
                    💡 Delivery tip
                  </span>
                  <p>{activeQA.deliveryTip}</p>
                </div>
              )}

              {/* Phase 3: Code Snippet */}
              {activeQA?.codeSnippet && (
                <div className="p-3 rounded-xl bg-black/70 border border-white/10 font-mono text-xs overflow-x-auto text-zinc-300">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      Фаза 3 · Код / Реалізація
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeQA.codeSnippet!);
                      }}
                      className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 active:scale-95 transition"
                    >
                      Копіювати
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap">{activeQA.codeSnippet}</pre>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Floating Scroll Indicator */}
        {canScrollMoreDown && (
          <div className="absolute bottom-28 left-0 right-0 z-30 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ top: 180, behavior: 'smooth' })}
              className="pointer-events-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/95 hover:bg-zinc-800 border border-amber-400/50 text-[11px] font-mono font-bold text-amber-300 shadow-[0_4px_20px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all active:scale-95 animate-bounce cursor-pointer"
            >
              <span>↓ Ще тези нижче</span>
            </button>
          </div>
        )}

        {/* Bottom Navigation and Live Transcript */}
        <footer className="pt-3 border-t border-white/[0.08] space-y-3 shrink-0">
          {/* Live Interim Transcript */}
          {liveTranscript && (
            <div className="p-2.5 bg-black/60 rounded-xl border border-white/[0.08] backdrop-blur-md">
              <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                HEARING NOW
              </div>
              <div className="text-xs text-zinc-300 italic truncate">
                {liveTranscript}
              </div>
            </div>
          )}

          {/* Card Navigation Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevCard}
              disabled={!activeQA || qas.length <= 1}
              className="btn-resend-glass text-xs font-mono !py-2 !px-4 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              PREV
            </button>

            <span className="text-[11px] font-mono text-zinc-500">
              {activeQA && qas.length > 0
                ? `${qas.findIndex((q) => q.id === activeQA.id) + 1} / ${qas.length}`
                : '0 / 0'}
            </span>

            <button
              onClick={handleNextCard}
              disabled={!activeQA || qas.length <= 1}
              className="btn-resend-glass text-xs font-mono !py-2 !px-4 disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
            >
              NEXT
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </SubpageStripesContainer>
  );
}

export default function CompanionPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center text-zinc-500 font-mono text-xs">
          CONNECTING HUD...
        </div>
      }
    >
      <CompanionContent params={params} />
    </Suspense>
  );
}

