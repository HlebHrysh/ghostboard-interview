'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

interface SyncQAItem {
  id: string;
  question: string;
  quickAnswer: string;
}

export default function CompanionPage({ params }: { params: { sessionId: string } }) {
  const [activeQA, setActiveQA] = useState<SyncQAItem | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const lastUpdatedRef = useRef<number>(0);

  // WakeLock API
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error('WakeLock failed', err);
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

  // Polling Sync API
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/ai/interview-sync?since=${lastUpdatedRef.current}`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasUpdate) {
            lastUpdatedRef.current = data.lastUpdated;
            setIsCapturing(data.isCapturing);
            setLiveTranscript(data.liveTranscript || '');

            if (data.activeId && data.qas) {
              const active = data.qas.find((q: any) => q.id === data.activeId);
              if (active) {
                setActiveQA(active);
              }
            }
          }
        }
      } catch (err) {
        // silently fail and retry
      }
      
      timeoutId = setTimeout(poll, 300); // Poll every 300ms for lowest latency
    };

    poll();
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans select-none overflow-hidden flex flex-col justify-center">
      {!isCapturing && !activeQA ? (
        <div className="text-center opacity-50 flex flex-col items-center justify-center h-full gap-4">
          <div className="w-4 h-4 rounded-full bg-zinc-800 animate-pulse" />
          <p className="text-xl font-bold font-mono tracking-widest text-zinc-600">WAITING</p>
        </div>
      ) : (
        <div className="w-full max-w-xl mx-auto space-y-8 animate-in fade-in duration-300">
          
          {/* Active Question Title */}
          {activeQA && (
            <div className="border-l-4 border-zinc-800 pl-4">
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-400 leading-tight">
                {activeQA.question}
              </h2>
            </div>
          )}

          {/* Active Answer (Huge Text) */}
          {activeQA && (
            <div className="text-3xl sm:text-4xl md:text-5xl font-black text-[#C8F135] leading-tight break-words">
              {activeQA.quickAnswer}
            </div>
          )}

          {/* Live Transcript Stream (Small at bottom) */}
          {liveTranscript && (
            <div className="fixed bottom-6 left-6 right-6 p-4 bg-zinc-900/50 rounded-2xl border border-white/10 backdrop-blur-xl">
              <div className="text-xs font-mono text-zinc-500 mb-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                TRANSCRIPT
              </div>
              <div className="text-lg text-zinc-300 italic">
                {liveTranscript}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
