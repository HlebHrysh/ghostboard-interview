/**
 * HUD session hook: native event stream -> session store (reducer), plus every "ask" path.
 *
 * Performance notes
 *  - audio levels never touch React state (see hudBus / VuMeter);
 *  - token chunks are coalesced to one reducer dispatch per animation frame, so a 60 tok/s stream
 *    costs at most 60 renders/s of a single memoized answer card (message rows do not re-render).
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { HudEvent, SttConnectionStatus } from '../types/hud';
import { subscribeHudEvents, injectHudEvent } from '../lib/hudBus';
import {
  initialSession,
  nextLocalId,
  sessionReducer,
  type AnswerSource,
  type ChatMessage,
  type SessionAction,
  type SessionState,
} from '../lib/session';
import { buildAnswerPayload, streamAnswer, type AnswerRequest, type DirectorModifier } from '../lib/answerStream';
import { isTauriEnvironment, streamAiAnswer, clearSession as nativeClearSession } from '../lib/tauriBridge';
import { runDemoInterview, type DemoHandle } from '../lib/demoInterview';
import { analyzeScreen } from '../lib/screenshotAnswer';
import type { DesktopSettings } from '../lib/desktopSettings';
import type { CandidateProfile } from '../lib/profileStore';

export interface SttStatus {
  status: SttConnectionStatus | 'idle';
  attempt?: number;
  message?: string | null;
}

export interface AskOptions {
  messageId?: string | null;
  modifier?: DirectorModifier;
  source?: AnswerSource;
}

export interface UseCopilotSessionOptions {
  settings: DesktopSettings;
  /** Latest candidate profile (read lazily so edits apply without re-subscribing). */
  getProfile: () => CandidateProfile | null;
  onHotkey?: (action: string) => void;
}

const FRAME_FALLBACK_MS = 48;

