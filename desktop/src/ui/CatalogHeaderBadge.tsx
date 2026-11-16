import React, { useState } from 'react';

export interface CatalogHeaderBadgeProps {
  /** Square-cropped animated WebP / PNG emblem for catalog section headers (zero GStreamer overhead). */
  src: string;
  label: string;
  fallbackIcon?: React.ReactNode;
  size?: 'sm' | 'md';
  tone?: 'emerald' | 'violet' | 'amber' | 'neutral';
  className?: string;
}

const TONE_FRAME: Record<NonNullable<CatalogHeaderBadgeProps['tone']>, string> = {
  emerald:
    'border-emerald-400/25 shadow-[inset_0_1px_0_0_rgba(167,243,208,0.2),0_10px_28px_-8px_rgba(16,185,129,0.28)]',
  violet:
    'border-violet-400/25 shadow-[inset_0_1px_0_0_rgba(221,214,254,0.2),0_10px_28px_-8px_rgba(139,92,246,0.3)]',
  amber:
    'border-amber-300/20 shadow-[inset_0_1px_0_0_rgba(253,230,138,0.18),0_10px_28px_-8px_rgba(245,158,11,0.22)]',
  neutral:
    'border-white/[0.14] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_10px_24px_-8px_rgba(0,0,0,0.85)]',
};

/**
 * Crisp seamless squircle emblem placed strictly in catalog/section headers.
 * Uses native WebP/PNG <img> decoding so Linux WebKitGTK never invokes GStreamer/autoaudiosink.
 */
export const CatalogHeaderBadge: React.FC<CatalogHeaderBadgeProps> = ({
  src,
  label,
  fallbackIcon,
  size = 'md',
  tone = 'neutral',
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  const dim = size === 'sm' ? 'h-10 w-10 rounded-[12px]' : 'h-12 w-12 rounded-[14px]';

  return (
    <div
      aria-label={label}
      className={`relative shrink-0 overflow-hidden border bg-[#0b0b0e] flex items-center justify-center ${dim} ${TONE_FRAME[tone]} ${className}`}
    >
      {!failed ? (
        <img
          src={src}
          alt={label}
          draggable={false}
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover scale-[1.07]"
        />
      ) : (
        fallbackIcon ?? <span className="text-xs font-mono text-zinc-400">GB</span>
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/[0.12] via-transparent to-black/25"
      />
    </div>
  );
};
