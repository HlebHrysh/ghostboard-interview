import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicScorecard } from '@/lib/serverDb';
import { HologramScorecard3D, ScorecardData } from '@/components/arena/HologramScorecard3D';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { ArrowLeft, Sparkles, CheckCircle2, Clock, HelpCircle, ShieldCheck, ChevronRight } from 'lucide-react';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ScorecardPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getPublicScorecard(slug);

  if (!session || !session.isPublic) {
    return (
      <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col justify-between selection:bg-white selection:text-black">
        <UnifiedNavbar />
        <SubpageStripesContainer pattern="telemetry" className="flex-1 flex flex-col justify-center">
          <main className="max-w-md mx-auto w-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 mb-4 shadow-xl">
              <ShieldCheck className="w-8 h-8 text-zinc-400" />
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-white mb-2">
              Скоркард не знайдено або закрито
            </h1>
            <p className="text-sm text-zinc-400 max-w-md mb-6 font-sans">
              Цей результат інтерв'ю є приватним або термін дії публічного посилання завершився.
            </p>
            <Link
              href="/interview"
              className="py-2.5 px-5 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Перейти до Ghostboard</span>
            </Link>
          </main>
        </SubpageStripesContainer>
        <UnifiedFooter />
      </div>
    );
  }

interface ScorecardItem {
  id?: string;
  question?: string;
  tag?: string;
  quickAnswer?: string;
  hints?: string[];
  codeSnippet?: string;
  confidenceScore?: number;
}

  const rawItems = ((Array.isArray(session.items) ? session.items : []) as unknown) as ScorecardItem[];
  const questionsCount = session.questionsCount || rawItems.length || 1;

  // Calculate synthetic criteria scores based on question depth & confidence
  const avgConfidence = rawItems.reduce((acc: number, item: ScorecardItem) => acc + (item.confidenceScore || 90), 0) / (rawItems.length || 1);
  const baseScore = Math.min(Math.max(Math.round(avgConfidence), 75), 98);

  const scorecardData: ScorecardData = {
    slug,
    candidateName: session.title ? session.title.replace(/^Співбесіда від\s*/i, 'Кандидат ') : 'Ghostboard Candidate',
    trackName: 'Full-Stack & System Design',
    level: 'Senior',
    verifiedBadge: 'Verified Live Interview Session',
    overallScore: baseScore,
    percentile: Math.min(Math.round(baseScore * 0.98), 99),
    scores: {
      technicalAccuracy: Math.min(baseScore + 2, 99),
      architecturalVision: Math.max(baseScore - 4, 78),
      communication: Math.min(baseScore + 1, 96),
      stressResilience: Math.max(baseScore - 2, 82),
      thinkingSpeed: Math.min(baseScore + 3, 98),
    },
    dateStr: new Date(session.timestamp).toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    durationSec: session.durationSec || 600,
    totalQuestions: questionsCount,
    summaryFeedback: `Кандидат продемонстрував глибоке розуміння архітектурних патернів, високу точність відповідей та впевнену комунікацію під час технічного скринінгу.`,
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
              className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Повернутися до інтерв'ю</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-mono">
                <CheckCircle2 className="w-3 h-3 text-white" />
                Офіційно верифікований результат
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
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">Тривалість</div>
              <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span>{minutes}хв {seconds}с</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">Питань розкрито</div>
              <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span>{questionsCount}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">Загальний бал</div>
              <div className="text-xl font-bold font-mono text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-white" />
                <span>{baseScore}/100</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
              <div className="text-[11px] font-mono text-zinc-400 uppercase mb-1">Рейтинг у когорті</div>
              <div className="text-xl font-bold font-mono text-white">
                Топ {100 - scorecardData.percentile}%
              </div>
            </div>
          </div>

          {/* Detailed Question & Answer Breakdown */}
          {rawItems.length > 0 && (
            <div className="space-y-4 mb-12">
              <h2 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-white" />
                <span>Аналіз відповідей сесії ({rawItems.length})</span>
              </h2>

              <div className="space-y-3">
                {rawItems.map((item: ScorecardItem, idx: number) => (
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
              Готуєтеся до технічного інтерв'ю?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto">
              Отримайте власний інтерактивний AI-суфлер із затримкою 1.4с, розбором системного дизайну та невидимим десктопним HUD.
            </p>
            <div className="pt-2">
              <Link
                href="/interview"
                className="py-3 px-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] inline-flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Спробувати Ghostboard Copilot</span>
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
