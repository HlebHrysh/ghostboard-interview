'use client';

import React from 'react';
import Link from 'next/link';
import { GhostDetectiveLogo } from './GhostDetectiveLogo';
import { ShieldCheck, Terminal } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';

export const UnifiedFooter: React.FC = () => {
  const { locale, t } = useLocale();
  const m = getModalsTranslations(locale);
  const f = m.footer;

  return (
    <footer className="w-full bg-[#040406] border-t border-white/[0.08] text-zinc-400 py-14 px-4 sm:px-8 select-none">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-white/[0.06]">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 w-fit group">
              <GhostDetectiveLogo size="md" />
              <div>
                <span className="font-mono font-black text-base tracking-[0.25em] text-white group-hover:text-zinc-200 transition-colors">
                  GHOSTBOARD
                </span>
                <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  {f.tagline}
                </span>
              </div>
            </Link>
            <p className="text-sm text-zinc-400 max-w-md font-sans leading-relaxed">
              {f.desc}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{f.ramBadge}</span>
            </div>
          </div>

          {/* Nav links */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {f.ecoTitle}
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/#features" className="hover:text-white transition-colors">
                  {f.featLink}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  {f.pricingLink}
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-white transition-colors">
                  {f.guideLink}
                </Link>
              </li>
              <li>
                <Link href="/mock-interview" className="hover:text-white transition-colors">
                  {f.mockLink}
                </Link>
              </li>
              <li>
                <Link href="/sandbox" className="text-zinc-300 hover:text-white transition-colors flex items-center gap-1">
                  <span>{t.nav.arena}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/[0.08] text-zinc-300 border border-white/15 font-bold">SCORECARD</span>
                </Link>
              </li>
              <li>
                <Link href="/interview?modal=soundcheck" className="hover:text-white transition-colors">
                  {m.soundcheck.title}
                </Link>
              </li>
              <li>
                <Link href="/interview" className="text-zinc-200 hover:text-white hover:underline font-bold flex items-center gap-1">
                  <span>{f.copilotLink}</span>
                  <span>→</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              {f.legalTitle}
            </h4>
            <ul className="space-y-2 text-xs font-mono">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {f.termsLink}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {f.privacyLink}
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  {f.settingsLink}
                </Link>
              </li>
              <li className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                  <Terminal className="w-3 h-3 text-zinc-400" />
                  <span>Native PipeWire / CoreAudio</span>
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div>
            © {new Date().getFullYear()} Ghostboard Studio. {f.rights}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135] animate-pulse" />
              <span className="text-zinc-400">Deepgram Nova-3 &amp; Gemini 2.5 Flash</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
