import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Code2,
  Copy,
  Check,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  X,
  Send,
  Camera,
  MessageSquare,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Move,
  RefreshCw,
  Terminal,
  Volume2,
  Mic,
  AlertTriangle,
} from 'lucide-react';
import { useDesktopSettings, saveSettings, type DesktopSettings } from '../lib/desktopSettings';
import { streamAnswer, type AnswerStreamHandle, type DirectorModifier } from '../lib/answerStream';
import { analyzeScreen } from '../lib/screenshotAnswer';
import {
  closeCopilotWindow,
  launchCopilotWindow,
  panicHide,
  toggleClickThrough,
  setScreenShareStealth,
  setWindowOpacity,
  listenTauriEvent,
  isTauriEnvironment,
} from '../lib/tauriBridge';
import { useHudStream } from '../hooks/useHudStream';
import { useSampledLevel } from '../hooks/useSampledLevel';
import { AudioWaveEqualizer } from './AudioWaveEqualizer';
import { loadStoredProfile } from '../lib/profileStore';
import { parseStreamingMarkdown, renderBilingualPhrase } from './DualColumnChat';
import { DesktopAiLanguageSelector } from './AiLanguageSelector';

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

interface DialogueMessage {
  id: string;
  speaker: 'interlocutor' | 'candidate';
  text: string;
  timestamp: number;
}

export interface HudWindowProps {
  onReturnToOffice?: () => void;
}

export function HudWindow({ onReturnToOffice }: HudWindowProps = {}) {
  const [settings, updateSettings] = useDesktopSettings();

  // Mode: initial from URL query param (?mode=chat | top_bar), falling back to settings
  const [hudMode, setHudMode] = useState<'chat' | 'top_bar'>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    if (m === 'chat' || m === 'top_bar') return m;
    return settings.copilotMode || 'chat';
  });

  const [isFrozen, setIsFrozen] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(settings.clickThrough);
  const [isStealth, setIsStealth] = useState(settings.stealth);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Transcripts & Dialogues: Interlocutor and Candidate speech
  const [dialogueMessages, setDialogueMessages] = useState<DialogueMessage[]>([]);
  const [liveInterim, setLiveInterim] = useState<string>('');
  const [manualInput, setManualInput] = useState('');

interface WebSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
}

