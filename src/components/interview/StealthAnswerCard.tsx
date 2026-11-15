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
import { InterviewQAItem } from '@/types/interview';
import { ScrambleText } from '@/components/ui/ScrambleText';
import { useLocale } from '@/contexts/LocaleContext';
import { getHudTranslations } from '@/lib/hudI18n';
import { parseBilingualParts } from '@/lib/aiPromptCore';

export function renderFormattedInlineText(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

interface StealthAnswerCardProps {
  activeQA: InterviewQAItem;
  readLockProgress: number;
  copiedId: string | null;
  isFrozen?: boolean;
  isCopilotGenerating?: boolean;
  pendingNewCount?: number;
  userPlan?: 'free' | 'pro' | 'lifetime';
  onCopy: (text: string, id: string) => void;
  onRefineQA: (id: string, refinement: 'under_the_hood' | 'code' | 'shorter' | 'simpler' | 're_angle') => void;
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

  const mainAnswer = activeQA.startHook || activeQA.quickAnswer || '';

  return (
    <div className="w-full max-w-[680px] mx-auto flex flex-col gap-3 animate-in fade-in duration-200 select-none">
      {/* ── 15-SECOND READ LOCK BAR (Subtle Hairline) ── */}
      {readLockProgress > 0 && (
        <div className="w-full bg-white/[0.04] rounded-full h-1 overflow-hidden">
          <div
            className="bg-white h-full rounded-full transition-all duration-150 ease-linear "
            style={{ width: `${Math.round(readLockProgress * 100)}%` }}
            title={`${hud.readLock} ${Math.ceil(readLockProgress * 15)}s`}
          />
        </div>
      )}

      {/* ── FREEZE BANNER (Minimalist Slate/Cyan) ── */}
      {isFrozen && (
        <div className="w-full px-4 py-2.5 rounded-xl bg-[#111113] border border-white/20 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="font-bold text-white uppercase tracking-wider">{hud.frozenBanner}</span>
            {pendingNewCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white text-black font-bold text-xs">
                +{pendingNewCount} {hud.newInQueue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingNewCount > 0 && onJumpToNewest && (
              <button
                type="button"
                onClick={onJumpToNewest}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs font-mono cursor-pointer"
              >
                {hud.jumpLatest}
              </button>
            )}
            <button
              type="button"
              onClick={onToggleFreeze}
              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white text-xs font-mono cursor-pointer transition-colors"
            >
              {hud.unfreeze} [Space]
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN TELEPROMPTER CARD (Linear Noir) ── */}
      <div
        className={`w-full rounded-2xl bg-[#111113] border p-4 sm:p-6 min-h-[220px] [contain:content] transition-colors duration-150 ${
          isFrozen ? 'border-white/40' : 'border-white/[0.08]'
        }`}
      >
        {/* Question Header */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono text-zinc-400">
              {activeQA.meta ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.12] text-zinc-200 font-semibold text-xs">
                  <span>{activeQA.meta.domain}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-300">{activeQA.meta.level}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-200 uppercase">{activeQA.meta.language}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 font-semibold uppercase tracking-wider text-xs">
                  {activeQA.tag || 'Architecture'}
                </span>
              )}
              <span className="text-zinc-500">·</span>
              <span className="text-zinc-400">{activeQA.timecode}</span>
              {activeQA.confidenceScore !== undefined && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">{activeQA.confidenceScore}% confidence</span>
                </>
              )}
            </div>

            <h2 className="text-base font-semibold text-zinc-300 tracking-tight leading-snug line-clamp-3 font-sans">
              <ScrambleText text={activeQA.question} speed={12} scrambleDuration={250} />
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onCopy(mainAnswer, activeQA.id)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.08] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white/60"
            aria-label={copiedId === activeQA.id ? hud.copied : hud.copy}
            title={copiedId === activeQA.id ? hud.copied : hud.copy}
          >
            {copiedId === activeQA.id ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* ── 1. LEAD HOOK (Phase 1: First phrase out loud, 17-19px, border-l-4) ── */}
        <div className="my-4 pl-4 pr-3.5 py-3 border-l-[3px] border-l-white rounded-r-xl bg-white/[0.04] border-y border-r border-white/[0.1]">
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>Фаза 1 · Голосовий старт (Hook)</span>
          </div>
          <div className="text-base sm:text-lg lg:text-[19px] font-medium text-white leading-relaxed tracking-tight font-sans ">
            {parseBilingualParts(mainAnswer).map((part, idx) =>
              part.isTranslation ? (
                <span
                  key={idx}
                  className="text-zinc-400 text-xs italic bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 ml-1.5 inline-block font-normal"
                >
                  {part.text}
                </span>
              ) : (
                <span key={idx}>{renderFormattedInlineText(part.text)}</span>
              )
            )}
          </div>
        </div>

        {/* ── 1.5 BILINGUAL NATIVE TRANSLATION CRIB-SHEET ── */}
        {activeQA.nativeTranslation && (
          <div className="my-2 p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.1]">
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1 flex items-center gap-1.5">
              <span>{hud.nativeTranslationHeader}</span>
            </div>
            <p className="text-sm font-medium text-zinc-200 leading-relaxed font-sans">
              {renderFormattedInlineText(activeQA.nativeTranslation)}
            </p>
          </div>
        )}

        {/* ── 2. KEY THESES BULLETS (Phase 2: Pillars with bold chips) ── */}
        {activeQA.hints && activeQA.hints.length > 0 && (
          <div className="my-3.5 space-y-2">
            <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold px-0.5">
              Фаза 2 · Ключові тези (Pillars)
            </div>

            <ul className="space-y-1.5 text-sm font-sans text-zinc-200">
              {activeQA.hints.map((hint, idx) => {
                const colonIdx = hint.indexOf(':');
                const hasAnchor = colonIdx > 0 && colonIdx <= 45;
                const rawAnchor = hasAnchor ? hint.slice(0, colonIdx).trim() : null;
                const anchor = rawAnchor ? rawAnchor.replace(/^\*\*|\*\*$/g, '').trim() : null;
                const rest = hasAnchor ? hint.slice(colonIdx + 1) : hint;
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                  >
                    <span className="text-zinc-400 font-mono text-xs leading-none mt-1 font-semibold">{idx + 1}.</span>
                    <div className="leading-relaxed font-medium flex-1">
                      {anchor && (
                        <span className="text-white font-semibold">
                          {anchor}
                        </span>
                      )}
                      {parseBilingualParts(rest).map((part, pIdx) =>
                        part.isTranslation ? (
                          <span
                            key={pIdx}
                            className="text-zinc-400 text-xs italic bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5 ml-1.5 inline-block font-normal"
                          >
                            {part.text}
                          </span>
                        ) : (
                          <span key={pIdx}>{renderFormattedInlineText(part.text)}</span>
                        )
                      )}
                    </div>
                  </li>
                );
              })}
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
                aria-expanded={isCodeExpanded}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold uppercase text-xs tracking-wider">{hud.readyCodeHeader}</span>
                {isCodeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button
                type="button"
                onClick={() => onCopy(activeQA.codeSnippet!, 'code')}
                className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {hud.copy}
              </button>
            </div>

            {isCodeExpanded && (
              <pre className="bg-[#09090b] p-3.5 rounded-xl border border-white/[0.06] text-zinc-200 font-mono text-[13px] overflow-auto max-h-[320px] leading-relaxed">
                <code>{activeQA.codeSnippet.trim()}</code>
              </pre>
            )}
          </div>
        )}

        {/* ── 4. DELIVERY TIP (Compact, Muted) ── */}
        {activeQA.deliveryTip && (
          <div className="mt-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-zinc-400 text-xs font-sans flex items-center gap-2">
            <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">TIP:</span>
            <span className="leading-relaxed text-zinc-300">{activeQA.deliveryTip}</span>
          </div>
        )}

        {/* ── 5. 1-CLICK MODIFIERS BAR ── */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-zinc-400 uppercase tracking-wider">
            Модифікатори:
          </span>

          <div className="inline-flex items-center gap-1.5 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono">
            {[
              { key: 'shorter', label: '⚡ Коротше', kbd: 'S' },
              { key: 'simpler', label: '💡 Простіше', kbd: 'E' },
              { key: 'code', label: '</> Код', kbd: 'C' },
              { key: 're_angle', label: '🔄 Інший підхід', kbd: 'R' },
            ].map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => onRefineQA(activeQA.id, btn.key as 'shorter' | 'simpler' | 'code' | 're_angle')}
                disabled={isCopilotGenerating}
                className="px-2.5 py-1.5 rounded-lg text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-white/60"
              >
                <span>{btn.label}</span>
                <kbd className="text-xs font-mono text-zinc-400 px-1 rounded bg-black/40 border border-white/10">
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
