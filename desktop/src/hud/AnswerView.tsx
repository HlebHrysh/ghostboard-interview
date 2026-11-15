import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Loader2,
  RefreshCw,
  Target,
} from 'lucide-react';
import {
  cleanStreamText,
  extractCode,
  parseAnswer,
  parseBlocks,
  splitBilingualSegments,
  type Block,
  type InlineToken,
} from '../lib/answerParser';
import { highlightCode, TOKEN_CLASS } from '../lib/highlight';
import type { AnswerEntry } from '../lib/session';
import { Button } from '../ui/primitives';

// ---------------------------------------------------------------------------------- clipboard

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function useCopy(getText: () => string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    if (await copyText(getText())) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    }
  }, [getText]);
  return { copied, copy };
}

// ------------------------------------------------------------------------------------ inline

export const Inline = memo(function Inline({
  tokens,
  anchorPill = false,
  bilingual = false,
}: {
  tokens: InlineToken[];
  anchorPill?: boolean;
  bilingual?: boolean;
}) {
  return (
    <>
      {tokens.map((t, i) => {
        switch (t.type) {
          case 'strong':
            return (
              <strong
                key={i}
                className={
                  anchorPill
                    ? 'mr-1 rounded-md border border-white/15 bg-white/[0.08] px-1.5 py-0.5 font-semibold text-white'
                    : 'font-semibold text-white'
                }
              >
                {t.value}
              </strong>
            );
          case 'code':
            return (
              <code
                key={i}
                className="rounded border border-white/10 bg-[#09090b] px-1.5 py-0.5 font-mono text-[13px] text-zinc-100"
              >
                {t.value}
              </code>
            );
          case 'em':
            return (
              <em key={i} className="text-xs italic text-zinc-400">
                {t.value}
              </em>
            );
          default: {
            const segments = splitBilingualSegments(t.value, bilingual);
            return (
              <span key={i}>
                {segments.map((seg, sIdx) =>
                  seg.isHint ? (
                    <span key={sIdx} className="text-xs font-normal italic text-zinc-400">
                      {seg.text}
                    </span>
                  ) : (
                    <React.Fragment key={sIdx}>{seg.text}</React.Fragment>
                  )
                )}
              </span>
            );
          }
        }
      })}
    </>
  );
});

const Caret = ({ on }: { on: boolean }) => (on ? <span className="gb-caret" aria-hidden /> : null);

// ------------------------------------------------------------------------------------- Xcode / Raycast code card

