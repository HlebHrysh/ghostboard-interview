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
} from 'lucide-react';
import { useDesktopSettings, saveSettings } from '../lib/desktopSettings';
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
} from '../lib/tauriBridge';
import { useHudStream } from '../hooks/useHudStream';
import { useSampledLevel } from '../hooks/useSampledLevel';
import { AudioWaveEqualizer } from './AudioWaveEqualizer';
import { loadStoredProfile } from '../lib/profileStore';
import { parseStreamingMarkdown } from './DualColumnChat';
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

export function HudWindow() {
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

  // AI Stream state
  const [streamingText, setStreamingText] = useState<string>('');
  const [activeQuestion, setActiveQuestion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [ttftMs, setTtftMs] = useState<number | null>(null);
  const [totalLatencyMs, setTotalLatencyMs] = useState<number | null>(null);
  const [modelName, setModelName] = useState<string>('Gemini 2.5 Flash');
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
      handleTriggerAi(question, 'normal');
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

        // Auto-trigger answer on speech pause if it looks like a question or prompt
        if (!isGenerating && !isFrozen && text.length > 8) {
          handleTriggerAi(text, 'normal');
        }
      }
    }
  }, [hudStream.isSpeech, liveInterim, hudStream.activeSpeaker, isGenerating, isFrozen]);

  // Listen to Tauri events for live mode changes and external hotkeys
  useEffect(() => {
    const unlistenMode = listenTauriEvent<string>('hud:set-mode', (modeStr) => {
      if (modeStr === 'chat' || modeStr === 'top_bar') {
        setHudMode(modeStr);
      }
    });

    const unlistenSettings = listenTauriEvent<any>('settings:updated', (newSettings) => {
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

  // Trigger token-by-token answer generation
  const handleTriggerAi = useCallback(
    async (questionText: string, modifier: DirectorModifier = 'normal') => {
      if (!questionText.trim()) return;

      // Abort active stream if any
      if (activeStreamRef.current) {
        activeStreamRef.current.abort();
        activeStreamRef.current = null;
      }

      setActiveQuestion(questionText);
      setActiveModifier(modifier);
      setStreamingText('');
      setTtftMs(null);
      setTotalLatencyMs(null);
      setIsGenerating(true);

      const historyContext = dialogueMessages.slice(-6).map((m) => ({
        speaker: m.speaker === 'candidate' ? ('candidate' as const) : ('interviewer' as const),
        text: m.text,
      }));

      try {
        const handle = await streamAnswer(
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
              setTotalLatencyMs(info.totalMs);
              if (info.model) setModelName(info.model);
            },
            onError: (err) => {
              setIsGenerating(false);
              setStreamingText((prev) => (prev ? `${prev}\n\n[Помилка генерації: ${err}]` : `[Помилка генерації: ${err}]`));
            },
          }
        );
        activeStreamRef.current = handle;
      } catch (err: any) {
        setIsGenerating(false);
        setStreamingText(`[Помилка запиту: ${err?.message || 'Мережевий збій'}]`);
      }
    },
    [dialogueMessages, isFrozen, settings]
  );

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
    } catch (err: any) {
      setStreamingText(`[Помилка скріншоту: ${err?.message || 'Не вдалося захопити екран'}]`);
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
    setTtftMs(null);
    setTotalLatencyMs(null);
  }, []);

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
        closeCopilotWindow().catch(() => {});
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
  }, [handleToggleFreeze, handleSwitchMode, handleTriggerScreenshot, handleToggleClickThrough, hudMode]);

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

  // =========================================================================
  // RENDER: TOP BAR (NOTCH) MODE (680x150, flush under webcam)
  // =========================================================================
  if (hudMode === 'top_bar') {
    return (
      <div
        className="w-full h-full select-none flex flex-col justify-between overflow-hidden rounded-b-xl border border-white/10 bg-[#09090b]/95 backdrop-blur-xl text-zinc-100 shadow-2xl p-2.5"
        style={{ opacity: settings.hudOpacity ?? 0.95 }}
      >
        {/* Header row: drag region + controls */}
        <div className="flex items-center justify-between gap-2 drag-region pb-1 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Ghostboard HUD
            </span>
            <AudioWaveEqualizer level={currentRms} />
            <button
              onClick={() => hudStream.switchListenMode(hudStream.listenMode === 'all' ? 'system_only' : 'all')}
              title={hudStream.listenMode === 'all' ? 'Слухати: Системний звук + Мікрофон' : 'Тільки Системний звук'}
              className={`px-2 py-0.5 rounded-full text-[9px] font-mono flex items-center gap-1 border transition no-drag ${
                hudStream.listenMode === 'all'
                  ? 'bg-zinc-800 text-white border-zinc-600'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800'
              }`}
            >
              {hudStream.listenMode === 'all' ? (
                <>
                  <Mic className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Всі</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-2.5 h-2.5 text-zinc-400" />
                  <span>Звук</span>
                </>
              )}
            </button>
            {ttftMs !== null && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                ⚡ {ttftMs}ms
              </span>
            )}
            {isFrozen && (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded">
                ⏸ FROZEN
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 no-drag">
            <button
              onClick={() => handleSwitchMode('chat')}
              title="Розгорнути у повний чат (Ctrl+M)"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleFreeze}
              title={isFrozen ? 'Розморозити (Space)' : 'Заморозити екран (Space)'}
              className={`p-1 rounded transition ${isFrozen ? 'text-amber-400 bg-amber-950/50' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
            >
              {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleTriggerScreenshot}
              disabled={isOcrActive}
              title="Скріншот екрана (Ctrl+Shift+S)"
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => closeCopilotWindow().catch(() => {})}
              title="Закрити копайлот (Esc)"
              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Line 1: Speech preview (Interlocutor or Candidate) */}
        <div className="py-1 px-1 text-xs text-zinc-400 font-mono truncate flex items-center gap-1.5">
          {hudStream.activeSpeaker === 'candidate' ? (
            <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : (
            <Volume2 className="w-3 h-3 text-zinc-400 shrink-0" />
          )}
          <span className="text-zinc-500">{hudStream.activeSpeaker === 'candidate' ? 'Ви:' : 'Співрозмовник:'}</span>
          <span className="text-zinc-300">
            {liveInterim || (dialogueMessages.length > 0 ? dialogueMessages[dialogueMessages.length - 1].text : 'Очікування мовлення...')}
          </span>
        </div>

        {/* Line 2: AI Live Suggestion (Prominent, large) */}
        <div
          ref={answerScrollRef}
          className={`flex-1 overflow-y-auto px-1 leading-snug select-text font-medium text-white ${fontSizeClass}`}
        >
          {streamingText ? (
            <span>
              {streamingText}
              {isGenerating && <span className="inline-block w-1.5 h-3.5 ml-1 bg-white animate-pulse" />}
            </span>
          ) : (
            <span className="text-zinc-500 italic font-normal">
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
      className="w-full h-full select-none flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[#09090b]/95 backdrop-blur-xl text-zinc-100 shadow-2xl"
      style={{ opacity: settings.hudOpacity ?? 0.95 }}
    >
      {/* 1. TOP HEADER / TITLEBAR */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 drag-region bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-zinc-200">
            Ghostboard Copilot
          </span>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
            {modelName}
          </span>
          {/* Live 5-bar Equalizer */}
          <AudioWaveEqualizer level={currentRms} />
          {/* 1-click Listen Mode Toggle */}
          <button
            onClick={() => hudStream.switchListenMode(hudStream.listenMode === 'all' ? 'system_only' : 'all')}
            title={hudStream.listenMode === 'all' ? 'Слухати: Системний звук + Мікрофон' : 'Тільки Системний звук (відфільтровувати мікрофон)'}
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1 border transition no-drag ${
              hudStream.listenMode === 'all'
                ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            {hudStream.listenMode === 'all' ? (
              <>
                <Mic className="w-2.5 h-2.5 text-emerald-400" />
                <span>Звук + Мік</span>
              </>
            ) : (
              <>
                <Volume2 className="w-2.5 h-2.5 text-zinc-400" />
                <span>Тільки Звук</span>
              </>
            )}
          </button>
          {ttftMs !== null && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
              ⚡ TTFT {ttftMs}ms
            </span>
          )}
          {isFrozen && (
            <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.5 rounded">
              ⏸ FROZEN
            </span>
          )}
        </div>

        {/* Window action icons & Language Selector */}
        <div className="flex items-center gap-1.5 no-drag">
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
          <button
            onClick={() => closeCopilotWindow().catch(() => {})}
            title="Закрити копайлот і повернутися в Офіс (Esc)"
            className="p-1.5 rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800/80 transition ml-1"
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
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-medium text-zinc-300">Живе мовлення</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {hudStream.listenMode === 'all' ? 'Звук + Мікрофон' : 'Лише системний звук'}
            </span>
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
                    className={`p-2.5 rounded-lg border ${
                      msg.speaker === 'candidate'
                        ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-300 ml-2'
                        : 'bg-zinc-900/70 border-zinc-700/70 text-zinc-100 mr-2'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1 text-[10px] font-mono">
                      <span className="flex items-center gap-1 font-semibold text-zinc-300">
                        {msg.speaker === 'candidate' ? (
                          <>
                            <Mic className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Ви</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-2.5 h-2.5 text-blue-400" />
                            <span>Інтерв'юер</span>
                          </>
                        )}
                      </span>
                      <span className="text-zinc-600">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}

                {liveInterim && (
                  <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-700/80 text-zinc-200">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-zinc-400">
                      {hudStream.activeSpeaker === 'candidate' ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Mic className="w-2.5 h-2.5" /> Ви
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-400 font-semibold">
                          <Volume2 className="w-2.5 h-2.5" /> Інтерв'юер
                        </span>
                      )}
                      <span className="text-zinc-500 text-[10px]">Слухаю...</span>
                    </div>
                    <p className="leading-relaxed italic">
                      {liveInterim}
                      <span className="inline-block w-1.5 h-3 ml-1 bg-white animate-pulse" />
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

            {streamingText ? (
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
                      <p key={idx} className="whitespace-pre-wrap">
                        {sec.content}
                      </p>
                    );
                  })
                ) : (
                  <p className="whitespace-pre-wrap">{streamingText}</p>
                )}
                {isGenerating && <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse" />}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8 text-zinc-500">
                <Terminal className="w-8 h-8 stroke-1 mb-2 text-zinc-600" />
                <p className="font-medium text-zinc-400">Готовий до стримінгу підказок</p>
                <p className="text-[11px] mt-1 text-zinc-500 leading-relaxed">
                  Відповідь надходитиме потоково токен за токеном без затримок (TTFT &lt; 300мс).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM CONTROLS & MANUAL PROMPT BAR */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/70 flex flex-col gap-2">
        {/* Quick action buttons / modifiers */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Поясни коротко', 'shorter')}
              disabled={isGenerating}
              className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="⚡ Коротше"
            >
              ⚡ Коротше
            </button>
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Поясни простіше', 'simpler')}
              disabled={isGenerating}
              className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="💡 Простіше"
            >
              💡 Простіше
            </button>
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Напиши код', 'code')}
              disabled={isGenerating}
              className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="</> Код"
            >
              &lt;/&gt; Код
            </button>
            <button
              onClick={() => handleTriggerAi(activeQuestion || liveInterim || 'Запропонуй інший підхід', 're_angle')}
              disabled={isGenerating}
              className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
              title="🔄 Інший підхід"
            >
              🔄 Інший підхід
            </button>
            <button
              onClick={handleTriggerScreenshot}
              disabled={isOcrActive}
              className="px-2 py-1 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition flex items-center gap-1"
            >
              <Camera className="w-3 h-3" />
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
