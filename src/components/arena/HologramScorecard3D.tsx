'use client';

import React, { useRef, useCallback, useState } from 'react';
import {
  ShieldCheck,
  Award,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Zap,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { SpiderRadarChart, ArenaCriteriaScores } from './SpiderRadarChart';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';

export interface ScorecardData {
  slug: string;
  candidateName: string;
  trackName: string; // e.g. "Frontend Core", "Backend Engineering", "System Design"
  level: string;     // "Junior", "Middle", "Senior", "Staff"
  verifiedBadge: string; // e.g. "Verified Senior Frontend Engineer"
  overallScore: number;  // 0 - 100
  percentile: number;    // e.g. 95 -> "Top 5%"
  scores: ArenaCriteriaScores;
  dateStr: string;
  durationSec: number;
  totalQuestions: number;
  summaryFeedback?: string;
}

interface HologramScorecard3DProps {
  data: ScorecardData;
  showShareActions?: boolean;
}

export const HologramScorecard3D: React.FC<HologramScorecard3DProps> = ({
  data,
  showShareActions = true,
}) => {
  const { locale } = useLocale();
  const sc = getModalsTranslations(locale).scorecard;
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const publicUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/scorecard/${data.slug}`
    : `/scorecard/${data.slug}`;

  // ── 3D Card Interactive Tilt ───────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12; // tilt up to 12 deg
    const rotateY = ((x - centerX) / centerX) * 12;

    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);

    card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
  }, []);

  const handleMouseEnter = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = 'transform 0.1s ease-out';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = 'transform 0.5s ease-out';
    card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }, []);

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success(sc.toastLink);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareLinkedIn = () => {
    const shareText = encodeURIComponent(
      `Ghostboard Interview Arena (${data.trackName}) — ${data.overallScore}/100 (${data.verifiedBadge})! 🚀\nScorecard: ${publicUrl}`
    );
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}&summary=${shareText}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center">
      {/* 3D Holographic Tilt Card */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-zinc-900/98 via-zinc-950/98 to-black border-2 border-white/15 hover:border-white/40 shadow-[0_32px_100px_rgba(0,0,0,0.95)] overflow-hidden select-none transition-transform duration-100 ease-out cursor-pointer"
      >
        {/* Dynamic Cursor Spotlight Effect */}
        <div
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255, 0.12), transparent 45%)',
          }}
        />

        {/* Holographic Rainbow Sheen Overlay */}
        <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-45 pointer-events-none animate-pulse" />

        {/* Top Header Row */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)] animate-pulse" />
            <span className="font-mono font-black text-xs sm:text-sm tracking-widest text-zinc-100">
              GHOSTBOARD ARENA
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/10">
              3D SCORECARD
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[10px] font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span>VERIFIED PROOF</span>
          </div>
        </div>

        {/* Candidate & Verified Title */}
        <div className="pt-6 pb-4 relative z-10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
              {sc.candidateDefault}: <span className="text-white font-bold">{data.candidateName}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
              {data.verifiedBadge}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-mono text-zinc-400 justify-center sm:justify-start">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/5">
                {data.trackName}
              </span>
              <span>•</span>
              <span className="text-zinc-200 font-bold">Level: {data.level}</span>
            </div>
          </div>

          {/* Big Score Orb */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-zinc-900/90 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] shrink-0 w-24">
            <span className="text-3xl font-black font-mono text-white leading-none">
              {data.overallScore}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase mt-0.5">/ 100</span>
            <span className="text-[9px] font-mono text-white font-bold mt-1">
              Top {100 - (data.percentile || 92)}%
            </span>
          </div>
        </div>

        {/* Centerpiece: Interactive Spider Radar Chart */}
        <div className="py-4 relative z-10 flex flex-col items-center justify-center">
          <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
            {sc.matrixTitle}
          </div>
          <SpiderRadarChart scores={data.scores} size={300} />
        </div>

        {/* Criteria Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 pb-4 relative z-10">
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400">🎯 {sc.accuracy}</span>
            <span className="text-base font-bold font-mono text-white mt-0.5">
              {data.scores.technicalAccuracy}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400">🏛️ {sc.architecture}</span>
            <span className="text-base font-bold font-mono text-white mt-0.5">
              {data.scores.architecturalVision}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400">⏱️ {sc.speed}</span>
            <span className="text-base font-bold font-mono text-white mt-0.5">
              {data.scores.thinkingSpeed}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400">💬 {sc.communication}</span>
            <span className="text-base font-bold font-mono text-white mt-0.5">
              {data.scores.communication}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400">⚡ {sc.stress}</span>
            <span className="text-base font-bold font-mono text-white mt-0.5">
              {data.scores.stressResilience}%
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-white/5 flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400">📋 Q/A</span>
            <span className="text-base font-bold font-mono text-white mt-0.5">
              {data.totalQuestions || 6} {sc.rounds}
            </span>
          </div>
        </div>

        {/* Summary Feedback */}
        {data.summaryFeedback && (
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-sans text-zinc-300 relative z-10 mb-4 leading-relaxed">
            <span className="font-mono text-zinc-300 font-bold text-[10px] uppercase block mb-1">
              {sc.staffConclusion}
            </span>
            {data.summaryFeedback}
          </div>
        )}

        {showQr && (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 relative z-20 flex flex-col items-center text-center my-3 animate-in fade-in zoom-in-95">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                publicUrl
              )}&color=ffffff&bgcolor=18181b`}
              alt="Scorecard QR Code"
              className="w-36 h-36 rounded-xl border border-white/20 mb-2 shadow-lg"
            />
            <span className="text-[10px] font-mono text-zinc-400">
              {sc.qrScanHint}
            </span>
          </div>
        )}

        {/* Card Footer / Watermark */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-500 relative z-10">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-zinc-400" />
            <span>{data.dateStr}</span>
          </div>
          <div className="flex items-center gap-1 text-zinc-300">
            <Sparkles className="w-3 h-3" />
            <span>ID: GHOST-{data.slug.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Action Share Bar (under the 3D card) */}
      {showShareActions && (
        <div className="w-full flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={handleShareLinkedIn}
            className="py-3 px-5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.25)] flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Share2 className="w-4 h-4 fill-black" />
            <span>{sc.shareLinkedIn}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="py-3 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 font-mono text-xs font-medium transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">{sc.copiedPublic || sc.copiedLinkedIn}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-zinc-400" />
                <span>{sc.publicLink}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowQr((p) => !p)}
            className="py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 font-mono text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title={sc.qrScanHint}
          >
            <QrCode className="w-4 h-4 text-zinc-300" />
            <span className="hidden sm:inline">QR</span>
          </button>
        </div>
      )}
    </div>
  );
};
