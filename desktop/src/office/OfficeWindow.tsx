import React, { useState, useEffect, useCallback } from 'react';
import { OfficeNavRail, type OfficeTab } from './OfficeNavRail';
import { LaunchpadTab } from './LaunchpadTab';
import { AudioStudioTab } from './AudioStudioTab';
import { AiBrainTab } from './AiBrainTab';
import { CandidateContextTab } from './CandidateContextTab';
import { StealthTab } from './StealthTab';
import {
  useDesktopSettings,
  type DesktopSettings,
} from '../lib/desktopSettings';
import {
  getStoredProfile,
  type CandidateProfile,
} from '../lib/profileStore';
import {
  launchCopilotWindow,
  saveTokens,
  type CopilotMode,
} from '../lib/tauriBridge';
import { startListening } from '../lib/audioSession';
import { markDemoPending } from '../lib/demoInterview';
import { apiFetch, type UserProfileData } from '../lib/apiClient';

export interface OfficeWindowProps {
  user: UserProfileData | null;
  onLogout: () => void;
  onOpenAuth?: () => void;
  onStartHud?: (mode?: CopilotMode) => void;
}

export const OfficeWindow: React.FC<OfficeWindowProps> = ({
  user,
  onLogout,
  onStartHud,
}) => {
  const [settings, updateSettings] = useDesktopSettings();
  const [activeTab, setActiveTab] = useState<OfficeTab>('launch');
  const [profile, setProfile] = useState<CandidateProfile>(() => getStoredProfile());

  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isQaLoggingIn, setIsQaLoggingIn] = useState(false);

  // Quick QA login handler for offline dev
  const handleQuickQaLogin = useCallback(async () => {
    setIsQaLoggingIn(true);
    try {
      const res = await apiFetch<{
        success: boolean;
        token: string;
        user: UserProfileData;
      }>('/api/qa/control', {
        method: 'POST',
        body: JSON.stringify({ action: 'seed_test_user' }),
      });
      if (res.ok && res.data?.token) {
        await saveTokens(res.data.token, {
          userId: res.data.user?.id,
          email: res.data.user?.email,
          plan: res.data.user?.plan || 'pro',
        });
        window.location.reload();
      }
    } catch (e) {
      console.warn('[OfficeWindow] Quick QA login failed:', e);
    } finally {
      setIsQaLoggingIn(false);
    }
  }, []);

  // Launch action: Starts audio hardware capture and launches HUD window (with in-window fallback)
  const handleLaunch = useCallback(
    async (overrideMode?: CopilotMode) => {
      const targetMode = overrideMode || settings.copilotMode;
      setLaunchError(null);
      setIsLaunching(true);

      // 1. Start audio isolation capture in background
      try {
        await startListening(settings);
      } catch (audioErr) {
        console.warn('[OfficeWindow] Audio start warning:', audioErr);
      }

      // 2. Launch detached HUD window or fallback to in-window HUD
      try {
        await launchCopilotWindow(targetMode);
      } catch (err) {
        console.warn('[OfficeWindow] Detached window launch failed, falling back to in-window HUD:', err);
        if (onStartHud) {
          onStartHud(targetMode);
          return;
        }
        setLaunchError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLaunching(false);
      }
    },
    [settings, onStartHud]
  );

  // 1-Click Demo Simulation trigger
  const handleRunDemo = useCallback(async () => {
    markDemoPending();
    await handleLaunch(settings.copilotMode);
  }, [handleLaunch, settings.copilotMode]);

  // Global keyboard shortcut: Ctrl+Enter / ⌘+Enter to launch from anywhere in the Office
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleLaunch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleLaunch]);

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-zinc-100 select-none overflow-hidden font-sans">
      {/* 220px Left Navigation Rail */}
      <OfficeNavRail
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onLogout={onLogout}
        onQuickQaLogin={handleQuickQaLogin}
        isQaLoggingIn={isQaLoggingIn}
      />

      {/* Main Content View with Ambient Radial Glow */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-[#09090b] p-6 sm:p-8 gb-scroll relative">
        {/* Subtle radial top lighting */}
        <div
          className="absolute top-0 left-0 right-0 h-96 pointer-events-none -z-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(255, 255, 255, 0.04), transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-4xl w-full mx-auto">
          {activeTab === 'launch' && (
            <LaunchpadTab
              settings={settings}
              profile={profile}
              isLaunching={isLaunching}
              launchError={launchError}
              onSelectMode={(mode) => updateSettings({ copilotMode: mode })}
              onLaunch={() => void handleLaunch()}
              onRunDemo={() => void handleRunDemo()}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'audio' && (
            <AudioStudioTab
              settings={settings}
              updateSettings={updateSettings}
            />
          )}

          {activeTab === 'ai' && (
            <AiBrainTab
              settings={settings}
              updateSettings={updateSettings}
            />
          )}

          {activeTab === 'context' && (
            <CandidateContextTab
              profile={profile}
              setProfile={setProfile}
            />
          )}

          {activeTab === 'stealth' && (
            <StealthTab
              settings={settings}
              updateSettings={updateSettings}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default OfficeWindow;
