'use client';

import React, { useEffect, useState } from 'react';
import { Calculator, NotebookPen } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { getLuxTranslations } from '@/lib/luxI18n';

interface DisguiseProps {
  isActive: boolean;
  onDeactivate: () => void;
}

/** Evaluates a simple arithmetic expression without eval(). */
function calculate(expr: string): string {
  const tokens = expr.match(/\d+\.?\d*|[+\-*/]/g);
  if (!tokens) return '0';
  const nums: number[] = [];
  const ops: string[] = [];
  const apply = () => {
    const b = nums.pop() ?? 0;
    const a = nums.pop() ?? 0;
    const op = ops.pop();
    nums.push(op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b === 0 ? NaN : a / b);
  };
  const prec = (o: string) => (o === '+' || o === '-' ? 1 : 2);
  for (const tk of tokens) {
    if (/\d/.test(tk)) nums.push(parseFloat(tk));
    else {
      while (ops.length && prec(ops[ops.length - 1]) >= prec(tk)) apply();
      ops.push(tk);
    }
  }
  while (ops.length) apply();
  const r = nums[0];
  return Number.isFinite(r) ? String(Math.round(r * 1e8) / 1e8) : 'Error';
}

/** Panic mask: the HUD becomes an unremarkable notepad / calculator. Esc returns. */
export const StealthDisguise: React.FC<DisguiseProps> = ({ isActive, onDeactivate }) => {
  const { locale } = useLocale();
  const t = getLuxTranslations(locale).disguise;
  const [tab, setTab] = useState<'notes' | 'calc'>('notes');
  const [note, setNote] = useState('');
  const [expr, setExpr] = useState('');

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onDeactivate();
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [isActive, onDeactivate]);

  if (!isActive) return null;

  const keys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'];
  const press = (k: string) => {
    if (k === '=') setExpr(calculate(expr));
    else setExpr((e) => (e === 'Error' ? k : e + k));
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#1c1c1e] font-sans text-zinc-200" role="dialog">
      <div className="flex h-10 items-center gap-2 border-b border-black/40 bg-[#2a2a2c] px-4">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-4 flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab('notes')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 ${tab === 'notes' ? 'bg-black/30 text-white' : 'text-zinc-400'}`}
          >
            <NotebookPen className="h-3.5 w-3.5" /> {t.notes}
          </button>
          <button
            type="button"
            onClick={() => setTab('calc')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 ${tab === 'calc' ? 'bg-black/30 text-white' : 'text-zinc-400'}`}
          >
            <Calculator className="h-3.5 w-3.5" /> {t.calc}
          </button>
        </div>
      </div>

      {tab === 'notes' ? (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.placeholder}
          className="flex-1 resize-none bg-transparent p-6 text-[15px] leading-relaxed outline-none placeholder:text-zinc-600"
          autoFocus
        />
      ) : (
        <div className="mx-auto flex w-full max-w-xs flex-1 flex-col justify-center gap-3 p-6">
          <div className="min-h-[3.5rem] overflow-x-auto rounded-xl bg-black/30 px-4 py-3 text-right font-mono text-3xl tabular-nums">
            {expr || '0'}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                className={`cursor-pointer rounded-xl py-3 text-lg ${/[+\-*/=]/.test(k) ? 'bg-[#ff9f0a] text-white' : 'bg-[#3a3a3c] text-white'}`}
              >
                {k}
              </button>
            ))}
            <button type="button" onClick={() => setExpr('')} className="col-span-4 cursor-pointer rounded-xl bg-[#636366] py-3 text-lg text-white">
              C
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-1.5 text-center text-[10px] text-zinc-700">{t.exitHint}</div>
    </div>
  );
};

export default StealthDisguise;
