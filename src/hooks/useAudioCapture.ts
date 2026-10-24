import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { TabAudioCapture } from '@/lib/tabAudioCapture';
import { DeepgramLiveClient } from '@/lib/deepgramLive';

interface UseAudioCaptureOptions {
  speechLanguageRef: React.MutableRefObject<string>;
  triggerModeRef: React.MutableRefObject<'auto' | 'enter'>;
  userPlanRef: React.MutableRefObject<'free' | 'pro' | 'lifetime'>;
  onLiveTranscript: (text: string, isFinal: boolean, speechFinal: boolean, speaker?: 'interviewer' | 'candidate') => void;
  setShowTrialLimitModal: (val: boolean) => void;
  sessionDuration: number;
  setSessionDuration: (val: number) => void;
}

export function useAudioCapture({
  speechLanguageRef,
  triggerModeRef,
  userPlanRef,
  onLiveTranscript,
  setShowTrialLimitModal,
  sessionDuration,
  setSessionDuration,
}: UseAudioCaptureOptions) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [interviewerVolume, setInterviewerVolume] = useState<number>(0);
  const [candidateVolume, setCandidateVolume] = useState<number>(0);
  const [sttStatus, setSttStatus] = useState<'connected' | 'reconnecting' | 'idle' | 'disconnected'>('idle');
  const [hasTabAudio, setHasTabAudio] = useState<boolean>(true);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [candidateLiveTranscript, setCandidateLiveTranscript] = useState<string>('');
  const [candidateSpeechHistory, setCandidateSpeechHistory] = useState<Array<{ id: string; text: string; timestamp: number }>>([]);
  
  // Audio source: 'tab' (Meeting tab + mic mix) vs 'mic' (Microphone only)
  const [audioSource, setAudioSourceState] = useState<'tab' | 'mic'>('tab');
  const audioSourceRef = useRef<'tab' | 'mic'>('tab');

  const setAudioSource = useCallback((src: 'tab' | 'mic') => {
    setAudioSourceState(src);
    audioSourceRef.current = src;
    try {
      localStorage.setItem('ghostboard_audio_source', src);
    } catch {}
  }, []);

  const isCapturingRef = useRef<boolean>(false);
  const tabCaptureRef = useRef<TabAudioCapture | null>(null);
  const deepgramApiKeyRef = useRef<string>('');
  
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const candidateSilenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warnedAboutLimitRef = useRef<boolean>(false);
  const lastVolUpdateRef = useRef<number>(0);

  // 1. Initialize preferred source and pre-fetch Deepgram token on mount
  // Pre-fetching is crucial so getDisplayMedia() never gets blocked by network latency!
  useEffect(() => {
    try {
      const savedSrc = localStorage.getItem('ghostboard_audio_source');
      if (savedSrc === 'mic' || savedSrc === 'tab') {
        setAudioSourceState(savedSrc);
        audioSourceRef.current = savedSrc;
      }
      const cachedKey = localStorage.getItem('ghostboard_deepgram_api_key');
      if (cachedKey) {
        deepgramApiKeyRef.current = cachedKey.trim();
      }
    } catch {}

    const prefetchKey = async () => {
      try {
        const res = await fetch('/api/ai/deepgram', {
          headers: { 'x-ghostboard-client': 'studio-session' },
        });
        const data = await res.json();
        if (data?.apiKey) {
          const clean = data.apiKey.trim().replace(/^["']|["']$/g, '');
          deepgramApiKeyRef.current = clean;
          try {
            localStorage.setItem('ghostboard_deepgram_api_key', clean);
          } catch {}
        }
      } catch (e) {
        console.warn('[useAudioCapture] Pre-fetching Deepgram key failed:', e);
      }
    };
    prefetchKey();
  }, []);

  // 2. Listen for cross-OS audio events dispatched by TabAudioCapture
  useEffect(() => {
    const handleAudioToast = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: string; message?: string }>).detail;
      if (!detail) return;
      if (detail.type === 'warning') {
        toast.warning(detail.message || '', { duration: 6000 });
      } else if (detail.type === 'info') {
        toast.info(detail.message || '', { duration: 4000 });
      }
    };
    const handleTabAudioStatus = (e: Event) => {
      const detail = (e as CustomEvent<{ hasTabAudio?: boolean }>).detail;
      if (typeof detail?.hasTabAudio === 'boolean') {
        setHasTabAudio(detail.hasTabAudio);
      }
    };
    window.addEventListener('ghostboard:audio_toast', handleAudioToast as EventListener);
    window.addEventListener('ghostboard:tab_audio_status', handleTabAudioStatus as EventListener);
    return () => {
      window.removeEventListener('ghostboard:audio_toast', handleAudioToast as EventListener);
      window.removeEventListener('ghostboard:tab_audio_status', handleTabAudioStatus as EventListener);
    };
  }, []);

  const requestWakeLock = async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        (window as unknown as { wakeLockRef?: unknown }).wakeLockRef = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }).wakeLock.request('screen');
      }
    } catch {}
  };

  const handleSttStatusChange = (st: 'connected' | 'reconnecting' | 'idle' | 'disconnected') => {
    setSttStatus(st);
    if (isCapturingRef.current) {
      fetch('/api/ai/interview-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SET_STT_STATUS', sttStatus: st }),
      }).catch(() => {});
    }
  };

  const stopCapture = useCallback(() => {
    isCapturingRef.current = false;
    setIsCapturing(false);
    setLiveVolume(0);
    setInterviewerVolume(0);
    setCandidateVolume(0);
    setSttStatus('idle');
    setLiveTranscript('');
    setCandidateLiveTranscript('');

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (candidateSilenceTimeoutRef.current) {
      clearTimeout(candidateSilenceTimeoutRef.current);
      candidateSilenceTimeoutRef.current = null;
    }

    if (tabCaptureRef.current) {
      try {
        tabCaptureRef.current.stopCapture();
      } catch (e) {
        console.warn('Error stopping tab capture:', e);
      }
      tabCaptureRef.current = null;
    }



    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }

    fetch('/api/ai/interview-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'STATUS', isCapturing: false }),
    }).catch(() => {});
  }, []);

  const startCapture = useCallback(async (sourceParam?: 'mic' | 'tab' | unknown) => {
    if (isCapturingRef.current) {
      stopCapture();
    }

    // Determine target source: default to 'tab' so Meet/Zoom interviewer is captured!
    const source: 'mic' | 'tab' =
      sourceParam === 'mic' ? 'mic' :
      sourceParam === 'tab' ? 'tab' :
      audioSourceRef.current;

    // Check cached Deepgram key
    if (!deepgramApiKeyRef.current) {
      try {
        const fallback = localStorage.getItem('ghostboard_deepgram_api_key');
        if (fallback) deepgramApiKeyRef.current = fallback.trim();
      } catch {}
    }

    isCapturingRef.current = true;
    setIsCapturing(true);
    requestWakeLock();

    if (source === 'tab') {
      toast.info('Оберіть вкладку зустрічі (Google Meet / Zoom / YouTube) у вікні браузера', { duration: 4000 });
    }

    try {
      tabCaptureRef.current = new TabAudioCapture();
      
      // Crucial: tabCaptureRef.current.startCapture is called directly without preceding await fetch,
      // which preserves transient user activation for getDisplayMedia() in Chrome/Edge!
      await tabCaptureRef.current.startCapture({
        source,
        includeMic: true,
        deepgramApiKey: deepgramApiKeyRef.current,
        speechLanguage: speechLanguageRef.current,
        onConnectionStateChange: handleSttStatusChange,
        onVolumeChange: (vol, candVol = 0) => {
          const now = Date.now();
          if (now - lastVolUpdateRef.current > 200) {
            lastVolUpdateRef.current = now;
            setLiveVolume(vol);
            setInterviewerVolume(vol);
            setCandidateVolume(candVol);
          }
        },
        onLiveTranscript: (text: string, isFinal: boolean, speechFinal: boolean, speaker = 'interviewer') => {
          if (!text || !text.trim()) return;
          const trimmed = text.trim();
          if (speaker === 'candidate') {
            setCandidateLiveTranscript(trimmed);
            if (isFinal || speechFinal) {
              setCandidateSpeechHistory((prev) => [
                {
                  id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  text: trimmed,
                  timestamp: Date.now(),
                },
                ...prev.slice(0, 19),
              ]);
            }
            if (candidateSilenceTimeoutRef.current) clearTimeout(candidateSilenceTimeoutRef.current);
            candidateSilenceTimeoutRef.current = setTimeout(() => {
              setCandidateLiveTranscript('');
            }, 4500);
          } else {
            setLiveTranscript(trimmed);
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = setTimeout(() => {
              setLiveTranscript('');
            }, 6000);

            fetch('/api/ai/interview-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'LIVE_TRANSCRIPT', text: trimmed }),
            }).catch(() => {});
          }

          onLiveTranscript(trimmed, isFinal, speechFinal, speaker);
        },
      });

      // If user clicked stop while permission dialog was open, abort
      if (!isCapturingRef.current) {
        if (tabCaptureRef.current) {
          tabCaptureRef.current.stopCapture();
          tabCaptureRef.current = null;
        }
        setIsCapturing(false);
        return;
      }

      fetch('/api/ai/interview-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STATUS', isCapturing: true }),
      }).catch(() => {});
      
      sessionStartTimeRef.current = Date.now();
      warnedAboutLimitRef.current = false;
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
        setSessionDuration(elapsed);

        if (userPlanRef.current === 'free') {
          if (elapsed >= 890 && !warnedAboutLimitRef.current) {
            warnedAboutLimitRef.current = true;
            toast.warning('⏳ Залишилося 10 секунд безкоштовного демо-тесту!');
          }
          if (elapsed >= 900) {
            stopCapture();
            setShowTrialLimitModal(true);
          }
        }
      }, 1000);
    } catch (err: unknown) {
      stopCapture();
      toast.error((err as { message?: string })?.message || 'Не вдалося підключитися до звуку. Перевірте дозволи.');
    }
  }, [onLiveTranscript, setShowTrialLimitModal, setSessionDuration, stopCapture, userPlanRef, speechLanguageRef]);

  const handleManualReconnect = useCallback(() => {
    if (!isCapturingRef.current) {
      toast.info('Запуск захоплення аудіо...');
      startCapture();
      return;
    }
    toast.info('Перезапуск зʼєднання з Deepgram STT...');
    handleSttStatusChange('reconnecting');
    if (tabCaptureRef.current) {
      tabCaptureRef.current.reconnect();
    }
  }, [startCapture]);

  const repickTabAudio = useCallback(async () => {
    if (tabCaptureRef.current) {
      toast.info('Оберіть вкладку зустрічі з увімкненим аудіо...');
      const ok = await tabCaptureRef.current.repickTabAudio();
      if (ok) {
        setHasTabAudio(true);
      }
      return ok;
    }
    return false;
  }, []);

  const clearCandidateHistory = useCallback(() => {
    setCandidateSpeechHistory([]);
    setCandidateLiveTranscript('');
  }, []);

  return {
    isCapturing,
    isCapturingRef,
    liveVolume,
    interviewerVolume,
    candidateVolume,
    sttStatus,
    hasTabAudio,
    liveTranscript,
    setLiveTranscript,
    candidateLiveTranscript,
    setCandidateLiveTranscript,
    candidateSpeechHistory,
    clearCandidateHistory,
    repickTabAudio,
    silenceTimeoutRef,
    startCapture,
    stopCapture,
    handleManualReconnect,
    tabCaptureRef,
    audioSource,
    setAudioSource,
  };
}
