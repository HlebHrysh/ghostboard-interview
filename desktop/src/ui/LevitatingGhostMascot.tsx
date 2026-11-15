import React, { useCallback, useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

export type GhostMascotMode = 'stealth' | 'split' | 'notch' | 'audio' | 'turbo';

export interface GhostModeMeta {
  id: GhostMascotMode;
  label: string;
  shortLabel: string;
  image: string;
  accentHex: string;
  glowClass: string;
  badgeClass: string;
  tagline: string;
}

/**
 * 5 cohesive visual states mapped directly to the 5 flagship Ghostboard
 * renders synchronized into `desktop/public/`.
 */
export const GHOST_MASCOT_STATES: Record<GhostMascotMode, GhostModeMeta> = {
  stealth: {
    id: 'stealth',
    label: 'Stealth Ready',
    shortLabel: 'Stealth',
    image: './ghost-transparent.png',
    accentHex: '#10b981',
    glowClass: 'bg-emerald-500/20',
    badgeClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    tagline: 'Апаратна невидимість увімкнена',
  },
  split: {
    id: 'split',
    label: 'Split AI Copilot',
    shortLabel: 'Split AI',
    image: './hero-ghost.png',
    accentHex: '#06b6d4',
    glowClass: 'bg-cyan-500/20',
    badgeClass: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    tagline: '2-колонковий бойовий HUD 26/74%',
  },
  notch: {
    id: 'notch',
    label: 'Eyeline Notch',
    shortLabel: 'Eyeline',
    image: './hud_minimal_banner.png',
    accentHex: '#38bdf8',
    glowClass: 'bg-sky-500/20',
    badgeClass: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    tagline: 'Телесуфлер на лінії веб-камери',
  },
  audio: {
    id: 'audio',
    label: 'Audio Loopback',
    shortLabel: 'Loopback',
    image: './hero-ghost.jpg',
    accentHex: '#8b5cf6',
    glowClass: 'bg-violet-500/20',
    badgeClass: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    tagline: 'Ізольований PipeWire / WASAPI перехоп',
  },
  turbo: {
    id: 'turbo',
    label: 'AI Turbo',
    shortLabel: 'AI Turbo',
    image: './hud_minimal_retina.png',
    accentHex: '#f59e0b',
    glowClass: 'bg-amber-500/20',
    badgeClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    tagline: 'Каскад Gemini + Groq Llama 3.3 (<180ms)',
  },
};

export const GHOST_MODE_ORDER: GhostMascotMode[] = [
  'stealth',
  'split',
  'notch',
  'audio',
  'turbo',
];

const MODE_ROTATE_SPRING = { stiffness: 220, damping: 22, mass: 0.5 };

export interface LevitatingGhostMascotProps {
  /** Controlled or initial active visual mode among the 5 renders. */
  mode?: GhostMascotMode;
  onModeChange?: (mode: GhostMascotMode) => void;
  /** Compact size for auth card vs showcase size for Launchpad hero. */
  size?: 'sm' | 'md' | 'hero';
  /** Allow cycling states on click & hovering pills. */
  interactive?: boolean;
  /** Show clickable 5-state pill bar underneath. */
  showModePills?: boolean;
  className?: string;
}

export const LevitatingGhostMascot: React.FC<LevitatingGhostMascotProps> = ({
  mode,
  onModeChange,
  size = 'hero',
  interactive = true,
  showModePills = true,
  className = '',
}) => {
  const [internalMode, setInternalMode] = useState<GhostMascotMode>(mode ?? 'stealth');

  useEffect(() => {
    if (mode) {
      setInternalMode(mode);
    }
  }, [mode]);

  const activeMode = mode ?? internalMode;
  const meta = GHOST_MASCOT_STATES[activeMode];
  const isHudPreviewImage = activeMode === 'notch' || activeMode === 'turbo';
  const isOpaquePortrait = activeMode === 'audio';

  // 3D pointer tilt & parallax motion values
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, MODE_ROTATE_SPRING);
  const smoothY = useSpring(pointerY, MODE_ROTATE_SPRING);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [9, -9]);
  const glareX = useTransform(smoothX, [-0.5, 0.5], [-18, 18]);
  const glareY = useTransform(smoothY, [-0.5, 0.5], [-12, 12]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
      pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [interactive, pointerX, pointerY]
  );

  const handlePointerLeave = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY]);

  const selectMode = useCallback(
    (next: GhostMascotMode) => {
      setInternalMode(next);
      onModeChange?.(next);
    },
    [onModeChange]
  );

  const cycleNextMode = useCallback(() => {
    if (!interactive) return;
    const idx = GHOST_MODE_ORDER.indexOf(activeMode);
    const next = GHOST_MODE_ORDER[(idx + 1) % GHOST_MODE_ORDER.length];
    selectMode(next);
  }, [activeMode, interactive, selectMode]);

  const stageSizeClass =
    size === 'sm'
      ? 'h-24 w-24'
      : size === 'md'
        ? 'h-32 w-32'
        : isHudPreviewImage
          ? 'h-36 w-[250px]'
          : 'h-36 w-36';

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ perspective: 900 }}
        className="relative flex flex-col items-center justify-center py-1"
      >
        {/* Ambient radial core behind the levitating ghost (pure gradient, zero expensive blur) */}
        <motion.div
          aria-hidden="true"
          animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.42, 0.72, 0.42] }}
          transition={{ duration: 4.8, ease: 'easeInOut', repeat: Infinity }}
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${meta.accentHex}26 0%, transparent 68%)`,
          }}
        />

        {/* Zero-gravity levitating body */}
        <motion.button
          type="button"
          onClick={cycleNextMode}
          aria-label={`Стан призрака: ${meta.label}. Натисніть, щоб перемкнути ракурс`}
          title={interactive ? `${meta.label} — натисніть для зміни ракурсу` : meta.label}
          whileHover={interactive ? { scale: 1.035 } : undefined}
          whileTap={interactive ? { scale: 0.97 } : undefined}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          className={`group relative flex items-center justify-center rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
            interactive ? 'cursor-pointer' : 'cursor-default'
          } ${stageSizeClass}`}
        >
          <motion.div
            animate={{ y: [0, -14, 0], rotateZ: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 4.8, ease: 'easeInOut', repeat: Infinity }}
            className="relative flex h-full w-full items-center justify-center"
          >
            {/* Subtle specular rim shift reacting to pointer */}
            <motion.div
              aria-hidden="true"
              style={{ x: glareX, y: glareY }}
              className="pointer-events-none absolute inset-2 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeMode}
                initial={{ opacity: 0, scale: 0.93, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.6 }}
                className="flex h-full w-full items-center justify-center"
              >
                {isHudPreviewImage ? (
                  <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/15 bg-[#111114] p-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_20px_40px_-14px_rgba(0,0,0,0.8)]">
                    <img
                      src={meta.image}
                      alt={meta.label}
                      draggable={false}
                      className="h-full w-full rounded-lg object-cover object-center"
                    />
                  </div>
                ) : isOpaquePortrait ? (
                  <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/15 bg-[#111114] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),0_20px_40px_-14px_rgba(0,0,0,0.85)]">
                    <img
                      src={meta.image}
                      alt={meta.label}
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#09090b]/80 via-transparent to-transparent"
                    />
                  </div>
                ) : (
                  <img
                    src={meta.image}
                    alt={meta.label}
                    draggable={false}
                    className="h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.button>

        {/* Ground pulsing elevation shadow */}
        <motion.div
          aria-hidden="true"
          animate={{ scaleX: [0.85, 1.05, 0.85], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 4.8, ease: 'easeInOut', repeat: Infinity }}
          className="mt-1.5 h-2 w-24 rounded-full"
          style={{
            background: `radial-gradient(ellipse at center, ${meta.accentHex}45 0%, rgba(0,0,0,0.65) 52%, transparent 75%)`,
          }}
        />
      </div>

      {/* Active state caption */}
      <div className="mt-1 flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium tracking-wide ${meta.badgeClass}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: meta.accentHex }}
          />
          {meta.label}
        </span>
      </div>

      {/* 5-state quick selector pills */}
      {showModePills && (
        <div
          role="tablist"
          aria-label="Ракурси маскота Ghostboard"
          className="mt-2.5 flex flex-wrap items-center justify-center gap-1"
        >
          {GHOST_MODE_ORDER.map((m) => {
            const item = GHOST_MASCOT_STATES[m];
            const selected = m === activeMode;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectMode(m)}
                className={`rounded-md border px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
                  selected
                    ? 'border-white/20 bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    : 'border-white/[0.06] bg-[#111114] text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
