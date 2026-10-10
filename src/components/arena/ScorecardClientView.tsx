'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, CheckCircle2, Clock, HelpCircle, ShieldCheck, ChevronRight } from 'lucide-react';
import { HologramScorecard3D, ScorecardData } from '@/components/arena/HologramScorecard3D';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { useLocale } from '@/contexts/LocaleContext';
import { getScorecardTranslations } from '@/lib/scorecardI18n';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

interface ScorecardClientViewProps {
  session: any | null;
  slug: string;
}

export function ScorecardClientView({ session, slug }: ScorecardClientViewProps) {
  const { locale } = useLocale();
  const s = getScorecardTranslations(locale);

  if (!session || !session.isPublic) {
    return (
      <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col justify-between">
        <UnifiedNavbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
            <ShieldCheck className="w-8 h-8 text-zinc-500" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
            {s.notFoundTitle}
          </h1>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            {s.notFoundDesc}
          </p>
          <Link
            href="/interview"
            className="btn-resend-primary inline-flex items-center gap-2 text-xs font-mono px-5 py-2.5 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{s.btnGoHome}</span>
          </Link>
        </main>
        <UnifiedFooter />
      </div>
    );
  }

  const rawItems = Array.isArray(session.items) ? session.items : [];
  const questionsCount = session.questionsCount || rawItems.length || 1;

  const avgConfidence = rawItems.reduce((acc: number, item: any) => acc + (item.confidenceScore || 90), 0) / (rawItems.length || 1);
  const baseScore = Math.min(Math.max(Math.round(avgConfidence), 75), 98);

  const dateLocaleMap: Record<string, string> = {
    ua: 'uk-UA',
    en: 'en-US',
    pl: 'pl-PL',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    pt: 'pt-PT',
    it: 'it-IT',
    cs: 'cs-CZ',
    nl: 'nl-NL',
  };

  const scorecardData: ScorecardData = {
    slug,
    candidateName: session.title ? session.title.replace(/^Співбесіда від\s*/i, 'Candidate ') : 'Ghostboard Candidate',
    trackName: 'Full-Stack & System Design',
    level: 'Senior',
    verifiedBadge: s.verifiedBadge,
    overallScore: baseScore,
    percentile: Math.min(Math.round(baseScore * 0.98), 99),
    scores: {
      technicalAccuracy: Math.min(baseScore + 2, 99),
      architecturalVision: Math.max(baseScore - 4, 78),
      communication: Math.min(baseScore + 1, 96),
      stressResilience: Math.max(baseScore - 2, 82),
      thinkingSpeed: Math.min(baseScore + 3, 98),
    },
    dateStr: new Date(session.timestamp).toLocaleDateString(dateLocaleMap[locale] || 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    durationSec: session.durationSec || 600,
    totalQuestions: questionsCount,
    summaryFeedback: `Candidate demonstrated deep understanding of architectural trade-offs, high technical precision, and articulate engineering communication.`,
  };

  const minutes = Math.floor((session.durationSec || 0) / 60);
  const seconds = (session.durationSec || 0) % 60;

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col justify-between selection:bg-white selection:text-black">
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="telemetry" className="flex-1 flex flex-col justify-between">
        <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          {/* Top Breadcrumb & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <Link
              href="/interview"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{s.backToInterview}</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-mono">
                <CheckCircle2 className="w-3 h-3 text-white" />
                {s.verifiedBadge}
              </span>
            </div>
          </div>

          {/* 3D Hologram Scorecard Showcase */}
          <div className="mb-12">
            <HologramScorecard3D data={scorecardData} showShareActions={true} />
          </div>

          {/* Session Meta Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">{s.durationLabel}</div>
              <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span>{minutes}{s.minutesUnit} {seconds}{s.secondsUnit}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">{s.questionsCovered}</div>
              <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span>{questionsCount}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">{s.overallScore}</div>
              <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-white" />
                <span>{baseScore}/100</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">{s.cohortRating}</div>
              <div className="text-xl font-bold font-mono text-white">
                {s.topPercent} {100 - scorecardData.percentile}%
              </div>
            </div>
          </div>

          {/* Detailed Question & Answer Breakdown */}
          {rawItems.length > 0 && (
            <div className="space-y-4 mb-12">
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span>{s.answersAnalysis} ({rawItems.length})</span>
              </h2>

              <div className="space-y-3">
                {rawItems.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-white/30 transition-all space-y-3 backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono text-xs flex items-center justify-center font-bold border border-white/15">
                          #{idx + 1}
                        </span>
                        <h3 className="font-semibold text-sm sm:text-base text-zinc-100">
                          {item.question}
                        </h3>
                      </div>
                      {item.tag && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5 whitespace-nowrap">
                          {item.tag}
                        </span>
                      )}
                    </div>

                    {item.quickAnswer && (
                      <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed pl-8 border-l-2 border-white/30">
                        {item.quickAnswer}
                      </div>
                    )}

                    {Array.isArray(item.hints) && item.hints.length > 0 && (
                      <div className="pl-8 flex flex-wrap gap-1.5 pt-1">
                        {item.hints.map((hint: string, hIdx: number) => (
                          <span
                            key={hIdx}
                            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/5 text-zinc-400"
                          >
                            • {hint}
                          </span>
                        ))}
                      </div>
                    )}

                    {item.codeSnippet && (
                      <div className="pl-8 pt-2">
                        <CodeBlock code={item.codeSnippet} language="typescript" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to action for visitors viewing the scorecard */}
          <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950/90 border border-white/20 text-center space-y-3 shadow-2xl backdrop-blur-md">
            <h3 className="text-lg sm:text-xl font-bold text-white font-mono">
              {s.ctaTitle}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto">
              {s.ctaDesc}
            </p>
            <div className="pt-2">
              <Link
                href="/interview"
                className="py-3 px-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>{s.ctaBtn}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}
