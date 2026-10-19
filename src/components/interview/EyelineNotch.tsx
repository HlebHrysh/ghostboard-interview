'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, EyeOff, Languages, Pause, Zap } from 'lucide-react';
import type { InterviewQAItem } from '@/types/interview';
import { useLocale } from '@/contexts/LocaleContext';
import { getLuxTranslations } from '@/lib/luxI18n';
import { GlowBadge, KbdObsidian, LUX_SPRING, VoiceWaveform } from '@/components/ui/lux/primitives';

/** Highlights numbers, metrics and Tech/ACRONYM tokens in white; the rest stays muted. */
export function emphasize(text: string): React.ReactNode[] {
  const parts = text.split(/(\b\d[\d.,]*\s?(?:%|ms|s|x|k|M|GB|MB|RPS|QPS)?|\b[A-Z][A-Za-z0-9]{2,}\b|\b[A-Z]{2,}\b)/g);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-semibold text-white">
        {p}
      </span>
    ) : (
      <span key={i} className="text-zinc-400">
        {p}
      </span>
    )
  );
}

const BULLET_TONES = [
  'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
  'bg-indigo-400/15 text-indigo-300 border-indigo-400/30',
  'bg-white/10 text-zinc-200 border-white/20',
];

interface EyelineNotchProps {
  isCapturing: boolean;
  sttStatus: 'connected' | 'reconnecting' | 'idle' | 'disconnected';
  isFrozen: boolean;
  isGenerating: boolean;
  level: number;
  activeQA: InterviewQAItem | null;
  onToggleFreeze: () => void;
  onManualReconnect: () => void;
  onPanic: () => void;
  onScreenshot: () => void;
}

const AUTO_COLLAPSE_MS = 9000;

/**
 * Dynamic notch pinned under the webcam (top-centre).
 * Compact: [● status] [TTFT] [collapse]. On a new answer it springs down with the
 * hook and up to 3 talking points, then settles back so it never covers the screen.
 */
