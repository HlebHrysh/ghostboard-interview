import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
  KeyRound,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import {
  apiFetch,
  checkAuth,
  detectBackendUrl,
  getResolvedBaseUrl,
  initHandshake,
  isBackendOffline,
  pollHandshake,
  setAuthToken,
  type UserProfileData,
} from '../lib/apiClient';
import { isTauriEnvironment, openBrowser, saveTokens } from '../lib/tauriBridge';
import { SPRING } from '../ui/primitives';

export interface DesktopAuthGateProps {
  onSuccess: (user: UserProfileData, token: string) => void;
  onDemoMode: () => void;
  backendUrl?: string;
}

// 400ms fast handshake polling (150 req/min, safely under 240/min limit) + instant check on window focus
const HANDSHAKE_POLL_MS = 400;
const HANDSHAKE_TIMEOUT_MS = 3 * 60 * 1000;

function formatLoginError(code?: string, fallbackError?: string): string {
  switch (code) {
    case 'USER_NOT_FOUND':
      return 'Користувача з таким email не знайдено. Перевірте email або зареєструйтесь на сайті.';
    case 'WRONG_PASSWORD':
      return 'Невірний пароль. Спробуйте ще раз або увійдіть через браузер.';
    case 'PASSWORD_NOT_SET':
      return 'Цей акаунт створено через Google або GitHub. Натисніть відповідну кнопку вище.';
    case 'RATE_LIMITED':
      return 'Забагато спроб входу. Зачекайте трохи або скористайтеся входом через браузер.';
    default:
      if (fallbackError === 'BACKEND_OFFLINE') {
        return 'Локальний сервер не відповідає. Запустіть сайт або увійдіть в Автономний / Демо-режим.';
      }
      return fallbackError || 'Не вдалося увійти. Перевірте email та пароль.';
  }
}

function extractUrlFromDeepLinkPayload(payload: unknown): string | null {
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) {
    const first = payload.find((item) => typeof item === 'string');
    return typeof first === 'string' ? first : null;
  }
  return null;
}

