import { memo, useId, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, type MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { shortcutTokens, useOsFamily, type ShortcutSpec } from '../lib/platform';

export const SPRING = { type: 'spring', stiffness: 350, damping: 28, mass: 0.6 } as const;

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** Stops a mousedown from starting a window drag (belt and braces next to the data attribute). */
export const stopDrag = (e: MouseEvent) => e.stopPropagation();

// ------------------------------------------------------------------------------------------ Kbd

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="gb-kbd">{children}</kbd>;
}

/** OS-adaptive shortcut badge: `⌘ ↵` on macOS, `Ctrl Enter` on Windows / Linux. */
export const Shortcut = memo(function Shortcut({ spec }: { spec: ShortcutSpec }) {
  const os = useOsFamily();
  const tokens = shortcutTokens(spec, os).map((t) => (t === 'Enter' ? '↵' : t));
  return (
    <span className="inline-flex items-center gap-1">
      {tokens.map((t, i) => (
        <Kbd key={`${t}-${i}`}>{t}</Kbd>
      ))}
    </span>
  );
});

// --------------------------------------------------------------------------------------- Button

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'bare';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZES = {
  xs: 'min-h-6 py-1 px-2 text-[11px] rounded-md',
  sm: 'min-h-8 py-1.5 px-3 text-xs',
  md: 'min-h-10 py-2 px-4 text-sm',
  lg: 'min-h-14 py-3 px-7 text-base rounded-xl',
} as const;

export function Button({ variant = 'ghost', size = 'sm', className, onMouseDown, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      data-tauri-drag-region="false"
      onMouseDown={(e) => {
        stopDrag(e);
        onMouseDown?.(e);
      }}
      className={cx(
        variant !== 'bare' && 'gb-btn',
        variant === 'primary' && 'gb-btn-primary',
        variant === 'ghost' && 'gb-btn-ghost',
        variant === 'danger' && 'gb-btn-danger',
        variant !== 'bare' && SIZES[size],
        'gb-nodrag',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------------------------- Pill/Dot

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad';

export function Pill({
  tone = 'neutral',
  children,
  className,
  ...rest
}: { tone?: Tone; children: ReactNode } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx('gb-pill', tone === 'ok' && 'gb-pill-ok', tone === 'warn' && 'gb-pill-warn', tone === 'bad' && 'gb-pill-bad', className)}
      {...rest}
    >
      {children}
    </span>
  );
}

const DOT: Record<Tone, string> = {
  neutral: 'bg-zinc-500 text-zinc-500',
  ok: 'bg-emerald-400 text-emerald-400',
  warn: 'bg-amber-400 text-amber-400',
  bad: 'bg-rose-400 text-rose-400',
};

export function StatusDot({ tone = 'neutral', ping = false }: { tone?: Tone; ping?: boolean }) {
  return <span className={cx('relative inline-block h-1.5 w-1.5 shrink-0 rounded-full', DOT[tone], ping && 'gb-ping')} />;
}

// ------------------------------------------------------------------------------------ Structure

export function Card({ className, children, hover = true, active = false, ...rest }: HTMLAttributes<HTMLDivElement> & { hover?: boolean; active?: boolean }) {
  return (
    <div className={cx('gb-card', hover && 'gb-card-hover', active && 'gb-card-active', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, hint, right }: { eyebrow?: string; title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">{eyebrow}</div>}
        <h1 className="font-display text-[22px] sm:text-[24px] font-bold leading-tight tracking-[-0.025em] text-white antialiased">{title}</h1>
        {hint && <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-zinc-400 antialiased">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <div id={id}>{children}</div>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------------- Segmented

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: string;
  badge?: ReactNode;
}

/** Horizontal segmented control with a spring-morphing active pill (shared layoutId). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
  className,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (v: T) => void;
  name: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cx('relative flex gap-1 rounded-xl border border-white/[0.08] bg-[#09090b]/95 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative z-10 flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70',
              active ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${name}`}
                transition={SPRING}
                className="absolute inset-0 -z-10 rounded-lg bg-gradient-to-b from-white to-zinc-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_10px_rgba(255,255,255,0.16)]"
              />
            )}
            <span className="truncate">{o.label}</span>
            {o.badge}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------------------------- Toggle

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-[22px] w-[40px] shrink-0 items-center overflow-hidden rounded-full border p-[2px] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111114]',
        checked
          ? 'border-emerald-400/55 bg-emerald-500 shadow-[inset_0_1px_1px_rgba(255,255,255,0.22),0_0_14px_rgba(16,185,129,0.26)]'
          : 'border-white/[0.12] bg-[#1b1b20] shadow-[inset_0_1px_2px_rgba(0,0,0,0.65)] hover:border-white/25'
      )}
    >
      <motion.span
        initial={false}
        animate={{ x: checked ? 18 : 0 }}
        transition={SPRING}
        className={cx(
          'pointer-events-none block h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] transition-colors',
          checked ? 'bg-white' : 'bg-zinc-300'
        )}
      />
    </button>
  );
}

// -------------------------------------------------------------------------------------- Slider

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  label: string;
  format: (v: number) => string;
}) {
  const formatted = format(value);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-400">{label}</span>
        <span className="rounded-md border border-white/[0.08] bg-[#09090b] px-1.5 py-0.5 font-mono tabular-nums text-[11px] font-semibold text-white">
          {formatted}
        </span>
      </div>
      <input
        type="range"
        className="gb-range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        aria-valuetext={formatted}
        style={
          {
            '--attr-min': String(min),
            '--attr-max': String(max),
            '--control-value': String(value),
          } as React.CSSProperties
        }
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// -------------------------------------------------------------------------------- Empty/Error

export function EmptyState({ icon, title, hint, action }: { icon: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-zinc-300">{icon}</div>
      <div className="font-display text-[13.5px] font-semibold text-zinc-100">{title}</div>
      {hint && <div className="max-w-[260px] text-xs leading-relaxed text-zinc-400">{hint}</div>}
      {action}
    </div>
  );
}
