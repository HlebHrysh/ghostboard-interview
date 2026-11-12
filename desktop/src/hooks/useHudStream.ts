import { useState, useEffect, useRef, useCallback } from 'react';
import type { HudEvent, ScreenRadarSummary, SpeakerRole, SttConnectionStatus, UserProfile, DeviceCodePendingPayload } from '../types/hud';
import type { AudioLevelsRef } from './useSampledLevel';
import {
  startCopilotStream,
  startAudioCapture,
  stopAudioCapture,
  triggerManualAnswer,
  clearSession as nativeClearSession,
  setWindowOpacity,
  setScreenShareStealth,
  toggleClickThrough,
  alignToActiveDisplay,
  panicHide,
  exportMarkdown,
  getAuthState,
  setListenMode as nativeSetListenMode,
  getListenMode as nativeGetListenMode,
  setSttLanguage as nativeSetSttLanguage,
  getSttLanguage as nativeGetSttLanguage,
  consumeRadarSnapshot,
  toggleVisionRadar,
} from '../lib/tauriBridge';
import {
  StructuredAnswerOutput,
  parseDualStreamDelimiters,
} from '../lib/streamClient';
import { cleanStreamText } from '../lib/answerStream';

// Module-level: the native capture auto-start must happen at most once per app session.
let autoCaptureStartPromise: Promise<boolean> | null = null;

function cleanStreamingAnswerText(raw: string): string {
  if (!raw) return '';
  return cleanStreamText(raw);
}

export interface SttStatusState {
  status: SttConnectionStatus | 'idle';
  attempt?: number;
  retryInMs?: number;
  message?: string | null;
  speaker?: SpeakerRole;
}

export interface UseHudStreamOptions {
  autoConnect?: boolean;
  onQuestionDetected?: (question: string, id: string) => void;
  onHotkey?: (action: string) => void;
}

