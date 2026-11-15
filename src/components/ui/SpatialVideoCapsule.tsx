'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Play, Sparkles } from 'lucide-react';

export interface SpatialVideoItem {
  id: string;
  src: string;
  label: string;
  caption?: string;
}

interface SpatialVideoCapsuleProps {
  videos: SpatialVideoItem[];
  layoutGroupId?: string;
  className?: string;
  compact?: boolean;
  aspectClassName?: string;
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 26 };

export function SpatialVideoCapsule({
  videos,
  layoutGroupId = 'spatial-video-tab',
  className = '',
  compact = false,
  aspectClassName = 'aspect-video',
}: SpatialVideoCapsuleProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const safeList = videos.length > 0 ? videos : [];
  const current = safeList[activeIndex] || safeList[0];

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  if (!current) return null;

  return (
    <>
      <div
        className={`group relative rounded-2xl bg-[#090b10]/85 backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_-14px_rgba(0,0,0,0.85)] overflow-hidden transition-colors hover:border-white/20 ${className}`}
      >
        {/* Top PiP Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono font-semibold text-emerald-300 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE DEMO
            </span>
            <span className="text-xs font-medium text-zinc-200 truncate">
              {current.label}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Expand video preview"
            aria-label="Expand video preview"
          >
            <Maximize2 className="w-3 h-3" />
            {!compact && <span className="hidden sm:inline">Expand</span>}
          </button>
        </div>

        {/* Video Frame */}
        <div
          onClick={() => setIsExpanded(true)}
          className={`relative w-full ${aspectClassName} bg-black/70 overflow-hidden cursor-pointer`}
        >
          <video
            key={current.src}
            src={current.src}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover opacity-95 group-hover:scale-[1.02] transition-transform duration-500"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/15" />

          {current.caption && !compact && (
            <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-200/95 font-medium line-clamp-1 drop-shadow">
                {current.caption}
              </span>
              <span className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Play className="w-3 h-3 fill-white ml-0.5" />
              </span>
            </div>
          )}
        </div>

        {/* Multi-Video Switcher Pills */}
        {safeList.length > 1 && (
          <div className="flex items-center gap-1 p-1.5 bg-black/40 border-t border-white/[0.06] overflow-x-auto no-scrollbar">
            {safeList.map((vid, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={vid.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`relative px-2.5 py-1 rounded-xl text-[11px] font-mono font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={layoutGroupId}
                      transition={SPRING}
                      className="absolute inset-0 rounded-xl bg-white/[0.12] border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16)]"
                    />
                  )}
                  <span className="relative z-10">{vid.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded Apple Spatial Glass PiP Modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={SPRING}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl rounded-3xl bg-[#0b0d12]/95 border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_32px_90px_rgba(0,0,0,0.9)] overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-mono font-semibold text-emerald-300">
                    <Sparkles className="w-3 h-3" />
                    LIVE DEMO
                  </span>
                  <h3 className="text-sm font-semibold text-white">{current.label}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="aspect-video bg-black relative">
                <video
                  key={`expanded-${current.src}`}
                  src={current.src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              {safeList.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-white/[0.08] bg-white/[0.02]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {safeList.map((vid, idx) => (
                      <button
                        key={vid.id}
                        type="button"
                        onClick={() => setActiveIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-colors cursor-pointer ${
                          idx === activeIndex
                            ? 'bg-white text-black font-semibold'
                            : 'bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1] border border-white/10'
                        }`}
                      >
                        {vid.label}
                      </button>
                    ))}
                  </div>
                  {current.caption && (
                    <span className="text-xs text-zinc-400">{current.caption}</span>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
