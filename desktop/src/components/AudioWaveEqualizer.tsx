import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSampledLevel, AudioLevelsRef } from '../hooks/useSampledLevel';

export interface AudioWaveEqualizerProps {
  level?: number; // 0 - 100
  levelsRef?: React.MutableRefObject<AudioLevelsRef>;
  isActive?: boolean;
  className?: string;
  label?: string;
}

const BAR_MULTIPLIERS = [0.45, 0.85, 1.0, 0.72, 0.5];
const DEFAULT_LEVELS_REF: AudioLevelsRef = { interviewer: 0, candidate: 0 };

export const AudioWaveEqualizer: React.FC<AudioWaveEqualizerProps> = ({
  level: directLevel,
  levelsRef,
  isActive = true,
  className = '',
  label,
}) => {
  const dummyRef = useRef<AudioLevelsRef>(DEFAULT_LEVELS_REF);
  const targetRef = levelsRef || dummyRef;
  const internalSampled = useSampledLevel(targetRef, (l) => Math.max(l.interviewer, l.candidate), 1, 60);

  const effectiveLevel = directLevel !== undefined ? directLevel : (levelsRef ? internalSampled : 0);
  const normalized = Math.min(100, Math.max(0, effectiveLevel));
  const isAudible = normalized > 2;

  const barHeights = useMemo(() => {
    return BAR_MULTIPLIERS.map((mult) => {
      if (!isAudible) return 3;
      // Map 0-100 to 4px - 18px range
      const h = 4 + (normalized / 100) * 14 * mult;
      return Math.min(18, Math.max(3, Math.round(h)));
    });
  }, [normalized, isAudible]);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/95 border border-white/[0.08] transition-colors ${className}`}
      title={label ? `${label}: ${Math.round(normalized)}%` : `Рівень звуку: ${Math.round(normalized)}%`}
    >
      <div className="flex items-center gap-[3px] h-4">
        {barHeights.map((height, idx) => (
          <motion.span
            key={idx}
            animate={{
              height: isActive ? height : 3,
              opacity: isAudible ? 1 : 0.45,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 24,
              mass: 0.5,
            }}
            className={`w-[2.5px] rounded-full transition-colors ${
              isAudible
                ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                : 'bg-zinc-600'
            }`}
          />
        ))}
      </div>
      {label && (
        <span className="text-[10px] font-mono tracking-tight text-zinc-400 select-none">
          {label}
        </span>
      )}
    </div>
  );
};