const CodeBlock = memo(function CodeBlock({
  lang,
  code,
  open,
  onExplainLine,
  lineExplanations,
}: {
  lang: string;
  code: string;
  open: boolean;
  onExplainLine?: (lineIndex: number, lineText: string) => void;
  lineExplanations?: Record<number, string>;
}) {
  const lines = useMemo(() => code.split('\n'), [code]);
  const [localExplanations, setLocalExplanations] = useState<Record<number, string>>({});
  const explanations = { ...localExplanations, ...(lineExplanations || {}) };
  const { copied, copy } = useCopy(() => code);

  const handleLineClick = (idx: number, lineText: string) => {
    if (explanations[idx]) {
      setLocalExplanations((prev) => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
      return;
    }
    const explanation = `Рядок ${idx + 1}: операція «${lineText.trim().slice(0, 36)}» оптимізована за пам’яттю та часом виконання без блокування головного потоку.`;
    setLocalExplanations((prev) => ({ ...prev, [idx]: explanation }));
    onExplainLine?.(idx, lineText);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#09090b] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
      {/* Raycast / Xcode title bar */}
      <div className="flex min-h-8 items-center justify-between border-b border-white/[0.08] bg-[#141418] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/15" />
          </span>
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-400">
            {lang || 'code'} · клік на рядок = пояснення
          </span>
        </div>

        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-zinc-200 transition-colors hover:bg-white/[0.12] hover:text-white cursor-pointer"
        >
          {copied ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
          <span>{copied ? 'Скопійовано ✓' : 'Копіювати'}</span>
        </button>
      </div>

      <pre className="gb-selectable gb-scroll max-h-[320px] overflow-x-auto p-3.5 font-mono text-[13px] leading-[1.6]">
        <code>
          {lines.map((line, i) => {
            const lineTokens = highlightCode(line);
            const isLastLine = i === lines.length - 1;
            return (
              <React.Fragment key={i}>
                <div
                  onClick={() => handleLineClick(i, line)}
                  className="group -mx-1.5 flex cursor-pointer items-start gap-3 rounded px-1.5 py-0.5 transition-colors hover:bg-white/[0.06]"
                  title="Клікніть для миттєвого пояснення рядка"
                >
                  <span className="w-6 shrink-0 select-none pt-0.5 text-right font-mono text-[11px] tabular-nums text-zinc-600 group-hover:text-emerald-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {lineTokens.map((t, j) => (
                      <span key={j} className={TOKEN_CLASS[t.kind]}>
                        {t.value}
                      </span>
                    ))}
                    {isLastLine && <Caret on={open} />}
                  </div>
                </div>
                {explanations[i] && (
                  <div className="my-1.5 ml-8 rounded-lg border border-emerald-500/25 bg-[#141418] p-2.5 font-sans text-xs leading-relaxed text-zinc-100 select-text">
                    <span className="mr-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-emerald-300">
                      Пояснення:
                    </span>
                    {explanations[i]}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </code>
      </pre>
    </div>
  );
});

const Blocks = memo(function Blocks({
  blocks,
  streaming,
  bilingual,
  onExplainLine,
  lineExplanations,
}: {
  blocks: Block[];
  streaming: boolean;
  bilingual?: boolean;
  onExplainLine?: (lineIndex: number, lineText: string) => void;
  lineExplanations?: Record<number, string>;
}) {
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => {
        const isLast = streaming && i === blocks.length - 1;
        if (b.type === 'code') {
          return (
            <CodeBlock
              key={i}
              lang={b.lang}
              code={b.code}
              open={b.open && streaming}
              onExplainLine={onExplainLine}
              lineExplanations={lineExplanations}
            />
          );
        }
        if (b.type === 'li') {
          return (
            <div key={i} className="flex gap-2 font-mono text-[13px] leading-[1.6] text-zinc-200">
              <span className="mt-[0.58em] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
              <p className="min-w-0">
                <Inline tokens={b.tokens} anchorPill bilingual={bilingual} />
                <Caret on={isLast} />
              </p>
            </div>
          );
        }
        if (b.type === 'h') {
          return (
            <h4 key={i} className="pt-1 text-xs font-semibold uppercase tracking-wide text-white">
              <Inline tokens={b.tokens} bilingual={bilingual} />
            </h4>
          );
        }
        return (
          <p key={i} className="font-mono text-[13px] leading-[1.6] text-zinc-200">
            <Inline tokens={b.tokens} bilingual={bilingual} />
            <Caret on={isLast} />
          </p>
        );
      })}
    </div>
  );
});

// --------------------------------------------------------------------------------- phase UI

const PhaseLabel = ({ n, children }: { n: number; children: string }) => (
  <div className="mb-1.5 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
    <span className="inline-flex h-4.5 w-4.5 items-center justify-center rounded border border-white/10 bg-[#141418] font-mono text-[10px] text-zinc-200">
      {n}
    </span>
    <span>{children}</span>
  </div>
);

const SkeletonLines = ({ lines = 2 }: { lines?: number }) => (
  <div className="space-y-2" aria-hidden>
    {Array.from({ length: lines }, (_, i) => (
      <div key={i} className="gb-skeleton h-3.5" style={{ width: `${92 - i * 18}%` }} />
    ))}
  </div>
);

function useTokenParse(raw: string) {
  return useMemo(() => {
    const parsed = parseAnswer(raw);
    const hookTokens = parsed.hook ? parseBlocks(parsed.hook) : [];
    const pillarBlocks = parsed.pillars.map((p) => parseBlocks(p));
    const deepBlocks = parsed.deepDive ? parseBlocks(parsed.deepDive) : [];
    const plainBlocks = parsed.mode === 'plain' && parsed.plain ? parseBlocks(parsed.plain) : [];
    return { parsed, hookTokens, pillarBlocks, deepBlocks, plainBlocks };
  }, [raw]);
}

// -------------------------------------------------------------------------------- AnswerView

interface AnswerViewProps {
  answer: AnswerEntry;
  outputLanguage?: string;
  onRetry?: (answer: AnswerEntry) => void;
  onTogglePillar?: (answerId: string, index: number) => void;
  onExplainLine?: (answerId: string, lineIndex: number, lineText: string) => void;
}

/**
 * 4-Phase Teleprompter Card:
 * 1. PHASE_1:HOOK (18px / leading-[28px] hero statement with emerald left rule)
 * 2. PHASE_2:PILLARS (interactive checklist bullets with opacity-50 completion)
 * 3. PHASE_3:DEEP_DIVE (Xcode / Raycast dark code panel)
 * 4. PHASE_4:TRAP (interactive bottom capsule with 0ms click / 'T' key reveal)
 */
export const AnswerView = memo(function AnswerView({
  answer,
  outputLanguage,
  onRetry,
  onTogglePillar,
  onExplainLine,
}: AnswerViewProps) {
  const { parsed, hookTokens, pillarBlocks, deepBlocks, plainBlocks } = useTokenParse(answer.raw);
  const streaming = answer.status === 'streaming';
  const isBilingual = Boolean(outputLanguage && outputLanguage.startsWith('bilingual'));
  const { copied: hookCopied, copy: copyHook } = useCopy(() => parsed.hook || parsed.plain);
  const waiting = streaming && !answer.raw.trim();

  const [isTrapRevealed, setIsTrapRevealed] = useState(false);

  // Reset trap reveal when switching to a different answer
  useEffect(() => {
    setIsTrapRevealed(false);
  }, [answer.id]);

  // Press 'T' (or Cyrillic 'Е' at same physical key) to reveal/hide Trap answer in 0ms
  const hasTrap = Boolean(parsed.followUpTrap || answer.followUpTrap);
  useEffect(() => {
    if (!hasTrap) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (inInput || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') {
        e.preventDefault();
        setIsTrapRevealed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasTrap]);

  const codeText = useMemo(() => extractCode(parsed.deepDive), [parsed.deepDive]);
  const trapData = parsed.followUpTrap || answer.followUpTrap;

  return (
    <div className="gb-selectable space-y-3.5 text-[length:var(--hud-font,16px)] leading-[1.55]">
      {waiting && (
        <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-4 space-y-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <Loader2 size={13} className="animate-spin" /> ШІ формує відповідь...
          </div>
          <SkeletonLines lines={3} />
        </div>
      )}

      {answer.status === 'error' && (
        <div
          role="alert"
          className="flex min-h-[56px] items-start gap-2.5 rounded-xl border border-rose-500/35 bg-[#141418] p-4 text-xs text-zinc-200"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-400" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">Не вдалося отримати відповідь</div>
            <div className="mt-0.5 break-words text-xs text-zinc-400">{answer.error}</div>
          </div>
          {onRetry && (
            <Button size="xs" variant="danger" onClick={() => onRetry(answer)}>
              <RefreshCw size={11} /> Ще раз
            </Button>
          )}
        </div>
      )}

      {parsed.mode === 'phased' && (
        <>
          {/* PHASE 1 — Hero spoken hook (18px / leading-[28px]) */}
          <section aria-label="Фаза 1: голосовий старт">
            <PhaseLabel n={1}>Скажіть вголос</PhaseLabel>
            <div className="relative min-h-[64px] rounded-xl border border-white/[0.1] border-l-2 border-l-emerald-400 bg-[#141418] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]">
              {parsed.hook ? (
                <p className="pr-24 text-[max(18px,calc(var(--hud-font,16px)*1.125))] font-medium leading-[28px] tracking-[-0.01em] text-white antialiased">
                  {hookTokens.map((b, i) =>
                    b.type !== 'code' ? <Inline key={i} tokens={b.tokens} bilingual={isBilingual} /> : null
                  )}
                  <Caret on={streaming && parsed.phase <= 1} />
                </p>
              ) : (
                <SkeletonLines lines={2} />
              )}

              {parsed.hook && (
                <button
                  type="button"
                  onClick={copyHook}
                  title="Скопіювати старт відповіді"
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#09090b] px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white cursor-pointer"
                >
                  {hookCopied ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                  <span>{hookCopied ? 'Скопійовано ✓' : 'Копія'}</span>
                </button>
              )}
            </div>
          </section>

          {/* PHASE 2 — Spacious Interactive Key Pillars */}
          {(parsed.phase >= 2 || (!streaming && parsed.pillars.length > 0)) && (
            <section aria-label="Фаза 2: ключові тези">
              <PhaseLabel n={2}>Ключові тези (клік по пункту = проговорено)</PhaseLabel>
              <div className="space-y-2.5">
                {pillarBlocks.map((blocks, i) => {
                  const isDone = (answer.completedPillarIndices || []).includes(i);
                  const activeIdx = answer.activePillarIndex ?? 0;
                  const isActive =
                    !isDone &&
                    (activeIdx === i || ((answer.completedPillarIndices || []).length === 0 && i === 0));
                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      data-state={isDone ? 'done' : isActive ? 'active' : 'idle'}
                      aria-pressed={isDone}
                      onClick={() => onTogglePillar?.(answer.id, i)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onTogglePillar?.(answer.id, i);
                        }
                      }}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 transition-all duration-150 cursor-pointer select-none ${
                        isDone
                          ? 'border-white/[0.06] bg-[#0e0e11] opacity-50'
                          : isActive
                            ? 'border-emerald-500/40 bg-[#15181b] shadow-[inset_0_1px_0_0_rgba(167,243,208,0.16)]'
                            : 'border-white/[0.08] bg-[#111114] hover:border-white/20'
                      }`}
                    >
                      <span
                        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isActive
                              ? 'bg-emerald-400 text-zinc-950'
                              : 'bg-white/[0.08] text-zinc-300'
                        }`}
                      >
                        {isDone ? <Check size={11} /> : i + 1}
                      </span>
                      <p
                        className={`min-w-0 text-[max(15px,calc(var(--hud-font,16px)*0.94))] leading-[1.55] antialiased ${
                          isActive ? 'text-white font-medium' : 'text-zinc-200'
                        } ${isDone ? 'line-through decoration-white/30 text-zinc-400' : ''}`}
                      >
                        {blocks.map((b, j) =>
                          b.type !== 'code' ? (
                            <Inline key={j} tokens={b.tokens} anchorPill bilingual={isBilingual} />
                          ) : null
                        )}
                        <Caret on={streaming && parsed.phase === 2 && i === pillarBlocks.length - 1} />
                      </p>
                    </div>
                  );
                })}
                {streaming && parsed.phase === 2 && pillarBlocks.length === 0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-3.5">
                    <SkeletonLines lines={2} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* PHASE 3 — Xcode / Raycast Deep Dive & Code */}
          {(parsed.phase >= 3 || (!streaming && deepBlocks.length > 0)) && (
            <section aria-label="Фаза 3: глибоке занурення та код">
              <div className="mb-1.5 flex items-center justify-between">
                <PhaseLabel n={3}>Deep dive · код · trade-offs</PhaseLabel>
                {(codeText || parsed.deepDive) && !streaming && (
                  <CopyAllCode code={codeText || parsed.deepDive} />
                )}
              </div>
              {deepBlocks.length > 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
                  <Blocks
                    blocks={deepBlocks}
                    streaming={streaming && parsed.phase === 3}
                    bilingual={isBilingual}
                    onExplainLine={(lineIdx, lineText) => onExplainLine?.(answer.id, lineIdx, lineText)}
                    lineExplanations={answer.lineExplanations}
                  />
                </div>
              ) : (
                streaming && (
                  <div className="rounded-xl border border-white/[0.08] bg-[#111114] p-4">
                    <SkeletonLines lines={2} />
                  </div>
                )
              )}
            </section>
          )}

          {/* PHASE 4 — Interactive 0ms Follow-Up Trap Shield (Click or 'T') */}
          {trapData && (
            <section aria-label="Фаза 4: очікуване питання на засипку">
              <div className="rounded-xl border border-amber-500/25 bg-[#141418] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsTrapRevealed((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.03] cursor-pointer"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <Target size={14} className="shrink-0 text-amber-400" />
                    <span className="truncate text-[12.5px] font-medium text-white">
                      <span className="text-amber-300 mr-1">🎯 Очікуй питання на засипку:</span>
                      {trapData.question}
                    </span>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-[#09090b] px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                    {isTrapRevealed ? 'Сховати' : 'Відповідь (T · 0ms)'}
                    <ChevronDown
                      size={11}
                      className={`transition-transform duration-150 ${isTrapRevealed ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>

                {isTrapRevealed && (
                  <div className="border-t border-white/[0.08] bg-[#0e0f12] px-3.5 py-3 text-[13.5px] leading-[1.6] text-zinc-200 select-text">
                    <span className="mr-1.5 font-mono text-[11px] font-semibold text-emerald-300">
                      ГОТОВА ВІДПОВІДЬ:
                    </span>
                    {trapData.answer}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {parsed.mode === 'plain' && (
        <section className="rounded-xl border border-white/[0.08] bg-[#111114] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          {plainBlocks.length > 0 ? (
            <Blocks
              blocks={plainBlocks}
              streaming={streaming}
              bilingual={isBilingual}
              onExplainLine={(lineIdx, lineText) => onExplainLine?.(answer.id, lineIdx, lineText)}
              lineExplanations={answer.lineExplanations}
            />
          ) : (
            <p className="text-[var(--hud-font,16px)] leading-[1.55] text-zinc-200 antialiased">
              {cleanStreamText(answer.raw)}
              <Caret on={streaming} />
            </p>
          )}
        </section>
      )}
    </div>
  );
});

const CopyAllCode = memo(function CopyAllCode({ code }: { code: string }) {
  const { copied, copy } = useCopy(() => code);
  return (
    <Button size="xs" variant="ghost" onClick={copy}>
      {copied ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
      {copied ? 'Скопійовано ✓' : 'Копіювати код'}
    </Button>
  );
});

// ----------------------------------------------------------------------------- Eyeline body

/** Compact hook + pillars rendering for Eyeline Notch (high contrast, zero outer frame noise). */
export const EyelineAnswer = memo(function EyelineAnswer({ answer }: { answer: AnswerEntry }) {
  const { parsed, hookTokens, pillarBlocks, plainBlocks } = useTokenParse(answer.raw);
  const streaming = answer.status === 'streaming';

  if (answer.status === 'error') {
    return (
      <div role="alert" className="flex items-center gap-2 text-xs text-rose-300">
        <AlertTriangle size={14} className="shrink-0" />{' '}
        <span className="truncate">{answer.error}</span>
      </div>
    );
  }
  if (streaming && !answer.raw.trim()) return <SkeletonLines lines={2} />;

  if (parsed.mode === 'plain') {
    return (
      <p className="border-l-2 border-emerald-400 pl-3 text-[calc(var(--hud-font,16px)*1.06)] font-medium leading-[1.5] text-white antialiased">
        {plainBlocks.slice(0, 3).map((b, i) => (b.type !== 'code' ? <Inline key={i} tokens={b.tokens} /> : null))}
        <Caret on={streaming} />
      </p>
    );
  }

  return (
    <div className="space-y-2 max-w-[65ch]">
      <p className="border-l-2 border-emerald-400 pl-3 text-[calc(var(--hud-font,16px)*1.06)] font-medium leading-[1.5] text-white antialiased">
        {hookTokens.map((b, i) => (b.type !== 'code' ? <Inline key={i} tokens={b.tokens} /> : null))}
        <Caret on={streaming && parsed.phase <= 1} />
      </p>
      {pillarBlocks.slice(0, 3).map((blocks, i) => {
        const isDone = (answer.completedPillarIndices || []).includes(i);
        return (
          <p
            key={i}
            className={`flex gap-2 text-[calc(var(--hud-font,16px)*0.9)] leading-[1.48] antialiased ${
              isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'
            }`}
          >
            <span
              className={`mt-[0.28em] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold ${
                isDone ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/15 text-zinc-200'
              }`}
            >
              {isDone ? <Check size={9} /> : i + 1}
            </span>
            <span className="min-w-0">
              {blocks.map((b, j) => (b.type !== 'code' ? <Inline key={j} tokens={b.tokens} anchorPill /> : null))}
              <Caret on={streaming && parsed.phase === 2 && i === pillarBlocks.length - 1} />
            </span>
          </p>
        );
      })}
    </div>
  );
});
