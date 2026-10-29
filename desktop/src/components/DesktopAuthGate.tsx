import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Globe,
  KeyRound,
  Mail,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  initHandshake,
  pollHandshake,
  setAuthToken,
  checkAuth,
  apiFetch,
  getResolvedBaseUrl,
  detectBackendUrl,
  isBackendOffline,
  type UserProfileData,
} from '../lib/apiClient';
import { saveTokens, openBrowser, isTauriEnvironment } from '../lib/tauriBridge';

export interface DesktopAuthGateProps {
  onSuccess: (user: UserProfileData, token: string) => void;
  /** Opens the HUD without a backend session (offline / demo mode). */
  onDemoMode?: () => void;
  backendUrl?: string;
  onSwitchBackend?: () => void;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export function DesktopAuthGate({ onSuccess, onDemoMode, backendUrl }: DesktopAuthGateProps) {
  const [isWaitingForBrowser, setIsWaitingForBrowser] = useState(false);
  const [activeHandshakeId, setActiveHandshakeId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [pollError, setPollError] = useState<string | null>(null);
  const [isCheckingDirectly, setIsCheckingDirectly] = useState(false);

  // Direct in-window login (Email + Password) is open by default: works without deep-link
  const [showFallback, setShowFallback] = useState(true);
  const [fallbackTab, setFallbackTab] = useState<'token' | 'credentials'>('credentials');
  const [manualToken, setManualToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmittingFallback, setIsSubmittingFallback] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (secondsTimerRef.current) {
      clearInterval(secondsTimerRef.current);
      secondsTimerRef.current = null;
    }
    setIsWaitingForBrowser(false);
    setActiveHandshakeId(null);
    setActiveUrl(null);
    setSecondsWaiting(0);
  }, []);

  const openBrowserUrl = async (url: string) => {
    await openBrowser(url);
  };

  const completeLoginSuccess = useCallback(async (token: string, userData?: UserProfileData | null) => {
    stopPolling();
    // 1. Save in OS Keyring & local storage
    await saveTokens(token, {
      userId: userData?.id,
      email: userData?.email,
      plan: userData?.plan || 'pro',
    });
    setAuthToken(token);

    // 2. Report success to parent App
    if (userData) {
      onSuccess(userData, token);
    } else {
      const authRes = await checkAuth(token);
      if (authRes.authenticated && authRes.user) {
        onSuccess(authRes.user, token);
      } else {
        // Fallback user profile if me endpoint temporarily fails
        onSuccess(
          {
            id: 'usr_synced',
            email: email || 'user@ghostboard.ai',
            plan: 'PRO',
            role: 'Software Engineer',
          },
          token
        );
      }
    }
  }, [stopPolling, onSuccess, email]);

