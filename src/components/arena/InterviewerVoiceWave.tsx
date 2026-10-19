'use client';

import React from 'react';

interface InterviewerVoiceWaveProps {
  isSpeaking: boolean;
  color?: string;
  className?: string;
  barsCount?: number;
}

export const InterviewerVoiceWave: React.FC<InterviewerVoiceWaveProps> = ({
  isSpeaking,
  color = 'bg-white',
  className = '',
  barsCount = 14,
}) => {
  return (
    <div className={`flex items-center gap-[3px] h-6 px-2 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md ${className}`}>
      {Array.from({ length: barsCount }).map((_, i) => {
        // Vary heights and animation speeds for natural waveform look
        const delay = (i * 0.08).toFixed(2);
        const duration = (0.5 + (i % 5) * 0.12).toFixed(2);
        const minHeight = 4;
        const maxHeight = isSpeaking ? 16 + (i % 3) * 4 : 4;

        return (
          <span
            key={i}
            className={`w-[2.5px] rounded-full transition-all ${
              isSpeaking
                ? `${color} animate-[pulse_${duration}s_ease-in-out_infinite] shadow-[0_0_8px_rgba(255,255,255,0.6)]`
                : 'bg-zinc-600'
            }`}
            style={{
              height: isSpeaking ? `${maxHeight}px` : `${minHeight}px`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
};
