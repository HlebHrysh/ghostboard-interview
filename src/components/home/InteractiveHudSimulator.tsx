'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Monitor,
  ShieldCheck,
  Zap,
  RotateCcw,
  Snowflake,
  EyeOff,
  Terminal,
  Globe,
  Code2,
  Mic,
  Sparkles,
} from 'lucide-react';
import type { HomeTranslations } from '@/lib/homeI18n';
import { trackFunnelEvent } from '@/lib/croTelemetry';
import { useLocale } from '@/contexts/LocaleContext';

interface Props {
  t: HomeTranslations;
}

type ScenarioKey = 'behavioral' | 'systemDesign' | 'bilingual';
type ViewMode = 'candidate' | 'recruiter';
type Density = 'full' | 'short';

interface HudCard {
  label: string;
  text: string;
}

interface Scenario {
  key: ScenarioKey;
  tabLabel: string;
  tag: string;
  file: string;
  cursor: string;
  code: string[];
  question: string;
  translation?: string;
  hookLabel: string;
  hook: string;
  hookIsEnglish: boolean;
  cards: HudCard[];
  short: string[];
  takeaway: string;
}

const SCENARIOS: Record<ScenarioKey, Scenario> = {
  behavioral: {
    key: 'behavioral',
    tabLabel: 'Поведінкове / STAR',
    tag: 'BEHAVIORAL',
    file: 'service_orchestration.ts',
    cursor: 'Ln 142, Col 18',
    code: [
      '// Production ledger: distributed lock with fencing token',
      "import { redis, db } from './infra';",
      '',
      'export async function processLedger(txId: string): Promise<Result> {',
      "  const token = await redis.eval(FENCING_ACQUIRE_LUA, ['lock:' + txId]);",
      "  if (!token) throw new LockAcquisitionError('Redlock contention');",
      '',
      '  return db.transaction(async (tx) => {',
      '    const ok = await tx.ledger.verifyToken(txId, token);',
      '    if (!ok) throw new StaleLockError(txId);',
      '    return tx.executeTransfer({ txId, at: Date.now() });',
      '  });',
      '}',
      '',
      'const LOCK_TTL_MS = 30000;',
      'const MAX_RETRIES = 5;',
    ],
    question: 'Розкажіть про випадок, коли ви виправили критичний інцидент у продакшені під тиском часу.',
    hookLabel: 'ХУК',
    hook: 'Подвійні списання на 12% платежів — я за 40 хвилин локалізував race condition і впровадив fencing-токени.',
    hookIsEnglish: false,
    cards: [
      { label: 'СИТУАЦІЯ', text: 'Peak-навантаження, дублі транзакцій у ledger, SLA під загрозою.' },
      { label: 'ЗАВДАННЯ', text: 'Зупинити втрати грошей і не покласти платіжний контур.' },
      { label: 'ДІЯ', text: 'Redlock + fencing token, ідемпотентні ключі, feature-flag rollout.' },
      { label: 'РЕЗУЛЬТАТ', text: 'Дублі: 12% → 0%, p99 без регресії, постмортем для команди.' },
    ],
    short: [
      'Race condition → дублі списань (12%)',
      'Fencing token + ідемпотентність',
      'Результат: 0 дублів, p99 стабільний',
    ],
    takeaway: 'Назви цифри першими — вони запам’ятовуються.',
  },
  systemDesign: {
    key: 'systemDesign',
    tabLabel: 'System Design',
    tag: 'SYSTEM DESIGN',
    file: 'cluster_topology.ts',
    cursor: 'Ln 38, Col 9',
    code: [
      '// Rate limiter + event pipeline topology (100k RPS)',
      'export const topology = {',
      '  shards: 64,',
      "  hashing: 'consistent-ring',",
      '  replicas: 3,',
      '  limiter: {',
      "    algorithm: 'sliding-window-counter',",
      "    store: 'redis-cluster',",
      '    failOpen: true,',
      '    localBurstCache: 2000,',
      '  },',
      '  queue: {',
      "    broker: 'kafka',",
      '    partitions: 128,',
      "    delivery: 'at-least-once',",
      "    dlq: 'events.dead-letter',",
      '  },',
      '};',
    ],
    question: 'Спроєктуйте відмовостійкий Rate Limiter та Event Pipeline на 100k RPS.',
    hookLabel: 'ХУК',
    hook: 'Edge-limiter на sliding window у Redis Cluster, а події — через Kafka з партиціонуванням за tenant-ключем.',
    hookIsEnglish: false,
    cards: [
      { label: 'АРХІТЕКТУРА', text: 'API GW → локальний лімітер → Redis Cluster → Kafka → воркери.' },
      { label: 'ВУЗЬКІ МІСЦЯ', text: 'Hot keys, мережа до Redis, rebalance партицій при деплої.' },
      { label: 'МАСШТАБУВАННЯ', text: 'Consistent hashing, 64 шарди, автоскейл консюмерів за lag.' },
      { label: 'TRADE-OFFS', text: 'Fail-open проти точності; at-least-once + ідемпотентні споживачі.' },
    ],
    short: [
      'Sliding window у Redis Cluster',
      'Kafka: партиції за tenant, DLQ',
      'Fail-open + ідемпотентність',
    ],
    takeaway: 'Спершу озвуч trade-off — це сигнал рівня Senior.',
  },
  bilingual: {
    key: 'bilingual',
    tabLabel: 'Bilingual (EN → UA)',
    tag: 'BILINGUAL',
    file: 'cache_guard.ts',
    cursor: 'Ln 61, Col 24',
    code: [
      '// Multi-region cache with stampede protection',
      'export async function getWithGuard<T>(key: string, load: () => Promise<T>): Promise<T> {',
      '  const hit = await redis.get(key);',
      '  if (hit) return JSON.parse(hit) as T;',
      '',
      "  const lock = await redis.set('lock:' + key, '1', 'PX', 5000, 'NX');",
      '  if (!lock) return waitForFill<T>(key);',
      '',
      '  const value = await load();',
      '  const ttl = 60000 + Math.floor(Math.random() * 10000); // jitter',
      '  await redis.set(key, JSON.stringify(value), "PX", ttl);',
      '  return value;',
      '}',
    ],
    question: 'How do you prevent cache stampede and stale reads in a multi-region Redis setup?',
    translation: 'Як ви запобігаєте cache stampede та застарілим читанням у multi-region Redis?',
    hookLabel: 'READ ALOUD · EN',
    hook: 'I combine request coalescing with a short-lived lock, add TTL jitter, and serve stale-while-revalidate so a single region refills the key while others keep reading.',
    hookIsEnglish: true,
    cards: [
      { label: 'ТЕЗА 1', text: 'Request coalescing + lock з NX і коротким TTL.' },
      { label: 'ТЕЗА 2', text: 'TTL jitter, щоб ключі не вигорали одночасно.' },
      { label: 'ТЕЗА 3', text: 'Stale-while-revalidate для плавного оновлення.' },
      { label: 'ТЕЗА 4', text: 'Версії ключів та pub/sub інвалідація між регіонами.' },
    ],
    short: [
      'Coalescing + lock (NX)',
      'TTL jitter + stale-while-revalidate',
      'Versioned keys між регіонами',
    ],
    takeaway: 'Читай англійською повільно — переклад-підказки поруч.',
  },
};

