'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Eye, ChevronLeft, ChevronRight, X, Sparkles, Zap } from 'lucide-react';
import { InterviewQAItem } from '@/types/interview';

interface DocumentPiPPrompterProps {
  container: HTMLElement | null;
  activeQA: InterviewQAItem | null;
  onClose: () => void;
  onTriggerBridge?: () => void;
  isBridgeActive?: boolean;
  bridgePhrase?: string;
}

export const DocumentPiPPrompter: React.FC<DocumentPiPPrompterProps> = ({
  container,
  activeQA,
  onClose,
  onTriggerBridge,
  isBridgeActive = false,
  bridgePhrase,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    setSlideIndex(0);
  }, [activeQA?.id]);

  if (!container) return null;

  const leadAnswer = activeQA?.startHook || activeQA?.quickAnswer || 'Очікую запитання від співрозмовника...';
  const slides = activeQA
    ? [leadAnswer, ...(activeQA.hints && activeQA.hints.length > 0 ? activeQA.hints : [])].filter(Boolean)
    : [leadAnswer];

  const currentSlide = slides[slideIndex] || leadAnswer;

  const handleNext = () => {
    if (slides.length > 0) setSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    if (slides.length > 0) setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const content = (
    <div className="flex flex-col h-full w-full bg-[#0a0a0d] text-zinc-100 p-3 select-none justify-between font-sans border border-white/10 rounded-xl overflow-hidden box-border">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-white" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
            {activeQA?.tag || 'Ghostboard PiP'}
          </span>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
            ALWAYS ON TOP
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {slides.length > 1 && (
            <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
              {slideIndex + 1}/{slides.length}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Picture-in-Picture"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center py-2 px-1">
        {isBridgeActive && bridgePhrase ? (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 animate-in fade-in">
            <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
              ⚡ Фраза для виграшу часу (Speak Now):
            </span>
            <p className="text-sm font-semibold leading-snug">
              {bridgePhrase}
            </p>
          </div>
        ) : (
          <>
            {activeQA?.question && (
              <p className="text-[10px] font-mono text-zinc-500 line-clamp-1 mb-1">
                Q: {activeQA.question}
              </p>
            )}
            <p className="text-base sm:text-lg font-semibold text-white leading-snug tracking-tight">
              {currentSlide}
            </p>
          </>
        )}
      </div>

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[10px] font-mono">
        {onTriggerBridge && (
          <button
            type="button"
            onClick={onTriggerBridge}
            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-all"
            title="Emergency stall phrase"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Bridge [B]</span>
          </button>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, container);
};
