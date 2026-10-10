'use client';

import React from 'react';

export interface GhostDetectiveLogoProps {
  size?: 'mini' | 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  animated?: boolean;
  monocleGlow?: boolean;
  hatColor?: string;
  accentColor?: string;
  variant?: 'badge' | 'plain';
}

const SIZE_MAP_BADGE = {
  mini: 'w-6 h-6 p-0.5',
  sm: 'w-7.5 h-7.5 sm:w-8 sm:h-8 p-1',
  md: 'w-10 h-10 p-1.5',
  lg: 'w-14 h-14 p-2',
  hero: 'w-20 h-20 sm:w-24 sm:h-24 p-3',
};

const SIZE_MAP_PLAIN = {
  mini: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  hero: 'w-24 h-24 sm:w-28 sm:h-28',
};

export const GhostDetectiveLogo: React.FC<GhostDetectiveLogoProps> = ({
  size = 'md',
  className = '',
  animated = true,
  monocleGlow = true,
  accentColor = '#FFFFFF',
  variant = 'badge',
}) => {
  const isBadge = variant === 'badge';
  const sizeClass = isBadge ? SIZE_MAP_BADGE[size] || SIZE_MAP_BADGE.md : SIZE_MAP_PLAIN[size] || SIZE_MAP_PLAIN.md;
  const animClass = animated ? 'animate-ghost-float-alt' : '';

  const badgeWrapperClass = isBadge
    ? 'rounded-full bg-gradient-to-b from-[#181824] via-[#0d0d14] to-[#07070b] border border-white/[0.14] shadow-[0_2px_8px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.15)] group-hover:border-white/40 group-hover:shadow-[0_0_14px_rgba(255,255,255,0.25)] transition-all duration-300'
    : '';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none align-middle ${badgeWrapperClass} ${sizeClass} ${animClass} ${className}`}
      title="Ghostboard — AI Real-Time Teleprompter & Live Performance Coach"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
      >
        <defs>
          {/* Ghost Body Gradient (Liquid Pearl / Obsidian Highlight) */}
          <linearGradient id="detectiveGhostBody" x1="20" y1="25" x2="80" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E4E4E7" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Fedora Titanium Gradient */}
          <linearGradient id="fedoraGrad" x1="20" y1="10" x2="80" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#52525B" />
            <stop offset="45%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#121216" />
          </linearGradient>

          {/* Hat Ribbon Gradient (Monochromatic Titanium/Silver Sheen) */}
          <linearGradient id="hatRibbonGrad" x1="25" y1="32" x2="75" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#D4D4D8" />
            <stop offset="100%" stopColor="#71717A" />
          </linearGradient>

          {/* Monocle Target Glow (Luminous White/Silver Aura) */}
          <radialGradient id="monocleAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#E4E4E7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#A1A1AA" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── GHOST BODY SILHOUETTE ── */}
        <path
          d="M 50 30
             C 32 30 26 42 26 58
             C 26 76 26 84 32 82
             C 37 80 40 84 45 82
             C 50 80 54 84 59 82
             C 64 80 67 84 72 82
             C 76 80 74 76 74 58
             C 74 42 68 30 50 30 Z"
          fill="url(#detectiveGhostBody)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.2"
        />

        {/* ── DETECTIVE TRENCHCOAT LAPELS / COLLAR ── */}
        <path
          d="M 33 60 L 45 74 L 50 64 L 55 74 L 67 60"
          stroke="#18181B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.8"
        />

        {/* ── FEDORA HAT BRIM ── */}
        <path
          d="M 14 36 C 28 32 72 32 86 36 C 90 37 88 41 78 40 C 58 37 40 37 22 40 C 12 41 10 37 14 36 Z"
          fill="url(#fedoraGrad)"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.2"
        />

        {/* ── FEDORA HAT CROWN ── */}
        <path
          d="M 28 35 
             C 27 22 36 12 44 14 
             C 48 15 52 15 56 14 
             C 64 12 73 22 72 35 Z"
          fill="url(#fedoraGrad)"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1"
        />

        {/* ── FEDORA INDENT ON TOP ── */}
        <path
          d="M 42 16 C 50 19 50 19 58 16"
          stroke="#18181B"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* ── NEON HATBAND (RIBBON) ── */}
        <path
          d="M 27.5 32 C 40 30 60 30 72.5 32 L 72.8 35.5 C 60 33.5 40 33.5 27.2 35.5 Z"
          fill="url(#hatRibbonGrad)"
        />

        {/* ── DETECTIVE SHIELD PIN ── */}
        <circle cx="50" cy="33.8" r="1.2" fill="#E4E4E7" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />

        {/* ── DETECTIVE EYES / MONOCLE ── */}
        {/* Left Eye: Sleek investigative squint slit */}
        <path
          d="M 36 49 C 39 46 44 47 45 49"
          stroke="#09090B"
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Right Eye: Cyber Sleuth Monocle with glowing crosshair */}
        {monocleGlow && (
          <circle cx="62" cy="48" r="9" fill="url(#monocleAura)" />
        )}
        <circle
          cx="62"
          cy="48"
          r="6.5"
          fill="#09090B"
          stroke={accentColor}
          strokeWidth="2"
        />
        {/* Monocle Lens pupil crosshair */}
        <circle cx="62" cy="48" r="2.2" fill={accentColor} />
        <line x1="62" y1="41" x2="62" y2="43.5" stroke={accentColor} strokeWidth="1" strokeLinecap="round" />
        <line x1="62" y1="52.5" x2="62" y2="55" stroke={accentColor} strokeWidth="1" strokeLinecap="round" />
        <line x1="55" y1="48" x2="57.5" y2="48" stroke={accentColor} strokeWidth="1" strokeLinecap="round" />
        <line x1="66.5" y1="48" x2="69" y2="48" stroke={accentColor} strokeWidth="1" strokeLinecap="round" />

        {/* Monocle Hanging Chain */}
        <path
          d="M 68 50 C 74 54 73 63 68 66"
          stroke={accentColor}
          strokeWidth="0.9"
          strokeDasharray="1.5 1.5"
          fill="none"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};