export const DesktopAuthGate: React.FC<DesktopAuthGateProps> = ({
  onSuccess,
  onDemoMode,
  backendUrl,
}) => {
  const emailId = useId();
  const passwordId = useId();

  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [detectedHost, setDetectedHost] = useState<string | null>(null);

  const [handshakeId, setHandshakeId] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [pollingState, setPollingState] = useState<'idle' | 'waiting' | 'verified' | 'error'>('idle');
  const [activeProviderLabel, setActiveProviderLabel] = useState<string>('браузер');
  const [pollError, setPollError] = useState<string | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeHandshakeRef = useRef<string | null>(null);
  const pollInFlightRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    activeHandshakeRef.current = null;
    pollInFlightRef.current = false;
  }, []);

  const recheckBackend = useCallback(async () => {
    setBackendStatus('checking');
    const url = await detectBackendUrl(true);
    setDetectedHost(url);
    setBackendStatus(isBackendOffline() ? 'offline' : 'online');
  }, []);

  useEffect(() => {
    void recheckBackend();
  }, [recheckBackend]);

  const completeLoginSuccess = useCallback(
    async (token: string, user?: UserProfileData) => {
      stopPolling();
      setAuthToken(token);

      let resolvedUser = user;
      if (!resolvedUser) {
        const auth = await checkAuth(token);
        if (auth.authenticated && auth.user) {
          resolvedUser = auth.user;
        }
      }

      try {
        await saveTokens(token, {
          userId: resolvedUser?.id,
          email: resolvedUser?.email,
          plan: resolvedUser?.plan,
        });
      } catch {
        // Keyring fallback to localStorage still succeeds
      }

      const finalUser: UserProfileData = resolvedUser || {
        id: 'desktop_user',
        email: email.trim() || 'pro@ghostboard.ai',
        plan: 'pro',
      };

      setPollingState('verified');
      setTimeout(() => onSuccess(finalUser, token), 220);
    },
    [email, onSuccess, stopPolling]
  );

  const pollOnce = useCallback(
    async (id: string) => {
      if (pollInFlightRef.current || activeHandshakeRef.current !== id) return;
      pollInFlightRef.current = true;
      try {
        const pollRes = await pollHandshake(id);
        if (pollRes.ready && pollRes.token) {
          await completeLoginSuccess(pollRes.token, pollRes.user);
        } else if (pollRes.code === 'HANDSHAKE_NOT_FOUND' || pollRes.error === 'expired') {
          stopPolling();
          setPollingState('error');
          setPollError('Час очікування минув. Натисніть «Увійти через браузер» ще раз.');
        }
      } catch {
        // Transient network hiccup; next tick or focus re-check retries
      } finally {
        pollInFlightRef.current = false;
      }
    },
    [completeLoginSuccess, stopPolling]
  );

  // Instant handshake check when user switches back from browser to Desktop
  useEffect(() => {
    const triggerFocusRecheck = () => {
      const id = activeHandshakeRef.current;
      if (id && pollingState === 'waiting') {
        void pollOnce(id);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        triggerFocusRecheck();
      }
    };
    window.addEventListener('focus', triggerFocusRecheck);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', triggerFocusRecheck);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pollOnce, pollingState]);

  const startBrowserFlow = useCallback(
    async (target: 'login' | 'google' | 'github') => {
      stopPolling();
      setPollError(null);
      setFormError(null);
      setPollingState('waiting');
      setActiveProviderLabel(
        target === 'google' ? 'Google' : target === 'github' ? 'GitHub' : 'браузер'
      );

      try {
        if (isBackendOffline()) {
          await recheckBackend();
          if (isBackendOffline()) {
            setPollingState('error');
            setPollError('Локальний сервер не відповідає. Перейдіть в Автономний / Демо-режим.');
            return;
          }
        }

        const res = await initHandshake();
        // Resolve web browser origin from server's loginUrl (avoids opening Vite :5173 proxy in Chrome/Firefox)
        let webOrigin = detectedHost || backendUrl || getResolvedBaseUrl();
        try {
          if (res.loginUrl) {
            webOrigin = new URL(res.loginUrl).origin;
          }
        } catch {
          // Keep resolved base URL
        }

        const targetUrl =
          target === 'google'
            ? `${webOrigin}/api/auth/oauth/google?client=desktop&handshake=${encodeURIComponent(res.handshakeId)}&from=/interview`
            : target === 'github'
              ? `${webOrigin}/api/auth/oauth/github?client=desktop&handshake=${encodeURIComponent(res.handshakeId)}&from=/interview`
              : res.loginUrl;

        setHandshakeId(res.handshakeId);
        setBrowserUrl(targetUrl);
        activeHandshakeRef.current = res.handshakeId;

        await openBrowser(targetUrl);

        pollIntervalRef.current = setInterval(() => {
          void pollOnce(res.handshakeId);
        }, HANDSHAKE_POLL_MS);

        pollTimeoutRef.current = setTimeout(() => {
          if (activeHandshakeRef.current === res.handshakeId) {
            stopPolling();
            setPollingState('error');
            setPollError('Час очікування минув (3 хв). Спробуйте ще раз.');
          }
        }, HANDSHAKE_TIMEOUT_MS);
      } catch (err) {
        stopPolling();
        setPollingState('error');
        setPollError(
          err instanceof Error ? err.message : 'Не вдалося ініціалізувати вхід через браузер.'
        );
      }
    },
    [backendUrl, detectedHost, pollOnce, recheckBackend, stopPolling]
  );

  const handleDirectEmailLogin = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (isSubmittingEmail) return;
      if (!email.trim() || !password) {
        setFormError('Введіть email та пароль.');
        return;
      }

      setIsSubmittingEmail(true);
      setFormError(null);
      setPollError(null);

      try {
        if (isBackendOffline()) {
          await recheckBackend();
        }
        const res = await apiFetch<{
          success: boolean;
          token?: string;
          user?: UserProfileData;
          error?: string;
          code?: string;
        }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
            client: 'desktop',
          }),
        });

        if (res.ok && res.data?.token) {
          await completeLoginSuccess(res.data.token, res.data.user);
        } else {
          setFormError(formatLoginError(res.code || res.data?.code, res.error || res.data?.error));
        }
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : 'Сервер недоступний. Увійдіть в Демо-режим.'
        );
      } finally {
        setIsSubmittingEmail(false);
      }
    },
    [completeLoginSuccess, email, isSubmittingEmail, password, recheckBackend]
  );

  const handleManualRecheck = useCallback(async () => {
    setIsRechecking(true);
    setPollError(null);
    try {
      if (activeHandshakeRef.current) {
        await pollOnce(activeHandshakeRef.current);
      }
      const auth = await checkAuth();
      if (auth.authenticated && auth.user) {
        stopPolling();
        onSuccess(auth.user, 'stored_token');
      } else if (pollingState !== 'verified') {
        setPollError('Активну сесію поки не знайдено. Завершіть вхід або скористайтеся Демо-режимом.');
      }
    } catch (err) {
      setPollError(err instanceof Error ? err.message : 'Не вдалося перевірити сесію.');
    } finally {
      setIsRechecking(false);
    }
  }, [onSuccess, pollOnce, pollingState, stopPolling]);

  // Listen for native deep-link callbacks (Rust emits string[] on deep-link://new-url & string on ghostboard://deep-link)
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    const unlisteners: Array<() => void> = [];

    const handleDeepLinkPayload = async (payload: unknown) => {
      const raw = extractUrlFromDeepLinkPayload(payload);
      if (!raw || !raw.includes('token=')) return;
      try {
        const url = new URL(raw);
        const token = url.searchParams.get('token');
        if (!token) return;
        const auth = await checkAuth(token);
        if (auth.authenticated && auth.user) {
          await completeLoginSuccess(token, auth.user);
        }
      } catch (err) {
        console.debug('[DesktopAuthGate] Deep link parse err:', err);
      }
    };

    import('@tauri-apps/api/event')
      .then(async ({ listen }) => {
        unlisteners.push(await listen<unknown>('deep-link://new-url', (ev) => void handleDeepLinkPayload(ev.payload)));
        unlisteners.push(await listen<unknown>('ghostboard://deep-link', (ev) => void handleDeepLinkPayload(ev.payload)));
      })
      .catch(() => {});

    return () => {
      unlisteners.forEach((off) => off());
    };
  }, [completeLoginSuccess]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const activeHost = detectedHost || backendUrl || getResolvedBaseUrl();
  const isWaiting = pollingState === 'waiting';

  return (
    <div
      data-tauri-drag-region
      className="gb-office fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 select-none cursor-default"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING}
        className="gb-hairline-top relative w-full max-w-[448px] rounded-[20px] border border-white/[0.09] bg-[#111114] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_32px_90px_rgba(0,0,0,0.88)] space-y-5"
      >
        {/* Subtle optical corner ticks for precision engineering craft */}
        <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-2.5 h-2 w-2 border-l border-t border-white/15 rounded-tl-[2px]" />
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 top-2.5 h-2 w-2 border-r border-t border-white/15 rounded-tr-[2px]" />
        <span aria-hidden="true" className="pointer-events-none absolute left-2.5 bottom-2.5 h-2 w-2 border-l border-b border-white/15 rounded-bl-[2px]" />
        <span aria-hidden="true" className="pointer-events-none absolute right-2.5 bottom-2.5 h-2 w-2 border-r border-b border-white/15 rounded-br-[2px]" />

        {/* Top telemetry status strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.1em] text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            STEALTH ENGINE READY
          </div>

          <button
            type="button"
            onClick={() => void recheckBackend()}
            title={`Хост: ${activeHost}. Натисніть для повторної перевірки`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#09090b] px-2.5 py-1 text-[10px] font-mono text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200 cursor-pointer"
          >
            {backendStatus === 'checking' ? (
              <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
            ) : backendStatus === 'online' ? (
              <Wifi className="h-3 w-3 text-emerald-400" />
            ) : (
              <WifiOff className="h-3 w-3 text-amber-400" />
            )}
            <span>
              {backendStatus === 'checking'
                ? 'Пошук...'
                : backendStatus === 'online'
                  ? activeHost.includes('localhost') || activeHost.includes('127.0.0.1')
                    ? 'Local Engine'
                    : 'Cloud Sync'
                  : 'Offline'}
            </span>
          </button>
        </div>

        {/* Clean Monochrome Brand Header */}
        <div className="flex items-center gap-3.5 pt-0.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.14] bg-[#09090b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_10px_24px_-8px_rgba(0,0,0,0.8)] overflow-hidden">
            <img
              src="./icon.svg"
              alt="Ghostboard"
              draggable={false}
              className="h-6.5 w-6.5 object-contain"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[19px] font-bold tracking-tight text-white">
                Stealth Access Pass
              </h1>
              <span className="rounded-md border border-white/10 bg-[#09090b] px-1.5 py-0.5 font-mono text-[9.5px] text-zinc-400">
                v2
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
              Увійдіть в акаунт Ghostboard для синхронізації або працюйте локально.
            </p>
          </div>
        </div>

        {/* Primary CTA: Browser Handshake + Google / GitHub */}
        <div className="space-y-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.012 }}
            whileTap={{ scale: 0.978 }}
            transition={SPRING}
            onClick={() => void startBrowserFlow('login')}
            disabled={isWaiting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white to-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_28px_rgba(255,255,255,0.09)] transition-colors hover:to-white disabled:opacity-65 cursor-pointer"
          >
            {isWaiting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            <span>
              {isWaiting ? `Очікуємо підтвердження (${activeProviderLabel})...` : 'Увійти через браузер'}
            </span>
          </motion.button>

          <div className="grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.978 }}
              transition={SPRING}
              onClick={() => void startBrowserFlow('google')}
              disabled={isWaiting}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#16161b] px-3 py-2 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)] transition-colors hover:border-white/20 hover:text-white disabled:opacity-55 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z"
                />
              </svg>
              Google
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.978 }}
              transition={SPRING}
              onClick={() => void startBrowserFlow('github')}
              disabled={isWaiting}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#16161b] px-3 py-2 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)] transition-colors hover:border-white/20 hover:text-white disabled:opacity-55 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
              GitHub
            </motion.button>
          </div>
        </div>

        {/* Live Handshake Feedback */}
        <AnimatePresence mode="popLayout">
          {isWaiting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
              className="rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-[11.5px] text-zinc-300 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                  <span>Очікуємо підтвердження · код {handshakeId?.slice(0, 6)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleManualRecheck()}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-zinc-200 hover:bg-white/[0.1] cursor-pointer"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${isRechecking ? 'animate-spin' : ''}`} />
                  Перевірити
                </button>
              </div>
              {browserUrl && (
                <div className="flex items-center justify-between gap-2 text-[10.5px] text-zinc-500">
                  <span className="truncate">Не відкрився браузер?</span>
                  <button
                    type="button"
                    onClick={() => void openBrowser(browserUrl)}
                    className="inline-flex items-center gap-1 text-zinc-300 hover:text-white cursor-pointer shrink-0"
                  >
                    Відкрити ще раз <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {pollingState === 'verified' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Доступ підтверджено. Відкриваємо Ghostboard Office...
            </motion.div>
          )}

          {pollError && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-300"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{pollError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider */}
        <div className="flex items-center gap-2.5 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span>або вхід за Email</span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Direct Email + Password Login */}
        <form onSubmit={(e) => void handleDirectEmailLogin(e)} className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor={emailId} className="sr-only">
                Email
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) {
                    e.preventDefault();
                  }
                }}
                className="gb-input h-9 text-xs bg-[#09090b]"
              />
            </div>
            <div>
              <label htmlFor={passwordId} className="sr-only">
                Пароль
              </label>
              <input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) {
                    e.preventDefault();
                  }
                }}
                className="gb-input h-9 text-xs bg-[#09090b]"
              />
            </div>
          </div>

          {formError && (
            <p className="text-[11px] text-rose-300 flex items-start gap-1.5 leading-snug">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmittingEmail}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.09] bg-[#16161b] px-3 py-2 text-xs font-medium text-zinc-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-colors hover:border-white/20 hover:bg-[#1c1c23] hover:text-white disabled:opacity-50 cursor-pointer"
          >
            {isSubmittingEmail ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
            )}
            <span>{isSubmittingEmail ? 'Перевірка...' : 'Увійти за паролем'}</span>
          </button>
        </form>

        {/* Autonomous / Demo Mode Card */}
        <div
          className={`rounded-xl border p-3 transition-colors ${
            backendStatus === 'offline'
              ? 'border-amber-500/35 bg-amber-500/[0.06]'
              : 'border-white/[0.07] bg-[#0a0a0d]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[11px] text-zinc-300 font-medium">
              {backendStatus === 'offline'
                ? 'Локальний сервер зараз не запущено'
                : 'Автономна робота через Rust Core'}
            </div>
            <span className="rounded border border-white/[0.08] bg-[#141418] px-1.5 py-0.5 text-[9.5px] font-mono uppercase text-zinc-400">
              .env keys
            </span>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            transition={SPRING}
            onClick={onDemoMode}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/12 bg-[#141418] px-3 py-2 text-xs font-medium text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-colors hover:border-white/25 hover:bg-[#1a1a20] cursor-pointer"
          >
            <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
            <span>Продовжити в Автономному / Демо-режимі</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default DesktopAuthGate;
