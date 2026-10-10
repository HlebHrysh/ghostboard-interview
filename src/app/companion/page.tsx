'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedNavbar } from '@/components/ui/UnifiedNavbar';
import { UnifiedFooter } from '@/components/ui/UnifiedFooter';
import { Smartphone, ArrowRight, Radio } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/contexts/LocaleContext';
import { SubpageStripesContainer } from '@/components/ui/SubpageStripesContainer';

export default function CompanionFallbackPage() {
  const router = useRouter();
  const { locale } = useLocale();

  useEffect(() => {
    // Graceful auto-redirect to interview companion modal
    const timer = setTimeout(() => {
      router.replace('/interview?modal=companion');
    }, 1200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SubpageStripesContainer pattern="spine" className="flex flex-col justify-between selection:bg-white/20 selection:text-white">
      <UnifiedNavbar />

      <main className="flex-1 max-w-lg mx-auto w-full px-4 flex flex-col items-center justify-center text-center py-20">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.04] border border-white/20 flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(255,255,255,0.08)]">
          <Smartphone className="w-8 h-8 text-white" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] font-mono text-zinc-400 mb-4 uppercase">
          <Radio className="w-3 h-3 text-white animate-pulse" />
          <span>Radio Relay Sync</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold font-sans text-white mb-2">
          {locale === 'ua' ? 'Підключення мобільного суфлера' : 'Connecting Mobile Eyeline Companion'}
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-8 leading-relaxed font-sans">
          {locale === 'ua'
            ? 'Перенаправляємо до генерації персонального QR-коду сесії для синхронізації зі смартфоном...'
            : 'Redirecting to your active session QR code generator for instant smartphone pairing...'}
        </p>

        <Link
          href="/interview?modal=companion"
          className="btn-resend-primary text-xs font-mono !py-3 !px-6 flex items-center gap-2 shadow-[0_0_25px_rgba(255,255,255,0.15)]"
        >
          <span>{locale === 'ua' ? 'Відкрити QR-код зараз' : 'Open Pairing QR Now'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </main>

      <UnifiedFooter />
    </SubpageStripesContainer>
  );
}
