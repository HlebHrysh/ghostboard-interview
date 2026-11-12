import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopIsland } from './TopIsland';
import { SplitChat } from './SplitChat';
import { EyelineNotch } from './EyelineNotch';
import { useDesktopSettings } from '../lib/desktopSettings';
import { useCopilotSession } from '../hooks/useCopilotSession';
import { getStoredProfile } from '../lib/profileStore';
import {
  setWindowSize,
  setWindowMode,
  setWindowOpacity,
  setScreenShareStealth,
  toggleClickThrough,
  panicHide,
  openOffice,
  closeCopilotWindow,
  listenTauriEvent,
  isTauriEnvironment,
  consumeRadarSnapshot,
  getAccessToken,
  stageBrowserRadarSnapshot,
} from '../lib/tauriBridge';
import { subscribeHudEvents, injectHudEvent } from '../lib/hudBus';
import { detectBackendUrl } from '../lib/apiClient';
import { formatScreenshotAnswer } from '../lib/screenshotAnswer';
import { startListening, stopListening } from '../lib/audioSession';
import { consumeDemoPending } from '../lib/demoInterview';
import { nextLocalId, viewedAnswer } from '../lib/session';
import { getRandomBridgePhrase } from '../lib/bridgePhrases';
import type { HudEvent, ScreenRadarSummary } from '../types/hud';

const RADAR_FRESH_MS = 15_000;

export interface HudWindowProps {
  onReturnToOffice?: () => void;
}

