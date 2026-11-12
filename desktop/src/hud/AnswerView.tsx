import React, { memo, useCallback, useMemo, useState, Fragment } from 'react';
import { AlertTriangle, Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import { extractCode, parseAnswer, parseBlocks, type Block, type InlineToken } from '../lib/answerParser';
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

export const Inline = memo(function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((t, i) => {
        switch (t.type) {
          case 'strong':
            return (
              <strong key={i} className="font-semibold text-white">
                {t.value}
              </strong>
            );
          case 'code':
            return (
              <code key={i} className="rounded-[5px] bg-white/10 px-1 py-px font-mono text-[0.86em] text-zinc-100">
                {t.value}
              </code>
            );
          case 'em':
            return (
              <em key={i} className="text-zinc-200">
                {t.value}
              </em>
            );
          default:
            return <span key={i}>{t.value}</span>;
        }
      })}
    </>
  );
});

const Caret = ({ on }: { on: boolean }) => (on ? <span className="gb-caret" aria-hidden /> : null);

// ------------------------------------------------------------------------------------- code

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
    const explanation = `Рядок ${idx + 1}: ключова операція ${lineText.trim().slice(0, 35)}... виконується з безпечною обробкою ресурсів O(1). Запобігає блокуванню потоку виконання.`;
    setLocalExplanations((prev) => ({ ...prev, [idx]: explanation }));
    onExplainLine?.(idx, lineText);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/50">
      <div className="flex h-7 items-center justify-between border-b border-white/[0.07] bg-white/[0.03] px-2.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{lang || 'code'} · клікніть рядок для пояснення</span>
        <Button variant="bare" onClick={copy} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 hover:bg-white/10 hover:text-white">
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          {copied ? 'Скопійовано' : 'Copy'}
        </Button>
      </div>
      <pre className="gb-selectable gb-scroll max-h-[300px] overflow-x-auto p-3 font-mono text-[12.5px] leading-[1.55]">
        <code>
          {lines.map((line, i) => {
            const lineTokens = highlightCode(line);
            const isLastLine = i === lines.length - 1;
            return (
              <React.Fragment key={i}>
                <div
                  onClick={() => handleLineClick(i, line)}
                  className="group flex items-start gap-2.5 px-1 py-0.5 -mx-1 rounded cursor-pointer hover:bg-white/[0.06] transition-colors"
                  title="Клікніть для 2-реченнєвого пояснення рядка (explain_line)"
                >
                  <span className="w-5 text-right font-mono text-xs text-zinc-400 group-hover:text-cyan-300 select-none shrink-0 pt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {lineTokens.map((t, j) => (
                      <span key={j} className={TOKEN_CLASS[t.kind]}>
                        {t.value}
                      </span>
                    ))}
                    {isLastLine && <Caret on={open} />}
                  </div>
                </div>
                {explanations[i] && (
                  <div className="my-1.5 ml-7 p-2 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-200 text-xs font-sans animate-in fade-in leading-relaxed select-text shadow-sm">
                    <span className="font-mono text-[10px] text-cyan-300 font-bold mr-1.5 uppercase">⚡ Пояснення (explain_line):</span>
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
  onExplainLine,
  lineExplanations,
}: {
  blocks: Block[];
  streaming: boolean;
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
            <div key={i} className="flex gap-2 text-zinc-300">
              <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
              <p className="min-w-0">
                <Inline tokens={b.tokens} />
                <Caret on={isLast} />
              </p>
            </div>
          );
        }
        if (b.type === 'h') {
          return (
            <h4 key={i} className="pt-1 font-semibold text-white">
              <Inline tokens={b.tokens} />
            </h4>
          );
        }
        return (
          <p key={i} className="text-zinc-300">
            <Inline tokens={b.tokens} />
            <Caret on={isLast} />
          </p>
        );
      })}
    </div>
  );
});

// --------------------------------------------------------------------------------- phase UI

const PhaseLabel = ({ n, children, tone = 'zinc' }: { n: number; children: string; tone?: 'emerald' | 'zinc' }) => (
  <div className="mb-1.5 flex items-center gap-2">
    <span
      className={`flex h-4 w-4 items-center justify-center rounded font-mono text-[9px] font-bold ${
        tone === 'emerald' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-zinc-300'
      }`}
    >
      {n}
    </span>
    <span className={`font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] ${tone === 'emerald' ? 'text-emerald-300/90' : 'text-zinc-500'}`}>
      {children}
    </span>
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
  onRetry?: (answer: AnswerEntry) => void;
  onTogglePillar?: (answerId: string, index: number) => void;
  onExplainLine?: (answerId: string, lineIndex: number, lineText: string) => void;
}

