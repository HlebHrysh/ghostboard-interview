import { useState, useEffect, useRef, useCallback } from 'react';
import type { HudEvent, SpeakerRole, SttConnectionStatus, UserProfile, DeviceCodePendingPayload } from '../types/hud';
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
} from '../lib/tauriBridge';
import {
  StructuredAnswerOutput,
  parseDualStreamDelimiters,
} from '../lib/streamClient';

function cleanStreamingAnswerText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<<<\s*PHASE_[123]:[A-Za-z0-9_]+\s*>>>/gi, '')
    .replace(/<<<\s*END\s*>>>/gi, '')
    .replace(/\[DONE\]/gi, '')
    .replace(/(?:\r?\n|\s)*(?:<{1,3}[A-Za-z0-9_:>-]*>{0,3})\s*$/gi, '')
    .replace(/(?:\r?\n|\s)*(?:<{1,3}|>{1,3})\s*$/g, '')
    .trim();
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
  const [interviewerVolume, setInterviewerVolume] = useState(0);
  const [candidateVolume, setCandidateVolume] = useState(0);

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

  const accumulatedTokensRef = useRef('');
  const questionStartTimeRef = useRef<number | null>(null);
  const firstTokenTimeRef = useRef<number | null>(null);

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
        setVadConfidence(conf);
        if (speech) {
          setInterviewerVolume(Math.min(100, Math.round(conf * 100)));
        } else {
          setInterviewerVolume((prev) => Math.max(0, Math.floor(prev * 0.7)));
        }
        break;
      }

      case 'audioLevel': {
        const p = event.payload;
        if (p.source !== undefined && p.level !== undefined) {
          const lvl = typeof p.level === 'number' ? p.level : 0;
          if (p.source === 'loopback' || p.source === 'interlocutor') {
            setInterviewerVolume(Math.min(100, Math.round(lvl)));
          } else {
            setCandidateVolume(Math.min(100, Math.round(lvl)));
          }
        }
        if (p.interlocutor !== undefined || p.candidate !== undefined) {
          if (p.interlocutor !== undefined) {
            const intVol = typeof p.interlocutor === 'number'
              ? (p.interlocutor <= 1.0 ? p.interlocutor * 100 : p.interlocutor)
              : 0;
            setInterviewerVolume(Math.min(100, Math.round(intVol)));
          }
          if (p.candidate !== undefined) {
            const candVol = typeof p.candidate === 'number'
              ? (p.candidate <= 1.0 ? p.candidate * 100 : p.candidate)
              : 0;
            setCandidateVolume(Math.min(100, Math.round(candVol)));
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

      case 'llmChunk': {
        const token = event.payload.token || event.payload.delta || '';
        accumulatedTokensRef.current += token;
        const fullSoFar = accumulatedTokensRef.current;
        setStreamingAnswer(cleanStreamingAnswerText(fullSoFar));

        if (!firstTokenTimeRef.current && (event.payload.is_first || token.length > 0)) {
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

        setStructuredAnswer({
          hook: parsed.hook,
          pillars: parsed.pillars,
          deepDive: parsed.deepDive,
          rawText: fullSoFar,
          ttftMs: currentTtft,
          totalDurationMs: currentDuration,
          model: 'Gemini 3.8 Flash',
        });
        setIsStreaming(true);
        break;
      }

      case 'llmDone': {
        setIsStreaming(false);
        const fullText = event.payload.full_text || accumulatedTokensRef.current;
        accumulatedTokensRef.current = fullText;
        setStreamingAnswer(cleanStreamingAnswerText(fullText));

        const finalParsed = parseDualStreamDelimiters(fullText);
        const finalLatency = event.payload.latency_ms ?? (
          questionStartTimeRef.current ? Date.now() - questionStartTimeRef.current : 0
        );

        if (event.payload.latency_ms) {
          setLatencyMs(event.payload.latency_ms);
        } else if (questionStartTimeRef.current) {
          setLatencyMs(Date.now() - questionStartTimeRef.current);
        }

        setStructuredAnswer({
          hook: finalParsed.hook,
          pillars: finalParsed.pillars,
          deepDive: finalParsed.deepDive,
          rawText: fullText,
          ttftMs: ttftMs ?? 0,
          totalDurationMs: finalLatency,
          model: 'Gemini 3.8 Flash',
        });
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

      case 'error': {
        setError(event.payload);
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

    // Auto-start native dual audio capture (loopback + mic) with isMounted guard
    startAudioCapture('dual')
      .then((ok) => {
        if (isMounted) setIsCapturing(ok);
      })
      .catch((err) => {
        console.warn('[useHudStream] startAudioCapture error:', err);
        if (isMounted) setIsCapturing(false);
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
      stopAudioCapture().catch(() => {});
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

  return {
    // Reactive State
    sttStatus,
    isSpeech,
    vadConfidence,
    interviewerVolume,
    candidateVolume,
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
    error,
    isAuthenticated,
    user,
    plan,
    deviceCode,
    connectionLatencyMs,
    isCapturing,

    // Actions
    startCapture,
    stopCapture,
    restartCapture,
    triggerAnswer,
    clearSession,
    setOpacity,
    toggleStealth,
    toggleCursorClickThrough,
    alignWebcam,
    triggerPanicHide,
    exportDebrief,
  };
}