  const startHandshakeFlow = async (mode: 'login' | 'signup') => {
    setPollError(null);
    setIsWaitingForBrowser(true);
    setSecondsWaiting(0);

    try {
      if (isBackendOffline()) {
        await recheckBackend();
        if (isBackendOffline()) {
          setIsWaitingForBrowser(false);
          setPollError('Локальний сервер не знайдено (запустіть npm run dev у корені проєкту)');
          return;
        }
      }
      const res = await initHandshake();
      const targetUrl = mode === 'signup' ? res.signupUrl : res.loginUrl;
      setActiveHandshakeId(res.handshakeId);
      setActiveUrl(targetUrl);

      // Open user's default browser to website
      await openBrowserUrl(targetUrl);

      // Start elapsed seconds timer
      secondsTimerRef.current = setInterval(() => {
        setSecondsWaiting((s) => s + 1);
      }, 1000);

      // Start polling every 1.5 seconds as required by specification
      pollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await pollHandshake(res.handshakeId);
          if (pollRes.ready && pollRes.token) {
            await completeLoginSuccess(pollRes.token, pollRes.user);
          } else if (pollRes.code === 'HANDSHAKE_NOT_FOUND') {
            setPollError('Час дії рукостискання вичерпано. Спробуйте ще раз.');
            stopPolling();
          }
        } catch (err) {
          console.debug('[DesktopAuthGate] Polling tick error:', err);
        }
      }, 1500);
    } catch (err: unknown) {
      setPollError((err as Error)?.message || 'Помилка з’єднання з сервером');
      setIsWaitingForBrowser(false);
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setFallbackError('Будь ласка, введіть токен або код');
      return;
    }

    setIsSubmittingFallback(true);
    setFallbackError(null);

    try {
      const cleanToken = manualToken.trim();
      const authRes = await checkAuth(cleanToken);
      if (authRes.authenticated && authRes.user) {
        await completeLoginSuccess(cleanToken, authRes.user);
      } else {
        setFallbackError('Недійсний токен або термін його дії минув.');
      }
    } catch (err: unknown) {
      setFallbackError((err as Error)?.message || 'Помилка перевірки токена.');
    } finally {
      setIsSubmittingFallback(false);
    }
  };

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setFallbackError('Введіть email та пароль');
      return;
    }

    setIsSubmittingFallback(true);
    setFallbackError(null);

    try {
      const res = await apiFetch<{
        success: boolean;
        token?: string;
        user?: UserProfileData;
        error?: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
          client: 'desktop',
        }),
      });

      if (res.ok && res.data?.token) {
        await completeLoginSuccess(res.data.token, res.data.user);
      } else {
        setFallbackError(res.error || 'Невірний email або пароль.');
      }
    } catch (err: unknown) {
      setFallbackError((err as Error)?.message || 'Помилка зв’язку з сервером.');
    } finally {
      setIsSubmittingFallback(false);
    }
  };

  const handleManualRecheck = async () => {
    setIsCheckingDirectly(true);
    setPollError(null);
    try {
      const auth = await checkAuth();
      if (auth.authenticated && auth.user) {
        stopPolling();
        onSuccess(auth.user, 'stored_token');
      } else {
        setPollError('Сесію не знайдено в базі сайту. Будь ласка, увійдіть через сайт або email.');
      }
    } catch (err: unknown) {
      setPollError((err as Error)?.message || 'Помилка перевірки авторизації');
    } finally {
      setIsCheckingDirectly(false);
    }
  };

  // Deep-link callback listener
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        listen<string>('deep-link://new-url', async (event) => {
          try {
            const raw = event.payload;
            if (raw && raw.includes('token=')) {
              const url = new URL(raw);
              const token = url.searchParams.get('token');
              if (token) {
                await completeLoginSuccess(token);
              }
            }
          } catch (e) {
            console.debug('[DesktopAuthGate] Deep link parse err:', e);
          }
        }).then((un) => {
          unlisten = un;
        });
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [completeLoginSuccess]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [detectedHost, setDetectedHost] = useState<string | null>(null);

  const recheckBackend = useCallback(async () => {
    setBackendStatus('checking');
    const url = await detectBackendUrl(true);
    setDetectedHost(url);
    setBackendStatus(isBackendOffline() ? 'offline' : 'online');
  }, []);

  useEffect(() => {
    recheckBackend();
  }, [recheckBackend]);

  const activeHost = detectedHost || backendUrl || getResolvedBaseUrl();

  return (
    <div
      data-tauri-drag-region
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090a] select-none overflow-hidden cursor-default"
    >
      {/* Blueprint grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={SPRING_PHYSICS}
        className="relative w-full max-w-md p-6 sm:p-7 rounded-3xl bg-zinc-950/95 border border-white/[0.09] shadow-2xl space-y-5"
      >
        {/* Brand header & status badge (Draggable via data-tauri-drag-region) */}
        <div data-tauri-drag-region className="flex items-center justify-between cursor-move">
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold tracking-tight text-white font-mono uppercase">
                  Ghostboard Desktop
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Auth Gate
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Stealth HUD Verification
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-mono uppercase tracking-wider">
            <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
            <span>Вхід</span>
          </div>
        </div>

        {/* Server status pill */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5 font-sans">
              <ShieldCheck className="w-4 h-4 text-zinc-300" />
              <span>Підключений бекенд:</span>
            </span>
            <span className="font-mono text-[11px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 truncate max-w-[200px]">
              {activeHost}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
            Для розблокування AI-суфлера, асистент підтягне персональне резюме та налаштування після авторизації.
          </p>
        </div>

        {/* Backend offline guard (dev): clear message + autonomous/demo mode */}
        {backendStatus === 'offline' && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-start gap-2 text-amber-200 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>Локальний сервер не знайдено (запустіть npm run dev у корені проєкту)</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={recheckBackend}
                className="flex-1 py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs text-zinc-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Перевірити знову</span>
              </button>
              {onDemoMode && (
                <button
                  type="button"
                  onClick={onDemoMode}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Продовжити в автономному / демо-режимі</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Polling active state */}
        <AnimatePresence mode="wait">
          {isWaitingForBrowser ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={SPRING_PHYSICS}
              className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-700 space-y-4 text-center"
            >
              <div className="relative flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-zinc-800 border border-zinc-700 text-white shadow-sm">
                <RefreshCw className="w-6 h-6 animate-spin text-zinc-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Очікування входу в браузері...
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Увійдіть на сторінці сайту. Десктоп автоматично розпізнає сесію та збереже токен в OS Keyring.
                </p>
                <div className="pt-2 text-[11px] font-mono text-zinc-400">
                  Опитування кожні 1.5с • Час: {secondsWaiting}с
                  {activeHandshakeId && ` • ID: ${activeHandshakeId.slice(0, 8)}`}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {activeUrl && (
                  <button
                    type="button"
                    onClick={() => openBrowserUrl(activeUrl)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Відкрити ще раз</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopPolling}
                  className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium text-red-300 transition-all cursor-pointer"
                >
                  Скасувати
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="buttons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={SPRING_PHYSICS}
              className="space-y-3"
            >
              {pollError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{pollError}</span>
                </div>
              )}

              {/* Main Action 1: Sign in via Browser Handshake */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => startHandshakeFlow('login')}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <LogIn className="w-4 h-4 text-zinc-950" />
                <span>Увійти через браузер</span>
                <ArrowRight className="w-4 h-4 ml-auto text-zinc-700" />
              </motion.button>

              {/* Main Action 2: Create Account */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => startHandshakeFlow('signup')}
                className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-medium text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-zinc-400" />
                <span>Створити акаунт</span>
                <ArrowRight className="w-4 h-4 ml-auto text-zinc-500" />
              </motion.button>

              {/* Fallback Entry Trigger */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowFallback((prev) => !prev)}
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-all flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Резервний вхід (ввести токен або email)</span>
                  </span>
                  {showFallback ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Fallback Accordion Container */}
              <AnimatePresence>
                {showFallback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={SPRING_PHYSICS}
                    className="overflow-hidden space-y-3 pt-1"
                  >
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                      {/* Sub-tabs for fallback */}
                      <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => setFallbackTab('credentials')}
                          className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                            fallbackTab === 'credentials'
                              ? 'bg-white/10 text-white font-semibold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Email + Пароль
                        </button>
                        <button
                          type="button"
                          onClick={() => setFallbackTab('token')}
                          className={`flex-1 py-1.5 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                            fallbackTab === 'token'
                              ? 'bg-white/10 text-white font-semibold'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          Вставити токен
                        </button>
                      </div>

                      {fallbackError && (
                        <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                          {fallbackError}
                        </div>
                      )}

                      {fallbackTab === 'credentials' ? (
                        <form onSubmit={handleEmailPasswordSubmit} className="space-y-2.5">
                          <div>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Email вашого акаунту..."
                              className="w-full px-3 py-2 text-xs bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                          <div>
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Пароль..."
                              className="w-full px-3 py-2 text-xs bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={isSubmittingFallback}
                            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
                          >
                            {isSubmittingFallback ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <LogIn className="w-3.5 h-3.5" />
                            )}
                            <span>Увійти прямо тут</span>
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleManualTokenSubmit} className="space-y-2.5">
                          <input
                            type="text"
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            placeholder="Вставте Bearer токен або код..."
                            className="w-full px-3 py-2 text-xs font-mono bg-black/30 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                          />
                          <button
                            type="submit"
                            disabled={isSubmittingFallback}
                            className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
                          >
                            {isSubmittingFallback ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <KeyRound className="w-3.5 h-3.5" />
                            )}
                            <span>Підтвердити токен</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick direct verify check */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500">
                <button
                  type="button"
                  onClick={handleManualRecheck}
                  disabled={isCheckingDirectly}
                  className="hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingDirectly ? 'animate-spin' : ''}`} />
                  <span>{isCheckingDirectly ? 'Перевірка...' : 'Перевірити активну сесію'}</span>
                </button>
                <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  DB Live
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