export function useHudStream(options: UseHudStreamOptions = {}) {
  const { autoConnect = true, onQuestionDetected, onHotkey } = options;

  const [sttStatus, setSttStatus] = useState<SttStatusState>({ status: 'connected' });
  const [isSpeech, setIsSpeech] = useState(false);
  const [vadConfidence, setVadConfidence] = useState(0);
  // High-frequency audio levels live in a ref: updating it never re-renders anything.
  const levelsRef = useRef<AudioLevelsRef>({ interviewer: 0, candidate: 0 });

  const [liveTranscript, setLiveTranscript] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerRole>('interlocutor');

  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);

  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [structuredAnswer, setStructuredAnswer] = useState<StructuredAnswerOutput | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [ttftMs, setTtftMs] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [lastHotkey, setLastHotkey] = useState<string | null>(null);
  const [isStealth, setIsStealth] = useState(true);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<string>('pro');
  const [deviceCode, setDeviceCode] = useState<DeviceCodePendingPayload | null>(null);
  const [connectionLatencyMs, setConnectionLatencyMs] = useState<number>(45);
  const [isCapturing, setIsCapturing] = useState(false);
  const [listenMode, setListenModeState] = useState<'all' | 'system_only'>('all');
  const [sttLanguage, setSttLanguageState] = useState<'multi' | 'uk' | 'ru' | 'en' | string>('multi');
  const [radarReady, setRadarReady] = useState<ScreenRadarSummary | null>(null);

  const accumulatedTokensRef = useRef('');
  const questionStartTimeRef = useRef<number | null>(null);
  const firstTokenTimeRef = useRef<number | null>(null);
  const lastValidQuestionRef = useRef<string>('');
  const lastValidQuestionIdRef = useRef<string | null>(null);
  const lastValidStructuredRef = useRef<StructuredAnswerOutput | null>(null);
  const lastValidStreamingRef = useRef<string>('');

  const onQuestionDetectedRef = useRef(onQuestionDetected);
  const onHotkeyRef = useRef(onHotkey);

  useEffect(() => {
    onQuestionDetectedRef.current = onQuestionDetected;
  }, [onQuestionDetected]);

  useEffect(() => {
    onHotkeyRef.current = onHotkey;
  }, [onHotkey]);

  const handleHudEvent = useCallback((event: HudEvent) => {
    switch (event.type) {
      case 'vadState': {
        const speech = event.payload.is_speech ?? event.payload.isSpeaking ?? false;
        const conf = event.payload.confidence ?? 0;
        setIsSpeech(speech);
        setVadConfidence(Math.round(conf * 4) / 4);
        if (speech) {
          levelsRef.current.interviewer = Math.min(100, Math.round(conf * 100));
        } else {
          levelsRef.current.interviewer = Math.max(0, Math.floor(levelsRef.current.interviewer * 0.7));
        }
        break;
      }

      case 'audioLevel': {
        const p = event.payload;
        const levels = levelsRef.current;
        if (p.source !== undefined && p.level !== undefined) {
          const lvl = typeof p.level === 'number' ? p.level : 0;
          if (p.source === 'loopback' || p.source === 'interlocutor') {
            levels.interviewer = Math.min(100, Math.round(lvl));
          } else {
            levels.candidate = Math.min(100, Math.round(lvl));
          }
        }
        if (p.interlocutor !== undefined || p.candidate !== undefined) {
          if (p.interlocutor !== undefined) {
            const intVol = typeof p.interlocutor === 'number'
              ? (p.interlocutor <= 1.0 ? p.interlocutor * 100 : p.interlocutor)
              : 0;
            levels.interviewer = Math.min(100, Math.round(intVol));
          }
          if (p.candidate !== undefined) {
            const candVol = typeof p.candidate === 'number'
              ? (p.candidate <= 1.0 ? p.candidate * 100 : p.candidate)
              : 0;
            levels.candidate = Math.min(100, Math.round(candVol));
          }
        }
        break;
      }

      case 'sttTranscript': {
        const text = event.payload.text || '';
        const speaker = event.payload.speaker || 'interlocutor';
        setLiveTranscript(text);
        setActiveSpeaker(speaker);
        break;
      }

      case 'questionDetected': {
        const q = event.payload.question || event.payload.text || '';
        const id = event.payload.id || event.payload.questionId || `q-${Date.now()}`;
        if (structuredAnswer && !accumulatedTokensRef.current.trim().startsWith('<<<IGNORE>>>')) {
          lastValidQuestionRef.current = currentQuestion;
          lastValidQuestionIdRef.current = currentQuestionId;
          lastValidStructuredRef.current = structuredAnswer;
          lastValidStreamingRef.current = streamingAnswer;
        }
        setCurrentQuestion(q);
        setCurrentQuestionId(id);
        accumulatedTokensRef.current = '';
        setStreamingAnswer('');
        setStructuredAnswer(null);
        setIsStreaming(true);
        questionStartTimeRef.current = Date.now();
        firstTokenTimeRef.current = null;
        setTtftMs(null);
        setLatencyMs(null);
        onQuestionDetectedRef.current?.(q, id);
        break;
      }

      case 'llmChunk':
      case 'aiChunk': {
        const payload = event.payload as { token?: string; delta?: string; text?: string; is_first?: boolean; question_id?: string; questionId?: string };
        const token = payload.token || payload.delta || payload.text || '';
        const qId = payload.question_id || payload.questionId;
        if (qId && (!currentQuestionId || currentQuestionId !== qId)) {
          setCurrentQuestionId(qId);
        }
        if (!currentQuestion) {
          setCurrentQuestion('Запитання співрозмовника');
        }
        accumulatedTokensRef.current += token;
        const fullSoFar = accumulatedTokensRef.current;

        if (fullSoFar.trim().startsWith('<<<IGNORE>>>')) {
          setIsStreaming(false);
          setCurrentQuestion(lastValidQuestionRef.current);
          setCurrentQuestionId(lastValidQuestionIdRef.current);
          setStructuredAnswer(lastValidStructuredRef.current);
          setStreamingAnswer(lastValidStreamingRef.current);
          accumulatedTokensRef.current = '';
          return;
        }

        const cleaned = cleanStreamingAnswerText(fullSoFar);
        setStreamingAnswer(cleaned || fullSoFar);

        if (!firstTokenTimeRef.current && (payload.is_first || token.length > 0)) {
          firstTokenTimeRef.current = Date.now();
          if (questionStartTimeRef.current) {
            setTtftMs(firstTokenTimeRef.current - questionStartTimeRef.current);
          }
        }

        const parsed = parseDualStreamDelimiters(fullSoFar);
        const currentTtft = firstTokenTimeRef.current && questionStartTimeRef.current
          ? firstTokenTimeRef.current - questionStartTimeRef.current
          : 0;
        const currentDuration = questionStartTimeRef.current
          ? Date.now() - questionStartTimeRef.current
          : 0;

        const newStructured: StructuredAnswerOutput = {
          hook: parsed.hook || cleaned || fullSoFar,
          pillars: parsed.pillars,
          deepDive: parsed.deepDive,
          rawText: fullSoFar,
          ttftMs: currentTtft,
          totalDurationMs: currentDuration,
          model: 'Gemini 3.8 Flash / Groq',
        };
        setStructuredAnswer(newStructured);
        setIsStreaming(true);
        break;
      }

      case 'llmDone':
      case 'aiDone': {
        setIsStreaming(false);
        const payload = event.payload as { full_text?: string; text?: string; latency_ms?: number };
        const fullText = payload.full_text || payload.text || accumulatedTokensRef.current;

        if (fullText.trim().startsWith('<<<IGNORE>>>')) {
          setCurrentQuestion(lastValidQuestionRef.current);
          setCurrentQuestionId(lastValidQuestionIdRef.current);
          setStructuredAnswer(lastValidStructuredRef.current);
          setStreamingAnswer(lastValidStreamingRef.current);
          accumulatedTokensRef.current = '';
          return;
        }

        accumulatedTokensRef.current = fullText;
        const cleaned = cleanStreamingAnswerText(fullText);
        setStreamingAnswer(cleaned || fullText);

        const finalParsed = parseDualStreamDelimiters(fullText);
        const finalLatency = payload.latency_ms ?? (
          questionStartTimeRef.current ? Date.now() - questionStartTimeRef.current : 0
        );

        if (payload.latency_ms) {
          setLatencyMs(payload.latency_ms);
        } else if (questionStartTimeRef.current) {
          setLatencyMs(Date.now() - questionStartTimeRef.current);
        }

        const finalStructured: StructuredAnswerOutput = {
          hook: finalParsed.hook || cleaned || fullText,
          pillars: finalParsed.pillars,
          deepDive: finalParsed.deepDive,
          rawText: fullText,
          ttftMs: ttftMs ?? 0,
          totalDurationMs: finalLatency,
          model: 'Gemini 3.8 Flash / Groq',
        };
        setStructuredAnswer(finalStructured);
        lastValidStructuredRef.current = finalStructured;
        lastValidQuestionRef.current = currentQuestion;
        lastValidQuestionIdRef.current = currentQuestionId;
        lastValidStreamingRef.current = cleaned || fullText;
        break;
      }

      case 'hotkeyTriggered': {
        setLastHotkey(event.payload.action);
        onHotkeyRef.current?.(event.payload.action);
        break;
      }

      case 'stealthChanged': {
        setIsStealth(event.payload.enabled);
        break;
      }

      case 'clickThroughChanged': {
        setIsClickThrough(event.payload.enabled);
        break;
      }

      case 'listenModeChanged': {
        const mode = event.payload.mode;
        setListenModeState(mode === 'system_only' ? 'system_only' : 'all');
        break;
      }

      case 'sttLanguageChanged': {
        const lang = event.payload.language;
        setSttLanguageState(lang);
        break;
      }

      case 'authChanged': {
        setIsAuthenticated(event.payload.authenticated);
        if (event.payload.user) setUser(event.payload.user);
        if (event.payload.plan) setPlan(event.payload.plan);
        break;
      }

      case 'deviceCodePending': {
        setDeviceCode(event.payload);
        break;
      }

      case 'planUpdated': {
        setPlan(event.payload.plan);
        break;
      }

      case 'sttStatus': {
        const payload = event.payload;
        const status = (payload.status as SttConnectionStatus) || 'connected';
        setSttStatus({
          status,
          attempt: payload.attempt,
          retryInMs: payload.retry_in_ms,
          message: payload.message,
          speaker: payload.speaker,
        });
        if (status === 'connected') {
          setError((prev) => (prev?.code === 'AUDIO_PIPELINE_ERROR' ? null : prev));
        }
        break;
      }

      case 'screenRadarReady': {
        const p = event.payload;
        setRadarReady({
          detectionId: p.detectionId ?? p.detection_id ?? `radar-${Date.now()}`,
          hammingDistance: p.hammingDistance ?? p.hamming_distance ?? 0,
          roiWidth: p.roiWidth ?? p.roi_width ?? 0,
          roiHeight: p.roiHeight ?? p.roi_height ?? 0,
          detectedAtMs: p.detectedAtMs ?? p.detected_at_ms ?? Date.now(),
        });
        break;
      }

      case 'error': {
        setError(event.payload);
        setIsStreaming(false);
        if (event.payload.code === 'AUDIO_PIPELINE_ERROR') {
          setSttStatus((prev) => ({
            ...prev,
            status: 'failed',
            message: event.payload.message,
          }));
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (!autoConnect) return;
    let isMounted = true;
    const unsubscribe = startCopilotStream(handleHudEvent);

    // Initial listen mode load
    nativeGetListenMode().then((m) => {
      if (isMounted) setListenModeState(m === 'system_only' ? 'system_only' : 'all');
    }).catch(console.warn);

    // Initial STT language load
    nativeGetSttLanguage().then((l) => {
      if (isMounted && l) setSttLanguageState(l);
    }).catch(console.warn);

    // Auto-start native dual audio capture once per session (guard survives remounts / StrictMode)
    if (!autoCaptureStartPromise) {
      autoCaptureStartPromise = startAudioCapture('dual').catch((err) => {
        console.warn('[useHudStream] startAudioCapture error:', err);
        return false;
      });
    }
    autoCaptureStartPromise.then((ok) => {
      if (isMounted) setIsCapturing(ok);
    });
    // Initial auth state load
    getAuthState().then((st) => {
      if (isMounted && st) {
        setIsAuthenticated(st.authenticated);
        if (st.user) setUser(st.user);
        if (st.plan) setPlan(st.plan);
      }
    }).catch(console.warn);

    // Simulated latency jitter within optimal <80ms boundary
    const latencyInterval = setInterval(() => {
      if (isMounted) {
        setConnectionLatencyMs(Math.floor(38 + Math.random() * 24));
      }
    }, 4000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(latencyInterval);
    };
  }, [autoConnect, handleHudEvent]);

  const startCapture = useCallback(async (source?: string) => {
    try {
      const ok = await startAudioCapture(source);
      setIsCapturing(ok);
      return ok;
    } catch (err) {
      console.warn('[useHudStream] startCapture error:', err);
      setIsCapturing(false);
      return false;
    }
  }, []);

  const stopCapture = useCallback(async () => {
    try {
      const ok = await stopAudioCapture();
      setIsCapturing(false);
      return ok;
    } catch (err) {
      console.warn('[useHudStream] stopCapture error:', err);
      return false;
    }
  }, []);

  const restartCapture = useCallback(async (source?: string) => {
    try {
      await stopAudioCapture().catch(() => {});
      const ok = await startAudioCapture(source || 'dual');
      setIsCapturing(ok);
      if (ok) {
        setSttStatus({ status: 'connected' });
        setError((prev) => (prev?.code === 'AUDIO_PIPELINE_ERROR' ? null : prev));
      }
      return ok;
    } catch (err) {
      console.warn('[useHudStream] restartCapture error:', err);
      setIsCapturing(false);
      return false;
    }
  }, []);

  const triggerAnswer = useCallback(async (prompt?: string) => {
    setIsStreaming(true);
    await triggerManualAnswer(prompt);
  }, []);

  const clearSession = useCallback(async () => {
    accumulatedTokensRef.current = '';
    setLiveTranscript('');
    setCurrentQuestion('');
    setCurrentQuestionId(null);
    setStreamingAnswer('');
    setStructuredAnswer(null);
    setIsStreaming(false);
    setTtftMs(null);
    setLatencyMs(null);
    setRadarReady(null);
    await nativeClearSession();
  }, []);

  const setOpacity = useCallback(async (opacity: number) => {
    await setWindowOpacity(opacity);
  }, []);

  const toggleStealth = useCallback(async (enabled?: boolean) => {
    const next = enabled !== undefined ? enabled : !isStealth;
    const res = await setScreenShareStealth(next);
    setIsStealth(res);
    return res;
  }, [isStealth]);

  const toggleCursorClickThrough = useCallback(async (enabled?: boolean) => {
    const next = enabled !== undefined ? enabled : !isClickThrough;
    const res = await toggleClickThrough(next);
    setIsClickThrough(res);
    return res;
  }, [isClickThrough]);

  const alignWebcam = useCallback(async () => {
    return await alignToActiveDisplay();
  }, []);

  const triggerPanicHide = useCallback(async () => {
    return await panicHide();
  }, []);

  const exportDebrief = useCallback(async (content: string, filename?: string) => {
    return await exportMarkdown(content, filename);
  }, []);

  const switchListenMode = useCallback(async (mode: 'all' | 'system_only') => {
    const res = await nativeSetListenMode(mode);
    setListenModeState(res === 'system_only' ? 'system_only' : 'all');
    return res;
  }, []);

  const switchSttLanguage = useCallback(async (lang: 'multi' | 'uk' | 'ru' | 'en' | string) => {
    const res = await nativeSetSttLanguage(lang);
    setSttLanguageState(res);
    return res;
  }, []);

  const clearRadarReady = useCallback(() => {
    setRadarReady(null);
  }, []);

  const consumeRadar = useCallback(async () => {
    const snap = await consumeRadarSnapshot();
    setRadarReady(null);
    return snap;
  }, []);

  const setVisionRadarEnabled = useCallback(async (enabled: boolean) => {
    const res = await toggleVisionRadar(enabled);
    if (!res) {
      setRadarReady(null);
    }
    return res;
  }, []);

  return {
    // Reactive State
    sttStatus,
    isSpeech,
    vadConfidence,
    levelsRef,
    liveTranscript,
    activeSpeaker,
    currentQuestion,
    currentQuestionId,
    streamingAnswer,
    structuredAnswer,
    isStreaming,
    ttftMs,
    latencyMs,
    lastHotkey,
    isStealth,
    isClickThrough,
    listenMode,
    sttLanguage,
    error,
    isAuthenticated,
    user,
    plan,
    deviceCode,
    connectionLatencyMs,
    isCapturing,
    radarReady,

    // Actions
    startCapture,
    stopCapture,
    restartCapture,
    switchListenMode,
    switchSttLanguage,
    triggerAnswer,
    clearSession,
    setOpacity,
    toggleStealth,
    toggleCursorClickThrough,
    alignWebcam,
    triggerPanicHide,
    exportDebrief,
    clearRadarReady,
    consumeRadar,
    setVisionRadarEnabled,
  };
}
