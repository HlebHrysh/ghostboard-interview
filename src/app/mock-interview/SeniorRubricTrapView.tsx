'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Volume2,
  Copy,
  Check,
  Zap,
  Target,
  Flame,
  Layers,
  Columns,
  ShieldAlert,
  Send,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { UpgradedEvaluationResult } from '../api/ai/arena/evaluationHelper';

interface SeniorRubricTrapViewProps {
  roundIndex: number;
  totalRounds: number;
  question: string;
  candidateAnswer: string;
  evaluation: UpgradedEvaluationResult;
  locale: string;
  onProceedNext: () => void;
  isProceeding?: boolean;
}

interface TrapDefenseResult {
  passed: boolean;
  score: number;
  verdict: string;
  feedback: string;
  recommendedCounter: string;
}

export function SeniorRubricTrapView({
  roundIndex,
  totalRounds,
  question,
  candidateAnswer,
  evaluation,
  locale,
  onProceedNext,
  isProceeding = false,
}: SeniorRubricTrapViewProps) {
  const isUa = locale === 'ua' || locale === 'uk';

  const [activeTab, setActiveTab] = useState<'review' | 'benchmark'>('review');
  const [isSideBySide, setIsSideBySide] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSpeakingHook, setIsSpeakingHook] = useState(false);

  // Trap drill state
  const [showTrapDrill, setShowTrapDrill] = useState(false);
  const [candidateDefense, setCandidateDefense] = useState('');
  const [isEvaluatingDefense, setIsEvaluatingDefense] = useState(false);
  const [defenseResult, setDefenseResult] = useState<TrapDefenseResult | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      toast.success(isUa ? 'Скопійовано' : 'Copied');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleSpeakHook = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeakingHook) {
      window.speechSynthesis.cancel();
      setIsSpeakingHook(false);
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/«|»/g, '');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = isUa ? 'uk-UA' : 'en-US';
    utter.onend = () => setIsSpeakingHook(false);
    utter.onerror = () => setIsSpeakingHook(false);
    setIsSpeakingHook(true);
    window.speechSynthesis.speak(utter);
  };

  const handleSubmitDefense = async () => {
    if (!candidateDefense.trim()) return;
    setIsEvaluatingDefense(true);
    try {
      const res = await fetch('/api/ai/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TRAP_DRILL_EVALUATE',
          trapQuestion: evaluation.trapDrill.trapQuestion,
          candidateDefense,
          idealDefense: evaluation.trapDrill.idealDefense,
          language: isUa ? 'uk' : 'en',
        }),
      });
      const data = await res.json();
      setDefenseResult(data);
      if (data.passed) {
        toast.success(isUa ? '🎯 Пастку успішно відбито!' : '🎯 Trap defended!');
      } else {
        toast.info(isUa ? 'Пастка спрацювала — перегляньте контр-відповідь' : 'Trap triggered — see ideal defense');
      }
    } catch {
      toast.error(isUa ? 'Помилка перевірки захисту' : 'Failed to evaluate defense');
    } finally {
      setIsEvaluatingDefense(false);
    }
  };

  const whatWorkedList = evaluation.whatWorked || evaluation.strengths || [];
  const weakSpotsList = evaluation.weakSpots || evaluation.missingKeyConcepts || [];
  const benchmark = evaluation.seniorBenchmark || {
    hook: evaluation.staffEngineerAnswer,
    pillars: [
      'Архітектурний інваріант та надійність',
      'Запобігання блокуванню потоку та оптимізація пам’яті',
      'Обробка відмов та експоненційні ретраї з jitter',
    ],
    productionExample: '',
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/95 border-2 border-white/15 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
        {/* Specular highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* ── Header: Verdict & Score ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 mb-6 gap-3">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {isUa ? 'Вердикт за раунд' : 'Round Verdict'} {roundIndex + 1} {isUa ? 'з' : 'of'} {totalRounds}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span className="text-zinc-200">{evaluation.verdict}</span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-white/20 text-center min-w-[76px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white block">
                {evaluation.score}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">/ 100</span>
            </div>
          </div>
        </div>

        {/* ── 5-Metrics Matrix ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
            <span className="text-[10px] font-mono text-zinc-400 block">{isUa ? 'Точність' : 'Accuracy'}</span>
            <span className="text-sm font-bold font-mono text-white">
              {evaluation.scores.technicalAccuracy}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
            <span className="text-[10px] font-mono text-zinc-400 block">{isUa ? 'Архітектура' : 'Architecture'}</span>
            <span className="text-sm font-bold font-mono text-white">
              {evaluation.scores.architecturalVision}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
            <span className="text-[10px] font-mono text-zinc-400 block">{isUa ? 'Швидкість' : 'Speed'}</span>
            <span className="text-sm font-bold font-mono text-white">
              {evaluation.scores.thinkingSpeed}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
            <span className="text-[10px] font-mono text-zinc-400 block">{isUa ? 'Комунікація' : 'Communication'}</span>
            <span className="text-sm font-bold font-mono text-white">
              {evaluation.scores.communication}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/80 text-center border border-white/5">
            <span className="text-[10px] font-mono text-zinc-400 block">{isUa ? 'Стійкість' : 'Resilience'}</span>
            <span className="text-sm font-bold font-mono text-white">
              {evaluation.scores.stressResilience}%
            </span>
          </div>
        </div>

        {/* ── Question Recap Banner ── */}
        <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300">
          <span className="font-mono text-[10px] uppercase text-zinc-500 font-bold block mb-1">
            {isUa ? 'Запитання раунду:' : 'Question asked:'}
          </span>
          <p className="font-semibold text-white">«{question}»</p>
        </div>

        {/* ── Tab / Side-by-Side Mode Controls ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setActiveTab('review');
                setIsSideBySide(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                !isSideBySide && activeTab === 'review'
                  ? 'bg-white text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isUa ? '1. Аналіз відповіді' : '1. Your Answer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('benchmark');
                setIsSideBySide(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                !isSideBySide && activeTab === 'benchmark'
                  ? 'bg-white text-black font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {isUa ? '2. Senior-еталон (3 фази)' : '2. Senior Benchmark'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsSideBySide((p) => !p)}
            className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
              isSideBySide
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{isSideBySide ? (isUa ? 'Порівняння пліч-о-пліч' : 'Side-by-Side ON') : (isUa ? 'Пліч-о-пліч' : 'Side-by-Side')}</span>
          </button>
        </div>

        {/* ── Main Breakdown Area: Side-by-Side or Tabs ── */}
        <div className={`grid gap-6 mb-6 ${isSideBySide ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* ═══ COLUMN 1: CANDIDATE ANSWER & CRITIQUE ═══ */}
          {(isSideBySide || activeTab === 'review') && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">
                    {isUa ? 'Ваша озвучена відповідь' : 'Your Answer'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(candidateAnswer || '', 'cand_ans')}
                    className="text-zinc-500 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'cand_ans' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'cand_ans' ? 'Скопійовано' : 'Копіювати'}</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {candidateAnswer || (isUa ? '(Відповідь була порожньою або кандидат промовчав)' : '(Candidate was silent)')}
                </p>
              </div>

              {/* What Worked & Weak Spots Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* What Worked */}
                <div className="p-4 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 text-zinc-300">
                  <span className="font-mono text-emerald-400 font-bold block mb-2 uppercase text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isUa ? 'Що спрацювало' : 'What Worked'}</span>
                  </span>
                  <ul className="space-y-1.5 text-zinc-300">
                    {whatWorkedList.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weak Spots */}
                <div className="p-4 rounded-2xl bg-amber-500/[0.04] border border-amber-500/20 text-zinc-300">
                  <span className="font-mono text-amber-400 font-bold block mb-2 uppercase text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{isUa ? 'Зони росту' : 'Weak Spots'}</span>
                  </span>
                  <ul className="space-y-1.5 text-zinc-300">
                    {weakSpotsList.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ═══ COLUMN 2: SENIOR BENCHMARK (3-PHASE ANSWER) ═══ */}
          {(isSideBySide || activeTab === 'benchmark') && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/15 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isUa ? 'Еталонна 3-фазна Senior відповідь' : 'Ideal 3-Phase Senior Answer'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(evaluation.staffEngineerAnswer, 'benchmark_all')}
                  className="text-zinc-400 hover:text-white text-[11px] font-mono flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'benchmark_all' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'benchmark_all' ? 'Скопійовано' : 'Копіювати все'}</span>
                </button>
              </div>

              {/* Phase 1: The Hook */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-300 uppercase">
                  <span>🗣️ {isUa ? 'Фаза 1: Перша фраза вголос (Hook)' : 'Phase 1: Spoken Opener (Hook)'}</span>
                  <button
                    type="button"
                    onClick={() => handleSpeakHook(benchmark.hook)}
                    className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-amber-300 hover:text-white transition-colors cursor-pointer"
                    title="Послухати як звучить вголос"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed italic">
                  {benchmark.hook}
                </p>
              </div>

              {/* Phase 2: 3 Bold Anchor Pillars */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase block">
                  📌 {isUa ? 'Фаза 2: 3 Ключові архітектурні якорі' : 'Phase 2: 3 Core Pillars'}
                </span>
                <div className="space-y-1.5">
                  {benchmark.pillars.map((pillar, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300 flex items-start gap-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-white/10 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{pillar}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase 3: Production Code / Scenario */}
              {benchmark.productionExample && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase block">
                    💻 {isUa ? 'Фаза 3: Продакшен-приклад / Код' : 'Phase 3: Production Example'}
                  </span>
                  <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                    <pre>{benchmark.productionExample}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Follow-Up Trap Drill Section (`🎯 Перевірка на пастку`) ── */}
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-zinc-950 to-black p-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-rose-500/20">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                <Target className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{isUa ? 'Стрес-тренажер: Перевірка на пастку' : 'Stress Drill: Follow-Up Trap'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
                    Pressure Check
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  {isUa
                    ? 'Перевірте вашу стійкість під тиском проти найскладнішого follow-up запитання інтервʼюера.'
                    : 'Defend your architecture under pressure against the toughest interviewer follow-up.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTrapDrill((p) => !p)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-mono font-bold transition-all cursor-pointer active:scale-95 shrink-0"
            >
              <span>{showTrapDrill ? (isUa ? 'Згорнути пастку' : 'Hide Trap') : (isUa ? '🎯 Перевірка на пастку' : '🎯 Fire Trap Drill')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTrapDrill ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <AnimatePresence>
            {showTrapDrill && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="pt-4 space-y-4"
              >
                {/* Trap Question Display */}
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2">
                  <div className="text-[11px] font-mono font-bold text-rose-300 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{isUa ? 'Каверзне Follow-Up питання інтервʼюера:' : 'Interviewer Follow-Up Trap:'}</span>
                  </div>
                  <p className="text-xs text-white font-semibold leading-relaxed">
                    «{evaluation.trapDrill.trapQuestion}»
                  </p>
                  <p className="text-[11px] text-zinc-400 italic">
                    💡 {isUa ? 'Фокус перевірки:' : 'Probing target:'} {evaluation.trapDrill.interviewerAngle}
                  </p>
                </div>

                {/* Candidate Defense Input */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-zinc-400">
                    {isUa ? 'Сформулюйте вашу лінію захисту:' : 'State your architectural defense:'}
                  </label>
                  <textarea
                    rows={3}
                    value={candidateDefense}
                    onChange={(e) => setCandidateDefense(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitDefense();
                      }
                    }}
                    placeholder={
                      isUa
                        ? 'Поясніть, як система збереже узгодженість при збої (напр. ідемпотентність, Transactional Outbox, тайм-аути)...'
                        : 'Explain how the invariant holds under failure (idempotency, outbox, timeouts)...'
                    }
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/15 focus:border-rose-400/50 text-white font-sans text-xs focus:outline-none transition-colors leading-relaxed resize-none shadow-inner"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>Ctrl + Enter для швидкої відправки</span>
                    <button
                      type="button"
                      onClick={handleSubmitDefense}
                      disabled={isEvaluatingDefense || !candidateDefense.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-40"
                    >
                      {isEvaluatingDefense ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                      ) : (
                        <Send className="w-3.5 h-3.5 fill-black" />
                      )}
                      <span>
                        {isEvaluatingDefense
                          ? (isUa ? 'Перевірка захисту...' : 'Testing...')
                          : (isUa ? 'Відбити пастку' : 'Defend Trap')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Defense Evaluation Result */}
                {defenseResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      defenseResult.passed
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold">
                      <span className="flex items-center gap-1.5">
                        {defenseResult.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                        <span>{defenseResult.verdict}</span>
                      </span>
                      <span className="text-xs">{defenseResult.score}/100</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed">{defenseResult.feedback}</p>
                    <div className="pt-2 border-t border-white/10 text-zinc-300">
                      <strong className="text-white block mb-0.5">
                        {isUa ? 'Рекомендований контр-аргумент Staff-інженера:' : 'Staff Engineer Counter-Defense:'}
                      </strong>
                      <span className="text-zinc-200 italic">{defenseResult.recommendedCounter}</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Proceed to Next Round / Hologram ── */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onProceedNext}
            disabled={isProceeding}
            className="py-3 px-7 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs font-mono shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <span>
              {roundIndex + 1 < totalRounds
                ? (isUa ? 'Наступний раунд →' : 'Next Round →')
                : (isUa ? 'Згенерувати 3D Скоркард →' : 'Generate 3D Scorecard →')}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
