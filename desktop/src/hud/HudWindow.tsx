import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from '../lib/tauriBridge';
import { startListening, stopListening } from '../lib/audioSession';
import { consumeDemoPending } from '../lib/demoInterview';
import { viewedAnswer } from '../lib/session';
import { getRandomBridgePhrase } from '../lib/bridgePhrases';

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

  // Hotkey dispatch from Rust
  const handleRustHotkey = useCallback((action: string) => {
    if (action === 'panic') {
      void panicHide();
    } else if (action === 'screenshot') {
      void session.captureAndAnalyze();
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

      // Ctrl/Cmd + Shift + S: Screenshot OCR
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void session.captureAndAnalyze();
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
  }, [handlePanic, handleToggleClickThrough, session, toggleLayout, handleReturnToOffice, activeAnswer, handleToggleAudio, handleTriggerBridge]);

  return (
    <div
      data-tauri-drag-region="true"
      className="fixed inset-0 flex flex-col gb-hud-shell overflow-hidden select-none border border-white/[0.1] shadow-2xl"
    >
      {/* Top Floating Island Header */}
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
        onScreenshot={session.captureAndAnalyze}
        isScreenBusy={session.screenBusy}
        onPanic={handlePanic}
        onReturnToOffice={handleReturnToOffice}
        onClose={handleClose}
        isBridgeActive={isBridgeActive}
        onTriggerBridge={handleTriggerBridge}
        isAudioActive={isAudioActive}
        onToggleAudio={handleToggleAudio}
      />

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
