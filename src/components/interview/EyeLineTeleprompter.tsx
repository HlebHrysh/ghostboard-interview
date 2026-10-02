'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, ChevronRight, ChevronLeft, X, Sparkles, Move } from 'lucide-react';
import { InterviewQAItem } from '@/components/LiveInterviewHUD';

interface EyeLineTeleprompterProps {
  activeQA: InterviewQAItem | null;
  onClose: () => void;
  isCapturing: boolean;
}

export const EyeLineTeleprompter: React.FC<EyeLineTeleprompterProps> = ({
  activeQA,
  onClose,
  isCapturing,
}) => {
  const [hintIndex, setHintIndex] = useState(0);

  if (!activeQA) return null;

  const hints = activeQA.hints && activeQA.hints.length > 0 ? activeQA.hints : [];
  const currentHint = hints[hintIndex] || activeQA.startHook || activeQA.quickAnswer;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hints.length > 0) {
      setHintIndex((prev) => (prev + 1) % hints.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hints.length > 0) {
      setHintIndex((prev) => (prev - 1 + hints.length) % hints.length);
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: -500, right: 500, top: -10, bottom: 800 }}
      dragMomentum={false}
      initial={{ opacity: 0, y: -20, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -20, x: '-50%' }}
      transition={{ duration: 0.2 }}
      className="fixed top-2 left-1/2 z-50 w-[490px] max-w-[94vw] pointer-events-auto cursor-move"
    >
      <div className="relative overflow-hidden rounded-2xl bg-[#090a0d]/95 backdrop-blur-xl border border-[#C8F135]/40 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(200,241,53,0.15)] p-3 text-zinc-100 font-sans">
        {/* Subtle camera anchor indicator */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-70">
          <Move className="w-2 h-2 text-[#C8F135]" />
          <span className="text-[8px] font-mono uppercase tracking-widest text-[#C8F135]">
            DRAG TO MOVE
          </span>
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between mt-1 mb-1.5 px-1">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[#C8F135]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
              {activeQA.tag || 'AI Co-Pilot'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {hints.length > 1 && (
              <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
                {hintIndex + 1}/{hints.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Core Thesis Formulation — large, high-contrast, effortless to read with peripheral eye */}
        <div className="px-1 py-1">
          <p className="text-[14px] leading-snug font-medium text-white tracking-tight line-clamp-2">
            {currentHint}
          </p>
        </div>

        {/* Action Controls / Next hint */}
        {hints.length > 1 && (
          <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-white/5 px-1">
            <span className="text-[10px] font-mono text-zinc-500">
              Webcam Eyeline · [Space]
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer"
                title="Prev"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#C8F135] transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
