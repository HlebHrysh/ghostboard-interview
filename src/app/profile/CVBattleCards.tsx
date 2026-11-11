'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Download,
  Printer,
  Copy,
  Check,
  Sparkles,
  Volume2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Code2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CVBattleCard,
  generateCvBattleCards,
  generateBattleCardsMarkdown,
} from './cvBattleCardGenerator';

interface CandidateProfileProps {
  role?: string;
  level?: string;
  techStack?: string[];
  cvContext?: string;
}

interface CVBattleCardsProps {
  candidateProfile: CandidateProfileProps | null;
  resumeContext?: string;
  locale: string;
}

export function CVBattleCards({ candidateProfile, resumeContext = '', locale }: CVBattleCardsProps) {
  const isUa = locale === 'ua';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [masteredCards, setMasteredCards] = useState<Record<string, boolean>>({});
  const [isEnriching, setIsEnriching] = useState(false);
  const [aiEnrichedCards, setAiEnrichedCards] = useState<CVBattleCard[] | null>(null);

  const resolvedStack = useMemo(() => {
    if (candidateProfile?.techStack && candidateProfile.techStack.length > 0) {
      return candidateProfile.techStack;
    }
    return ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'];
  }, [candidateProfile]);

  const resolvedLevel = candidateProfile?.level || 'Senior';
  const resolvedRole = candidateProfile?.role || 'Software Engineer';
  const resolvedContext = resumeContext || candidateProfile?.cvContext || '';

  // Base client-side generated cards
  const baseCards = useMemo(() => {
    return generateCvBattleCards({
      primaryStack: resolvedStack,
      experienceLevel: resolvedLevel,
      cvContext: resolvedContext,
      role: resolvedRole,
      locale,
    });
  }, [resolvedStack, resolvedLevel, resolvedContext, resolvedRole, locale]);

  const cardsToDisplay = aiEnrichedCards || baseCards;

  // Copy helper
  const handleCopy = (text: string, keyName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      toast.success(isUa ? 'Скопійовано в буфер' : 'Copied to clipboard');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Text-to-speech for practicing hook aloud
  const handleSpeakHook = (text: string, cardId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.error(isUa ? 'Озвучка не підтримується браузером' : 'TTS not supported');
      return;
    }

    if (speakingId === cardId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/«|»/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = isUa ? 'uk-UA' : 'en-US';
    utterance.rate = 1.0;

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(cardId);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle mastered status
  const handleToggleMastered = (cardId: string) => {
    setMasteredCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Download Markdown Cheat-Sheet
  const handleDownloadMarkdown = () => {
    const mdContent = generateBattleCardsMarkdown(cardsToDisplay, {
      role: resolvedRole,
      level: resolvedLevel,
      stack: resolvedStack,
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanRoleName = resolvedRole.toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `cv-battle-cheat-sheet-${cleanRoleName}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(
      isUa
        ? '📥 Шпаргалку завантажено у форматі Markdown!'
        : '📥 Cheat-sheet downloaded in Markdown!'
    );
  };

  // Print Cheat-Sheet
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Optional AI Enrichment
  const handleAiEnrich = async () => {
    setIsEnriching(true);
    try {
      const res = await fetch('/api/profile/cheat-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: resolvedRole,
          level: resolvedLevel,
          techStack: resolvedStack,
          resumeContext: resolvedContext,
          locale,
        }),
      });
      const data = await res.json();
      if (res.ok && data.cheatSheet?.trickyQuestions?.length > 0) {
        // Map trickyQuestions to CVBattleCard format
        const mapped: CVBattleCard[] = data.cheatSheet.trickyQuestions.slice(0, 6).map((tq: {
          id: string;
          question: string;
          category: string;
          leadHook: string;
          keyPillars: string[];
          pitfall: string;
          codeSnippet?: string;
        }) => ({
          id: tq.id,
          title: tq.question,
          domain: tq.category,
          domainBadge: tq.category,
          hook: tq.leadHook,
          pillars: [
            tq.keyPillars[0] || 'Архітектурний баланс та надійність',
            tq.keyPillars[1] || 'Стійкість до відмов та ліквідація вузьких місць',
            tq.keyPillars[2] || 'Оптимізація ресурсів та обробка помилок',
          ],
          trap: {
            question: isUa
              ? '«Як ваша система поведеться при раптовому сплеску або розділенні мережі?»'
              : '«How does this system behave during sudden split-brain or network partitions?»',
            counterAnswer: tq.pitfall,
          },
          codeSnippet: tq.codeSnippet,
        }));

        setAiEnrichedCards(mapped);
        toast.success(
          isUa
            ? '✨ Шпаргалку збагачено свіжими ШІ-кейсами під ваш стек!'
            : '✨ Battle cards enriched with latest AI context!'
        );
      } else {
        toast.info(isUa ? 'Використано готову високоточну збірку' : 'Applied precision local bundle');
      }
    } catch {
      toast.error(isUa ? 'Помилка оновлення ШІ, показано базові картки' : 'AI enrichment failed');
    } finally {
      setIsEnriching(false);
    }
  };

  const masteredCount = Object.values(masteredCards).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* ── Section Header Bento ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-950 via-[#0e1017] to-zinc-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-bold tracking-wider uppercase">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{isUa ? 'CV Battle Cards' : 'CV Battle Cards'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{isUa ? 'Персональна шпаргалка перед дзвінком' : 'Pre-Call Battle Cheat-Sheet'}</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
              {isUa
                ? '6 відібраних карток під ваш стек. Кожна картка містить залізний опенинг вголос, 3 якірні тези та контраргумент проти підступних запитань інтервʼюера.'
                : '6 high-yield cards tailored to your stack. Each includes an immediate spoken opener, 3 structural pillars, and a recruiter trap counter-attack.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAiEnrich}
              disabled={isEnriching}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-mono text-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Збагатити картки за допомогою Gemini AI"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isEnriching ? 'animate-spin' : ''}`} />
              <span>{isEnriching ? (isUa ? 'ШІ думає...' : 'Enriching...') : (isUa ? 'ШІ-поглиблення' : 'AI Enrich')}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white font-mono text-xs transition-all cursor-pointer active:scale-95"
              title="Друк або збереження у PDF"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-300" />
              <span>{isUa ? 'Друк шпаргалки' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-black font-mono font-bold text-xs shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>{isUa ? '📥 Завантажити Markdown' : '📥 Download MD'}</span>
            </button>
          </div>
        </div>

        {/* Status Strip: Selected Stack & Mastery */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-zinc-500">{isUa ? 'Стек картки:' : 'Active Stack:'}</span>
            {resolvedStack.slice(0, 5).map((tech, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300 text-[11px]"
              >
                {tech}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              {resolvedLevel}
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400">
            <span>
              {isUa ? 'Засвоєно карток:' : 'Mastered:'}{' '}
              <strong className="text-white">
                {masteredCount} / {cardsToDisplay.length}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── 6 CV Battle Flashcards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cardsToDisplay.map((card, idx) => {
          const isMastered = !!masteredCards[card.id];
          const isSpeaking = speakingId === card.id;

          return (
            <div
              key={card.id || idx}
              className={`group relative rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden p-6 ${
                isMastered
                  ? 'bg-zinc-950/80 border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.06)]'
                  : 'bg-zinc-950/90 border-white/10 hover:border-white/25 shadow-xl hover:shadow-2xl'
              }`}
            >
              {/* Specular highlight border on top */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div>
                {/* Header: Card Number, Domain Badge & Mastered Toggle */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-zinc-200">
                      #{idx + 1}
                    </span>
                    <span className="text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      {card.domainBadge}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleMastered(card.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer ${
                      isMastered
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-white/5 hover:border-white/15'
                    }`}
                  >
                    <CheckCircle2 className={`w-3 h-3 ${isMastered ? 'text-emerald-400' : 'text-zinc-500'}`} />
                    <span>{isMastered ? (isUa ? 'Засвоєно' : 'Mastered') : (isUa ? 'Відмітити' : 'Mark')}</span>
                  </button>
                </div>

                {/* Card Title (The Question) */}
                <h3 className="text-base font-bold text-white leading-snug mb-4 group-hover:text-zinc-100 transition-colors">
                  {card.title}
                </h3>

                {/* Block 1: 🗣️ Hook (Перша фраза вголос) */}
                <div className="mb-4 rounded-2xl bg-white/[0.04] border border-white/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <span>🗣️</span> {isUa ? 'Перша фраза вголос (Hook):' : 'Spoken Opener (Hook):'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSpeakHook(card.hook, card.id)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isSpeaking
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                        title={isSpeaking ? 'Зупинити озвучку' : 'Послухати як звучить вголос'}
                      >
                        <Volume2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(card.hook, `hook_${card.id}`)}
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Скопіювати опенинг"
                      >
                        {copiedKey === `hook_${card.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-200 leading-relaxed italic">
                    {card.hook}
                  </p>
                </div>

                {/* Block 2: 📌 3 Ключові якорі (Pillars) */}
                <div className="mb-4 space-y-2">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <span>📌</span> {isUa ? '3 Ключові якорі (Pillars):' : '3 Key Anchor Pillars:'}
                  </span>
                  <div className="space-y-1.5">
                    {card.pillars.map((pillar, pIdx) => (
                      <div
                        key={pIdx}
                        className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 leading-relaxed"
                      >
                        <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-mono text-[10px] text-zinc-300 font-bold mt-0.5">
                          {pIdx + 1}
                        </span>
                        <span>{pillar}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Code Snippet */}
                {card.codeSnippet && (
                  <div className="mb-4 rounded-xl bg-black/60 border border-white/10 p-2.5 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                    <pre>{card.codeSnippet}</pre>
                  </div>
                )}

                {/* Block 3: ⚠️ Пастка рекрутера (Trap & Counter-Answer) */}
                <div className="rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{isUa ? 'Пастка рекрутера & Контраргумент:' : 'Recruiter Trap & Defense:'}</span>
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-amber-200 block mb-1">
                      {isUa ? 'Підступне питання:' : 'Trick question:'} {card.trap.question}
                    </strong>
                    <span className="text-zinc-400 block">
                      <strong className="text-zinc-200">{isUa ? 'Контр-відповідь:' : 'Counter-attack:'}</strong>{' '}
                      {card.trap.counterAnswer}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>Ghostboard Battle Verified</span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `${card.title}\n\nHOOK:\n${card.hook}\n\nPILLARS:\n${card.pillars.join(
                        '\n'
                      )}\n\nTRAP DEFENSE:\n${card.trap.counterAnswer}`,
                      `card_${card.id}`
                    )
                  }
                  className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  {copiedKey === `card_${card.id}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">{isUa ? 'Скопійовано' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{isUa ? 'Копіювати картку' : 'Copy card'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
