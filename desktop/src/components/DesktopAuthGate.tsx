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
import { LevitatingGhostMascot } from '../ui/LevitatingGhostMascot';
import { SPRING } from '../ui/primitives';

export interface DesktopAuthGateProps {
  onSuccess: (user: UserProfileData, token: string) => void;
  onDemoMode: () => void;
  backendUrl?: string;
}

const TURBO_POLL_MS = 400;
const HANDSHAKE_TIMEOUT_MS = 3 * 60 * 1000;

export const DesktopAuthGate: React.FC<DesktopAuthGateProps> = ({
  onSuccess,
  onDemoMode,
  backendUrl,
}) => {
  const emailId = useId();
  const passwordId = useId();

  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [detectedHost, setDetectedHost] = useState<string | null>(null);

  // Handshake / Browser OAuth state
  const [handshakeId, setHandshakeId] = useState<string | null>(null);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [pollingState, setPollingState] = useState<'idle' | 'waiting' | 'verified' | 'error'>('idle');
  const [activeProviderLabel, setActiveProviderLabel] = useState<string>('браузер');
  const [pollError, setPollError] = useState<string | null>(null);
  const [isRechecking, setIsRechecking] = useState(false);

  // Direct Email + Password login inside desktop window
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
      try {
        await saveTokens(token, {
          userId: user?.id,
          email: user?.email,
          plan: user?.plan,
        });
      } catch {
        // Keyring fallback to localStorage still succeeds
      }
      setAuthToken(token);

      let resolvedUser = user;
      if (!resolvedUser) {
        const auth = await checkAuth(token);
        if (auth.authenticated && auth.user) {
          resolvedUser = auth.user;
        }
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
        } else if (pollRes.code === 'expired' || pollRes.error === 'expired') {
          stopPolling();
          setPollingState('error');
          setPollError('Час очікування минув. Запустіть вхід повторно.');
        }
      } catch {
        // Transient network error while polling every 400ms; next tick retries silently
      } finally {
        pollInFlightRef.current = false;
      }
    },
    [completeLoginSuccess, stopPolling]
  );

  // Instant handshake check when user returns focus to the desktop window from browser
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
            setPollError('Локальний чи хмарний сервер не відповідає. Спробуйте Автономний / Демо-режим.');
            return;
          }
        }

        const res = await initHandshake();
        const base = detectedHost || backendUrl || getResolvedBaseUrl();
        const targetUrl =
          target === 'google'
            ? `${base}/api/auth/oauth/google?client=desktop&handshake=${encodeURIComponent(res.handshakeId)}&from=/interview`
            : target === 'github'
              ? `${base}/api/auth/oauth/github?client=desktop&handshake=${encodeURIComponent(res.handshakeId)}&from=/interview`
              : res.loginUrl;

        setHandshakeId(res.handshakeId);
        setBrowserUrl(targetUrl);
        activeHandshakeRef.current = res.handshakeId;

        await openBrowser(targetUrl);

        pollIntervalRef.current = setInterval(() => {
          void pollOnce(res.handshakeId);
        }, TURBO_POLL_MS);

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
          setFormError(res.error || 'Невірний email або пароль.');
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

  // Listen for native deep-link callbacks (ghostboard://auth?token=...)
  useEffect(() => {
    if (!isTauriEnvironment()) return;
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) =>
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
          } catch (err) {
            console.debug('[DesktopAuthGate] Deep link parse err:', err);
          }
        }).then((un) => {
          unlisten = un;
        })
      )
      .catch(() => {});

    return () => {
      unlisten?.();
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
        className="relative w-full max-w-[440px] rounded-2xl border border-white/[0.08] bg-[#111114] p-5 sm:p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_28px_80px_rgba(0,0,0,0.85)] space-y-4"
      >
        {/* Top telemetry status strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10.5px] font-mono uppercase tracking-[0.08em] text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            STEALTH ENGINE READY
          </div>

          <button
            type="button"
            onClick={() => void recheckBackend()}
            title={`Хост: ${activeHost}. Натисніть для повторної перевірки`}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#09090b] px-2.5 py-1 text-[10.5px] font-mono text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200 cursor-pointer"
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

        {/* Hero levitating ghost & Monochrome Title */}
        <div className="flex flex-col items-center text-center pt-1">
          <LevitatingGhostMascot
            size="sm"
            showModePills={false}
            mode={isWaiting ? 'split' : 'stealth'}
          />
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-white">
            Stealth Access Pass
          </h1>
          <p className="mt-0.5 text-xs text-zinc-400 max-w-[32ch]">
            Синхронізуйте акаунт Ghostboard або продовжуйте локально з OS Keyring.
          </p>
        </div>

        {/* Primary CTA: Instant Browser Auth + Quick Google / GitHub */}
        <div className="space-y-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.975 }}
            transition={SPRING}
            onClick={() => void startBrowserFlow('login')}
            disabled={isWaiting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_28px_rgba(255,255,255,0.08)] transition-colors hover:bg-zinc-100 disabled:opacity-65 cursor-pointer"
          >
            {isWaiting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {isWaiting ? `Очікуємо підтвердження (${activeProviderLabel})...` : '⚡ Увійти через браузер'}
          </motion.button>

          <div className="grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.975 }}
              transition={SPRING}
              onClick={() => void startBrowserFlow('google')}
              disabled={isWaiting}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#16161a] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-55 cursor-pointer"
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
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.975 }}
              transition={SPRING}
              onClick={() => void startBrowserFlow('github')}
              disabled={isWaiting}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#16161a] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:text-white disabled:opacity-55 cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
              </svg>
              GitHub
            </motion.button>
          </div>
        </div>

        {/* Live Handshake waiting / success / error feedback */}
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
                  <span>Турбо-опитування ({TURBO_POLL_MS}ms) • код {handshakeId?.slice(0, 6)}</span>
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
        <div className="flex items-center gap-2.5 text-[10.5px] font-mono uppercase tracking-[0.1em] text-zinc-500">
          <div className="h-px flex-1 bg-white/[0.08]" />
          <span>або вхід за Email</span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Direct Email + Password Login inside Desktop */}
        <form onSubmit={(e) => void handleDirectEmailLogin(e)} className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor={emailId} className="sr-only">
                Email
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) {
                    e.preventDefault();
                  }
                }}
                className="gb-input h-9 text-xs"
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
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) {
                    e.preventDefault();
                  }
                }}
                className="gb-input h-9 text-xs"
              />
            </div>
          </div>

          {formError && (
            <p className="text-[11px] text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmittingEmail}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:opacity-50 cursor-pointer"
          >
            {isSubmittingEmail ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5 text-zinc-400" />
            )}
            {isSubmittingEmail ? 'Перевірка...' : 'Увійти за паролем'}
          </button>
        </form>

        {/* Autonomous / Offline Demo Strip */}
        <div
          className={`rounded-xl border p-3 transition-colors ${
            backendStatus === 'offline'
              ? 'border-amber-500/35 bg-amber-500/[0.06]'
              : 'border-white/[0.07] bg-[#09090b]'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[11px] text-zinc-300 font-medium">
              {backendStatus === 'offline'
                ? 'Локальний/хмарний сервер зараз не запущено'
                : 'Автономна робота через локальний Rust Core'}
            </div>
            <span className="rounded px-1.5 py-0.5 text-[9.5px] font-mono uppercase bg-white/[0.06] text-zinc-400">
              .env keys
            </span>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING}
            onClick={onDemoMode}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#141418] px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:border-white/25 hover:bg-[#1a1a20] cursor-pointer"
          >
            <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
            🧪 Продовжити в Автономному / Демо-режимі
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default DesktopAuthGate;
