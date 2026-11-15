'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  Cpu,
  Database,
  Flame,
  Gauge,
  KeyRound,
  Laptop,
  Layers,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  executeDevAction,
  FORCED_MODEL_OPTIONS,
  SPOOF_PLAN_OPTIONS,
  SPRING_TRANSITION,
  type DevTelemetryPayload,
} from './devShared';
import { StreamPhaseInspector } from './StreamPhaseInspector';

export type TelemetryResponse = DevTelemetryPayload;

export function DeveloperWorkbench({
  initialDeveloperEmail,
  initialDeveloperRole,
  initialEffectivePlan,
}: {
  initialDeveloperEmail: string;
  initialDeveloperRole: string;
  initialEffectivePlan: string;
}) {
  const router = useRouter();
  const [telemetry, setTelemetry] = useState<DevTelemetryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoPoll, setAutoPoll] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const loadTelemetry = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/dev/telemetry', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (res.status === 403 || res.status === 401) {
          router.replace('/');
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as DevTelemetryPayload;
          setTelemetry(data);
          if (typeof data.database.latencyMs === 'number') {
            setLatencyHistory((prev) => [
              ...prev.slice(-15),
              data.database.latencyMs as number,
            ]);
          }
        }
      } catch {
        if (!quiet && !controller.signal.aborted) {
          toast.error('Не вдалося завантажити телеметрію');
        }
      } finally {
        if (abortRef.current === controller) {
          setLoading(false);
        }
      }
    },
    [router]
  );

  useEffect(() => {
    void loadTelemetry(false);
    return () => abortRef.current?.abort();
  }, [loadTelemetry]);

  useEffect(() => {
    if (!autoPoll) return;
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      void loadTelemetry(true);
    }, 5000);
    const onVisibility = () => {
      if (!document.hidden) {
        void loadTelemetry(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [autoPoll, loadTelemetry]);

  const runAction = async (
    actionKey: string,
    payload: Record<string, unknown>,
    successMsg: string
  ) => {
    setBusyAction(actionKey);
    try {
      const { ok, data } = await executeDevAction(payload);
      if (!ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Action failed');
        return;
      }
      toast.success(successMsg);
      await loadTelemetry(true);
      if (payload.action === 'override_plan' || payload.action === 'reset_quotas') {
        router.refresh();
      }
    } catch {
      toast.error('Network error');
    } finally {
      setBusyAction(null);
    }
  };

  const companionSyncJson = useMemo(
    () => JSON.stringify(telemetry?.companionSync ?? null, null, 2),
    [telemetry?.companionSync]
  );

  const dev = telemetry?.developer;
  const effectivePlan = (dev?.effectivePlan ?? initialEffectivePlan).toUpperCase();
  const isOverrideActive = dev?.isOverrideActive ?? false;
  const maxChartLatency = Math.max(...latencyHistory, 10);

  return (
    <div className="min-h-screen bg-[#08090a] text-zinc-100 font-mono relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.08),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.07),transparent_50%)]"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
              <Link
                href="/"
                className="inline-flex items-center gap-1 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>App</span>
              </Link>
              <span>/</span>
              <Link href="/interview" className="hover:text-white transition-colors">
                /interview
              </Link>
              <span>/</span>
              <Link href="/admin/users" className="hover:text-white transition-colors">
                /admin/users
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-3">
              <span className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                <Terminal className="w-5 h-5" />
              </span>
              <span>Ghostboard Developer Workbench</span>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  isOverrideActive
                    ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30'
                }`}
              >
                {isOverrideActive ? `SIM: ${effectivePlan}` : 'DEV • UNLIMITED'}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              RBAC Role:{' '}
              <span className="text-white font-bold uppercase">
                {dev?.role ?? initialDeveloperRole}
              </span>{' '}
              • Account:{' '}
              <span className="text-zinc-300">
                {dev?.email ?? initialDeveloperEmail}
              </span>
              {telemetry?.meta?.telemetryLatencyMs != null && (
                <span className="text-zinc-500">
                  {' '}
                  • Telemetry {telemetry.meta.telemetryLatencyMs}ms
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoPoll((p) => !p)}
              className={`px-3 py-2 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                autoPoll
                  ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-300'
                  : 'bg-white/[0.04] border-white/10 text-zinc-400'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{autoPoll ? 'Live 5s Poll ON' : 'Live Poll Paused'}</span>
            </button>
            <button
              type="button"
              onClick={() => void loadTelemetry(false)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              disabled={busyAction === 'flush'}
              onClick={() =>
                void runAction(
                  'flush',
                  { action: 'flush_caches' },
                  'Flushed L1 caches & reset AI circuit breakers'
                )
              }
              className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Flush Caches &amp; Cooldowns</span>
            </button>
          </div>
        </header>

        <section
          aria-label="Tier preview override controls"
          className="p-4 rounded-2xl bg-[#0c0e13]/90 backdrop-blur-xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-300" />
              <span>Entitlement &amp; Paywall Simulation</span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Temporarily spoof effective product plan without touching Stripe or billing records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SPOOF_PLAN_OPTIONS.map((btn) => {
              const active =
                btn.key === 'reset_to_dev_unlimited'
                  ? !isOverrideActive
                  : dev?.overridePlan === btn.key;
              return (
                <motion.button
                  key={btn.key}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={SPRING_TRANSITION}
                  disabled={busyAction === `spoof_${btn.key}`}
                  onClick={() =>
                    void runAction(
                      `spoof_${btn.key}`,
                      { action: 'override_plan', plan: btn.key },
                      `Switched active entitlement to ${btn.label}`
                    )
                  }
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-400/40 text-white'
                      : 'bg-white/[0.03] border-white/10 text-zinc-300 hover:bg-white/[0.08]'
                  }`}
                >
                  {btn.label}
                </motion.button>
              );
            })}

            <button
              type="button"
              disabled={busyAction === 'reset_quotas'}
              onClick={() =>
                void runAction(
                  'reset_quotas',
                  { action: 'reset_quotas' },
                  'Developer trial quotas reset to 0'
                )
              }
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
              <span>Reset Quotas ({dev?.trialQuestionsUsed ?? 0})</span>
            </button>
          </div>
        </section>

        <section
          aria-label="System telemetry summary"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <div className="p-4 rounded-2xl bg-[#0c0e13] border border-white/[0.08]">
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-300" />
              <span>PostgreSQL</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {telemetry?.database.latencyMs != null
                ? `${telemetry.database.latencyMs}ms`
                : 'fallback'}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">
              {telemetry?.database.status ?? 'checking'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c0e13] border border-white/[0.08]">
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-violet-300" />
              <span>Upstash Redis</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {telemetry?.redis.latencyMs != null
                ? `${telemetry.redis.latencyMs}ms`
                : telemetry?.redis.status ?? 'local'}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">
              {telemetry?.redis.syncEnabled ? 'MULTI-NODE SYNC' : 'LOCAL DEV'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c0e13] border border-white/[0.08]">
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-300" />
              <span>L1 Cache Hit Rate</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {telemetry?.cache.hitRate ?? 0}%
            </div>
            <div className="text-[10px] text-zinc-500">
              {telemetry?.cache.entries ?? 0} entries cached
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c0e13] border border-white/[0.08]">
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-300" />
              <span>Gemini Pool</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {telemetry?.ai.gemini.healthyCount ?? 0}/
              {telemetry?.ai.gemini.totalModels ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">
              Force: {telemetry?.ai.forcedModel ?? 'auto'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c0e13] border border-white/[0.08]">
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>Deepgram STT</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {telemetry?.ai.deepgram.configured ? 'ARMED' : 'UNSET'}
            </div>
            <div className="text-[10px] text-zinc-500">
              TTL {telemetry?.ai.deepgram.tokenTtlSeconds ?? 60}s keys
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c0e13] border border-white/[0.08]">
            <div className="text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-emerald-300" />
              <span>Desktop Fleet</span>
            </div>
            <div className="text-xl font-black text-white mt-1">
              {telemetry?.desktopFleet.stats.onlineNodes ?? 0}/
              {telemetry?.desktopFleet.stats.totalNodes ?? 0}
            </div>
            <div className="text-[10px] text-zinc-500">
              Avg audio {telemetry?.desktopFleet.stats.avgLatencyMs ?? 0}ms
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section
            aria-label="Gemini and Groq model health chart"
            className="lg:col-span-7 p-5 rounded-2xl bg-[#0c0e13] border border-white/[0.08] space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-300" />
                  <span>AI Model Health &amp; Circuit-Breaker Matrix</span>
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Real-time health scores across Gemini Flash pool &amp; Groq fallback.
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={busyAction === 'probe'}
                  onClick={() =>
                    void runAction(
                      'probe',
                      {
                        action: 'probe_latency',
                        model: telemetry?.ai.forcedModel ?? 'auto',
                      },
                      'AI latency probe executed'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  <span>Probe TTFT</span>
                </button>
                <button
                  type="button"
                  disabled={busyAction === 'reset_breakers'}
                  onClick={() =>
                    void runAction(
                      'reset_breakers',
                      { action: 'flush_caches' },
                      'Circuit breakers cleared'
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-zinc-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Flame className="w-3 h-3 text-amber-300" />
                  <span>Reset Cooldowns</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {FORCED_MODEL_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={busyAction === `pin_${m}`}
                  onClick={() =>
                    void runAction(
                      `pin_${m}`,
                      { action: 'force_model', model: m },
                      `Forced model updated to ${m}`
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer ${
                    telemetry?.ai.forcedModel === m
                      ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                      : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  pin: {m}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {(telemetry?.ai.gemini.models ?? []).map((m) => (
                <div key={m.model} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-200 font-bold">{m.model}</span>
                      {m.isForced && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-cyan-500/20 text-cyan-300">
                          PINNED
                        </span>
                      )}
                      {m.rejectsThinking && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-zinc-400">
                          no-think
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold ${
                        m.circuitBroken
                          ? 'text-rose-400'
                          : m.status === 'primary_fast'
                          ? 'text-cyan-300'
                          : 'text-emerald-300'
                      }`}
                    >
                      {m.circuitBroken ? 'COOLDOWN (0%)' : `${m.healthScore}%`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.healthScore}%` }}
                      transition={SPRING_TRANSITION}
                      className={`h-full rounded-full ${
                        m.circuitBroken
                          ? 'bg-rose-500'
                          : m.status === 'primary_fast'
                          ? 'bg-cyan-400'
                          : 'bg-emerald-400/80'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            aria-label="Database latency history chart"
            className="lg:col-span-5 p-5 rounded-2xl bg-[#0c0e13] border border-white/[0.08] flex flex-col justify-between space-y-4"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                PG Query Latency &amp; TTFT Telemetry
              </h2>
              <p className="text-[11px] text-zinc-500">
                Sampled live database query latency across polls ({latencyHistory.length} samples).
              </p>
            </div>

            <div className="h-36 p-3 rounded-xl bg-black/50 border border-white/[0.06] flex items-end gap-1.5">
              {latencyHistory.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-zinc-500">
                  Awaiting latency samples...
                </div>
              ) : (
                latencyHistory.map((val, idx) => {
                  const pct = Math.max(8, Math.round((val / maxChartLatency) * 100));
                  return (
                    <div
                      key={`${idx}-${val}`}
                      className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                    >
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full rounded-t bg-gradient-to-t from-cyan-500/40 to-cyan-300/90 transition-all"
                        title={`${val}ms`}
                      />
                      <span className="text-[9px] text-zinc-500">{Math.round(val)}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                <div className="text-zinc-500 text-[10px]">Last AI TTFT Probe</div>
                <div className="text-white font-bold mt-0.5">
                  {telemetry?.ai.lastTtftMs != null
                    ? `${telemetry.ai.lastTtftMs} ms`
                    : 'Not measured'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06]">
                <div className="text-zinc-500 text-[10px]">Groq Fallback Engine</div>
                <div className="text-white font-bold mt-0.5">
                  {telemetry?.ai.groq.status ?? 'checking'}
                </div>
              </div>
            </div>
          </section>
        </div>

        <StreamPhaseInspector />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section
            aria-label="Desktop handshake diagnostics"
            className="lg:col-span-7 p-5 rounded-2xl bg-[#0c0e13] border border-white/[0.08] space-y-3"
          >
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Desktop Handshake &amp; Fleet Nodes
            </h2>

            <div
              tabIndex={0}
              role="region"
              aria-label="Desktop pairing handshakes and connected nodes"
              className="overflow-x-auto rounded-xl border border-white/[0.07]"
            >
              <table className="w-full text-left text-[11px] whitespace-nowrap">
                <thead className="bg-white/[0.03] text-zinc-400 border-b border-white/[0.07]">
                  <tr>
                    <th scope="col" className="p-3 uppercase text-[10px]">Type / ID</th>
                    <th scope="col" className="p-3 uppercase text-[10px]">Identity</th>
                    <th scope="col" className="p-3 uppercase text-[10px]">Status</th>
                    <th scope="col" className="p-3 uppercase text-[10px] text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {(telemetry?.desktopFleet.nodes ?? []).map((n) => (
                    <tr key={`node-${n.nodeId}`}>
                      <td className="p-3 font-bold text-cyan-300">
                        NODE {n.nodeId.slice(0, 8)}
                      </td>
                      <td className="p-3 text-zinc-200">{n.userEmail}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px]">
                          {n.state} ({n.sttStatus})
                        </span>
                      </td>
                      <td className="p-3 text-right text-zinc-400">
                        {n.platform} v{n.appVersion} • {n.audioLatencyMs}ms
                      </td>
                    </tr>
                  ))}
                  {(telemetry?.desktopFleet.handshakes ?? []).map((h) => (
                    <tr key={`hs-${h.id}`}>
                      <td className="p-3 font-bold text-violet-300">
                        HANDSHAKE {h.id.slice(0, 8)}
                      </td>
                      <td className="p-3 text-zinc-200">
                        {h.userEmail || 'pending browser login'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                            h.status === 'ready'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : h.status === 'expired'
                              ? 'bg-zinc-800 text-zinc-500'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="p-3 text-right text-zinc-400">
                        role: {h.userRole || 'n/a'}
                      </td>
                    </tr>
                  ))}
                  {(telemetry?.desktopFleet.nodes.length ?? 0) === 0 &&
                    (telemetry?.desktopFleet.handshakes.length ?? 0) === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-zinc-500">
                          No active desktop nodes or recent pairing handshakes in memory.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </section>

          <section
            aria-label="Companion SSE stream state"
            className="lg:col-span-5 p-5 rounded-2xl bg-[#0c0e13] border border-white/[0.08] space-y-3"
          >
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Companion Sync &amp; SSE State Inspector
            </h2>
            <pre className="p-3 rounded-xl bg-black/60 border border-white/[0.07] text-[11px] text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto">
              {companionSyncJson}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}
