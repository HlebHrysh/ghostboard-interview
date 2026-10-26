import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
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
  Wifi,
  Globe,
} from 'lucide-react';
import {
  initHandshake,
  pollHandshake,
  setAuthToken,
  checkAuth,
  getResolvedBaseUrl,
  type UserProfileData,
} from '../lib/apiClient';
import { saveTokens, openBrowser, isTauriEnvironment } from '../lib/tauriBridge';

interface AuthGateScreenProps {
  onSuccess: (user: UserProfileData, token: string) => void;
  backendUrl?: string;
  onSwitchBackend?: () => void;
}

const SPRING_PHYSICS = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export function AuthGateScreen({ onSuccess, backendUrl }: AuthGateScreenProps) {
  const [isWaitingForBrowser, setIsWaitingForBrowser] = useState(false);
  const [activeHandshakeId, setActiveHandshakeId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [pollError, setPollError] = useState<string | null>(null);
  const [isCheckingDirectly, setIsCheckingDirectly] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const secondsTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const startHandshakeFlow = async (mode: 'login' | 'signup') => {
    setPollError(null);
    setIsWaitingForBrowser(true);
    setSecondsWaiting(0);

    try {
      const res = await initHandshake();
      const targetUrl = mode === 'signup' ? res.signupUrl : res.loginUrl;
      setActiveHandshakeId(res.handshakeId);
      setActiveUrl(targetUrl);

      // Open user's default browser to website
      await openBrowserUrl(targetUrl);

      // Start polling every 1.5 seconds
      secondsTimerRef.current = setInterval(() => {
        setSecondsWaiting((s) => s + 1);
      }, 1000);

      pollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await pollHandshake(res.handshakeId);
          if (pollRes.ready && pollRes.token) {
            stopPolling();
            // 1. Save in OS Keyring & memory
            await saveTokens(pollRes.token, {
              userId: pollRes.user?.id,
              email: pollRes.user?.email,
              plan: pollRes.user?.plan,
            });
            setAuthToken(pollRes.token);

            // 2. Report success to parent App
            if (pollRes.user) {
              onSuccess(pollRes.user, pollRes.token);
            } else {
              // Fetch user data if omitted
              const authRes = await checkAuth(pollRes.token);
              if (authRes.authenticated && authRes.user) {
                onSuccess(authRes.user, pollRes.token);
              }
            }
          } else if (pollRes.code === 'HANDSHAKE_NOT_FOUND') {
            setPollError('Час дії рукостискання вичерпано. Спробуйте ще раз.');
            stopPolling();
          }
        } catch (err) {
          console.debug('[AuthGate] Polling tick error:', err);
        }
      }, 1500);
    } catch (err: unknown) {
      setPollError((err as Error)?.message || 'Помилка з’єднання з сервером');
      setIsWaitingForBrowser(false);
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
        setPollError('Сесію не знайдено в базі сайту. Будь ласка, увійдіть через сайт.');
      }
    } catch (err: unknown) {
      setPollError((err as Error)?.message || 'Помилка перевірки авторизації');
    } finally {
      setIsCheckingDirectly(false);
    }
  };

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
                await saveTokens(token);
                setAuthToken(token);
                const authRes = await checkAuth(token);
                if (authRes.authenticated && authRes.user) {
                  stopPolling();
                  onSuccess(authRes.user, token);
                }
              }
            }
          } catch (e) {
            console.debug('[AuthGateScreen] Deep link parse err:', e);
          }
        }).then((un) => {
          unlisten = un;
        });
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [onSuccess, stopPolling]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const activeHost = backendUrl || getResolvedBaseUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#08090a] select-none overflow-hidden">
      {/* Ambient background mesh light cones */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-[140px] pointer-events-none" />

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
        className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-2xl shadow-2xl space-y-6"
      >
        {/* Brand header & status badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white font-mono uppercase">
                Ghostboard Desktop
              </h2>
              <span className="text-[11px] font-mono text-zinc-500">
                Security & Auth Gate v2.5
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono uppercase tracking-wider">
            <Radio className="w-3 h-3 animate-pulse text-amber-400" />
            <span>Потрібен вхід</span>
          </div>
        </div>

        {/* Informational description */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Синхронізація з базою даних сайту</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed font-sans">
            Для запуску десктопного HUD, захисту від виявлення та завантаження персонального резюме необхідно увійти до вашого акаунту на сайті.
          </p>
          <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono text-zinc-500">
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <span>Сервер: </span>
            <span className="text-zinc-300 truncate max-w-[220px]">{activeHost}</span>
          </div>
        </div>

        {/* Polling active state */}
        <AnimatePresence mode="wait">
          {isWaitingForBrowser ? (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={SPRING_PHYSICS}
              className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-4 text-center"
            >
              <div className="relative flex items-center justify-center w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">
                  Очікуємо підтвердження у браузері...
                </h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Увійдіть або зареєструйтесь на відкритій вкладці сайту. Десктоп автоматично розпізнає вхід.
                </p>
                <div className="pt-2 text-[11px] font-mono text-cyan-400">
                  Опитування триває: {secondsWaiting}с
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
                    <span>Відкрити знову</span>
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

              {/* Button 1: Sign in via Website */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startHandshakeFlow('login')}
                className="w-full py-3.5 px-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs tracking-wide shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer font-sans"
              >
                <LogIn className="w-4 h-4 text-black" />
                <span>Увійти через сайт</span>
                <ArrowRight className="w-4 h-4 ml-auto text-black/70" />
              </motion.button>

              {/* Button 2: Create Account */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => startHandshakeFlow('signup')}
                className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white font-medium text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-zinc-400" />
                <span>Створити акаунт</span>
                <ArrowRight className="w-4 h-4 ml-auto text-zinc-500" />
              </motion.button>

              {/* Quick direct verify check */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-500">
                <button
                  type="button"
                  onClick={handleManualRecheck}
                  disabled={isCheckingDirectly}
                  className="hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingDirectly ? 'animate-spin' : ''}`} />
                  <span>{isCheckingDirectly ? 'Перевірка...' : 'Перевірити вже наявну сесію'}</span>
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
