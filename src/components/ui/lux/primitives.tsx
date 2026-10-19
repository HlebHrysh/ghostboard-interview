'use client';

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/** The one spring used across the whole product. No linear easing. */
export const LUX_SPRING = { type: 'spring', stiffness: 350, damping: 28, mass: 0.6 } as const;

type Tone = 'emerald' | 'indigo' | 'amber' | 'rose' | 'zinc';

const TONES: Record<Tone, string> = {
  emerald: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10 shadow-[0_0_14px_rgba(52,211,153,0.18)]',
  indigo: 'text-indigo-300 border-indigo-400/25 bg-indigo-400/10 shadow-[0_0_14px_rgba(129,140,248,0.18)]',
  amber: 'text-amber-300 border-amber-400/25 bg-amber-400/10 shadow-[0_0_14px_rgba(251,191,36,0.15)]',
  rose: 'text-rose-300 border-rose-400/25 bg-rose-400/10 shadow-[0_0_14px_rgba(251,113,133,0.18)]',
  zinc: 'text-zinc-300 border-white/10 bg-white/[0.04]',
};

/** Glowing pill badge with optional lucide icon and live ping. */
export function GlowBadge({
  tone = 'zinc',
  icon,
  ping = false,
  children,
  className = '',
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  ping?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${TONES[tone]} ${className}`}
    >
      {ping && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {icon}
      {children}
    </span>
  );
}

/** Keycap with specular top edge. */
export function KbdObsidian({ children }: { children: React.ReactNode }) {
  return <kbd className="gb-kbd">{children}</kbd>;
}

/** Live voice bars. `level` is 0–100; falls back to a quiet idle line when inactive. */
export function VoiceWaveform({
  level,
  active,
  bars = 14,
  height = 20,
  tone = 'emerald',
}: {
  level: number;
  active: boolean;
  bars?: number;
  height?: number;
  tone?: 'emerald' | 'indigo';
}) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setPhase((p) => p + 1), 90);
    return () => window.clearInterval(id);
  }, [active]);

  const color = tone === 'emerald' ? 'bg-emerald-400' : 'bg-indigo-400';
  const amp = Math.min(1, Math.max(0, level / 60));

  return (
    <span className="flex items-center gap-[2px]" style={{ height }} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        const wave = (Math.sin(phase * 0.9 + i * 0.7) + 1) / 2;
        const h = active ? 0.18 + amp * wave * 0.82 : 0.12;
        return (
          <motion.span
            key={i}
            className={`w-[2px] rounded-full ${color}`}
            animate={{ height: Math.max(2, h * height), opacity: active ? 0.55 + h * 0.45 : 0.25 }}
            transition={LUX_SPRING}
          />
        );
      })}
    </span>
  );
}

/** Card that tilts toward the pointer in 3D. */
export function TiltCard({
  children,
  className = '',
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, LUX_SPRING);
  const sy = useSpring(py, LUX_SPRING);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [max, -max]);

  return (
    <motion.div
      className={className}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width - 0.5);
        py.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Progressive-disclosure accordion row. */
export function Accordion({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          {title}
          {badge}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={LUX_SPRING}>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={LUX_SPRING}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-zinc-400">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