export function HudWindow({ onReturnToOffice }: HudWindowProps = {}) {
  const [settings, updateSettings] = useDesktopSettings();

  // Read initial mode from URL or settings
  const initialMode =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'top_bar'
      ? 'top_bar'
      : settings.copilotMode === 'top_bar'
      ? 'top_bar'
      : 'chat';

  const [layoutMode, setLayoutMode] = useState<'chat' | 'top_bar'>(initialMode);
  const smartScreenshotRef = useRef<() => Promise<void>>(async () => {});

  // Hotkey dispatch from Rust
  const handleRustHotkey = useCallback((action: string) => {
    if (action === 'panic') {
      void panicHide();
    } else if (action === 'screenshot') {
      void smartScreenshotRef.current();
    } else if (action === 'chat') {
      setLayoutMode('chat');
    }
  }, []);

  const session = useCopilotSession({
    settings,
    getProfile: getStoredProfile,
    onHotkey: handleRustHotkey,
  });

  const activeAnswer = viewedAnswer(session.state);

  // Zero-click Screen Delta Radar state (fresh < 15s)
  const [radarReady, setRadarReady] = useState<ScreenRadarSummary | null>(null);
  const [radarBusy, setRadarBusy] = useState(false);
  const radarAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const off = subscribeHudEvents((event: HudEvent) => {
      if (event.type === 'screenRadarReady') {
        const p = event.payload;
        setRadarReady({
          detectionId: p.detectionId ?? p.detection_id ?? `radar-${Date.now()}`,
          hammingDistance: p.hammingDistance ?? p.hamming_distance ?? 0,
          roiWidth: p.roiWidth ?? p.roi_width ?? 0,
          roiHeight: p.roiHeight ?? p.roi_height ?? 0,
          detectedAtMs: p.detectedAtMs ?? p.detected_at_ms ?? Date.now(),
        });
      }
    });
    return off;
  }, []);

  // Automatically expire radar pill after 15s so stale crops never mislead
  useEffect(() => {
    if (!radarReady) return;
    const remaining = RADAR_FRESH_MS - (Date.now() - radarReady.detectedAtMs);
    if (remaining <= 0) {
      setRadarReady(null);
      return;
    }
    const timer = setTimeout(() => setRadarReady(null), remaining);
    return () => clearTimeout(timer);
  }, [radarReady]);

  // Browser-mode fallback: detect pasted problem text or returning focus after >= 2.5s
  useEffect(() => {
    if (isTauriEnvironment()) return;
    let lastBlurAt = 0;

    const triggerBrowserRadar = () => {
      const now = Date.now();
      stageBrowserRadarSnapshot({
        base64Png:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        roiWidth: 1280,
        roiHeight: 720,
      });
      injectHudEvent({
        type: 'screenRadarReady',
        payload: {
          detectionId: `browser-radar-${now}`,
          hammingDistance: 12,
          roiWidth: 1280,
          roiHeight: 720,
          detectedAtMs: now,
        },
      });
    };

    const onPaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.getData('text') || '';
      if (pasted.trim().length >= 40) {
        triggerBrowserRadar();
      }
    };
    const onBlur = () => {
      lastBlurAt = Date.now();
    };
    const onFocus = () => {
      if (lastBlurAt > 0 && Date.now() - lastBlurAt >= 2500) {
        triggerBrowserRadar();
      }
    };

    window.addEventListener('paste', onPaste);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    return () => {
      radarAbortRef.current?.abort();
    };
  }, []);

  const analyzeZeroMsRadar = useCallback(async () => {
    if (radarBusy || session.screenBusy) return;
    setRadarBusy(true);
    setRadarReady(null);
    radarAbortRef.current?.abort();
    const controller = new AbortController();
    radarAbortRef.current = controller;

    try {
      const snap = await consumeRadarSnapshot();
      if (!snap?.base64Png) {
        setRadarBusy(false);
        await session.captureAndAnalyze();
        return;
      }

      const answerId = nextLocalId('screen');
      session.dispatch({
        type: 'ask',
        answerId,
        messageId: null,
        text: '👁️ Аналіз задачі (0ms ROI)…',
        modifier: null,
        source: 'screen',
        ts: Date.now(),
      });

      const profile = getStoredProfile();
      const [baseUrl, token] = await Promise.all([detectBackendUrl(), getAccessToken()]);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-ghostboard-client': 'desktop-app',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const outLang =
        settings.hintLanguage === 'auto'
          ? 'uk'
          : settings.hintLanguage === 'bilingual_uk' || settings.hintLanguage === 'bilingual_ru'
          ? 'bilingual'
          : settings.hintLanguage;

      let response: Response;
      try {
        response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/ai/screenshot`, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            imageBase64: snap.base64Png,
            mimeType: 'image/png',
            locale: settings.hintLanguage === 'en' ? 'en' : 'uk',
            outputLanguage: outLang,
            sessionMode: 'interview',
            candidateProfile: profile
              ? {
                  role: profile.role,
                  level: profile.experienceLevel,
                  primaryStack: profile.primaryStack || profile.techStack.join(', '),
                  techStack: profile.techStack,
                  customBio: profile.customBio,
                }
              : undefined,
          }),
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        throw new Error(err instanceof Error ? err.message : 'Немає зв’язку з сервером для аналізу екрана');
      }

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? 'Потрібен вхід: сесія Ghostboard недійсна'
            : `Аналіз екрана недоступний (${response.status})`
        );
      }

      const data = (await response.json().catch(() => null)) as Parameters<typeof formatScreenshotAnswer>[0] | null;
      const formatted = data ? formatScreenshotAnswer(data) : null;
      if (!formatted) {
        throw new Error('ШІ не знайшов на екрані задачі чи коду');
      }

      const words = formatted.text.split(/(\s+)/);
      let acc = '';
      for (let i = 0; i < words.length; i += 6) {
        if (controller.signal.aborted) return;
        const piece = words.slice(i, i + 6).join('');
        acc += piece;
        session.dispatch({ type: 'chunk', id: answerId, token: piece, ts: Date.now() });
        await new Promise((r) => setTimeout(r, 14));
      }
      session.dispatch({ type: 'done', id: answerId, full: acc, ts: Date.now() });
    } catch (err) {
      if (controller.signal.aborted) return;
      session.dispatch({
        type: 'fail',
        message: err instanceof Error ? err.message : 'Не вдалося проаналізувати ROI-знімок',
      });
    } finally {
      setRadarBusy(false);
    }
  }, [radarBusy, session, settings.hintLanguage]);

  const isRadarFresh = Boolean(radarReady && Date.now() - radarReady.detectedAtMs < RADAR_FRESH_MS);

  const handleSmartScreenshot = useCallback(async () => {
    if (isRadarFresh) {
      await analyzeZeroMsRadar();
    } else {
      await session.captureAndAnalyze();
    }
  }, [isRadarFresh, analyzeZeroMsRadar, session]);

  smartScreenshotRef.current = handleSmartScreenshot;

  // Sync window size on layout mode switch
  const switchLayout = useCallback(
    async (next: 'chat' | 'top_bar') => {
      setLayoutMode(next);
      updateSettings({ copilotMode: next });
      if (isTauriEnvironment()) {
        const width = next === 'top_bar' ? 680 : 780;
        const height = next === 'top_bar' ? 160 : 460;
        await setWindowSize(width, height).catch(() => {});
        await setWindowMode(next === 'top_bar' ? 'notch' : 'chat').catch(() => {});
      }
    },
    [updateSettings]
  );

  const toggleLayout = useCallback(() => {
    void switchLayout(layoutMode === 'chat' ? 'top_bar' : 'chat');
  }, [layoutMode, switchLayout]);

  // Listen to external Tauri mode switch events
  useEffect(() => {
    const unlisten = listenTauriEvent<string>('hud:set-mode', (modeStr) => {
      if (modeStr === 'chat' || modeStr === 'top_bar') {
        void switchLayout(modeStr);
      }
    });
    return unlisten;
  }, [switchLayout]);

  // Sync window opacity and stealth on mount / settings change
  useEffect(() => {
    void setWindowOpacity(settings.hudOpacity);
  }, [settings.hudOpacity]);

  useEffect(() => {
    void setScreenShareStealth(settings.stealth);
  }, [settings.stealth]);

  // Auto-start capture for configured isolation mode on HUD mount if not yet active
  useEffect(() => {
    void startListening(settings);
    // Check if demo simulation was requested from Office
    if (consumeDemoPending()) {
      session.runDemo();
    }
  }, []);

  const [isAudioActive, setIsAudioActive] = useState(true);
  const [isBridgeActive, setIsBridgeActive] = useState(false);
  const [bridgePhrase, setBridgePhrase] = useState('');
  const bridgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerBridge = useCallback(() => {
    const phrase = getRandomBridgePhrase(settings.hintLanguage);
    setBridgePhrase(phrase);
    setIsBridgeActive(true);
    if (bridgeTimerRef.current) clearTimeout(bridgeTimerRef.current);
    bridgeTimerRef.current = setTimeout(() => {
      setIsBridgeActive(false);
    }, 8000);
  }, [settings.hintLanguage]);

  const handleDismissBridge = useCallback(() => {
    if (bridgeTimerRef.current) clearTimeout(bridgeTimerRef.current);
    setIsBridgeActive(false);
  }, []);

  const handleToggleAudio = useCallback(async () => {
    if (isAudioActive) {
      await stopListening();
      setIsAudioActive(false);
    } else {
      await startListening(settings);
      setIsAudioActive(true);
    }
  }, [isAudioActive, settings]);

  // Click-through toggle
  const handleToggleClickThrough = useCallback(async () => {
    const next = !session.clickThrough;
    await toggleClickThrough(next);
    session.setClickThrough(next);
  }, [session]);

  // Panic hide
  const handlePanic = useCallback(async () => {
    await panicHide();
  }, []);

  // Return to office
  const handleReturnToOffice = useCallback(async () => {
    if (onReturnToOffice) {
      onReturnToOffice();
    } else {
      await openOffice();
      await closeCopilotWindow();
    }
  }, [onReturnToOffice]);

  // Close HUD
  const handleClose = useCallback(async () => {
    await stopListening();
    if (onReturnToOffice) {
      onReturnToOffice();
    } else {
      await closeCopilotWindow();
    }
  }, [onReturnToOffice]);

  // Global window keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // F12: Panic hide
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h')) {
        e.preventDefault();
        void handlePanic();
        return;
      }

      // Ctrl/Cmd + Shift + X: Click-through
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        void handleToggleClickThrough();
        return;
      }

      // Ctrl/Cmd + Shift + S: Screenshot OCR (uses 0ms radar ROI if fresh < 15s)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSmartScreenshot();
        return;
      }

      // Ctrl/Cmd + M: Toggle audio listening / mic capture
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm' && !isInput) {
        e.preventDefault();
        void handleToggleAudio();
        return;
      }

      // B: Trigger emergency bridge phrase (when not typing in an input)
      if (e.key.toLowerCase() === 'b' && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleTriggerBridge();
        return;
      }

      // Space: Freeze / unfreeze teleprompter answer card (when not typing in an input)
      if (e.key === ' ' && !isInput) {
        e.preventDefault();
        session.togglePause();
        return;
      }

      // Ctrl/Cmd + L: Toggle Layout
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !isInput) {
        e.preventDefault();
        toggleLayout();
        return;
      }

      // Escape: Return to office
      if (e.key === 'Escape' && !isInput) {
        e.preventDefault();
        void handleReturnToOffice();
        return;
      }

      // Alt+T: Instant test prompt
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        session.ask('Як працює Event Loop у JavaScript та черги microtask vs macrotask?', {
          modifier: 'shorter',
          source: 'manual',
        });
        return;
      }

      // Ctrl/Cmd + K: Focus manual question input
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // 1..5: Rapid modifiers for active answer (when not focused in text inputs)
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (activeAnswer?.question && ['1', '2', '3', '4', '5'].includes(e.key)) {
          e.preventDefault();
          const mods: Record<string, 'shorter' | 'simpler' | 'code' | 're_angle' | 'under_the_hood'> = {
            '1': 'shorter',
            '2': 'simpler',
            '3': 'code',
            '4': 're_angle',
            '5': 'under_the_hood',
          };
          const mod = mods[e.key];
          if (mod) {
            session.ask(activeAnswer.question, {
              modifier: mod,
              messageId: activeAnswer.messageId ?? undefined,
              source: 'manual',
            });
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePanic, handleToggleClickThrough, session, toggleLayout, handleReturnToOffice, activeAnswer, handleToggleAudio, handleTriggerBridge, handleSmartScreenshot]);

  const showInlineTopBarRadar =
    isRadarFresh &&
    layoutMode === 'chat' &&
    activeAnswer?.status !== 'streaming' &&
    !session.state.paused;

  return (
    <div
      data-tauri-drag-region="true"
      className="fixed inset-0 flex flex-col gb-hud-shell overflow-hidden select-none border border-white/[0.1] shadow-2xl"
    >
      {/* Top Floating Island Header + 0ms Vision Radar Instant Trigger */}
      <div className="relative shrink-0">
        <TopIsland
          settings={settings}
          updateSettings={updateSettings}
          layoutMode={layoutMode}
          onToggleLayout={toggleLayout}
          isStreaming={activeAnswer?.status === 'streaming'}
          activeAnswer={activeAnswer}
          isPaused={session.state.paused}
          onTogglePause={session.togglePause}
          isClickThrough={session.clickThrough}
          onToggleClickThrough={handleToggleClickThrough}
          onScreenshot={handleSmartScreenshot}
          isScreenBusy={session.screenBusy || radarBusy}
          onPanic={handlePanic}
          onReturnToOffice={handleReturnToOffice}
          onClose={handleClose}
          isBridgeActive={isBridgeActive}
          onTriggerBridge={handleTriggerBridge}
          isAudioActive={isAudioActive}
          onToggleAudio={handleToggleAudio}
        />

        <AnimatePresence>
          {isRadarFresh && (
            <div
              className={
                showInlineTopBarRadar
                  ? 'absolute top-[5px] left-[220px] right-[308px] flex justify-center pointer-events-none z-50'
                  : 'absolute top-[42px] right-2.5 pointer-events-none z-50'
              }
            >
              <motion.button
                type="button"
                data-tauri-drag-region="false"
                data-testid="vision-radar-pill"
                initial={{ opacity: 0, scale: 0.92, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.6 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => void analyzeZeroMsRadar()}
                disabled={session.screenBusy || radarBusy}
                title={`ROI ${radarReady?.roiWidth ?? 0}×${radarReady?.roiHeight ?? 0}px (Δ ${radarReady?.hammingDistance ?? 0}b) готовий у RAM — клік або Ctrl+Shift+S для 0ms аналізу`}
                className="gb-nodrag pointer-events-auto h-7 inline-flex items-center gap-1.5 px-2.5 rounded-full bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 border border-emerald-400/50 text-emerald-200 text-[11px] font-mono font-semibold shadow-[0_0_16px_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-xl transition-colors disabled:opacity-50"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="truncate">👁️ Задачу розпізнано (0ms)</span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Mode Body */}
      {layoutMode === 'chat' ? (
        <SplitChat
          sessionState={session.state}
          onSelectAnswer={session.selectAnswer}
          onActivateMessage={session.activateMessage}
          onAsk={session.ask}
          onTogglePillar={session.togglePillar}
          onExplainLine={session.setLineExplanation}
          fontSizePx={settings.hudFontSize}
          isBridgeActive={isBridgeActive}
          bridgePhrase={bridgePhrase}
          onTriggerBridge={handleTriggerBridge}
          onDismissBridge={handleDismissBridge}
          inputRef={inputRef}
        />
      ) : (
        <EyelineNotch
          activeAnswer={activeAnswer}
          onExpandToChat={() => void switchLayout('chat')}
          fontSizePx={settings.hudFontSize}
          onAsk={session.ask}
        />
      )}
    </div>
  );
}

export default HudWindow;