const SCENARIO_ORDER: ScenarioKey[] = ['behavioral', 'systemDesign', 'bilingual'];

const PYTEST_LINES: string[] = [
  '$ pytest -q tests/',
  '============ test session starts ============',
  'collected 48 items',
  '',
  'tests/test_ledger.py ........            [ 16%]',
  'tests/test_locks.py ..........            [ 37%]',
  'tests/test_api.py ................        [ 70%]',
  'tests/test_pipeline.py ..............     [100%]',
  '',
  '============ 48 passed in 2.14s ============',
];

/* Stream timing (one tick = 25ms) */
const TICK_MS = 25;
const QUESTION_TICKS = 14; // ~350ms
const TTFT_TICKS = 16; // ~400ms blink
const HOOK_CHARS_PER_TICK = 3;
const CARD_STAGGER = 6;

const SYNTAX_RE =
  /(\/\/.*$|'[^']*'|"[^"]*"|`[^`]*`|\b(?:export|async|function|const|await|return|if|throw|new|import|from)\b|\b\d+\b)/;
const KEYWORD_RE = /^(?:export|async|function|const|await|return|if|throw|new|import|from)$/;

function highlight(line: string): React.ReactNode[] {
  return line.split(SYNTAX_RE).map((part, i) => {
    if (!part) return null;
    let cls = 'text-zinc-300';
    if (part.startsWith('//')) cls = 'text-zinc-600 italic';
    else if (/^['"`]/.test(part)) cls = 'text-amber-300/90';
    else if (KEYWORD_RE.test(part)) cls = 'text-violet-400';
    else if (/^\d+$/.test(part)) cls = 'text-cyan-300';
    return (
      <span key={i} className={cls}>
        {part}
      </span>
    );
  });
}

const SPRING = { type: 'spring', stiffness: 350, damping: 28, mass: 0.6 } as const;

export function InteractiveHudSimulator({ t }: Props) {
  const { locale } = useLocale();
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('behavioral');
  const [viewMode, setViewMode] = useState<ViewMode>('candidate');
  const [density, setDensity] = useState<Density>('full');
  const [frozen, setFrozen] = useState(false);
  const [panic, setPanic] = useState(false);
  const [runId, setRunId] = useState(0);
  const [tick, setTick] = useState(0);
  const [hovered, setHovered] = useState(false);

  const frozenRef = useRef(false);
  const tickRef = useRef(0);

  const scenario = SCENARIOS[scenarioKey];

  const questionEnd = QUESTION_TICKS;
  const hookStart = QUESTION_TICKS + TTFT_TICKS;
  const hookTicks = Math.ceil(scenario.hook.length / HOOK_CHARS_PER_TICK);
  const cardsStart = hookStart + hookTicks;
  const totalTicks = cardsStart + 4 * CARD_STAGGER + 6;

  const questionChars = Math.min(
    scenario.question.length,
    Math.ceil((tick / questionEnd) * scenario.question.length),
  );
  const questionDone = tick >= questionEnd;
  const ttftVisible = tick >= questionEnd;
  const ttftBlinking = tick >= questionEnd && tick < hookStart;
  const hookChars =
    tick < hookStart ? 0 : Math.min(scenario.hook.length, (tick - hookStart) * HOOK_CHARS_PER_TICK);
  const done = tick >= totalTicks;
  const streaming = !done && !frozen;
  const cardVisible = (i: number): boolean => tick >= cardsStart + i * CARD_STAGGER;

  useEffect(() => {
    frozenRef.current = frozen;
  }, [frozen]);

  // Restart stream whenever scenario or runId changes
  useEffect(() => {
    tickRef.current = 0;
    frozenRef.current = false;
    setTick(0);
    setFrozen(false);
    setPanic(false);
    const total = totalTicks;
    const id = window.setInterval(() => {
      if (frozenRef.current || tickRef.current >= total) return;
      tickRef.current += 1;
      setTick(tickRef.current);
      if (tickRef.current >= total) window.clearInterval(id);
    }, TICK_MS);
    return () => window.clearInterval(id);
    // totalTicks derives from scenarioKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioKey, runId]);

  // Spacebar = Freeze (only while pointer is over the simulator)
  useEffect(() => {
    if (!hovered) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON')) return;
      e.preventDefault();
      setFrozen((f) => !f);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hovered]);

  const handleScenario = useCallback(
    (key: ScenarioKey) => {
      setScenarioKey(key);
      setRunId((r) => r + 1);
      trackFunnelEvent('simulator_question_triggered', { locale, questionId: key, mode: viewMode });
    },
    [locale, viewMode],
  );

  const handleView = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      trackFunnelEvent('stealth_toggle_switched', { locale, mode, questionId: scenarioKey });
    },
    [locale, scenarioKey],
  );

  const handleReplay = useCallback(() => setRunId((r) => r + 1), []);

  const hudStatus = panic ? null : frozen ? 'FROZEN' : streaming ? 'STREAMING' : 'LIVE';
  const statusCls =
    hudStatus === 'FROZEN'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  const dotCls = hudStatus === 'FROZEN' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse';

  const eqBars = [5, 14, 8, 18, 10, 16, 6, 12, 9, 15];
  const eqActive = !frozen && tick < hookStart + 20;

  return (
    <section id="simulator" className="relative py-16 sm:py-24 px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
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

        {/* Control bar */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 mb-6">
          <div
            role="tablist"
            aria-label="Сценарії"
            className="flex flex-wrap items-center gap-1 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md"
          >
            {SCENARIO_ORDER.map((key) => {
              const active = scenarioKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handleScenario(key)}
                  className="relative px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  {active && (
                    <motion.span
                      layoutId="scenario-pill"
                      transition={SPRING}
                      className="absolute inset-0 rounded-lg bg-white shadow-md"
                    />
                  )}
                  <span
                    className={`relative z-10 whitespace-nowrap transition-colors ${
                      active ? 'text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {SCENARIOS[key].tabLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3">
            <motion.button
              type="button"
              onClick={handleReplay}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              transition={SPRING}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.1] hover:text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Повторити стрім</span>
            </motion.button>

            <div className="relative flex items-center p-1.5 rounded-xl bg-zinc-900 border border-white/[0.12] shadow-xl">
              {(
                [
                  { mode: 'candidate', label: 'Режим кандидата', icon: <Eye className="w-3.5 h-3.5" />, emoji: '👁' },
                  { mode: 'recruiter', label: 'Режим рекрутера', icon: <Monitor className="w-3.5 h-3.5" />, emoji: '🖥' },
                ] as const
              ).map((item) => {
                const active = viewMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleView(item.mode)}
                    aria-pressed={active}
                    className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  >
                    {active && (
                      <motion.span
                        layoutId="mode-pill"
                        transition={SPRING}
                        className={`absolute inset-0 rounded-lg border ${
                          item.mode === 'candidate'
                            ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                            : 'bg-emerald-500 border-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.45)]'
                        }`}
                      />
                    )}
                    <span
                      className={`relative z-10 flex items-center gap-2 whitespace-nowrap transition-colors ${
                        active
                          ? item.mode === 'candidate'
                            ? 'text-emerald-200'
                            : 'text-zinc-950'
                          : 'text-zinc-400'
                      }`}
                    >
                      <span aria-hidden>{item.emoji}</span>
                      {item.icon}
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Zoom window */}
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`relative rounded-2xl overflow-hidden border transition-[border-color,box-shadow] duration-300 ${
            viewMode === 'recruiter'
              ? 'border-emerald-500 ring-4 ring-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.25)]'
              : 'border-white/[0.1] bg-[#0c0d12] shadow-2xl'
          }`}
        >
          <AnimatePresence initial={false}>
            {viewMode === 'recruiter' && (
              <motion.div
                key="recruiter-bar"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={SPRING}
                className="overflow-hidden bg-emerald-600 text-white"
              >
                <div className="px-4 py-2 flex items-center justify-between gap-3 text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                    <span>Recruiter View — Захоплення екрана Zoom (WDA_EXCLUDEFROMCAPTURE)</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] bg-emerald-700/80 px-2.5 py-0.5 rounded">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ACTIVE</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Window chrome */}
          <div className="px-4 py-3 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs font-mono text-zinc-500 truncate">
                Zoom Meeting — Senior Distributed Systems Round (45:00)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono shrink-0">
              <Mic className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">16kHz PCM</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* Workspace */}
          <div className="relative min-h-[540px] lg:h-[620px] bg-[#090a0f] flex flex-col gap-3 p-3 lg:p-0">
            {/* Layer 0: candidate's shared screen — VS Code */}
            <div className="absolute inset-0 flex flex-col bg-[#1e1e1e]/90 select-none">
              <div className="flex items-center justify-between h-9 px-3 bg-[#181818] border-b border-white/[0.05] text-[11px] font-mono">
                <div className="flex items-center gap-2 px-3 h-full bg-[#1e1e1e] border-t border-t-blue-500 text-zinc-300">
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>{scenario.file}</span>
                </div>
                <span className="text-zinc-600 hidden sm:inline">{scenario.cursor} · TypeScript</span>
              </div>
              <div className="flex-1 overflow-hidden px-4 pt-3 font-mono text-[11px] sm:text-xs leading-[1.7]">
                {scenario.code.map((line, i) => (
                  <div key={`${scenarioKey}-${i}`} className="flex gap-4 whitespace-pre">
                    <span className="w-5 text-right text-zinc-700 shrink-0">{i + 1}</span>
                    <span>{highlight(line)}</span>
                  </div>
                ))}
              </div>
              <div className="h-6 px-3 flex items-center justify-between bg-blue-600/80 text-[10px] font-mono text-white/90">
                <span>main* · 0 ⚠ 0 ✕</span>
                <span>UTF-8 · LF</span>
              </div>
            </div>

            {/* Interviewer PiP card (top right) */}
            <div className="relative z-20 lg:absolute lg:top-4 lg:right-4 lg:w-[31%] rounded-xl bg-zinc-950/85 backdrop-blur-xl border border-white/[0.1] p-3 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
                    IV
                  </div>
                  <div className="leading-tight">
                    <div className="text-[11px] font-semibold text-white">Interviewer</div>
                    <div className="text-[9px] font-mono text-indigo-300">{scenario.tag}</div>
                  </div>
                </div>
                <div className="flex items-end gap-0.5 h-5">
                  {eqBars.map((h, i) => (
                    <motion.span
                      key={i}
                      animate={eqActive ? { height: [3, h, 3] } : { height: 3 }}
                      transition={{ repeat: eqActive ? Infinity : 0, duration: 0.7, delay: i * 0.06 }}
                      className="w-[3px] rounded-full bg-indigo-400"
                      style={{ height: 3 }}
                    />
                  ))}
                </div>
              </div>
              <div className="min-h-[3.5rem] text-[11px] sm:text-xs leading-snug text-zinc-100">
                «{scenario.question.slice(0, questionChars)}
                {!questionDone && <span className="inline-block w-px h-3 bg-white ml-0.5 animate-pulse align-middle" />}
                {questionDone ? '»' : ''}
              </div>
              {scenario.translation && questionDone && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 pt-1.5 border-t border-white/[0.08] flex items-start gap-1.5 text-[11px] text-indigo-300 leading-snug"
                >
                  <Globe className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{scenario.translation}</span>
                </motion.div>
              )}
              <div className="mt-2 text-[10px] font-mono text-zinc-500">Deepgram Nova-3 • 340мс</div>
            </div>

            {/* Layer 1: floating Eyeline HUD */}
            <div className="relative z-30 lg:absolute lg:top-4 lg:left-4 lg:w-[62%] lg:order-first order-first">
              <AnimatePresence mode="wait" initial={false}>
                {viewMode === 'candidate' ? (
                  <motion.div
                    key="hud"
                    initial={{ opacity: 0, y: -16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.01, filter: 'blur(12px)' }}
                    transition={SPRING}
                    className="rounded-2xl backdrop-blur-xl bg-zinc-950/85 border border-emerald-500/30 shadow-2xl shadow-black/70 overflow-hidden"
                  >
                    {/* HUD header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${panic ? 'bg-zinc-500' : dotCls}`} />
                        <span className="text-[10px] sm:text-[11px] font-mono tracking-tight text-emerald-400 font-semibold uppercase truncate">
                          GHOSTBOARD TELEPROMPTER • EYELINE LOCKED
                        </span>
                        {hudStatus && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${statusCls}`}>
                            {hudStatus}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AnimatePresence>
                          {ttftVisible && !panic && (
                            <motion.span
                              key={`ttft-${runId}-${scenarioKey}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={ttftBlinking ? { opacity: [1, 0.3, 1], scale: 1 } : { opacity: 1, scale: 1 }}
                              transition={ttftBlinking ? { repeat: Infinity, duration: 0.4 } : SPRING}
                              className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30"
                            >
                              0.38s TTFT
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <button
                          type="button"
                          onClick={() => setFrozen((f) => !f)}
                          aria-pressed={frozen}
                          disabled={panic}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            frozen
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-white/[0.05] text-zinc-300 border-white/10 hover:text-white'
                          }`}
                        >
                          <Snowflake className="w-3 h-3" />
                          Freeze (Пробіл)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPanic(true)}
                          disabled={panic}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-semibold border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <EyeOff className="w-3 h-3" />
                          Panic Hide
                        </button>
                      </div>
                    </div>

                    {/* HUD body */}
                    <div className="p-4 min-h-[300px]">
                      <AnimatePresence mode="wait" initial={false}>
                        {panic ? (
                          <motion.div
                            key="terminal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="rounded-lg bg-black border border-white/10 p-3 font-mono text-[11px] leading-relaxed min-h-[290px] flex flex-col"
                          >
                            <div className="flex items-center gap-1.5 text-zinc-500 mb-2">
                              <Terminal className="w-3 h-3" />
                              <span>zsh — ~/projects/api</span>
                            </div>
                            <div className="flex-1">
                              {PYTEST_LINES.map((l, i) => (
                                <div
                                  key={i}
                                  className={
                                    l.includes('passed')
                                      ? 'text-emerald-400 font-bold'
                                      : l.startsWith('$')
                                        ? 'text-zinc-200'
                                        : l.includes('.')
                                          ? 'text-emerald-500'
                                          : 'text-zinc-500'
                                  }
                                >
                                  {l || '\u00A0'}
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => setPanic(false)}
                              className="self-start mt-2 px-3 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold hover:bg-emerald-500/25 cursor-pointer transition-colors"
                            >
                              Відновити суфлер
                            </button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key={`answer-${density}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                          >
                            <div className="min-h-[3.5rem]">
                              <div className="text-[9px] font-mono tracking-widest text-emerald-500/80 mb-1">
                                {scenario.hookLabel}
                              </div>
                              <div
                                className={`font-semibold text-white leading-snug ${
                                  density === 'short' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                                }`}
                              >
                                {scenario.hook.slice(0, hookChars)}
                                {hookChars < scenario.hook.length && tick >= hookStart && (
                                  <span className="inline-block w-0.5 h-4 bg-emerald-400 ml-0.5 animate-pulse align-middle" />
                                )}
                              </div>
                            </div>

                            {density === 'full' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {scenario.cards.map((card, i) => (
                                  <motion.div
                                    key={`${scenarioKey}-${runId}-${card.label}`}
                                    initial={false}
                                    animate={
                                      cardVisible(i)
                                        ? { opacity: 1, y: 0 }
                                        : { opacity: 0, y: 8 }
                                    }
                                    transition={SPRING}
                                    className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs leading-relaxed min-h-[76px]"
                                  >
                                    <span className="block font-mono font-bold text-emerald-400 tracking-wider text-[10px] mb-1">
                                      {card.label}
                                    </span>
                                    <span className="text-zinc-200">{card.text}</span>
                                  </motion.div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {scenario.short.map((b, i) => (
                                  <motion.div
                                    key={`${scenarioKey}-${runId}-s${i}`}
                                    initial={false}
                                    animate={cardVisible(i) ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                                    transition={SPRING}
                                    className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20"
                                  >
                                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                                      {i + 1}
                                    </span>
                                    <span className="text-base sm:text-lg font-semibold text-white leading-snug">
                                      {b}
                                    </span>
                                  </motion.div>
                                ))}
                              </div>
                            )}

                            <motion.div
                              initial={false}
                              animate={{ opacity: done ? 1 : 0 }}
                              className="text-xs text-amber-300/90 font-mono flex items-center gap-2"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{scenario.takeaway}</span>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* HUD footer: density switch */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-white/10 bg-black/20">
                      <div className="relative flex items-center p-1 rounded-lg bg-white/[0.04] border border-white/10">
                        {(
                          [
                            { d: 'full', label: 'Повний розбір' },
                            { d: 'short', label: '⚡ Коротко (Тези)' },
                          ] as const
                        ).map((opt) => {
                          const active = density === opt.d;
                          return (
                            <button
                              key={opt.d}
                              type="button"
                              onClick={() => setDensity(opt.d)}
                              aria-pressed={active}
                              className="relative px-3 py-1 rounded-md text-[11px] font-semibold cursor-pointer"
                            >
                              {active && (
                                <motion.span
                                  layoutId="density-pill"
                                  transition={SPRING}
                                  className="absolute inset-0 rounded-md bg-emerald-500/25 border border-emerald-500/40"
                                />
                              )}
                              <span
                                className={`relative z-10 whitespace-nowrap ${
                                  active ? 'text-emerald-200' : 'text-zinc-400'
                                }`}
                              >
                                {opt.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                        <Zap className="w-3 h-3 text-emerald-500" />
                        <span>Ctrl+Shift+H — Panic</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ghost"
                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="rounded-2xl border-2 border-dashed border-emerald-400/40 bg-emerald-400/[0.03] min-h-[380px] flex items-center justify-center p-4"
                  >
                    <div className="max-w-sm text-center p-5 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-emerald-500/30 shadow-xl">
                      <div className="text-sm font-semibold text-white leading-snug mb-3">
                        👻 Невидимо на записі та демонстрації екрана — рекрутер бачить лише чистий код у VS Code
                      </div>
                      <button
                        type="button"
                        onClick={() => handleView('candidate')}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 cursor-pointer transition-colors"
                      >
                        Повернути вигляд кандидата
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
