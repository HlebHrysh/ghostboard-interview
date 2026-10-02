'use client';

import React from 'react';

export interface GhostDetectiveLogoProps {
  size?: 'mini' | 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  animated?: boolean;
  monocleGlow?: boolean;
  hatColor?: string;
  accentColor?: string;
}

const SIZE_MAP = {
  mini: 'w-5 h-5',
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  hero: 'w-24 h-24 sm:w-28 sm:h-28',
};

export const GhostDetectiveLogo: React.FC<GhostDetectiveLogoProps> = ({
  size = 'md',
  className = '',
  animated = false,
  monocleGlow = true,
  hatColor = '#18181B',
  accentColor = '#C8F135',
}) => {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const animClass = animated ? 'animate-ghost-float' : '';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeClass} ${animClass} ${className}`}
      title="Ghostboard — AI Real-Time Teleprompter & Live Performance Coach"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_20px_rgba(200,241,53,0.25)]"
      >
        <defs>
          {/* Ghost Body Gradient */}
          <linearGradient id="detectiveGhostBody" x1="20" y1="25" x2="80" y2="95" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#E4E4E7" />
            <stop offset="100%" stopColor="#A1A1AA" />
          </linearGradient>

          {/* Fedora Gradient */}
          <linearGradient id="fedoraGrad" x1="15" y1="10" x2="85" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#27272A" />
            <stop offset="100%" stopColor="#09090B" />
          </linearGradient>

          {/* Hat Ribbon Gradient */}
          <linearGradient id="hatRibbonGrad" x1="25" y1="32" x2="75" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C8F135" />
            <stop offset="100%" stopColor="#00F0FF" />
          </linearGradient>

          {/* Monocle Target Glow */}
          <radialGradient id="monocleAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C8F135" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#00F0FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
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
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />

        {/* ── FEDORA HAT CROWN ── */}
        <path
          d="M 28 35 
             C 27 22 36 12 44 14 
             C 48 15 52 15 56 14 
             C 64 12 73 22 72 35 Z"
          fill="url(#fedoraGrad)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />

        {/* ── FEDORA INDENT ON TOP ── */}
        <path
          d="M 42 16 C 50 19 50 19 58 16"
          stroke="#09090B"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* ── NEON HATBAND (RIBBON) ── */}
        <path
          d="M 27.5 32 C 40 30 60 30 72.5 32 L 72.8 35.5 C 60 33.5 40 33.5 27.2 35.5 Z"
          fill="url(#hatRibbonGrad)"
        />

        {/* ── DETECTIVE EYES / MONOCLE ── */}
        {/* Left Eye: Sleek investigative squint slit */}
        <path
          d="M 36 49 C 39 46 44 47 45 49"
          stroke="#0A0A0B"
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