interface WebSpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

  // Live audio frame & byte counters for audio activity indicator
  const [audioFrames, setAudioFrames] = useState(0);
  const [audioBytes, setAudioBytes] = useState(0);
  const [isWebSpeechActive, setIsWebSpeechActive] = useState(false);
  const webSpeechRecognitionRef = useRef<WebSpeechRecognitionInstance | null>(null);
  const webSpeechSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AI Stream state
  const [streamingText, setStreamingText] = useState<string>('');
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hudError, setHudError] = useState<{ code: string; message: string } | null>(null);
  const [ttftMs, setTtftMs] = useState<number | null>(null);
  const [totalLatencyMs, setTotalLatencyMs] = useState<number | null>(null);
  const [modelName, setModelName] = useState<string>('Gemini 3.8 Flash / Groq');
  const [activeModifier, setActiveModifier] = useState<DirectorModifier>('normal');
  const [isOcrActive, setIsOcrActive] = useState(false);

  const activeStreamRef = useRef<AnswerStreamHandle | null>(null);
  const candidateProfileRef = useRef(loadStoredProfile());
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const answerScrollRef = useRef<HTMLDivElement>(null);
  const lastFinalTextRef = useRef('');

  // Native Tauri event / audio stream hook
  const hudStream = useHudStream({
    autoConnect: true,
    onQuestionDetected: (question) => {
      if (isFrozen) return;
      setActiveQuestion(question);
      setStreamingText('');
      setHudError(null);
      setIsGenerating(true);
    },
    onHotkey: (action) => {
      if (action === 'freeze') {
        setIsFrozen((prev) => !prev);
      } else if (action === 'screenshot') {
        handleTriggerScreenshot();
      } else if (action === 'click_through') {
        handleToggleClickThrough();
      } else if (action === 'panic') {
        panicHide();
      }
    },
  });

  // Sample real-time audio volume level for live 5-bar equalizer
  const currentRms = useSampledLevel(
    hudStream.levelsRef,
    (l) => Math.max(l.interviewer, l.candidate),
    1,
    60
  );

  // Track live speech (both interlocutor and candidate)
  useEffect(() => {
    if (hudStream.liveTranscript) {
      setLiveInterim(hudStream.liveTranscript);
    }
  }, [hudStream.liveTranscript]);

  // Sync reactive state from native Rust hudStream
  useEffect(() => {
    if (hudStream.streamingAnswer) {
      setStreamingText(hudStream.streamingAnswer);
    }
  }, [hudStream.streamingAnswer]);

  useEffect(() => {
    if (hudStream.currentQuestion) {
      setActiveQuestion(hudStream.currentQuestion);
    }
  }, [hudStream.currentQuestion]);

  useEffect(() => {
    if (hudStream.ttftMs !== null && hudStream.ttftMs !== undefined) {
      setTtftMs(hudStream.ttftMs);
    }
  }, [hudStream.ttftMs]);

  useEffect(() => {
    if (hudStream.latencyMs !== null && hudStream.latencyMs !== undefined) {
      setTotalLatencyMs(hudStream.latencyMs);
    }
  }, [hudStream.latencyMs]);

  useEffect(() => {
    if (hudStream.isStreaming) {
      setIsGenerating(true);
      setHudError(null);
    } else if (!activeStreamRef.current) {
      setIsGenerating(false);
    }
  }, [hudStream.isStreaming]);

  useEffect(() => {
    if (hudStream.error) {
      setHudError(hudStream.error);
      setIsGenerating(false);
    }
  }, [hudStream.error]);

  // Listen to Tauri events for live mode changes and external hotkeys
  useEffect(() => {
    const unlistenMode = listenTauriEvent<string>('hud:set-mode', (modeStr) => {
      if (modeStr === 'chat' || modeStr === 'top_bar') {
        setHudMode(modeStr);
      }
    });

    const unlistenSettings = listenTauriEvent<Partial<DesktopSettings>>('settings:updated', (newSettings) => {
      if (newSettings?.copilotMode && (newSettings.copilotMode === 'chat' || newSettings.copilotMode === 'top_bar')) {
        setHudMode(newSettings.copilotMode);
      }
    });

    return () => {
      unlistenMode();
      unlistenSettings();
    };
  }, []);

  // Update window opacity on mount / settings change
  useEffect(() => {
    if (settings.hudOpacity !== undefined) {
      setWindowOpacity(settings.hudOpacity).catch(() => {});
    }
  }, [settings.hudOpacity]);

  // Auto-scroll chat & answer when new tokens arrive
  useEffect(() => {
    if (answerScrollRef.current) {
      answerScrollRef.current.scrollTop = answerScrollRef.current.scrollHeight;
    }
  }, [streamingText]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [dialogueMessages, liveInterim]);

  // Trigger token-by-token answer generation (manual prompt, modifiers, test)
  const handleTriggerAi = useCallback(
    async (questionText: string, modifier: DirectorModifier = 'normal') => {
      if (!questionText.trim()) return;

      // Abort active HTTP stream if any
      if (activeStreamRef.current) {
        activeStreamRef.current.abort();
        activeStreamRef.current = null;
      }

      setActiveQuestion(questionText);
      setActiveModifier(modifier);
      setStreamingText('');
      setHudError(null);
      setTtftMs(null);
      setTotalLatencyMs(null);
      setIsGenerating(true);

      const historyContext = dialogueMessages.slice(-6).map((m) => ({
        speaker: m.speaker === 'candidate' ? ('candidate' as const) : ('interviewer' as const),
        text: m.text,
      }));

      try {
        const handle = streamAnswer(
          {
            question: questionText,
            modifier,
            speed: settings.answerSpeed,
            length: settings.answerLength,
            language: settings.hintLanguage,
            customInstructions: settings.customInstructions,
            profile: candidateProfileRef.current,
            history: historyContext,
          },
          {
            onToken: (_delta, cleanedText) => {
              if (isFrozen) return;
              setStreamingText(cleanedText);
            },
            onFirstToken: (ttft) => {
              setTtftMs(ttft);
            },
            onDone: (info) => {
              setIsGenerating(false);
              activeStreamRef.current = null;
              setTotalLatencyMs(info.totalMs);
              if (info.model) setModelName(info.model);
            },
            onError: (err) => {
              setIsGenerating(false);
              activeStreamRef.current = null;
              setHudError({ code: 'STREAM_ERROR', message: err });
            },
          }
        );
        activeStreamRef.current = handle;
      } catch (err: unknown) {
        setIsGenerating(false);
        activeStreamRef.current = null;
        const msg = err instanceof Error ? err.message : String(err);
        setHudError({ code: 'INVOKE_ERROR', message: msg || 'Помилка виклику ШІ' });
      }
    },
    [dialogueMessages, isFrozen, settings]
  );

  // Instant AI Pipeline self-test
  const handleRunAiTest = useCallback(() => {
    const testQuestion = 'Як влаштовані B-Tree індекси в PostgreSQL і коли вони неефективні?';
    setDialogueMessages((prev) => [
      ...prev,
      {
        id: `test-${Date.now()}`,
        speaker: 'interlocutor',
        text: testQuestion,
        timestamp: Date.now(),
      },
    ]);
    handleTriggerAi(testQuestion, 'normal');
  }, [handleTriggerAi]);

  // Clean close helper returning to Office if embedded or closing window
  const handleClose = useCallback(() => {
    if (onReturnToOffice) {
      onReturnToOffice();
    }
    closeCopilotWindow().catch(() => {});
  }, [onReturnToOffice]);

  // Format audio data metrics
  const formatAudioBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const audioSourceLabel = isWebSpeechActive
    ? isTauriEnvironment() && hudStream.sttStatus.status === 'connected'
      ? '🎙️ PipeWire + Web Speech API'
      : '🎙️ Web Speech (Мікрофон)'
    : hudStream.listenMode === 'all'
    ? '🎙️ PipeWire (Стерео Loopback + Мік)'
    : '🎙️ PipeWire (Системний Loopback)';

  // Increment live audio frame & byte metrics whenever sound or speech is detected
  useEffect(() => {
    if (currentRms > 0 || hudStream.isSpeech) {
      setAudioFrames((f) => f + 1);
      setAudioBytes((b) => b + 320); // ~320 bytes per 10ms PCM frame @ 16kHz
    }
  }, [currentRms, hudStream.isSpeech]);

  // 100% reliable backup SpeechRecognition loop (Web Speech API)
  // Activates if Deepgram does not connect within 2s, or in browser/mock mode, or on STT error.
  useEffect(() => {
    let recognition: WebSpeechRecognitionInstance | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const startWebSpeech = () => {
      if (typeof window === 'undefined') return;
      const win = window as unknown as {
        SpeechRecognition?: new () => WebSpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => WebSpeechRecognitionInstance;
      };
      const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[HudWindow] Web Speech API not supported in this environment');
        return;
      }
      if (webSpeechRecognitionRef.current) return;

      try {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang =
          settings.hintLanguage === 'en'
            ? 'en-US'
            : settings.hintLanguage === 'ru'
            ? 'ru-RU'
            : 'uk-UA';

        recognition.onstart = () => {
          setIsWebSpeechActive(true);
        };

        recognition.onresult = (event: WebSpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }

          const currentText = interimTranscript || finalTranscript;
          if (currentText.trim()) {
            setLiveInterim(currentText.trim());
            setAudioFrames((f) => f + 2);
            setAudioBytes((b) => b + 640);

            // Silence pause trigger: after 1.2s silence following speech, commit to dialogue and trigger AI
            if (webSpeechSilenceTimerRef.current) {
              clearTimeout(webSpeechSilenceTimerRef.current);
            }
            webSpeechSilenceTimerRef.current = setTimeout(() => {
              const fullSpeech = (finalTranscript || interimTranscript).trim();
              if (fullSpeech && fullSpeech.length > 5) {
                setDialogueMessages((prev) => [
                  ...prev,
                  {
                    id: `web-speech-${Date.now()}`,
                    speaker: 'interlocutor',
                    text: fullSpeech,
                    timestamp: Date.now(),
                  },
                ]);
                setLiveInterim('');
                handleTriggerAi(fullSpeech, 'normal');
              }
            }, 1200);
          }
        };

        recognition.onerror = (err: { error: string }) => {
          if (err.error !== 'no-speech') {
            console.warn('[HudWindow] Web Speech error:', err);
          }
        };

        recognition.onend = () => {
          // Keep listening while HUD is active if native Deepgram is not connected
          if (hudStream.sttStatus.status !== 'connected' || !isTauriEnvironment()) {
            try {
              recognition?.start();
            } catch {}
          } else {
            setIsWebSpeechActive(false);
          }
        };

        recognition.start();
        webSpeechRecognitionRef.current = recognition;
      } catch (e) {
        console.warn('[HudWindow] Failed to initialize Web Speech API:', e);
      }
    };

    // Check after 2000ms if native Deepgram is connected; if not, activate Web Speech fallback
    fallbackTimer = setTimeout(() => {
      if (
        hudStream.sttStatus.status !== 'connected' ||
        !isTauriEnvironment() ||
        hudStream.error?.code === 'AUDIO_PIPELINE_ERROR'
      ) {
        startWebSpeech();
      }
    }, 2000);

    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (webSpeechSilenceTimerRef.current) clearTimeout(webSpeechSilenceTimerRef.current);
      if (webSpeechRecognitionRef.current) {
        try {
          webSpeechRecognitionRef.current.stop();
        } catch {}
        webSpeechRecognitionRef.current = null;
      }
    };
  }, [hudStream.sttStatus.status, hudStream.error, settings.hintLanguage, handleTriggerAi]);

  // When speech ends (>350ms silence / speech boundary), commit to dialogue list
  useEffect(() => {
    if (!hudStream.isSpeech && liveInterim.trim().length > 0) {
      const text = liveInterim.trim();
      if (text !== lastFinalTextRef.current) {
        lastFinalTextRef.current = text;
        const speaker = (hudStream.activeSpeaker === 'candidate' ? 'candidate' : 'interlocutor') as 'candidate' | 'interlocutor';
        setDialogueMessages((prev) => [
          ...prev.slice(-30),
          {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            speaker,
            text,
            timestamp: Date.now(),
          },
        ]);
        setLiveInterim('');

        // In pure browser/mock mode (non-Tauri), auto-trigger answer on speech pause.
        // In Tauri desktop, native SpeechTracker handles LLM streaming directly without duplicate requests.
        if (!isTauriEnvironment() && !isGenerating && !isFrozen && text.length > 8) {
          handleTriggerAi(text, 'normal');
        }
      }
    }
  }, [hudStream.isSpeech, liveInterim, hudStream.activeSpeaker, isGenerating, isFrozen, handleTriggerAi]);

  // Trigger Vision OCR Screenshot analysis
  const handleTriggerScreenshot = useCallback(async () => {
    if (isOcrActive || isFrozen) return;
    setIsOcrActive(true);
    setStreamingText('📸 Робимо знімок екрана та аналізуємо завдання...');
    setIsGenerating(true);

    try {
      const res = await analyzeScreen(candidateProfileRef.current);
      setActiveQuestion(res.title);
      setStreamingText(res.text);
      setModelName('Vision OCR');
      setTtftMs(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStreamingText(`[Помилка скріншоту: ${msg || 'Не вдалося захопити екран'}]`);
    } finally {
      setIsOcrActive(false);
      setIsGenerating(false);
    }
  }, [isFrozen, isOcrActive]);

  // Mode switch: changes size, geometry, and Hyprland/Tauri positioning
  const handleSwitchMode = useCallback(
    async (targetMode: 'chat' | 'top_bar') => {
      setHudMode(targetMode);
      updateSettings({ copilotMode: targetMode });
      try {
        await launchCopilotWindow(targetMode);
      } catch (e) {
        console.warn('Mode switch window resize error:', e);
      }
    },
    [updateSettings]
  );

  const handleToggleFreeze = useCallback(() => {
    setIsFrozen((prev) => !prev);
  }, []);

  const handleToggleClickThrough = useCallback(async () => {
    const nextVal = !isClickThrough;
    setIsClickThrough(nextVal);
    updateSettings({ clickThrough: nextVal });
    await toggleClickThrough(nextVal).catch(() => {});
  }, [isClickThrough, updateSettings]);

  const handleToggleStealth = useCallback(async () => {
    const nextVal = !isStealth;
    setIsStealth(nextVal);
    updateSettings({ stealth: nextVal });
    await setScreenShareStealth(nextVal).catch(() => {});
  }, [isStealth, updateSettings]);

  const handleManualSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!manualInput.trim()) return;

      const q = manualInput.trim();
      setDialogueMessages((prev) => [
        ...prev,
        { id: `manual-${Date.now()}`, speaker: 'interlocutor', text: q, timestamp: Date.now() },
      ]);
      setManualInput('');
      handleTriggerAi(q, 'normal');
    },
    [manualInput, handleTriggerAi]
  );

  const handleClearSession = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort();
      activeStreamRef.current = null;
    }
    setDialogueMessages([]);
    setLiveInterim('');
    setStreamingText('');
    setActiveQuestion('');
    setHudError(null);
    setTtftMs(null);
    setTotalLatencyMs(null);
    hudStream.clearSession().catch(() => {});
  }, [hudStream]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Keyboard Shortcuts in HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleFreeze();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleSwitchMode(hudMode === 'chat' ? 'top_bar' : 'chat');
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleTriggerScreenshot();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        handleToggleClickThrough();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        panicHide().catch(() => {});
      } else if (e.key === 'F12') {
        e.preventDefault();
        panicHide().catch(() => {});
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleFreeze, handleSwitchMode, handleTriggerScreenshot, handleToggleClickThrough, handleClose, hudMode]);

  // Font size mapping from settings
  const fontSizeClass =
    typeof settings.hudFontSize === 'number'
      ? settings.hudFontSize <= 13
        ? 'text-xs'
        : settings.hudFontSize <= 15
        ? 'text-sm'
        : settings.hudFontSize <= 18
        ? 'text-base'
        : 'text-lg'
      : 'text-sm';

  const parsedSections = parseStreamingMarkdown(streamingText, isGenerating);

  const effectiveError =
    hudError ||
    (streamingText.startsWith('[Помилка')
      ? {
          code: 'AI_ERROR',
          message:
            streamingText.replace(/^\[Помилка[^:]*:\s*/, '').replace(/\]$/, '') || streamingText,
        }
      : null);

  // =========================================================================
  // RENDER: TOP BAR (NOTCH) MODE (680x150, flush under webcam)
  // =========================================================================
  if (hudMode === 'top_bar') {
    return (
      <div
        className="w-full h-full select-none flex flex-col justify-between overflow-hidden rounded-b-xl border border-white/10 bg-[#09090b]/95 text-zinc-100 shadow-[0_16px_40px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/[0.04] p-3"
        style={{ opacity: settings.hudOpacity ?? 0.95 }}
      >
        {/* Header row: drag region + controls */}
        <div className="flex items-center justify-between gap-2 drag-region pb-1.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-bold">
              Ghostboard HUD
            </span>
            <AudioWaveEqualizer level={currentRms} />
            <button
              onClick={() => hudStream.switchListenMode(hudStream.listenMode === 'all' ? 'system_only' : 'all')}
              title={hudStream.listenMode === 'all' ? 'Слухати: Системний звук + Мікрофон' : 'Тільки Системний звук'}
              className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 border transition no-drag ${
                hudStream.listenMode === 'all'
                  ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {hudStream.listenMode === 'all' ? (
                <>
                  <Mic className="w-3 h-3 text-emerald-400" />
                  <span>Всі</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3 text-zinc-400" />
                  <span>Звук</span>
                </>
              )}
            </button>
            {ttftMs !== null && (
              <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-md">
                ⚡ {ttftMs}ms
              </span>
            )}
            {isFrozen && (
              <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded-md">
                ⏸ FROZEN
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 no-drag">
            <button
              onClick={handleRunAiTest}
              disabled={isGenerating}
              title="Запустити тест генерації відповіді ШІ"
              className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 hover:bg-emerald-900 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40 shadow-sm cursor-pointer"
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Тест ШІ</span>
            </button>
            <button
              onClick={() => handleSwitchMode('chat')}
              title="Розгорнути у повний чат (Ctrl+M)"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleFreeze}
              title={isFrozen ? 'Розморозити (Space)' : 'Заморозити екран (Space)'}
              className={`p-1.5 rounded-md transition cursor-pointer ${isFrozen ? 'text-amber-400 bg-amber-950/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleTriggerScreenshot}
              disabled={isOcrActive}
              title="Скріншот екрана (Ctrl+Shift+S)"
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            {onReturnToOffice && (
              <button
                onClick={handleClose}
                title="Повернутися в Офіс"
                className="px-2 py-1 rounded text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <span>← Офіс</span>
              </button>
            )}
            <button
              onClick={handleClose}
              title="Закрити копайлот (Esc)"
              className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Line 1: Speech preview (Interlocutor or Candidate) */}
        <div className="py-1 px-2 my-1 text-xs text-zinc-200 font-mono truncate flex items-center gap-2 bg-zinc-900/60 rounded-md border border-zinc-800/80">
          <div className="flex items-center gap-1 shrink-0 font-bold">
            {hudStream.activeSpeaker === 'candidate' ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                <Mic className="w-3 h-3 text-emerald-400" /> Ви:
              </span>
            ) : (
              <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40 text-[11px]">
                <Volume2 className="w-3 h-3 text-cyan-400" /> Співрозмовник:
              </span>
            )}
          </div>
          <span className="text-white font-medium truncate flex-1">
            {liveInterim || (dialogueMessages.length > 0 ? dialogueMessages[dialogueMessages.length - 1].text : 'Очікування запитання...')}
          </span>
        </div>

        {/* Line 2: AI Live Suggestion or Error Card */}
        <div
          ref={answerScrollRef}
          className={`flex-1 overflow-y-auto px-1.5 leading-relaxed select-text font-medium text-white ${fontSizeClass}`}
        >
          {effectiveError ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-rose-950/60 border border-rose-800/70 text-rose-200 text-xs">
              <div className="flex items-center gap-2 truncate">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                <span className="truncate font-semibold">{effectiveError.message}</span>
              </div>
              <button
                onClick={() => handleTriggerAi(activeQuestion || 'Як влаштовані B-Tree індекси в PostgreSQL?')}
                className="px-2.5 py-1 rounded-md bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-xs font-mono shrink-0 transition text-white font-semibold cursor-pointer"
              >
                Повторити
              </button>
            </div>
          ) : streamingText ? (
            <div className="text-white text-[16px] leading-relaxed tracking-tight font-sans font-medium">
              {renderBilingualPhrase(streamingText)}
              {isGenerating && <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse align-middle" />}
            </div>
          ) : (
            <span className="text-zinc-400 italic font-normal text-xs sm:text-sm">
              ШІ-підказка з'явиться тут миттєво під час мовлення...
            </span>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: CHAT MODE (780x460, Two Columns)
  // =========================================================================
  return (
    <div
      className="w-full h-full select-none flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/95 text-zinc-100 shadow-[0_20px_50px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/[0.04]"
      style={{ opacity: settings.hudOpacity ?? 0.95 }}
    >
      {/* 1. TOP HEADER / TITLEBAR */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 drag-region bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-200">
            Ghostboard Copilot
          </span>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md font-medium">
            {modelName}
          </span>
          {/* Live 5-bar Equalizer */}
          <AudioWaveEqualizer level={currentRms} />
          {/* 1-click Listen Mode Toggle */}
          <button
            onClick={() => hudStream.switchListenMode(hudStream.listenMode === 'all' ? 'system_only' : 'all')}
            title={hudStream.listenMode === 'all' ? 'Слухати: Системний звук + Мікрофон' : 'Тільки Системний звук (відфільтровувати мікрофон)'}
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium flex items-center gap-1.5 border transition no-drag ${
              hudStream.listenMode === 'all'
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
            }`}
          >
            {hudStream.listenMode === 'all' ? (
              <>
                <Mic className="w-3 h-3 text-emerald-400" />
                <span>Звук + Мік</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3 text-zinc-400" />
                <span>Тільки Звук</span>
              </>
            )}
          </button>
          {ttftMs !== null && (
            <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-md">
              ⚡ TTFT {ttftMs}ms
            </span>
          )}
          {isFrozen && (
            <span className="text-xs font-mono font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded-md">
              ⏸ FROZEN
            </span>
          )}
        </div>

        {/* Window action icons & Language Selector */}
        <div className="flex items-center gap-1.5 no-drag">
          <button
            onClick={handleRunAiTest}
            disabled={isGenerating}
            title="Запустити тестовий запит до ШІ"
            className="px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-emerald-950/80 border border-emerald-600/70 text-emerald-300 hover:bg-emerald-900 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40 mr-1 shadow-sm cursor-pointer"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Тест ШІ</span>
          </button>
          <DesktopAiLanguageSelector
            value={settings.hintLanguage || 'auto'}
            onChange={(lang) => {
              updateSettings({ hintLanguage: lang });
            }}
          />
          <button
            onClick={() => handleSwitchMode('top_bar')}
            title="Згорнути у суфлер (Ctrl+M)"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleFreeze}
            title={isFrozen ? 'Розморозити (Space)' : 'Заморозити оновлення (Space)'}
            className={`p-1.5 rounded-md transition ${
              isFrozen ? 'text-amber-400 bg-amber-950/60' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80'
            }`}
          >
            {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleToggleStealth}
            title={isStealth ? 'Стелс увімкнено (приховано від шерингу екрана)' : 'Стелс вимкнено'}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
          >
            {isStealth ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleToggleClickThrough}
            title={isClickThrough ? 'Клік-наскрізь увімкнено' : 'Клік-наскрізь вимкнено'}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition"
          >
            {isClickThrough ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5" />}
          </button>
          {onReturnToOffice && (
            <button
              onClick={handleClose}
              title="Повернутися в Офіс"
              className="px-2 py-1 rounded text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer mr-1"
            >
              <span>← Офіс</span>
            </button>
          )}
          <button
            onClick={handleClose}
            title="Закрити копайлот і повернутися в Офіс (Esc)"
            className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800/80 transition ml-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN DISPLAY */}
      <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-zinc-800/80">
        {/* LEFT COLUMN: LIVE SPEECH ONLY */}
        <div className="w-1/2 flex flex-col min-h-0 p-3 bg-zinc-950/30">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span className={`w-2 h-2 rounded-full shrink-0 ${currentRms > 5 || hudStream.isSpeech ? 'bg-emerald-400 animate-ping' : 'bg-emerald-600'}`} />
              <span className="text-xs font-medium text-zinc-200 truncate">
                {audioSourceLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 shrink-0">
              <span className="bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400">
                {audioFrames} фр. ({formatAudioBytes(audioBytes)})
              </span>
            </div>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto pt-2 space-y-2.5 pr-1 text-xs select-text">
            {dialogueMessages.length === 0 && !liveInterim ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 text-zinc-500">
                <MessageSquare className="w-8 h-8 stroke-1 mb-2 text-zinc-600" />
                <p className="font-medium text-zinc-400">Очікування мовлення</p>
                <p className="text-[11px] mt-1 text-zinc-500 leading-relaxed">
                  Говоріть у мікрофон або слухайте запитання з конференції (Google Meet, Zoom, Teams). Мова розпізнається миттєво.
                </p>
              </div>
            ) : (
              <>
                {dialogueMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl border ${
                      msg.speaker === 'candidate'
                        ? 'bg-zinc-900/40 border-zinc-800 text-zinc-200 ml-3'
                        : 'bg-zinc-900/80 border-cyan-500/30 text-white mr-3 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5 text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-bold">
                        {msg.speaker === 'candidate' ? (
                          <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50 flex items-center gap-1 text-[11px]">
                            <Mic className="w-3 h-3 text-emerald-400" /> Ви
                          </span>
                        ) : (
                          <span className="text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50 flex items-center gap-1 text-[11px]">
                            <Volume2 className="w-3 h-3 text-cyan-400" /> Інтерв'юер
                          </span>
                        )}
                      </span>
                      <span className="text-zinc-400 text-[11px]">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap text-xs sm:text-sm font-medium text-zinc-100">{msg.text}</p>
                  </div>
                ))}

                {liveInterim && (
                  <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-700 text-zinc-100">
                    <div className="flex items-center gap-2 mb-1.5 text-xs font-mono text-zinc-300">
                      {hudStream.activeSpeaker === 'candidate' ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[11px]">
                          <Mic className="w-3 h-3" /> Ви
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-cyan-300 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 text-[11px]">
                          <Volume2 className="w-3 h-3" /> Інтерв'юер
                        </span>
                      )}
                      <span className="text-zinc-400 text-xs">Слухаю...</span>
                    </div>
                    <p className="leading-relaxed italic text-xs sm:text-sm text-zinc-200">
                      {liveInterim}
                      <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse align-middle" />
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REAL-TIME AI TOKEN STREAM */}
        <div className="w-1/2 flex flex-col min-h-0 p-3 bg-zinc-950/50">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 shrink-0">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-200">ШІ-Підказка</span>
              {activeModifier !== 'normal' && (
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                  {activeModifier}
                </span>
              )}
            </div>

            {streamingText && (
              <button
                onClick={() => handleCopy(streamingText, 'all')}
                className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition"
              >
                {copiedCode === 'all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode === 'all' ? 'Скопійовано' : 'Копіювати'}</span>
              </button>
            )}
          </div>

          <div
            ref={answerScrollRef}
            className={`flex-1 overflow-y-auto pt-2 space-y-2 pr-1 select-text leading-relaxed ${fontSizeClass}`}
          >
            {activeQuestion && (
              <div className="text-[11px] font-mono text-zinc-400 border-l-2 border-zinc-700 pl-2 mb-2 italic">
                {activeQuestion}
              </div>
            )}

            {effectiveError ? (
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-rose-950/40 via-zinc-950/80 to-zinc-950 border border-rose-800/50 text-rose-200 space-y-2.5">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 animate-pulse" />
                  <span>Помилка генерації ({effectiveError.code})</span>
                </div>
                <p className="text-xs text-rose-300/90 leading-relaxed font-mono whitespace-pre-wrap bg-black/60 p-2.5 rounded-lg border border-rose-900/40">
                  {effectiveError.message}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleTriggerAi(activeQuestion || 'Як влаштовані B-Tree індекси в PostgreSQL?')}
                    className="px-3 py-1 rounded-lg bg-rose-900/70 hover:bg-rose-800 border border-rose-700/60 text-xs font-medium text-white transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Спробувати знову</span>
                  </button>
                  <button
                    onClick={handleRunAiTest}
                    className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 transition"
                  >
                    ⚡ Тест ШІ
                  </button>
                </div>
              </div>
            ) : streamingText ? (
              <div className="text-zinc-100 space-y-2">
                {parsedSections.length > 0 ? (
                  parsedSections.map((sec, idx) => {
                    if (sec.type === 'code') {
                      return (
                        <div key={idx} className="my-2 rounded-lg bg-black/80 border border-zinc-800 overflow-hidden">
                          <div className="flex items-center justify-between px-2.5 py-1 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 font-mono">
                            <span>{sec.language || 'code'}</span>
                            <button
                              onClick={() => handleCopy(sec.content, `sec-${idx}`)}
                              className="hover:text-white flex items-center gap-1"
                            >
                              {copiedCode === `sec-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedCode === `sec-${idx}` ? 'Скопійовано' : 'Копія'}</span>
                            </button>
                          </div>
                          <pre className="p-2.5 font-mono text-xs overflow-x-auto text-emerald-400">
                            <code>{sec.content}</code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="whitespace-pre-wrap leading-relaxed text-zinc-100 font-medium text-xs sm:text-sm">
                        {renderBilingualPhrase(sec.content)}
                      </div>
                    );
                  })
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed text-zinc-100 font-medium text-xs sm:text-sm">
                    {renderBilingualPhrase(streamingText)}
                  </div>
                )}
                {isGenerating && <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse align-middle" />}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 text-zinc-500">
                <Terminal className="w-8 h-8 stroke-1 mb-2 text-zinc-600" />
                <p className="font-medium text-zinc-300 text-xs sm:text-sm">Готовий до стримінгу підказок</p>
                <p className="text-xs mt-1 text-zinc-400 leading-relaxed">
                  Відповідь надходитиме потоково токен за токеном без затримок (TTFT &lt; 300мс).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM CONTROLS & MANUAL PROMPT BAR */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col gap-2">
        {/* Quick action buttons / modifiers */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleRunAiTest}
              disabled={isGenerating}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/70 border border-emerald-700/70 text-emerald-300 hover:bg-emerald-900/90 hover:text-white hover:border-emerald-500 transition flex items-center gap-1.5 disabled:opacity-40 shadow-sm cursor-pointer"
              title="⚡ Тест генерації відповіді ШІ"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>⚡ Тест ШІ</span>
            </button>
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Поясни коротко', 'shorter')}
              disabled={isGenerating}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:border-zinc-500 transition shadow-sm cursor-pointer"
              title="⚡ Коротше"
            >
              ⚡ Коротше
            </button>
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Поясни простіше', 'simpler')}
              disabled={isGenerating}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:border-zinc-500 transition shadow-sm cursor-pointer"
              title="💡 Простіше"
            >
              💡 Простіше
            </button>
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Напиши код', 'code')}
              disabled={isGenerating}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:border-zinc-500 transition shadow-sm cursor-pointer"
              title="</> Код"
            >
              &lt;/&gt; Код
            </button>
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Запропонуй інший підхід', 're_angle')}
              disabled={isGenerating}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:border-zinc-500 transition shadow-sm cursor-pointer"
              title="🔄 Інший підхід"
            >
              🔄 Інший підхід
            </button>
            <button
              onClick={handleTriggerScreenshot}
              disabled={isOcrActive}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 border border-zinc-700/80 text-zinc-200 hover:text-white hover:border-zinc-500 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isOcrActive ? 'Аналіз...' : 'Скріншот'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClearSession}
              title="Очистити чат і відповіді"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSwitchMode('top_bar')}
              className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition flex items-center gap-1"
            >
              <span>Згорнути в суфлер</span>
            </button>
          </div>
        </div>

        {/* Manual question input */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Задати питання вручну або уточнити... (Enter)"
            className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
          />
          <button
            type="submit"
            disabled={!manualInput.trim() || isGenerating}
            className="p-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 transition font-medium"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
export default HudWindow;
