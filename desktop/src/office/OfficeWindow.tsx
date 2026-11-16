import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, type UserProfileData } from '../lib/apiClient';
import { markDemoPending } from '../lib/demoInterview';
import {
  useDesktopSettings,
  type DesktopSettings,
} from '../lib/desktopSettings';
import {
  buildCandidateSystemPrompt,
  getStoredProfile,
  type CandidateProfile,
} from '../lib/profileStore';
import { startListening } from '../lib/audioSession';
import {
  launchCopilotWindow,
  saveTokens,
  setAiPreferences,
  type CopilotMode,
} from '../lib/tauriBridge';
import { AiBrainTab } from './AiBrainTab';
import { AudioStudioTab } from './AudioStudioTab';
import { CandidateContextTab } from './CandidateContextTab';
import { LaunchpadTab } from './LaunchpadTab';
import { OfficeNavRail, type OfficeTab } from './OfficeNavRail';
import { StealthTab } from './StealthTab';

export interface OfficeWindowProps {
  user: UserProfileData | null;
  onLogout: () => void;
  onOpenAuth?: () => void;
  onStartHud?: (mode?: CopilotMode) => void;
}

function buildCustomInstructions(settings: DesktopSettings): string {
  return settings.customInstructions.trim();
}

function buildCleanSttStack(profile: CandidateProfile): string | null {
  const parts = [
    profile.primaryStack,
    ...(profile.techStack ?? []),
    ...(profile.resumeKeywords ?? []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export const OfficeWindow: React.FC<OfficeWindowProps> = ({
  user,
  onLogout,
  onOpenAuth,
  onStartHud,
}) => {
  const [settings, updateSettings] = useDesktopSettings();
  const [activeTab, setActiveTab] = useState<OfficeTab>('launch');
  const [profile, setProfile] = useState<CandidateProfile>(() => getStoredProfile());

  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isQaLoggingIn, setIsQaLoggingIn] = useState(false);

  // Debounced sync to native Rust AI pipeline (avoids IPC lock storms on keystrokes / slider drags)
  useEffect(() => {
    const timer = setTimeout(() => {
      const helperLanguage =
        settings.hintLanguage === 'bilingual_uk'
          ? 'uk'
          : settings.hintLanguage === 'bilingual_ru'
            ? 'ru'
            : null;
      const outputLanguage =
        settings.hintLanguage === 'auto'
          ? 'auto'
          : settings.hintLanguage === 'bilingual_uk' || settings.hintLanguage === 'bilingual_ru'
            ? 'en'
            : settings.hintLanguage;

      const baseProfile = buildCandidateSystemPrompt(profile);
      const custom = buildCustomInstructions(settings);
      const candidateProfile = custom ? `${baseProfile}\n\n${custom}` : baseProfile;

      void setAiPreferences({
        outputLanguage,
        helperLanguage,
        modifier: settings.answerLength === 'short' ? 'shorter' : settings.answerLength === 'code' ? 'code' : null,
        concise: settings.answerSpeed === 'fast' && settings.answerLength === 'short',
        candidateProfile,
        cascadeMode: settings.aiModelCascade,
        sttStack: buildCleanSttStack(profile),
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [
    profile,
    settings.aiModelCascade,
    settings.answerLength,
    settings.answerSpeed,
    settings.customInstructions,
    settings.hintLanguage,
  ]);

  // Quick QA login handler for localhost dev
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
    } catch (err) {
      console.warn('[OfficeWindow] Quick QA login failed:', err);
    } finally {
      setIsQaLoggingIn(false);
    }
  }, []);

  /**
   * Instant Copilot Launch (<50ms window spawn):
   * Spawns detached Stealth HUD immediately without waiting for blocking audio device setup;
   * audio capture starts concurrently in the background.
   */
  const handleLaunch = useCallback(
    async (overrideMode?: CopilotMode) => {
      const targetMode = overrideMode || settings.copilotMode;
      setLaunchError(null);
      setIsLaunching(true);

      // Fire-and-forget audio capture so HUD opens instantaneously (<50ms)
      void startListening(settings).catch((audioErr) => {
        console.warn('[OfficeWindow] Audio background start warning:', audioErr);
      });

      try {
        await launchCopilotWindow(targetMode);
      } catch (err) {
        console.warn('[OfficeWindow] Detached HUD launch failed, switching inline:', err);
        if (onStartHud) {
          onStartHud(targetMode);
          return;
        }
        setLaunchError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLaunching(false);
      }
    },
    [onStartHud, settings]
  );

  const handleRunDemo = useCallback(async () => {
    markDemoPending();
    await handleLaunch(settings.copilotMode);
  }, [handleLaunch, settings.copilotMode]);

  // Global Ctrl+Enter / Cmd+Enter launch shortcut inside Office
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
    <div className="gb-office flex h-screen w-screen text-zinc-100 select-none overflow-hidden font-sans relative">
      {/* Apple Settings / Linear Left Navigation Rail */}
      <OfficeNavRail
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        stealthArmed={settings.stealth}
        onLogout={onLogout}
        onOpenAuth={onOpenAuth}
        onQuickQaLogin={handleQuickQaLogin}
        isQaLoggingIn={isQaLoggingIn}
      />

      {/* Unified #09090b Engineering Grid Workspace Canvas */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto px-5 py-6 sm:px-8 sm:py-7 gb-scroll relative">
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
            <AudioStudioTab settings={settings} updateSettings={updateSettings} />
          )}

          {activeTab === 'ai' && (
            <AiBrainTab settings={settings} updateSettings={updateSettings} />
          )}

          {activeTab === 'context' && (
            <CandidateContextTab profile={profile} setProfile={setProfile} />
          )}

          {activeTab === 'stealth' && (
            <StealthTab settings={settings} updateSettings={updateSettings} />
          )}
        </div>
      </main>
    </div>
  );
};

export default OfficeWindow;
