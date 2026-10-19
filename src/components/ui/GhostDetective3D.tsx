'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export function BrandLogo() {
  return (
    <svg viewBox="0 0 240 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full h-auto">
      <g transform="translate(4, 6) scale(0.42)">
        <path
          d="M 50 15 C 32 15 24 28 24 46 C 24 66 25 76 31 74 C 36 72 40 76 45 74 C 50 72 54 76 59 74 C 64 72 68 76 73 74 C 77 72 76 66 76 46 C 76 28 68 15 50 15 Z"
          fill="#f4f4f5"
          opacity="0.95"
        />
        <path d="M 12 24 C 28 18 72 18 88 24 C 92 25 89 29 79 28 C 58 25 42 25 21 28 C 11 29 8 25 12 24 Z" fill="#18181b" />
        <path d="M 28 22 C 27 10 36 2 44 4 C 48 5 52 5 56 4 C 64 2 73 10 72 22 Z" fill="#18181b" />
        <path d="M 27 20 C 40 18 60 18 73 20 L 73 23 C 60 21 40 21 27 23 Z" fill="#e4e4e7" />
        <path d="M 36 38 C 39 35 44 36 45 38" stroke="#18181b" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="62" cy="38" r="7.5" fill="#09090b" stroke="#ffffff" strokeWidth="2.2" />
        <circle cx="62" cy="38" r="2.8" fill="#ffffff" />
      </g>
      <text x="56" y="34" fill="#f4f4f5" fontSize="23" fontWeight="900" fontFamily="var(--font-mono, monospace)" letterSpacing="-0.03em">
        GHOST<tspan fill="#e4e4e7">BOARD</tspan>
      </text>
      <text x="58" y="47" fill="#a1a1aa" fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono, monospace)" letterSpacing="0.16em">
        AI TELEPROMPTER & COACH
      </text>
    </svg>
  );
}

// ── Ultra-High-Fidelity Holographic Cowboy Ghost ──
// Replaced complex Three.js render with a beautifully generated static asset 
// matching the website aesthetic with a subtle floating animation.
export function GhostDetective3D({ className }: { className?: string } = {}) {
  return (
    <div className={className ?? "absolute inset-0 z-0 pointer-events-none w-full h-full"} aria-hidden="true">
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
        className="relative w-full h-full flex items-center justify-center"
      >
        <Image
          src="/hero-ghost.png"
          alt="Ghostboard Cowboy Ghost"
          width={800}
          height={800}
          priority
          className="w-auto h-full object-contain max-h-[110%] drop-shadow-[0_20px_50px_rgba(255,255,255,0.12)] filter"
        />
      </motion.div>
    </div>
  );
}