export function useCopilotSession({ settings, getProfile, onHotkey }: UseCopilotSessionOptions) {
  const [state, dispatch] = useReducer(sessionReducer, initialSession);
  const stateRef = useRef<SessionState>(state);
  stateRef.current = state;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const getProfileRef = useRef(getProfile);
  getProfileRef.current = getProfile;
  const onHotkeyRef = useRef(onHotkey);
  onHotkeyRef.current = onHotkey;

  const [stt, setStt] = useState<SttStatus>({ status: 'idle' });
  const [isSpeech, setIsSpeech] = useState(false);
  const [clickThrough, setClickThrough] = useState(false);
  const [nativeError, setNativeError] = useState<{ code: string; message: string } | null>(null);
  const [screenBusy, setScreenBusy] = useState(false);

  // ---- chunk coalescing -------------------------------------------------------------------
  const chunkBuf = useRef(new Map<string, string>());
  const chunkTimer = useRef<{ raf: number; timeout: ReturnType<typeof setTimeout> } | null>(null);

  const flushChunks = useCallback(() => {
    const t = chunkTimer.current;
    if (t) {
      cancelAnimationFrame(t.raf);
      clearTimeout(t.timeout);
      chunkTimer.current = null;
    }
    if (chunkBuf.current.size === 0) return;
    const ts = Date.now();
    chunkBuf.current.forEach((token, id) => dispatch({ type: 'chunk', id, token, ts }));
    chunkBuf.current.clear();
  }, []);

  const queueChunk = useCallback(
    (id: string, token: string) => {
      chunkBuf.current.set(id, (chunkBuf.current.get(id) ?? '') + token);
      if (chunkTimer.current) return;
      chunkTimer.current = {
        raf: requestAnimationFrame(flushChunks),
        timeout: setTimeout(flushChunks, FRAME_FALLBACK_MS),
      };
    },
    [flushChunks]
  );

  // ---- native event handling --------------------------------------------------------------
  const handleEvent = useCallback(
    (event: HudEvent) => {
      switch (event.type) {
        case 'sttTranscript': {
          const p = event.payload;
          flushChunks();
          dispatch({
            type: 'transcript',
            speaker: p.speaker === 'candidate' ? 'candidate' : 'interviewer',
            text: p.text || '',
            isFinal: Boolean(p.is_final ?? p.isFinal),
            ts: Date.now(),
          });
          break;
        }
        case 'questionDetected': {
          flushChunks();
          const p = event.payload;
          dispatch({
            type: 'question',
            id: p.id || p.questionId || nextLocalId('q'),
            text: p.question || p.text || '',
            ts: Date.now(),
          });
          setNativeError(null);
          break;
        }
        case 'llmChunk':
        case 'aiChunk': {
          const p = event.payload;
          const id = p.question_id || p.questionId;
          const token = p.token || p.delta || p.chunk || '';
          if (id && token) queueChunk(id, token);
          break;
        }
        case 'llmDone':
        case 'aiDone': {
          flushChunks();
          const p = event.payload;
          const id = p.question_id || p.questionId;
          if (id) {
            dispatch({
              type: 'done',
              id,
              full: p.full_text,
              latencyMs: p.latency_ms ?? p.durationMs,
              ts: Date.now(),
            });
          }
          break;
        }
        case 'hotkeyTriggered':
          onHotkeyRef.current?.(event.payload.action);
          break;
        case 'clickThroughChanged':
          setClickThrough(event.payload.enabled);
          break;
        case 'vadState':
          setIsSpeech(Boolean(event.payload.is_speech ?? event.payload.isSpeaking));
          break;
        case 'sttStatus': {
          const p = event.payload;
          setStt({ status: (p.status as SttConnectionStatus) || 'connected', attempt: p.attempt, message: p.message });
          if (p.status === 'connected') setNativeError((prev) => (prev?.code === 'AUDIO_PIPELINE_ERROR' ? null : prev));
          break;
        }
        case 'error': {
          flushChunks();
          setNativeError(event.payload);
          dispatch({ type: 'fail', message: event.payload.message });
          if (event.payload.code === 'AUDIO_PIPELINE_ERROR') {
            setStt({ status: 'failed', message: event.payload.message });
          }
          break;
        }
        default:
          break;
      }
    },
    [flushChunks, queueChunk]
  );

  useEffect(() => {
    const off = subscribeHudEvents(handleEvent);
    return () => {
      off();
      flushChunks();
    };
  }, [handleEvent, flushChunks]);

  // ---- asking the AI -----------------------------------------------------------------------
  const activeHttp = useRef<{ abort: () => void } | null>(null);

  const ask = useCallback(
    (text: string, options: AskOptions = {}) => {
      const question = text.trim();
      if (!question) return;
      flushChunks();
      const cfg = settingsRef.current;
      const answerId = nextLocalId('ask');
      const modifier = options.modifier ?? 'normal';
      dispatch({
        type: 'ask',
        answerId,
        messageId: options.messageId ?? null,
        text: question,
        modifier,
        source: options.source ?? 'manual',
        ts: Date.now(),
      });
      setNativeError(null);

      const history = stateRef.current.messages
        .filter((m) => m.speaker !== 'manual')
        .slice(-6)
        .map((m) => ({ speaker: m.speaker === 'candidate' ? ('candidate' as const) : ('interviewer' as const), text: m.text }));

      const req: AnswerRequest = {
        question,
        modifier,
        speed: cfg.answerSpeed,
        length: cfg.answerLength,
        language: cfg.hintLanguage,
        customInstructions: cfg.customInstructions,
        profile: getProfileRef.current(),
        history,
      };

      activeHttp.current?.abort();
      activeHttp.current = null;

      if (isTauriEnvironment()) {
        // Native path: Rust streams `questionDetected` / `llmChunk` / `llmDone` events that the
        // listener above maps onto the placeholder created by the `ask` action.
        const payload = buildAnswerPayload(req);
        streamAiAnswer(payload.question, {
          outputLanguage: payload.outputLanguage,
          helperLanguage: payload.helperLanguage,
          modifier: payload.directorModifier,
          candidateProfile: payload.candidateProfile,
          history: payload.history,
        })
          .then((full) => {
            flushChunks();
            if (!full || !full.trim()) {
              dispatch({ type: 'fail', id: answerId, message: 'ШІ повернув порожню відповідь. Перевірте ключ GEMINI_API_KEY.' });
            } else {
              dispatch({ type: 'done', id: answerId, full, ts: Date.now() });
            }
          })
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Помилка виклику ШІ';
            dispatch({ type: 'fail', id: answerId, message });
          });
        return;
      }

      // Browser / dev fallback: HTTP SSE straight into the same store.
      let raw = '';
      activeHttp.current = streamAnswer(req, {
        onToken: (delta) => {
          if (!delta) return;
          raw += delta;
          queueChunk(answerId, delta);
        },
        onDone: (info) => {
          flushChunks();
          dispatch({ type: 'done', id: answerId, full: raw || info.text, latencyMs: info.totalMs, ts: Date.now() });
          activeHttp.current = null;
        },
        onError: (message) => {
          flushChunks();
          dispatch({ type: 'fail', id: answerId, message });
          activeHttp.current = null;
        },
      });
    },
    [flushChunks, queueChunk]
  );

  /** Click on a dialogue message: jump to its answer, or generate one if it has none yet. */
  const activateMessage = useCallback(
    (message: ChatMessage) => {
      const current = stateRef.current;
      if (message.answerId && current.answers.some((a) => a.id === message.answerId)) {
        dispatch({ type: 'select', answerId: message.answerId });
        return;
      }
      ask(message.text, { messageId: message.id, source: 'manual' });
    },
    [ask]
  );

  const selectAnswer = useCallback((answerId: string | null) => dispatch({ type: 'select', answerId }), []);
  const togglePause = useCallback(() => dispatch({ type: 'togglePause' }), []);

  const clear = useCallback(() => {
    activeHttp.current?.abort();
    activeHttp.current = null;
    chunkBuf.current.clear();
    dispatch({ type: 'clear' });
    void nativeClearSession();
  }, []);

  // ---- screenshot (OCR / vision) -----------------------------------------------------------
  const screenAbort = useRef<AbortController | null>(null);
  const captureAndAnalyze = useCallback(async () => {
    if (screenBusy) return;
    setScreenBusy(true);
    screenAbort.current?.abort();
    const controller = new AbortController();
    screenAbort.current = controller;
    const answerId = nextLocalId('screen');
    dispatch({
      type: 'ask',
      answerId,
      messageId: null,
      text: '📸 Аналіз екрана…',
      modifier: null,
      source: 'screen',
      ts: Date.now(),
    });
    try {
      const result = await analyzeScreen(getProfileRef.current(), controller.signal);
      const words = result.text.split(/(\s+)/);
      let acc = '';
      for (let i = 0; i < words.length; i += 6) {
        if (controller.signal.aborted) return;
        acc += words.slice(i, i + 6).join('');
        queueChunk(answerId, words.slice(i, i + 6).join(''));
        await new Promise((r) => setTimeout(r, 16));
      }
      flushChunks();
      dispatch({ type: 'done', id: answerId, full: acc, ts: Date.now() });
    } catch (err) {
      if (controller.signal.aborted) return;
      flushChunks();
      dispatch({
        type: 'fail',
        id: answerId,
        message: err instanceof Error ? err.message : 'Не вдалося проаналізувати екран',
      });
    } finally {
      setScreenBusy(false);
    }
  }, [screenBusy, queueChunk, flushChunks]);

  // ---- demo ---------------------------------------------------------------------------------
  const demoRef = useRef<DemoHandle | null>(null);
  const runDemo = useCallback(() => {
    demoRef.current?.cancel();
    dispatch({ type: 'clear' });
    // Same code path as native events: through the bus so every listener (levels included) sees it.
    demoRef.current = runDemoInterview((ev) => injectHudEvent(ev));
  }, []);

  useEffect(
    () => () => {
      demoRef.current?.cancel();
      activeHttp.current?.abort();
      screenAbort.current?.abort();
    },
    []
  );

  const togglePillar = useCallback((answerId: string, pillarIndex: number) => {
    dispatch({ type: 'togglePillar', answerId, pillarIndex });
  }, []);

  const setLineExplanation = useCallback((answerId: string, lineIndex: number, explanation: string) => {
    dispatch({ type: 'setLineExplanation', answerId, lineIndex, explanation });
  }, []);

  return useMemo(
    () => ({
      state,
      stt,
      isSpeech,
      clickThrough,
      setClickThrough,
      nativeError,
      clearNativeError: () => setNativeError(null),
      screenBusy,
      ask,
      activateMessage,
      selectAnswer,
      togglePause,
      clear,
      captureAndAnalyze,
      runDemo,
      togglePillar,
      setLineExplanation,
      dispatch: dispatch as (a: SessionAction) => void,
    }),
    [state, stt, isSpeech, clickThrough, nativeError, screenBusy, ask, activateMessage, selectAnswer, togglePause, clear, captureAndAnalyze, runDemo, togglePillar, setLineExplanation]
  );
}
