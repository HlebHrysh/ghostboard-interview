'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ChevronRight,
  Database,
  Flame,
  Gauge,
  KeyRound,
  Layers,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEV_SCENARIO_PRESETS,
  dispatchCopilotInjectEvent,
  executeDevAction,
  FORCED_MODEL_OPTIONS,
  SPOOF_PLAN_OPTIONS,
  SPRING_TRANSITION,
  type DevTelemetryPayload,
} from './devShared';

type DockTabId = 'privileges' | 'ai' | 'injector' | 'cache';

const TELEMETRY_STALE_MS = 3000;

const TABS: Array<{ id: DockTabId; label: string; shortLabel: string }> = [
  { id: 'privileges', label: 'Privileges & Spoofer', shortLabel: 'Spoofer' },
  { id: 'ai', label: 'AI & Latency Lab', shortLabel: 'AI Lab' },
  { id: 'injector', label: 'Copilot & Noise Injector', shortLabel: 'Injector' },
  { id: 'cache', label: 'Cache & Sync Inspector', shortLabel: 'Cache/Sync' },
];

export interface DeveloperDockProps {
  initialRole?: string | null;
  initialEffectivePlan?: string | null;
}

export function DeveloperDock({
  initialRole = 'developer',
  initialEffectivePlan = 'lifetime',
}: DeveloperDockProps) {
  const router = useRouter();
  const baseId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DockTabId>('privileges');
  const [telemetry, setTelemetry] = useState<DevTelemetryPayload | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [streamPreview, setStreamPreview] = useState<{
    presetId: string;
    ttftMs: number | null;
    ignored: boolean;
    rawPreview: string;
  } | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const lastFetchedAtRef = useRef(0);
  const telemetryAbortRef = useRef<AbortController | null>(null);

  const fetchTelemetry = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchedAtRef.current < TELEMETRY_STALE_MS) {
      return;
    }

    telemetryAbortRef.current?.abort();
    const controller = new AbortController();
    telemetryAbortRef.current = controller;

    setLoadingTelemetry(true);
    try {
      const res = await fetch('/api/dev/telemetry', {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (res.ok) {
        const data = (await res.json()) as DevTelemetryPayload;
        setTelemetry(data);
        lastFetchedAtRef.current = Date.now();
      }
    } catch {
      // Aborted or non-fatal in floating HUD
    } finally {
      if (telemetryAbortRef.current === controller) {
        setLoadingTelemetry(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchTelemetry(false);
    } else {
      telemetryAbortRef.current?.abort();
    }
  }, [isOpen, fetchTelemetry]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const runDevAction = async (
    actionKey: string,
    payload: Record<string, unknown>,
    successMsg: string
  ) => {
    setBusyAction(actionKey);
    try {
      const { ok, data } = await executeDevAction(payload);
      if (!ok) {
        toast.error(
          typeof data.error === 'string' ? data.error : 'Developer action failed'
        );
        return null;
      }
      toast.success(successMsg);
      await fetchTelemetry(true);
      if (payload.action === 'override_plan' || payload.action === 'reset_quotas') {
        window.dispatchEvent(
          new CustomEvent('ghostboard:dev-plan-changed', { detail: data })
        );
        router.refresh();
      }
      return data;
    } catch {
      toast.error('Network error while executing developer action');
      return null;
    } finally {
      setBusyAction(null);
    }
  };

  const handleInjectPreset = async (preset: (typeof DEV_SCENARIO_PRESETS)[number]) => {
    dispatchCopilotInjectEvent({
      id: preset.id,
      tag: preset.tag,
      text: preset.text,
      mode: preset.mode,
    });

    const onInterviewPage =
      typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/interview') ||
        window.location.pathname.startsWith('/mock-interview'));

    if (onInterviewPage) {
      toast.success(`Dispatched "${preset.label}" to active Copilot HUD`);
      return;
    }

    setBusyAction(`inject_${preset.id}`);
    const started = performance.now();
    try {
      const res = await fetch('/api/ai/dual-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: preset.text,
          mode: preset.mode,
          language: 'auto',
        }),
      });
      const ttftMs = Math.round(performance.now() - started);
      if (!res.ok || !res.body) {
        toast.info(`Event "${preset.label}" dispatched (stream HTTP ${res.status})`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (acc.length < 360) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (acc.includes('<<<IGNORE>>>') || acc.length >= 260) {
          await reader.cancel().catch(() => {});
          break;
        }
      }
      const ignored = acc.includes('<<<IGNORE>>>');
      setStreamPreview({
        presetId: preset.id,
        ttftMs,
        ignored,
        rawPreview: acc.trim().slice(0, 260),
      });
      toast.success(
        ignored
          ? `Filter verified: <<<IGNORE>>> returned (${ttftMs}ms)`
          : `Stream probe received (${ttftMs}ms)`
      );
    } catch {
      toast.info(`Dispatched browser event for "${preset.label}"`);
    } finally {
      setBusyAction(null);
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx: number | null = null;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = TABS.length - 1;
    if (nextIdx !== null) {
      e.preventDefault();
      setActiveTab(TABS[nextIdx].id);
      tabRefs.current[nextIdx]?.focus();
    }
  };

  const dev = telemetry?.developer;
  const isOverrideActive = dev?.isOverrideActive ?? false;
  const effectivePlan = (dev?.effectivePlan ?? initialEffectivePlan ?? 'lifetime').toUpperCase();
  const roleLabel = (dev?.role ?? initialRole ?? 'developer').toUpperCase();
  const forcedModel = dev?.forcedModel ?? 'auto';

  const pillStatusLabel = isOverrideActive
    ? `DEV • ${effectivePlan} SIM`
    : 'DEV MODE • UNLIMITED';

  return (
    <div className="fixed bottom-5 right-5 z-[9990] font-mono text-xs select-none">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          <motion.button
            key="dev-pill"
            type="button"
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_TRANSITION}
            onClick={() => setIsOpen(true)}
            aria-label="Open Developer Control Panel (Ctrl+Shift+D)"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#090b0f]/95 backdrop-blur-xl border border-white/[0.14] shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.08)] text-zinc-100 hover:border-cyan-400/40 transition-colors cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${
                  isOverrideActive ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOverrideActive ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
              />
            </span>
            <Terminal className="w-3.5 h-3.5 text-cyan-300" />
            <span className="text-[11px] font-bold tracking-wider text-white">
              {pillStatusLabel}
            </span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] rounded bg-white/[0.06] text-zinc-400 border border-white/10">
              Ctrl+⇧+D
            </kbd>
          </motion.button>
        ) : (
          <motion.section
            key="dev-drawer"
            aria-label="Developer Control Panel"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={SPRING_TRANSITION}
            className="w-[430px] max-w-[calc(100vw-2rem)] bg-[#08090c]/96 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden text-zinc-200"
          >
            <div className="px-4 py-3 border-b border-white/[0.08] bg-gradient-to-r from-cyan-500/[0.06] via-transparent to-violet-500/[0.06] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                  <Terminal className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-[11px] tracking-wider uppercase truncate">
                      {pillStatusLabel}
                    </span>
                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-white/[0.07] text-zinc-300 border border-white/10">
                      {roleLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {dev?.email || 'Authenticated Dev Session'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href="/developer"
                  className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-[10px] text-cyan-300 font-bold flex items-center gap-1 transition-colors"
                >
                  <span>Workbench</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => void fetchTelemetry(true)}
                  disabled={loadingTelemetry}
                  aria-label="Refresh developer telemetry"
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loadingTelemetry ? 'animate-spin' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Collapse developer dock"
                  className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Developer tools sections"
              className="flex flex-nowrap overflow-x-auto border-b border-white/[0.08] bg-[#0b0d12] px-2 pt-1.5 gap-1"
            >
              {TABS.map((tab, idx) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[idx] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`${baseId}-tab-${tab.id}`}
                    aria-selected={isSelected}
                    aria-controls={`${baseId}-panel-${tab.id}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, idx)}
                    className={`flex-none px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 ${
                      isSelected
                        ? 'text-white border-cyan-400 bg-white/[0.05] rounded-t-lg'
                        : 'text-zinc-500 border-transparent hover:text-zinc-300'
                    }`}
                  >
                    {tab.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="p-4 max-h-[380px] overflow-y-auto space-y-3">
              {activeTab === 'privileges' && (
                <div
                  role="tabpanel"
                  id={`${baseId}-panel-privileges`}
                  aria-labelledby={`${baseId}-tab-privileges`}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                      Plan Preview Spoofer
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Effective:{' '}
                      <strong className="text-cyan-300">{effectivePlan}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {SPOOF_PLAN_OPTIONS.map((item) => {
                      const active =
                        item.key === 'reset_to_dev_unlimited'
                          ? !isOverrideActive
                          : dev?.overridePlan === item.key;
                      return (
                        <motion.button
                          key={item.key}
                          type="button"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          transition={SPRING_TRANSITION}
                          disabled={busyAction === `plan_${item.key}`}
                          onClick={() =>
                            void runDevAction(
                              `plan_${item.key}`,
                              { action: 'override_plan', plan: item.key },
                              `Plan switched to ${item.label}`
                            )
                          }
                          className={`px-3 py-2 rounded-xl border text-[11px] font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400/40 text-white shadow-[0_0_16px_rgba(34,211,238,0.12)]'
                              : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span>{item.label}</span>
                          {busyAction === `plan_${item.key}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            active && <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.07] space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                      Resolved Entitlements
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        {
                          label: 'AI Streams',
                          on: dev?.entitlements.aiStreamsUnlimited ?? true,
                        },
                        {
                          label: 'Unlimited Duration',
                          on: dev?.entitlements.unlimitedDuration ?? true,
                        },
                        {
                          label: 'OCR Screens',
                          on: dev?.entitlements.ocrScreenshots ?? true,
                        },
                        {
                          label: 'Desktop Sync',
                          on: dev?.entitlements.desktopSync ?? true,
                        },
                        {
                          label: 'Panic Shield',
                          on: dev?.entitlements.panicShield ?? true,
                        },
                      ].map((ent) => (
                        <span
                          key={ent.label}
                          className={`px-2 py-0.5 rounded-md text-[10px] border ${
                            ent.on
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/25'
                              : 'bg-zinc-900 text-zinc-500 border-white/10 line-through'
                          }`}
                        >
                          {ent.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyAction === 'reset_quotas'}
                      onClick={() =>
                        void runDevAction(
                          'reset_quotas',
                          { action: 'reset_quotas' },
                          'Daily trial & AI quotas reset to 0'
                        )
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {busyAction === 'reset_quotas' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
                      )}
                      <span>
                        Reset Quotas ({dev?.trialQuestionsUsed ?? 0})
                      </span>
                    </button>

                    <Link
                      href="/admin"
                      className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white font-bold text-[11px] flex items-center gap-1"
                    >
                      <span>/admin</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div
                  role="tabpanel"
                  id={`${baseId}-panel-ai`}
                  aria-labelledby={`${baseId}-tab-ai`}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-300" />
                        <span>Live TTFT Probe</span>
                      </div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {telemetry?.ai.lastTtftMs != null
                          ? `${telemetry.ai.lastTtftMs} ms`
                          : 'Not probed'}
                      </div>
                      <div className="text-[9px] text-zinc-500 truncate">
                        {telemetry?.ai.lastProbeModel || 'Run probe to measure'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-emerald-300" />
                        <span>Deepgram / Groq</span>
                      </div>
                      <div className="text-[11px] font-bold text-white mt-1">
                        STT:{' '}
                        <span
                          className={
                            telemetry?.ai.deepgram.configured
                              ? 'text-emerald-300'
                              : 'text-rose-400'
                          }
                        >
                          {telemetry?.ai.deepgram.configured ? 'READY' : 'MISSING'}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-white">
                        Groq:{' '}
                        <span
                          className={
                            telemetry?.ai.groq.configured
                              ? 'text-emerald-300'
                              : 'text-zinc-500'
                          }
                        >
                          {telemetry?.ai.groq.status ?? 'unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1.5">
                      Force AI Model
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FORCED_MODEL_OPTIONS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={busyAction === `model_${m}`}
                          onClick={() =>
                            void runDevAction(
                              `model_${m}`,
                              { action: 'force_model', model: m },
                              `Model routing pinned to ${m}`
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer truncate ${
                            forcedModel === m
                              ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                              : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                      <span>Gemini Circuit Breakers</span>
                      <span>
                        {telemetry?.ai.gemini.healthyCount ?? 0}/
                        {telemetry?.ai.gemini.totalModels ?? 0} healthy
                      </span>
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                      {(telemetry?.ai.gemini.models ?? []).slice(0, 6).map((m) => (
                        <div
                          key={m.model}
                          className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-white/[0.025] border border-white/[0.06] text-[10px]"
                        >
                          <span className="text-zinc-200 truncate">{m.model}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              m.circuitBroken
                                ? 'bg-rose-500/15 text-rose-300'
                                : m.status === 'primary_fast'
                                ? 'bg-cyan-500/15 text-cyan-300'
                                : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            {m.circuitBroken ? 'COOLDOWN' : `${m.healthScore}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyAction === 'probe_latency'}
                      onClick={() =>
                        void runDevAction(
                          'probe_latency',
                          { action: 'probe_latency', model: forcedModel },
                          'Latency probe completed'
                        )
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {busyAction === 'probe_latency' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>Probe TTFT</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyAction === 'reset_cooldowns'}
                      onClick={() =>
                        void runDevAction(
                          'reset_cooldowns',
                          { action: 'flush_caches' },
                          'All AI circuit-breaker cooldowns reset (0ms)'
                        )
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-300" />
                      <span>Reset Cooldowns</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'injector' && (
                <div
                  role="tabpanel"
                  id={`${baseId}-panel-injector`}
                  aria-labelledby={`${baseId}-tab-injector`}
                  className="space-y-2.5"
                >
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Dispatches <code className="text-cyan-300">ghostboard:dev-inject</code> &amp;
                    copilot transcript events on <code className="text-zinc-200">/interview</code>{' '}
                    or <code className="text-zinc-200">/mock-interview</code>, or probes live{' '}
                    <code className="text-zinc-200">/api/ai/dual-stream</code> filter rules.
                  </p>

                  <div className="space-y-2">
                    {DEV_SCENARIO_PRESETS.map((preset) => (
                      <motion.button
                        key={preset.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        transition={SPRING_TRANSITION}
                        disabled={busyAction === `inject_${preset.id}`}
                        onClick={() => void handleInjectPreset(preset)}
                        className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-left transition-all cursor-pointer flex items-start justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[11px] text-white">
                              {preset.label}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/[0.07] text-cyan-300">
                              {preset.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {preset.text}
                          </p>
                        </div>
                        <span className="p-1.5 rounded-lg bg-white/[0.05] text-zinc-300 shrink-0">
                          {busyAction === `inject_${preset.id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  {streamPreview && (
                    <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-cyan-300">
                          {streamPreview.ignored
                            ? 'FILTER PASSED (<<<IGNORE>>>)'
                            : `STREAM OUTPUT (${streamPreview.presetId})`}
                        </span>
                        <span className="text-zinc-400">
                          {streamPreview.ttftMs} ms
                        </span>
                      </div>
                      <pre className="text-[10px] text-zinc-300 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                        {streamPreview.rawPreview}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'cache' && (
                <div
                  role="tabpanel"
                  id={`${baseId}-panel-cache`}
                  aria-labelledby={`${baseId}-tab-cache`}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Database className="w-3 h-3 text-cyan-300" />
                        <span>PostgreSQL</span>
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {telemetry?.database.latencyMs != null
                          ? `${telemetry.database.latencyMs} ms`
                          : 'offline'}
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase">
                        {telemetry?.database.status ?? 'checking'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Radio className="w-3 h-3 text-violet-300" />
                        <span>Upstash Redis</span>
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {telemetry?.redis.latencyMs != null
                          ? `${telemetry.redis.latencyMs} ms`
                          : telemetry?.redis.status ?? 'local'}
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase">
                        {telemetry?.redis.syncEnabled ? 'SYNC ON' : 'LOCAL FALLBACK'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-zinc-300 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-cyan-300" />
                        <span>L1 Session Cache</span>
                      </span>
                      <span className="text-cyan-300 font-bold">
                        {telemetry?.cache.hitRate ?? 0}% hit rate
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                      <span>Entries: {telemetry?.cache.entries ?? 0}</span>
                      <span>
                        Hits: {telemetry?.cache.hits ?? 0} / Misses:{' '}
                        {telemetry?.cache.misses ?? 0}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-zinc-300 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-300" />
                        <span>Companion SSE State</span>
                      </span>
                      <span className="text-zinc-400">
                        STT: {telemetry?.companionSync?.sttStatus ?? 'idle'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 grid grid-cols-3 gap-1">
                      <span>Q&amp;As: {telemetry?.companionSync?.qasCount ?? 0}</span>
                      <span>
                        Frozen: {telemetry?.companionSync?.isFrozen ? 'YES' : 'NO'}
                      </span>
                      <span>
                        Nodes: {telemetry?.desktopFleet.stats.onlineNodes ?? 0}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busyAction === 'flush_l1'}
                    onClick={() =>
                      void runDevAction(
                        'flush_l1',
                        { action: 'flush_caches' },
                        'L1 session caches & AI breakers flushed'
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {busyAction === 'flush_l1' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Flush L1 Cache</span>
                  </button>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
