'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Monitor,
  ShieldCheck,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  Lock,
  Globe,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import type { HomeTranslations, SimulatorScenarioI18n } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

type ScenarioKey = 'behavioral' | 'systemDesign' | 'bilingual';

export function InteractiveHudSimulator({ t }: Props) {
  const { locale } = useLocale();
  const [activeScenarioKey, setActiveScenarioKey] = useState<ScenarioKey>('behavioral');
  const [viewMode, setViewMode] = useState<'candidate' | 'recruiter'>('candidate');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedCharCount, setStreamedCharCount] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const activeScenario: SimulatorScenarioI18n =
    t.simulator.scenarios[activeScenarioKey] || t.simulator.scenarios.behavioral;

  // Simulate tokenized 0.6s response streaming upon scenario switch
  useEffect(() => {
    setIsStreaming(true);
    setStreamedCharCount(0);
    setIsPlayingAudio(true);

    const totalTextLength =
      activeScenario.answerHook.length +
      activeScenario.bullets.reduce((acc, b) => acc + b.text.length, 0);

    const stepMs = 18;
    const interval = setInterval(() => {
      setStreamedCharCount((prev) => {
        const next = prev + 12;
        if (next >= totalTextLength) {
          clearInterval(interval);
          setIsStreaming(false);
          setIsPlayingAudio(false);
          return totalTextLength;
        }
        return next;
      });
    }, stepMs);

    return () => clearInterval(interval);
  }, [activeScenarioKey, activeScenario]);

  const handleScenarioChange = (key: ScenarioKey) => {
    setActiveScenarioKey(key);
    trackFunnelEvent('simulator_question_triggered', {
      locale,
      questionId: key,
      mode: viewMode,
    });
  };

  const handleToggleView = (mode: 'candidate' | 'recruiter') => {
    setViewMode(mode);
    trackFunnelEvent('stealth_toggle_switched', {
      locale,
      mode,
      questionId: activeScenarioKey,
    });
  };

  return (
    <section id="simulator" className="relative py-16 sm:py-24 px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>{t.simulator.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            {t.simulator.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 leading-relaxed">
            {t.simulator.subtitle}
          </p>
        </div>

        {/* Control Bar: Scenario Selectors + Dual View Stealth Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
          {/* 3 Clickable Scenario Pills */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md">
            {(
              [
                { key: 'behavioral', label: t.simulator.scenarios.behavioral.tabLabel },
                { key: 'systemDesign', label: t.simulator.scenarios.systemDesign.tabLabel },
                { key: 'bilingual', label: t.simulator.scenarios.bilingual.tabLabel },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleScenarioChange(item.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeScenarioKey === item.key
                    ? 'bg-white text-zinc-950 font-semibold shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Primary View Mode Switcher (Candidate vs Recruiter Screen Share) */}
          <div className="flex items-center self-center lg:self-auto p-1.5 rounded-xl bg-zinc-900 border border-white/[0.12] shadow-xl">
            <button
              type="button"
              onClick={() => handleToggleView('candidate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'candidate'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.simulator.viewToggle.candidateLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleView('recruiter')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'recruiter'
                  ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t.simulator.viewToggle.recruiterLabel}</span>
            </button>
          </div>
        </div>

        {/* Video Call Mockup Container */}
        <div
          className={`relative rounded-2xl overflow-hidden transition-all duration-300 border ${
            viewMode === 'recruiter'
              ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.25)]'
              : 'border-white/[0.1] bg-[#0c0d12] shadow-2xl'
          }`}
        >
          {/* Active Screen Share Top Indicator Bar (in Recruiter mode) */}
          {viewMode === 'recruiter' && (
            <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between text-xs font-medium tracking-tight animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>{t.simulator.recruiterNotice}</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] bg-emerald-700/80 px-2.5 py-0.5 rounded">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>WDA_EXCLUDEFROMCAPTURE: ACTIVE</span>
              </div>
            </div>
          )}

          {/* Video Mockup Header / Window Chrome */}
          <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs font-mono text-zinc-500">
                Zoom Meeting — Senior Distributed Systems Round (45:00)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>16kHz PCM</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* Main Virtual Screen Workspace */}
          <div className="relative min-h-[520px] sm:min-h-[580px] p-6 sm:p-8 bg-[#090a0f] flex flex-col justify-between">
            {/* Background Simulated Desktop IDE Window */}
            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 font-mono text-xs text-zinc-400 overflow-hidden select-none">
              <div className="flex items-center justify-between text-zinc-600 pb-2 mb-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>service_orchestration.ts — VS Code</span>
                </div>
                <span>Ln 142, Col 18</span>
              </div>
              <pre className="text-zinc-500 leading-relaxed text-[11px] sm:text-xs">
                {`// Production Transaction Fencing Token Pipeline
export async function processDistributedLedger(transactionId: string): Promise<Result> {
  const fencingToken = await redisClient.eval(FENCING_ACQUIRE_LUA, ['lock:' + transactionId]);
  if (!fencingToken) throw new LockAcquisitionError('Redlock contention limit reached');
  
  return await db.transaction(async (tx) => {
    const verified = await tx.ledger.verifyToken(transactionId, fencingToken);
    return tx.executeTransfer({ verified, timestamp: Date.now() });
  });
}`}
              </pre>
            </div>

            {/* Recruiter Audio Wave & Live Question Bar */}
            <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                    {activeScenario.tag}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {activeScenario.sttStatus}
                  </span>
                </div>

                {/* Animated Audio Soundwave */}
                <div className="flex items-center gap-0.5">
                  {[4, 12, 8, 16, 10, 18, 6, 14, 10, 8].map((h, i) => (
                    <motion.div
                      key={i}
                      animate={isPlayingAudio ? { height: [4, h, 4] } : { height: 4 }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.8,
                        delay: i * 0.08,
                      }}
                      className="w-1 rounded-full bg-indigo-500/80"
                    />
                  ))}
                </div>
              </div>

              <div className="text-sm sm:text-base font-medium text-white">
                «{activeScenario.interviewerSpeech}»
              </div>

              {/* Live Bilingual Translation Banner (if scenario has it) */}
              {activeScenario.liveTranslation && (
                <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-start gap-2 text-xs text-indigo-300">
                  <Globe className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-indigo-200">
                      Live Translation Preview:
                    </span>{' '}
                    <span>{activeScenario.liveTranslation}</span>
                  </div>
                </div>
              )}
            </div>

            {/* THE TELEPROMPTER OVERLAY WIDGET (Pinned to Eyeline under top edge) */}
            <AnimatePresence>
              {viewMode === 'candidate' ? (
                <motion.div
                  key="candidate-prompter"
                  initial={{ opacity: 0, y: -20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 w-[92%] sm:w-[86%] max-w-3xl rounded-2xl p-5 sm:p-6 bg-[#12141a]/90 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.15)] z-30"
                >
                  {/* Eyeline Prompter Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-mono tracking-tight text-emerald-400 font-semibold uppercase">
                        Ghostboard Teleprompter · Eyeline Locked
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                      <span>{t.simulator.controls.hotkeyTip}</span>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                        0.6s TTFT
                      </span>
                    </div>
                  </div>

                  {/* Core Structured Senior Hook & Bullets */}
                  <div className="space-y-3">
                    <div className="text-sm sm:text-base font-semibold text-white leading-snug">
                      {activeScenario.answerHook}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {activeScenario.bullets.map((bullet, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs leading-relaxed"
                        >
                          <span className="block font-mono font-bold text-emerald-400 uppercase tracking-wider text-[10px] mb-1">
                            {bullet.label}
                          </span>
                          <span className="text-zinc-200">{bullet.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Takeaway Advice Pill */}
                    <div className="pt-2 text-xs text-amber-300/90 font-mono flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{activeScenario.takeaway}</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* Recruiter View: Empty state proving invisibility */
                <motion.div
                  key="recruiter-invisibility-proof"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center p-6 bg-black/40 backdrop-blur-[2px] pointer-events-none"
                >
                  <div className="max-w-md text-center p-6 rounded-2xl bg-zinc-950/90 border border-emerald-500/40 shadow-2xl">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                      <EyeOff className="w-6 h-6" />
                    </div>
                    <div className="text-base font-bold text-white mb-1">
                      {t.simulator.viewToggle.recruiterBadge}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {t.simulator.recruiterNotice}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
