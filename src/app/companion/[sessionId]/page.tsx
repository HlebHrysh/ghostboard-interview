'use client';

import React, { useEffect, useState, useRef, Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Unlock, ChevronLeft, ChevronRight, ShieldAlert, Sparkles, Radio, Globe } from 'lucide-react';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

interface SyncQAItem {
  id: string;
  question: string;
  startHook?: string;
  quickAnswer: string;
  nativeTranslation?: string;
  hints?: string[];
  codeSnippet?: string;
  deliveryTip?: string;
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
    <SubpageStripesContainer pattern="spine" className="p-4 font-sans select-none flex flex-col justify-between">
      {/* Top Status Bar & Controls */}
      <header className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-6">
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
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Active Question Title */}
            {activeQA && (
              <div className="border-l-2 border-white/30 pl-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  QUESTION
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-zinc-200 leading-snug">
                  {activeQA.question}
                </h2>
              </div>
            )}

            {/* Start Hook / Opening statement */}
            {activeQA?.startHook && (
              <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.08]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold block mb-1">
                  OPENING HOOK:
                </span>
                <p className="text-sm font-medium text-zinc-200 leading-relaxed italic">
                  &ldquo;{activeQA.startHook}&rdquo;
                </p>
              </div>
            )}

            {/* Active Answer (Large High-Contrast Text for Glancing) */}
            {activeQA && (
              <div className="bento-card p-4 sm:p-5 border border-white/[0.12] shadow-[0_0_30px_rgba(255,255,255,0.06)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold block mb-1.5">
                  CORE ANSWER
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white leading-tight break-words">
                  {activeQA.quickAnswer}
                </div>
              </div>
            )}

            {/* Native Language Subtitle / Translation Crib-Sheet */}
            {showTranslation && activeQA?.nativeTranslation && (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.12]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-300 font-bold flex items-center gap-1.5 mb-1">
                  <Globe className="w-3 h-3 text-white" />
                  ПЕРЕВОД / СУТЬ (РОДНОЙ ЯЗЫК):
                </span>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {activeQA.nativeTranslation}
                </p>
              </div>
            )}

            {/* Bullet Hints */}
            {activeQA?.hints && activeQA.hints.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                  KEY BULLETS TO MENTION:
                </span>
                <ul className="space-y-1">
                  {activeQA.hints.map((hint, i) => (
                    <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-white font-bold">•</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation and Live Transcript */}
      <footer className="pt-3 border-t border-white/[0.08] space-y-3">
        {/* Live Interim Transcript */}
        {liveTranscript && (
          <div className="p-2.5 bg-transparent/80 rounded-xl border border-white/[0.08] backdrop-blur-md">
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

