'use client';

import React from 'react';
import { motion } from 'framer-motion';

export type SquircleAccent = 'emerald' | 'violet' | 'cyan' | 'amber';
export type SquircleSize = 'sm' | 'md' | 'lg' | 'hero';

interface SpatialSquircleBadgeProps {
  src: string;
  accent?: SquircleAccent;
  size?: SquircleSize;
  className?: string;
  centered?: boolean;
}

const ACCENT_GLOW: Record<SquircleAccent, string> = {
  emerald: 'from-emerald-400/40 via-teal-400/25 to-emerald-500/10',
  violet: 'from-violet-500/40 via-fuchsia-400/25 to-indigo-500/10',
  cyan: 'from-sky-400/40 via-cyan-300/25 to-indigo-400/10',
  amber: 'from-amber-400/40 via-orange-400/20 to-yellow-400/10',
};

const ACCENT_RING: Record<SquircleAccent, string> = {
  emerald: 'group-hover:border-emerald-300/35',
  violet: 'group-hover:border-violet-300/35',
  cyan: 'group-hover:border-sky-300/35',
  amber: 'group-hover:border-amber-300/35',
};

const SIZE_CLASSES: Record<SquircleSize, { outer: string; radiusOuter: string; radiusInner: string }> = {
  sm: {
    outer: 'w-16 h-16 sm:w-[74px] sm:h-[74px]',
    radiusOuter: 'rounded-[20px]',
    radiusInner: 'rounded-[18.5px]',
  },
  md: {
    outer: 'w-20 h-20 sm:w-24 sm:h-24',
    radiusOuter: 'rounded-[24px]',
    radiusInner: 'rounded-[22.5px]',
  },
  lg: {
    outer: 'w-28 h-28 sm:w-32 sm:h-32',
    radiusOuter: 'rounded-[28px]',
    radiusInner: 'rounded-[26.5px]',
  },
  hero: {
    outer: 'w-32 h-32 sm:w-40 sm:h-40',
    radiusOuter: 'rounded-[2rem] sm:rounded-[2.35rem]',
    radiusInner: 'rounded-[calc(2rem-1.5px)] sm:rounded-[calc(2.35rem-1.5px)]',
  },
};

const SPRING_SQUIRCLE = { type: 'spring' as const, stiffness: 300, damping: 24 };

export function SpatialSquircleBadge({
  src,
  accent = 'emerald',
  size = 'hero',
  className = '',
  centered = false,
}: SpatialSquircleBadgeProps) {
  const s = SIZE_CLASSES[size];

  return (
    <motion.div
      whileHover={{ scale: 1.045, y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={SPRING_SQUIRCLE}
      className={`group relative ${s.outer} ${centered ? 'mx-auto' : ''} ${className} select-none`}
    >
      {/* Diffused colored ambient glow halo behind the squircle */}
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.45, 0.72, 0.45], scale: [0.96, 1.04, 0.96] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        className={`pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-tr ${ACCENT_GLOW[accent]} blur-2xl group-hover:opacity-95 transition-opacity`}
      />

      {/* Precision Chamfer Gradient Rim */}
      <div
        className={`relative w-full h-full ${s.radiusOuter} p-[1.5px] bg-gradient-to-b from-white/30 via-white/[0.1] to-white/[0.03] shadow-[0_24px_55px_-12px_rgba(0,0,0,0.85)] transition-colors ${ACCENT_RING[accent]}`}
      >
        {/* Obsidian Lens Container */}
        <div
          className={`relative w-full h-full ${s.radiusInner} overflow-hidden bg-[#050609] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] border border-white/[0.08]`}
        >
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover scale-[1.03] transition-transform duration-500 group-hover:scale-[1.07]"
          />

          {/* Top-edge specular sheen & soft radial edge vignette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.1] via-transparent to-black/35"
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${s.radiusInner} ring-1 ring-inset ring-white/[0.08]`}
          />
        </div>
      </div>
    </motion.div>
  );
}