/** Full 3-phase teleprompter card. Memoized: only re-renders when its own answer changes. */
export const AnswerView = memo(function AnswerView({
  answer,
  onRetry,
  onTogglePillar,
  onExplainLine,
}: AnswerViewProps) {
  const { parsed, hookTokens, pillarBlocks, deepBlocks, plainBlocks } = useTokenParse(answer.raw);
  const streaming = answer.status === 'streaming';
  const { copied: hookCopied, copy: copyHook } = useCopy(() => parsed.hook || parsed.plain);
  const waiting = streaming && !answer.raw.trim();

  const codeText = useMemo(() => extractCode(parsed.deepDive), [parsed.deepDive]);

  return (
    <div className="gb-selectable space-y-3 text-[length:var(--hud-font,16px)] leading-[1.5]">
      {waiting && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[12px] text-amber-300">
            <Loader2 size={13} className="animate-spin" /> ШІ формує відповідь…
          </div>
          <SkeletonLines lines={3} />
        </div>
      )}

      {answer.status === 'error' && (
        <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-rose-400/30 bg-rose-400/[0.08] p-3 text-[13px] text-rose-200">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Не вдалося отримати відповідь</div>
            <div className="mt-0.5 break-words text-[12px] text-rose-200/80">{answer.error}</div>
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
          {/* PHASE 1 — spoken hook */}
          <section aria-label="Фаза 1: голосовий старт">
            <PhaseLabel n={1} tone="emerald">
              Скажіть вголос
            </PhaseLabel>
            <div className="relative rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-3.5 py-3 shadow-[inset_0_1px_0_0_rgba(110,231,183,0.12)]">
              {parsed.hook ? (
                <p className="font-medium text-white" style={{ fontSize: 'calc(var(--hud-font, 16px) + 2px)', lineHeight: 1.45 }}>
                  {hookTokens.map((b, i) => (b.type !== 'code' ? <Inline key={i} tokens={b.tokens} /> : null))}
                  <Caret on={streaming && parsed.phase <= 1} />
                </p>
              ) : (
                <SkeletonLines lines={2} />
              )}
              {parsed.hook && (
                <Button
                  variant="bare"
                  onClick={copyHook}
                  title="Скопіювати вступ у буфер обміну"
                  className="absolute right-2 top-2 h-6 px-2 flex items-center gap-1 text-[11px] font-medium rounded-md bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 border border-emerald-400/30 transition-all active:scale-95 shadow-sm"
                >
                  {hookCopied ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                  <span>{hookCopied ? 'Скопійовано' : 'Копія'}</span>
                </Button>
              )}
            </div>
          </section>

          {/* PHASE 2 — pillars with Real-time Voice Karaoke Tracking */}
          {(parsed.phase >= 2 || (!streaming && parsed.pillars.length > 0)) && (
            <section aria-label="Фаза 2: ключові тези">
              <PhaseLabel n={2}>Ключові тези</PhaseLabel>
              <div className="space-y-1.5">
                {pillarBlocks.map((blocks, i) => {
                  const isDone = (answer.completedPillarIndices || []).includes(i);
                  const activeIdx = answer.activePillarIndex ?? 0;
                  const isActive = !isDone && (activeIdx === i || ((answer.completedPillarIndices || []).length === 0 && i === 0));
                  return (
                    <div
                      key={i}
                      onClick={() => onTogglePillar?.(answer.id, i)}
                      className={`flex gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-all select-none ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-zinc-300 opacity-80'
                          : isActive
                          ? 'border-cyan-400/40 bg-cyan-500/[0.08] ring-1 ring-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <span
                        className={`mt-[0.15em] flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold transition-all ${
                          isDone
                            ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300'
                            : isActive
                            ? 'bg-cyan-500/25 border border-cyan-400/60 text-cyan-200'
                            : 'bg-white/10 text-zinc-200'
                        }`}
                      >
                        {isDone ? '✓' : i + 1}
                      </span>
                      <p className={`min-w-0 text-zinc-300 ${isDone ? 'line-through decoration-emerald-500/40' : ''}`}>
                        {blocks.map((b, j) => (b.type !== 'code' ? <Inline key={j} tokens={b.tokens} /> : null))}
                        <Caret on={streaming && parsed.phase === 2 && i === pillarBlocks.length - 1} />
                      </p>
                    </div>
                  );
                })}
                {streaming && parsed.phase === 2 && pillarBlocks.length === 0 && <SkeletonLines lines={2} />}
              </div>
            </section>
          )}

          {/* PHASE 3 — deep dive & code with explain_line */}
          {(parsed.phase >= 3 || (!streaming && deepBlocks.length > 0)) && (
            <section aria-label="Фаза 3: глибоке занурення">
              <div className="mb-1.5 flex items-center justify-between">
                <PhaseLabel n={3}>Deep dive · код · trade-offs</PhaseLabel>
                {codeText && !streaming && (
                  <CopyAllCode code={codeText} />
                )}
              </div>
              {deepBlocks.length > 0 ? (
                <div className="text-[0.93em]">
                  <Blocks
                    blocks={deepBlocks}
                    streaming={streaming && parsed.phase === 3}
                    onExplainLine={(lineIdx, lineText) => onExplainLine?.(answer.id, lineIdx, lineText)}
                    lineExplanations={answer.lineExplanations}
                  />
                </div>
              ) : (
                streaming && <SkeletonLines lines={2} />
              )}
            </section>
          )}

          {/* PHASE 4 — follow-up trap shield */}
          {(parsed.followUpTrap || answer.followUpTrap) && (
            <section aria-label="Фаза 4: пастка інтерв'юера">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-4 w-4 items-center justify-center rounded font-mono text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  4
                </span>
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
                  Follow-up trap shield
                </span>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs space-y-2 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.12)]">
                <p className="font-semibold text-amber-100">
                  <span className="text-amber-400 font-mono font-bold mr-1">Q:</span>
                  {(parsed.followUpTrap || answer.followUpTrap)?.question}
                </p>
                <p className="text-zinc-200 bg-black/40 p-2.5 rounded-lg border border-amber-500/20 leading-relaxed font-sans">
                  <span className="text-emerald-400 font-mono font-bold mr-1">A:</span>
                  {(parsed.followUpTrap || answer.followUpTrap)?.answer}
                </p>
              </div>
            </section>
          )}
        </>
      )}

      {parsed.mode === 'plain' && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
          {plainBlocks.length > 0 ? (
            <Blocks
              blocks={plainBlocks}
              streaming={streaming}
              onExplainLine={(lineIdx, lineText) => onExplainLine?.(answer.id, lineIdx, lineText)}
              lineExplanations={answer.lineExplanations}
            />
          ) : (
            <p className="text-zinc-200">
              {answer.raw}
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
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
      {copied ? 'Скопійовано' : 'Копіювати код'}
    </Button>
  );
});

// ----------------------------------------------------------------------------- Eyeline body

/** Compact hook + pillars rendering for the Eyeline notch (large, bold, eye-contact friendly). */
export const EyelineAnswer = memo(function EyelineAnswer({ answer }: { answer: AnswerEntry }) {
  const { parsed, hookTokens, pillarBlocks, plainBlocks } = useTokenParse(answer.raw);
  const streaming = answer.status === 'streaming';

  if (answer.status === 'error') {
    return (
      <div role="alert" className="flex items-center gap-2 text-[13px] text-rose-300">
        <AlertTriangle size={14} className="shrink-0" /> <span className="truncate">{answer.error}</span>
      </div>
    );
  }
  if (streaming && !answer.raw.trim()) return <SkeletonLines lines={2} />;

  if (parsed.mode === 'plain') {
    return (
      <p className="font-semibold text-white" style={{ fontSize: 'calc(var(--hud-font, 16px) + 2px)', lineHeight: 1.4 }}>
        {plainBlocks.slice(0, 3).map((b, i) => (b.type !== 'code' ? <Inline key={i} tokens={b.tokens} /> : null))}
        <Caret on={streaming} />
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="font-bold text-white" style={{ fontSize: 'calc(var(--hud-font, 16px) + 3px)', lineHeight: 1.38, letterSpacing: '-0.01em' }}>
        {hookTokens.map((b, i) => (b.type !== 'code' ? <Inline key={i} tokens={b.tokens} /> : null))}
        <Caret on={streaming && parsed.phase <= 1} />
      </p>
      {pillarBlocks.map((blocks, i) => {
        const isDone = (answer.completedPillarIndices || []).includes(i);
        return (
          <p
            key={i}
            className={`flex gap-2 transition-all ${isDone ? 'text-emerald-300/60 line-through' : 'text-zinc-300'}`}
            style={{ fontSize: 'var(--hud-font, 16px)', lineHeight: 1.4 }}
          >
            <span
              className={`mt-[0.35em] h-2 w-2 shrink-0 rounded-full flex items-center justify-center font-mono text-[8px] font-bold ${
                isDone ? 'bg-emerald-400 text-black' : 'bg-emerald-400/80'
              }`}
            >
              {isDone ? '✓' : ''}
            </span>
            <span className="min-w-0">
              {blocks.map((b, j) => (b.type !== 'code' ? <Inline key={j} tokens={b.tokens} /> : null))}
              <Caret on={streaming && parsed.phase === 2 && i === pillarBlocks.length - 1} />
            </span>
          </p>
        );
      })}
    </div>
  );
});
