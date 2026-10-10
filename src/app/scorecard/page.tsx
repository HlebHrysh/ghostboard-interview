'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';
import { ArrowRight, Award } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';

export default function ScorecardIndexFallbackPage() {
  const router = useRouter();
  const { locale } = useLocale();

  useEffect(() => {
    // If user has a recent scorecard in localStorage, redirect to it; otherwise go to /sandbox
    try {
      const lastSessionId = localStorage.getItem('ghostboard_last_history_id');
      if (lastSessionId) {
        router.replace(`/scorecard/${encodeURIComponent(lastSessionId)}`);
        return;
      }
    } catch {}

    const timer = setTimeout(() => {
      router.replace('/sandbox');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col justify-between selection:bg-white selection:text-black">
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="telemetry" className="flex-1 flex flex-col justify-center">
        <main className="max-w-lg mx-auto w-full px-4 flex flex-col items-center justify-center text-center py-20">
          <div className="w-16 h-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(255,255,255,0.15)] animate-pulse">
            <Award className="w-8 h-8" />
          </div>

          <h1 className="text-xl sm:text-2xl font-bold font-sans text-white mb-2">
            {locale === 'ua' ? 'Звіти та Скоркарди Співбесід' : 'Interview Scorecards & Analytics'}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-8 leading-relaxed font-sans">
            {locale === 'ua'
              ? 'Перенаправляємо до технічної Арени для проходження тестування та генерації персонального 3D-скоркарду...'
              : 'Redirecting to Technical Arena to conduct sparring rounds and generate your verified 3D scorecard...'}
          </p>

          <Link
            href="/sandbox"
            className="py-3 px-6 rounded-xl bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{locale === 'ua' ? 'Перейти до Арени' : 'Go to Technical Arena'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}
