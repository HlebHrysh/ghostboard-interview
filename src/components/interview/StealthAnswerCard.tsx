'use client';

import React, { useState } from 'react';
import {
  Zap,
  Code2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Lock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { InterviewQAItem } from '@/components/LiveInterviewHUD';
import { ScrambleText } from '@/components/ui/ScrambleText';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';

interface StealthAnswerCardProps {
  activeQA: InterviewQAItem;
  readLockProgress: number;
  copiedId: string | null;
  isFrozen?: boolean;
  isCopilotGenerating?: boolean;
  pendingNewCount?: number;
  userPlan?: 'free' | 'pro' | 'lifetime';
  onCopy: (text: string, id: string) => void;
  onRefineQA: (id: string, refinement: 'under_the_hood' | 'code' | 'shorter' | 're_angle') => void;
  onToggleFreeze?: () => void;
  onJumpToNewest?: () => void;
  onUpgradeClick?: () => void;
}

export const StealthAnswerCard: React.FC<StealthAnswerCardProps> = ({
  activeQA,
  readLockProgress,
  copiedId,
  isFrozen = false,
  isCopilotGenerating = false,
  pendingNewCount = 0,
  userPlan = 'free',
  onCopy,
  onRefineQA,
  onToggleFreeze,
  onJumpToNewest,
  onUpgradeClick,
}) => {
  const { locale } = useLocale();
  const hud = getHudTranslations(locale).answer;
  const [isCodeExpanded, setIsCodeExpanded] = useState(true);

  const mainAnswer = activeQA.quickAnswer || activeQA.startHook || '';

  return (
    <div className="w-full max-w-[680px] mx-auto flex flex-col gap-3 animate-in fade-in duration-200 select-none">
      {/* ── 15-SECOND READ LOCK BAR (Subtle Hairline) ── */}
      {readLockProgress > 0 && (
        <div className="w-full bg-white/[0.04] rounded-full h-1 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-150 ease-linear shadow-[0_0_6px_rgba(255,255,255,0.8)]"
            style={{ width: `${Math.round(readLockProgress * 100)}%` }}
            title={`${hud.readLock} ${Math.ceil(readLockProgress * 15)}s`}
          />
        </div>
      )}

      {/* ── FREEZE BANNER (Minimalist Slate/Cyan) ── */}
      {isFrozen && (
        <div className="w-full px-4 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in">
          <div className="flex items-center gap-2 text-cyan-200">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider">{hud.frozenBanner}</span>
            {pendingNewCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold text-[10px]">
                +{pendingNewCount} {hud.newInQueue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingNewCount > 0 && onJumpToNewest && (
              <button
                type="button"
                onClick={onJumpToNewest}
                className="px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-[11px] font-mono transition-all cursor-pointer"
              >
                {hud.jumpLatest}
              </button>
            )}
            <button
              type="button"
              onClick={onToggleFreeze}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-cyan-300 hover:text-white text-[11px] font-mono cursor-pointer transition-colors"
            >
              {hud.unfreeze} [Space]
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN TELEPROMPTER CARD (Linear Noir) ── */}
      <div
        className={`w-full rounded-2xl bg-black/80 backdrop-blur-3xl border p-5 sm:p-6 transition-all duration-200 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ${
          isFrozen ? 'border-cyan-500/40 ring-1 ring-cyan-500/30' : 'border-white/[0.08]'
        }`}
      >
        {/* Question Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-400">
              <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-semibold uppercase tracking-wider text-[10px]">
                {activeQA.tag || 'Architecture'}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">{activeQA.timecode}</span>
              {activeQA.confidenceScore !== undefined && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">{activeQA.confidenceScore}% confidence</span>
                </>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug font-sans">
              <ScrambleText text={activeQA.question} speed={12} scrambleDuration={250} />
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onCopy(mainAnswer, activeQA.id)}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition-colors shrink-0 cursor-pointer"
            title={copiedId === activeQA.id ? hud.copied : hud.copy}
          >
            {copiedId === activeQA.id ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ── 1. LEAD HOOK (The "First 5 Seconds" Immediate Spoken Answer) ── */}
        <div className="my-4 p-4 sm:p-5 rounded-xl bg-white/[0.035] border border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white font-bold mb-2 flex items-center gap-1.5">
            <span className="status-dot !w-1.5 !h-1.5" />
            <span>{hud.directAnswerHeader} (Speak First)</span>
          </div>
          <p className="text-base sm:text-lg lg:text-[19px] font-semibold text-white leading-relaxed tracking-tight font-sans">
            <ScrambleText text={mainAnswer} speed={8} scrambleDuration={180} />
          </p>
        </div>

        {/* ── 1.5 BILINGUAL NATIVE TRANSLATION CRIB-SHEET ── */}
        {activeQA.nativeTranslation && (
          <div className="my-2 p-3 sm:p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/25">
            <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{hud.nativeTranslationHeader}</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-blue-100/90 leading-relaxed font-sans">
              {activeQA.nativeTranslation}
            </p>
          </div>
        )}

        {/* ── 2. KEY THESES BULLETS ── */}
        {activeQA.hints && activeQA.hints.length > 0 && (
          <div className="my-3.5 space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold px-0.5">
              {hud.keyThesesHeader}
            </div>

            <ul className="space-y-1.5 text-xs sm:text-sm font-sans text-zinc-300">
              {/* First thesis always visible */}
              {activeQA.hints.slice(0, 1).map((hint, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <span className="text-white font-mono text-sm leading-none mt-0.5 font-bold">•</span>
                  <span className="leading-relaxed font-medium">{hint}</span>
                </li>
              ))}

              {/* Remaining theses: visible for pro, soft-paywall for free */}
              {activeQA.hints.length > 1 && (
                userPlan === 'free' ? (
                  <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.01] p-3.5 mt-2">
                    <div className="filter blur-[3px] select-none pointer-events-none opacity-40 space-y-1.5">
                      {activeQA.hints.slice(1).map((hint, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-1.5 text-xs">
                          <span className="text-zinc-500">•</span>
                          <span>{hint}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 bg-gradient-to-t from-[#0D0D10] via-[#0D0D10]/80 to-transparent">
                      <span className="text-xs font-mono text-zinc-300 flex items-center gap-1.5 font-semibold">
                        <Lock className="w-3.5 h-3.5 text-white" />
                        <span>{hud.deepDiveLocked}</span>
                      </span>
                      {onUpgradeClick && (
                        <button
                          type="button"
                          onClick={onUpgradeClick}
                          className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-white text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-md"
                        >
                          {hud.unlockProBtn}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  activeQA.hints.slice(1).map((hint, idx) => (
                    <li
                      key={idx + 1}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                    >
                      <span className="text-white font-mono text-sm leading-none mt-0.5 font-bold">•</span>
                      <span className="leading-relaxed font-medium">{hint}</span>
                    </li>
                  ))
                )
              )}
            </ul>
          </div>
        )}

        {/* ── 3. READY CODE SNIPPET (Collapsible, Quiet Obsidian) ── */}
        {activeQA.codeSnippet && activeQA.codeSnippet.trim() && (
          <div className="my-3 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-2">
              <button
                type="button"
                onClick={() => setIsCodeExpanded((prev) => !prev)}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold uppercase text-[10px] tracking-wider">{hud.readyCodeHeader}</span>
                {isCodeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => onCopy(activeQA.codeSnippet!, 'code')}
                className="text-[10px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {hud.copy}
              </button>
            </div>

            {isCodeExpanded && (
              <pre className="bg-black/60 p-3.5 rounded-xl border border-white/[0.06] text-zinc-200 font-mono text-xs overflow-x-auto leading-relaxed">
                <code>{activeQA.codeSnippet.trim()}</code>
              </pre>
            )}
          </div>
        )}

        {/* ── 4. DELIVERY TIP (Compact, Muted) ── */}
        {activeQA.deliveryTip && (
          <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-zinc-400 text-xs font-sans flex items-center gap-2">
            <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider font-bold">TIP:</span>
            <span className="leading-relaxed text-zinc-300">{activeQA.deliveryTip}</span>
          </div>
        )}

        {/* ── 5. REFINEMENT BAR (Raycast Segmented Control) ── */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {hud.refineHeader}:
          </span>

          <div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono">
            {[
              { key: 'under_the_hood', label: hud.refineUnderHood, kbd: 'H' },
              { key: 'code', label: hud.refineCode, kbd: 'C' },
              { key: 'shorter', label: hud.refineShorter, kbd: 'S' },
              { key: 're_angle', label: hud.refineReAngle, kbd: 'R' },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => onRefineQA(activeQA.id, btn.key as any)}
                disabled={isCopilotGenerating}
                className="px-2.5 py-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              >
                <span>{btn.label}</span>
                <kbd className="text-[9px] font-mono text-zinc-500 px-1 py-0.2 rounded bg-black/40 border border-white/10">
                  {btn.kbd}
                </kbd>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
