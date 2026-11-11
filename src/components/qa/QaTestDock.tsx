'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  CreditCard,
  UserCheck,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Terminal,
  Activity,
  Server,
  Database,
  Radio,
  Cpu,
  VolumeX,
  Code2,
  Workflow,
  X,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface InfraStatus {
  database: {
    status: 'connected' | 'fallback_memory' | 'circuit_broken' | 'error';
    latencyMs: number | null;
    engine: 'postgresql' | 'in_memory';
  };
  redis: {
    status: 'connected' | 'fallback_memory' | 'not_configured' | 'error';
    latencyMs: number | null;
  };
  gemini: {
    configured: boolean;
    primaryModel: string;
    status: 'healthy' | 'missing_key';
  };
  deepgram: {
    configured: boolean;
    status: 'ready' | 'missing_key';
  };
  stripe: {
    mode: 'live_keys' | 'test_keys' | 'simulator_active';
  };
}

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  role: string | null;
  trialQuestionsUsed: number;
}

interface QaProbeResponse {
  qaMode: boolean;
  environment: string;
  timestamp: number;
  infrastructure: InfraStatus;
  currentUser: CurrentUser | null;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 350,
  damping: 28,
  mass: 0.6,
};

export function QaTestDock() {
  // Only render when NEXT_PUBLIC_QA_MODE is explicitly enabled
  const isQaEnabled = process.env.NEXT_PUBLIC_QA_MODE === 'true';

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mutatingAction, setMutatingAction] = useState<string | null>(null);
  const [probeData, setProbeData] = useState<QaProbeResponse | null>(null);
  const [streamLog, setStreamLog] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Fetch real-time health probe
  const fetchProbe = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch('/api/qa/control', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data: QaProbeResponse = await res.json();
        setProbeData(data);
      }
    } catch (err) {
      console.warn('[QaTestDock] Probe failed:', err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Keyboard shortcut: Ctrl+Shift+K to toggle
  useEffect(() => {
    if (!isQaEnabled) return;
    fetchProbe();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQaEnabled, fetchProbe]);

  // Periodic background refresh every 15s when dock is open
  useEffect(() => {
    if (!isOpen || !isQaEnabled) return;
    const interval = setInterval(() => fetchProbe(true), 15000);
    return () => clearInterval(interval);
  }, [isOpen, isQaEnabled, fetchProbe]);

  if (!isQaEnabled) return null;

  // Execute QA state mutation
  const handleAction = async (action: string, payload: Record<string, unknown> = {}) => {
    setMutatingAction(action);
    try {
      const res = await fetch('/api/qa/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Дія не вдалася');
        return;
      }

      toast.success(data.message || 'Дію успішно виконано');
      await fetchProbe(true);

      // Trigger custom UI event so pages immediately re-render active session
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ghostboard:auth_changed', { detail: data.user }));
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setMutatingAction(null);
    }
  };

  // Live Copilot Stress-Test Injection
  const handleInjectQuestion = async (
    type: 'system_design' | 'coding' | 'noise'
  ) => {
    let questionText = '';
    if (type === 'system_design') {
      questionText = 'Як спроєктувати розподілений Rate Limiter на Redis з ковзним вікном для 50,000 rps?';
    } else if (type === 'coding') {
      questionText = 'Реалізуй LRU Cache з O(1) операціями get та put мовою TypeScript з doubly linked list.';
    } else {
      questionText = 'Так, друзі, чекаємо підключення звуку в чаті, напишіть плюс якщо чути нормально...';
    }

    const isOnInterview =
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/interview') ||
        window.location.pathname.startsWith('/mock-interview'));

    if (isOnInterview) {
      window.dispatchEvent(
        new CustomEvent('ghostboard:qa_inject_transcript', {
          detail: {
            text: questionText,
            isFinal: true,
            speechFinal: true,
            speaker: 'interviewer',
          },
        })
      );
      toast.success(
        type === 'noise'
          ? '🔇 Шум вебінару надіслано в live потік (перевірка фільтрації <<<IGNORE>>>)'
          : `🎯 Питання надіслано в телесуфлер: "${questionText.slice(0, 40)}..."`
      );
      return;
    }

    // If outside /interview, run direct live streaming test
    setIsStreaming(true);
    setStreamLog(`🚀 Відправка запиту в /api/ai/dual-stream:\n"${questionText}"\n\n`);

    try {
      const response = await fetch('/api/ai/dual-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          outputLanguage: 'uk',
          helperLanguage: 'uk',
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        setStreamLog((prev) => `${prev}❌ Помилка: ${errJson.error || response.statusText}`);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setStreamLog((prev) => (prev ? prev + chunk : chunk));
      }
      setStreamLog((prev) => `${prev}\n\n✅ Потік успішно завершено!`);
    } catch (err) {
      setStreamLog((prev) => `${prev}\n❌ Помилка з'єднання: ${String(err)}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const dbStatus = probeData?.infrastructure.database.status;
  const dbLatency = probeData?.infrastructure.database.latencyMs;
  const plan = probeData?.currentUser?.plan || 'GUEST';

  return (
    <div className="fixed bottom-4 left-4 z-[9999] select-none font-mono">
      {/* ─────────────────────────────────────────────────────────────
          COMPACT PILL (Collapsed State)
      ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING_TRANSITION}
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#08090a]/90 backdrop-blur-xl border border-white/10 text-xs text-zinc-300 shadow-2xl hover:border-cyan-500/40 hover:text-white transition-all cursor-pointer group"
          title="Відкрити QA Sandbox / God-Mode Dock (Ctrl+Shift+K)"
        >
          <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
            <FlaskConical className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>PROD-TEST</span>
          </span>

          <span className="w-px h-3 bg-zinc-700/80" />

          {/* DB Indicator */}
          <span className="flex items-center gap-1 text-[11px] text-zinc-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                dbStatus === 'connected'
                  ? 'bg-emerald-400'
                  : dbStatus === 'fallback_memory'
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
              }`}
            />
            <span>DB: {dbStatus === 'connected' ? `${dbLatency ?? 1}ms` : 'MEM'}</span>
          </span>

          <span className="w-px h-3 bg-zinc-700/80" />

          {/* Plan Indicator */}
          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
              plan === 'lifetime'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : plan === 'pro'
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {plan}
          </span>
        </motion.button>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EXPANDED QA CONTROL DRAWER
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={SPRING_TRANSITION}
            className="w-[440px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[#090b0e]/95 backdrop-blur-2xl border border-white/12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.1)] text-zinc-200 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold tracking-tight text-white">
                  QA & Prod Test Controller
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
                  Ctrl+Shift+K
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fetchProbe()}
                  disabled={loading}
                  title="Оновити статус інфраструктури"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Згорнути (Ctrl+Shift+K)"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* 1. Infrastructure Status Matrix */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="uppercase tracking-wider font-semibold text-zinc-500">
                    Live Infrastructure
                  </span>
                  <span>{probeData?.environment.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {/* Database */}
                  <div className="p-2 rounded-xl bg-black/40 border border-white/6 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Database className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PostgreSQL</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        dbStatus === 'connected'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : dbStatus === 'fallback_memory'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {dbStatus === 'connected' ? `${dbLatency}ms` : dbStatus || '...'}
                    </span>
                  </div>

                  {/* Redis */}
                  <div className="p-2 rounded-xl bg-black/40 border border-white/6 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Server className="w-3.5 h-3.5 text-rose-400" />
                      <span>Upstash</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        probeData?.infrastructure.redis.status === 'connected'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {probeData?.infrastructure.redis.status === 'connected'
                        ? `${probeData.infrastructure.redis.latencyMs}ms`
                        : 'Memory'}
                    </span>
                  </div>

                  {/* Gemini AI */}
                  <div className="p-2 rounded-xl bg-black/40 border border-white/6 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Cpu className="w-3.5 h-3.5 text-violet-400" />
                      <span>Gemini AI</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        probeData?.infrastructure.gemini.configured
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {probeData?.infrastructure.gemini.configured ? 'Ready' : 'Missing'}
                    </span>
                  </div>

                  {/* Deepgram STT */}
                  <div className="p-2 rounded-xl bg-black/40 border border-white/6 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Deepgram</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        probeData?.infrastructure.deepgram.configured
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {probeData?.infrastructure.deepgram.configured ? 'Nova-3' : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Account & Real DB Plan Switcher */}
              <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="uppercase tracking-wider font-semibold text-zinc-500">
                    Active Account & Plan
                  </span>
                  <span className="text-zinc-400">
                    {probeData?.currentUser ? (
                      <span className="text-emerald-400 font-mono">
                        {probeData.currentUser.email}
                      </span>
                    ) : (
                      <span className="text-zinc-500">Не авторизовано</span>
                    )}
                  </span>
                </div>

                {/* Quick login button if logged out */}
                {!probeData?.currentUser && (
                  <button
                    type="button"
                    onClick={() => handleAction('seed_test_user')}
                    disabled={mutatingAction === 'seed_test_user'}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>⚡ Quick Login QA User (qa@ghostboard.ai)</span>
                  </button>
                )}

                {/* Plan Switchers */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAction('set_plan', { plan: 'free' })}
                    disabled={mutatingAction === 'set_plan'}
                    className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] transition cursor-pointer border ${
                      plan === 'free'
                        ? 'bg-zinc-800 text-white border-zinc-500 shadow-sm'
                        : 'bg-black/30 text-zinc-400 border-white/6 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    Set FREE
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction('set_plan', { plan: 'pro' })}
                    disabled={mutatingAction === 'set_plan'}
                    className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] transition cursor-pointer border ${
                      plan === 'pro'
                        ? 'bg-violet-600/30 text-violet-300 border-violet-500 shadow-sm'
                        : 'bg-black/30 text-zinc-400 border-white/6 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    Set PRO
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction('set_plan', { plan: 'lifetime' })}
                    disabled={mutatingAction === 'set_plan'}
                    className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] transition cursor-pointer border ${
                      plan === 'lifetime'
                        ? 'bg-amber-600/30 text-amber-300 border-amber-500 shadow-sm'
                        : 'bg-black/30 text-zinc-400 border-white/6 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    Set LIFETIME
                  </button>
                </div>

                {/* Secondary mutation controls */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAction('reset_usage')}
                    disabled={mutatingAction === 'reset_usage' || !probeData?.currentUser}
                    title="Скинути лічильник використаних trial-питань до 0"
                    className="py-1.5 px-2.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/6 text-zinc-300 flex items-center justify-center gap-1.5 text-[11px] transition cursor-pointer disabled:opacity-40"
                  >
                    <RotateCcw className="w-3 h-3 text-cyan-400" />
                    <span>Reset Usage ({probeData?.currentUser?.trialQuestionsUsed || 0}/5)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction('simulate_webhook_payment', { plan: 'pro' })}
                    disabled={mutatingAction === 'simulate_webhook_payment'}
                    title="Виконати повний пайплайн Stripe webhook checkout.session.completed з логуванням платежу"
                    className="py-1.5 px-2.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/6 text-zinc-300 flex items-center justify-center gap-1.5 text-[11px] transition cursor-pointer"
                  >
                    <CreditCard className="w-3 h-3 text-emerald-400" />
                    <span>💳 Test Webhook Sim</span>
                  </button>
                </div>
              </div>

              {/* 3. Live Copilot Stress-Test Triggers */}
              <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="uppercase tracking-wider font-semibold text-zinc-500">
                    Live Copilot Triggers
                  </span>
                  <span className="text-[10px] text-zinc-500">Dual-Stream & Intent</span>
                </div>

                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleInjectQuestion('system_design')}
                    disabled={isStreaming}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/8 text-zinc-300 flex items-center justify-between text-[11px] transition cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                      <span>🎯 Inject Senior System Design Q</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInjectQuestion('coding')}
                    disabled={isStreaming}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/8 text-zinc-300 flex items-center justify-between text-[11px] transition cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-violet-400" />
                      <span>💻 Inject Coding / LeetCode Q</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleInjectQuestion('noise')}
                    disabled={isStreaming}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/8 text-zinc-300 flex items-center justify-between text-[11px] transition cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                      <span>🔇 Inject Webinar Noise (Filter Test)</span>
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              </div>

              {/* Stream Live Terminal Console (when streaming outside /interview) */}
              {streamLog && (
                <div className="pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Terminal className="w-3 h-3 text-zinc-400" />
                      <span>AI Stream Console</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStreamLog(null)}
                      className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <pre className="p-2 rounded-lg bg-black/80 border border-white/8 text-[10px] font-mono text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap select-text">
                    {streamLog}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
