"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { UnifiedNavbar } from "@/components/ui/UnifiedNavbar";
import { UnifiedFooter } from "@/components/ui/UnifiedFooter";
import { GhostDetectiveLogo } from "@/components/ui/GhostDetectiveLogo";
import { SubpageStripesContainer } from "@/components/ui/SubpageStripesContainer";
import { useLocale } from "@/contexts/LocaleContext";
import { getLegalTranslations } from "@/lib/legalI18n";
import { ReadingSpine } from "@/components/singularity/ReadingSpine";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-black text-white mb-3 mt-8 font-mono flex items-center gap-2">
      <span className="w-1.5 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)] flex-shrink-0" />
      {children}
    </h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400 leading-relaxed font-sans mb-3">{children}</p>;
}

export default function TermsPage() {
  const { locale, t } = useLocale();
  const legal = getLegalTranslations(locale).terms;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-between selection:bg-white/20 selection:text-white">
      <ReadingSpine />
      <UnifiedNavbar />

      <SubpageStripesContainer pattern="spine" className="flex-1 py-12 px-4 sm:px-6">
        <main className="max-w-3xl mx-auto w-full">
          <div className="bg-[#08080c]/90 backdrop-blur-2xl border border-white/[0.1] rounded-3xl p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            {/* Header strip */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="p-2 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <GhostDetectiveLogo size="mini" />
                    <h1 className="text-base font-black text-white font-mono tracking-wider uppercase flex items-center gap-2">
                      <FileText className="w-4 h-4 text-zinc-300" />
                      {legal.title}
                    </h1>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    {legal.updated}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/20 hidden sm:inline-block">
                {legal.badge}
              </span>
            </div>

            <P>{legal.intro}</P>

            <H2>{legal.sec1Title}</H2>
            <P>{legal.sec1Text}</P>

            <H2>{legal.sec2Title}</H2>
            <P>{legal.sec2Text}</P>

            <H2>{legal.sec3Title}</H2>
            <P>{legal.sec3Text}</P>

            <H2>{legal.sec4Title}</H2>
            <P>{legal.sec4Text}</P>

            <div className="mt-10 pt-6 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <Link href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {t.footer.privacy} →
              </Link>
              <Link href="/interview" className="text-zinc-200 hover:text-white hover:underline font-bold">
                {t.nav.launchCopilot} →
              </Link>
            </div>
          </div>
        </main>
      </SubpageStripesContainer>

      <UnifiedFooter />
    </div>
  );
}
