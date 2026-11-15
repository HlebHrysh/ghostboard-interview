import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DesktopAuthGate } from './components/DesktopAuthGate';
import { OfficeWindow } from './components/OfficeWindow';
import { HudWindow } from './components/HudWindow';
import { HudErrorBoundary } from './hud/HudErrorBoundary';
import {
  getAccessToken,
  isTauriEnvironment,
  logout,
  setWindowSize,
  type CopilotMode,
} from './lib/tauriBridge';
import { checkAuth, type UserProfileData } from './lib/apiClient';

export default function App() {
  const isUrlHud =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('window') === 'hud';

  const [isHudActive, setIsHudActive] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<UserProfileData | null>(null);

  // Sync window attribute so CSS keeps #09090b in Office/Auth and transparent chrome in HUD
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.window = isUrlHud || isHudActive ? 'hud' : 'office';
    }
  }, [isUrlHud, isHudActive]);

  // Verify existing OS Keyring / session token on desktop startup
  useEffect(() => {
    let isMounted = true;
    async function verifyExistingSession() {
      try {
        const token = await getAccessToken();
        if (token) {
          const auth = await checkAuth(token);
          if (auth.authenticated && auth.user && isMounted) {
            setAuthUser(auth.user);
            setIsAuthenticated(true);
            setIsAuthChecking(false);
            return;
          }
        }
      } catch (err) {
        console.debug('[App] Session check error:', err);
      }
      if (isMounted) {
        setIsAuthChecking(false);
      }
    }

    void verifyExistingSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuthSuccess = useCallback((user: UserProfileData, _token: string) => {
    setAuthUser(user);
    setIsAuthenticated(true);
  }, []);

  const handleDemoMode = useCallback(() => {
    setAuthUser({
      id: 'usr_demo',
      email: 'demo@ghostboard.ai',
      plan: 'pro',
      role: 'Software Engineer',
    });
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Best-effort token revocation
    }
    setAuthUser(null);
    setIsAuthenticated(false);
    setIsHudActive(false);
  }, []);

  const handleStartHud = useCallback((mode: CopilotMode = 'chat') => {
    setIsHudActive(true);
    if (isTauriEnvironment()) {
      const width = mode === 'top_bar' ? 680 : 780;
      const height = mode === 'top_bar' ? 160 : 460;
      setWindowSize(width, height).catch(() => {});
    }
  }, []);

  const handleReturnToOffice = useCallback(() => {
    setIsHudActive(false);
    if (isTauriEnvironment()) {
      setWindowSize(960, 640).catch(() => {});
    }
  }, []);

  // 1. Detached Stealth HUD Window (?window=hud) or in-window HUD fallback
  if (isUrlHud || isHudActive) {
    return (
      <HudErrorBoundary fallbackTitle="Stealth HUD">
        <HudWindow onReturnToOffice={isHudActive ? handleReturnToOffice : undefined} />
      </HudErrorBoundary>
    );
  }

  // 2. Initial OS Keyring / session splash screen (#09090b engineering grid)
  if (isAuthChecking) {
    return (
      <div
        data-tauri-drag-region
        className="gb-office fixed inset-0 z-50 flex items-center justify-center border border-white/[0.08] select-none"
      >
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#111114] px-7 py-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.75)]">
          <motion.img
            src="./ghost-transparent.png"
            alt="Ghostboard"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity }}
            className="h-12 w-12 object-contain"
          />
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-zinc-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            ПЕРЕВІРКА СЕСІЇ GHOSTBOARD...
          </div>
        </div>
      </div>
    );
  }

  // 3. Authentication Gate (Stealth Access Pass)
  if (!isAuthenticated) {
    return (
      <HudErrorBoundary fallbackTitle="Stealth Access Pass">
        <DesktopAuthGate onSuccess={handleAuthSuccess} onDemoMode={handleDemoMode} />
      </HudErrorBoundary>
    );
  }

  // 4. Ghostboard Office (Command Center)
  return (
    <HudErrorBoundary fallbackTitle="Ghostboard Office">
      <OfficeWindow
        user={authUser}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthenticated(false)}
        onStartHud={handleStartHud}
      />
    </HudErrorBoundary>
  );
}
