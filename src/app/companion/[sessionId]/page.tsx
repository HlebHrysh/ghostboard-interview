'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Unlock, ChevronLeft, ChevronRight, ShieldAlert, Sparkles, Radio, Globe } from 'lucide-react';

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

function CompanionContent({ params }: { params: { sessionId: string } }) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || params.sessionId;

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
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
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
      if (wakeLock) wakeLock.release();
    };
  }, []);

  // Primary: Real-Time SSE Stream with instant event push
  useEffect(() => {
    if (!token) return;

    let sse: EventSource | null = null;
    try {
      const sseUrl = `/api/companion/stream?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(params.sessionId)}&device=phone`;
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
              const active = data.qas.find((q: any) => q.id === data.activeId) || data.qas[0];
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
  }, [token, params.sessionId]);

  // Remote Action Dispatcher: sends commands from phone to desktop and web
  const sendAction = async (action: string, payload: Record<string, any> = {}) => {
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
        className="min-h-screen bg-black text-zinc-500 font-mono p-6 flex flex-col justify-center items-center text-center cursor-pointer select-none"
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
    <div className="min-h-screen bg-[#050608] text-white p-4 font-sans select-none flex flex-col justify-between overflow-x-hidden">
      {/* Top Status Bar & Controls */}
      <header className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isCapturing ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400 font-semibold">
            {isCapturing ? 'LIVE AUDIO' : 'READY'}
          </span>
          {isConnected && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-900 text-zinc-500 border border-zinc-800">
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
                ? 'bg-[#C8F135]/10 border-[#C8F135]/40 text-[#C8F135]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
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
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            {isFrozen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isFrozen ? 'FROZEN' : 'FREEZE'}
          </button>

          {/* Panic Trigger */}
          <button
            onClick={handleTogglePanic}
            className="p-2 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 hover:bg-red-900/40"
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
            <div className="w-6 h-6 rounded-full border-2 border-t-[#C8F135] border-zinc-800 animate-spin" />
            <p className="text-lg font-bold font-mono tracking-widest text-zinc-500">
              WAITING FOR INTERVIEW SPEECH...
            </p>
            <p className="text-xs text-zinc-600 max-w-xs">
              Place phone right below your webcam for natural eyeline contact.
            </p>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Active Question Title */}
            {activeQA && (
              <div className="border-l-2 border-[#C8F135]/50 pl-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  QUESTION
                </span>
                <h2 className="text-base sm:text-lg font-semibold text-zinc-300 leading-snug">
                  {activeQA.question}
                </h2>
              </div>
            )}

            {/* Start Hook / Opening statement */}
            {activeQA?.startHook && (
              <div className="bg-zinc-900/60 rounded-xl p-3 border border-white/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                  OPENING HOOK:
                </span>
                <p className="text-sm font-medium text-emerald-200/90 leading-relaxed italic">
                  &ldquo;{activeQA.startHook}&rdquo;
                </p>
              </div>
            )}

            {/* Active Answer (Large High-Contrast Text for Glancing) */}
            {activeQA && (
              <div className="p-4 rounded-2xl bg-[#090b10] border border-[#C8F135]/30 shadow-[0_0_30px_rgba(200,241,53,0.08)]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C8F135] font-bold block mb-1.5">
                  CORE ANSWER
                </span>
                <div className="text-2xl sm:text-3xl font-black text-white leading-tight break-words">
                  {activeQA.quickAnswer}
                </div>
              </div>
            )}

            {/* Native Language Subtitle / Translation Crib-Sheet */}
            {showTranslation && activeQA?.nativeTranslation && (
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5 mb-1">
                  <Globe className="w-3 h-3" />
                  ПЕРЕВОД / СУТЬ (РОДНОЙ ЯЗЫК):
                </span>
                <p className="text-sm text-blue-200/90 leading-relaxed">
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
                      <span className="text-[#C8F135] font-bold">•</span>
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
      <footer className="pt-3 border-t border-zinc-900 space-y-3">
        {/* Live Interim Transcript */}
        {liveTranscript && (
          <div className="p-2.5 bg-zinc-950/80 rounded-xl border border-zinc-800/60 backdrop-blur-md">
            <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5 mb-0.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
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
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-xs font-mono font-semibold"
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
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-xs font-mono font-semibold"
          >
            NEXT
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function CompanionPage({ params }: { params: { sessionId: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs">
          CONNECTING HUD...
        </div>
      }
    >
      <CompanionContent params={params} />
    </Suspense>
  );
}