export const EyelineNotch: React.FC<EyelineNotchProps> = ({
  isCapturing,
  sttStatus,
  isFrozen,
  isGenerating,
  level,
  activeQA,
  onToggleFreeze,
  onManualReconnect,
  onPanic,
  onScreenshot,
}) => {
  const { locale } = useLocale();
  const t = getLuxTranslations(locale);

  const [expanded, setExpanded] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [opacityPct, setOpacityPct] = useState(95);
  const [ttftMs, setTtftMs] = useState<number | null>(null);
  const genStartRef = useRef<number | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQAId = useRef<string | null>(null);

  // Time-to-first-token: generation start → answer arrival.
  useEffect(() => {
    if (isGenerating && genStartRef.current === null) genStartRef.current = performance.now();
  }, [isGenerating]);

  // New answer → spring open, then auto-collapse.
  useEffect(() => {
    if (!activeQA || activeQA.id === lastQAId.current) return;
    lastQAId.current = activeQA.id;
    if (genStartRef.current !== null) {
      setTtftMs(Math.round(performance.now() - genStartRef.current));
      genStartRef.current = null;
    }
    setExpanded(true);
  }, [activeQA]);

  useEffect(() => {
    if (collapseTimer.current) clearTimeout(collapseTimer.current);
    if (!expanded || pinned || hovered || isFrozen) return;
    collapseTimer.current = setTimeout(() => setExpanded(false), AUTO_COLLAPSE_MS);
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
    };
  }, [expanded, pinned, hovered, isFrozen, activeQA]);

  // Zero-friction shortcuts (bubble phase so existing capture handlers run first).
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;

      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onScreenshot();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        onPanic();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        setOpacityPct(Math.round(10 + ((Number(e.key) - 1) * 85) / 8));
      }
    },
    [onPanic, onScreenshot]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const statusTone =
    sttStatus === 'reconnecting' ? 'amber' : sttStatus === 'disconnected' ? 'rose' : isFrozen ? 'indigo' : isCapturing ? 'emerald' : 'zinc';
  const statusLabel = isFrozen
    ? t.status.paused
    : sttStatus === 'reconnecting'
    ? t.status.reconnecting
    : sttStatus === 'disconnected'
    ? t.status.offline
    : isGenerating
    ? t.status.thinking
    : isCapturing
    ? t.status.listening
    : t.status.idle;

  const hook = activeQA ? activeQA.startHook || activeQA.quickAnswer || '' : '';
  const points = activeQA?.hints?.slice(0, 3) ?? [];
  const showBody = expanded && !!activeQA;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-[45] flex justify-center px-3">
      <motion.section
        layout
        transition={LUX_SPRING}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        style={{ opacity: opacityPct / 100, borderRadius: 24 }}
        className={`gb-glass pointer-events-auto w-full select-none overflow-hidden ${isCapturing ? 'gb-beam' : ''} ${
          showBody ? 'max-w-[640px]' : 'max-w-[340px]'
        }`}
        aria-label="Eyeline notch"
      >
        {/* Compact bar — always visible */}
        <motion.div layout="position" className="flex items-center justify-between gap-2 px-3 py-1.5">
          <button
            type="button"
            onClick={onManualReconnect}
            className="cursor-pointer"
            aria-label={statusLabel}
          >
            <GlowBadge tone={statusTone} ping={isCapturing && !isFrozen && sttStatus === 'connected'}>
              {statusLabel}
            </GlowBadge>
          </button>

          <VoiceWaveform level={level} active={isCapturing && !isFrozen} bars={12} height={16} />

          <GlowBadge tone="zinc" icon={<Zap className="h-3 w-3 text-amber-300" />}>
            {ttftMs === null ? '—' : `${(ttftMs / 1000).toFixed(1)}s`} TTFT
          </GlowBadge>

          <div className="flex items-center gap-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={LUX_SPRING}
              onClick={onToggleFreeze}
              className={`cursor-pointer rounded-full p-1.5 transition-colors ${isFrozen ? 'bg-indigo-400/20 text-indigo-300' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              title={`${t.kbd.pause} (Space)`}
            >
              <Pause className="h-3.5 w-3.5" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={LUX_SPRING}
              onClick={onPanic}
              className="cursor-pointer rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-rose-400/15 hover:text-rose-300"
              title={`${t.panic} (Esc)`}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={LUX_SPRING}
              disabled={!activeQA}
              onClick={() => {
                setExpanded((v) => !v);
                setPinned((v) => (expanded ? false : v));
              }}
              className="cursor-pointer rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-30"
              title={expanded ? t.collapse : t.expand}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Answer body — Glance-and-Speak */}
        <AnimatePresence initial={false}>
          {showBody && activeQA && (
            <motion.div
              key={activeQA.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={LUX_SPRING}
              className="overflow-hidden"
            >
              <div className="space-y-3 border-t border-white/[0.06] px-5 pb-4 pt-3">
                {activeQA.nativeTranslation && (
                  <div className="flex items-start gap-2">
                    <GlowBadge tone="indigo" icon={<Languages className="h-3 w-3" />} className="mt-0.5 shrink-0">
                      {t.translation}
                    </GlowBadge>
                    <p className="text-sm font-medium leading-snug text-indigo-100">{activeQA.nativeTranslation}</p>
                  </div>
                )}

                {hook && (
                  <div>
                    <GlowBadge tone="emerald" className="mb-1.5">
                      {t.hook}
                    </GlowBadge>
                    <p className="text-xl font-semibold leading-snug tracking-tight text-white">{emphasize(hook)}</p>
                  </div>
                )}

                {points.length > 0 && (
                  <ul className="space-y-1.5">
                    {points.map((p, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...LUX_SPRING, delay: 0.06 + i * 0.04 }}
                        className="flex items-start gap-2.5 text-[15px] leading-snug"
                      >
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border font-mono text-[10px] font-bold ${BULLET_TONES[i % 3]}`}
                        >
                          {i + 1}
                        </span>
                        <span>{emphasize(p)}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.05] pt-2.5 text-[10px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <KbdObsidian>Space</KbdObsidian>
                    {t.kbd.pause}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <KbdObsidian>⌘/Ctrl</KbdObsidian>
                    <KbdObsidian>↵</KbdObsidian>
                    {t.kbd.screenshot}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <KbdObsidian>1–9</KbdObsidian>
                    {t.kbd.opacity} · {opacityPct}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <KbdObsidian>Esc</KbdObsidian>
                    {t.kbd.panic}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
};

export default EyelineNotch;
