import React, { useRef, useEffect } from 'react';
import { Headphones, Mic } from 'lucide-react';

export interface AudioLevels {
  interviewer: number; // 0 - 100
  candidate: number;   // 0 - 100
}

export interface AudioWaveformProps {
  interviewerVolume?: number;
  candidateVolume?: number;
  levelsRef?: React.MutableRefObject<AudioLevels>;
  isCapturing?: boolean;
  compact?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * AudioWaveform: Dual 60fps Real-Time Visualizer (Interlocutor vs Candidate)
 * Decoupled from React render cycles with canvas isolation to guarantee CLS = 0.000.
 */
export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  interviewerVolume = 0,
  candidateVolume = 0,
  levelsRef,
  isCapturing = false,
  compact = false,
  width = 180,
  height = compact ? 28 : 40,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fallback internal ref if levelsRef is not provided
  const internalLevelsRef = useRef<AudioLevels>({ interviewer: 0, candidate: 0 });

  // Sync props to internal ref without triggering canvas re-binding
  useEffect(() => {
    if (!levelsRef) {
      internalLevelsRef.current.interviewer = interviewerVolume;
      internalLevelsRef.current.candidate = candidateVolume;
    }
  }, [interviewerVolume, candidateVolume, levelsRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let currIntVol = 0;
    let currCandVol = 0;
    let phase = 0;

    const render = () => {
      const activeLevels = levelsRef ? levelsRef.current : internalLevelsRef.current;
      const targetInt = isCapturing ? Math.max(activeLevels.interviewer, 2) : 0;
      const targetCand = isCapturing ? Math.max(activeLevels.candidate, 2) : 0;

      // Smooth lerp for natural vocal bounce
      currIntVol += (targetInt - currIntVol) * 0.16;
      currCandVol += (targetCand - currCandVol) * 0.16;
      phase += 0.06;

      ctx.clearRect(0, 0, width, height);

      const halfHeight = height / 2;

      // ── 1. Top Channel: Remote Interlocutor (Electric Cyan) ──
      const intNorm = Math.min(1.0, currIntVol / 100);
      const intAmp = Math.min(halfHeight / 2 - 2, 2 + intNorm * (halfHeight / 2 - 2));
      const midIntY = halfHeight / 2;

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isCapturing && intNorm > 0.04 ? 'rgba(6, 182, 212, 0.95)' : 'rgba(255, 255, 255, 0.15)';
      ctx.shadowColor = isCapturing && intNorm > 0.04 ? 'rgba(6, 182, 212, 0.5)' : 'transparent';
      ctx.shadowBlur = 4;

      for (let x = 0; x < width; x += 2) {
        const env = Math.sin((x / width) * Math.PI);
        const y = midIntY + Math.sin(x * 0.05 + phase) * intAmp * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // ── 2. Bottom Channel: Candidate (Electric Violet) ──
      const candNorm = Math.min(1.0, currCandVol / 100);
      const candAmp = Math.min(halfHeight / 2 - 2, 2 + candNorm * (halfHeight / 2 - 2));
      const midCandY = halfHeight + halfHeight / 2;

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = isCapturing && candNorm > 0.04 ? 'rgba(168, 85, 247, 0.95)' : 'rgba(255, 255, 255, 0.15)';
      ctx.shadowColor = isCapturing && candNorm > 0.04 ? 'rgba(168, 85, 247, 0.5)' : 'transparent';
      ctx.shadowBlur = 4;

      for (let x = 0; x < width; x += 2) {
        const env = Math.sin((x / width) * Math.PI);
        const y = midCandY + Math.sin(x * 0.05 + phase * 1.25 + Math.PI / 4) * candAmp * env;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, height, isCapturing, levelsRef]);

  const displayInt = Math.round(interviewerVolume);
  const displayCand = Math.round(candidateVolume);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shrink-0 select-none ${className}`}
      style={{
        width: compact ? `${width + 48}px` : `${width + 92}px`,
        height: `${height + 8}px`,
        flexShrink: 0,
      }}
    >
      {/* Icon & Label Column */}
      <div className="flex flex-col justify-between h-full py-0.5 text-zinc-400 font-mono text-[9px] shrink-0">
        <div className="flex items-center gap-1.5" title="Рівень співрозмовника">
          <Headphones className="w-3 h-3 text-cyan-400 shrink-0" />
          {!compact && <span className="text-cyan-400 uppercase tracking-wider font-semibold">Співр.</span>}
        </div>
        <div className="flex items-center gap-1.5" title="Рівень кандидата (мікрофон)">
          <Mic className="w-3 h-3 text-violet-400 shrink-0" />
          {!compact && <span className="text-violet-400 uppercase tracking-wider font-semibold">Ви</span>}
        </div>
      </div>

      {/* Isolated Canvas (CLS = 0) */}
      <div className="relative shrink-0" style={{ width: `${width}px`, height: `${height}px` }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="block"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
      </div>

      {/* VU Numeric Meters (shown when not compact) */}
      {!compact && (
        <div className="flex flex-col justify-between h-full py-0.5 text-right font-mono text-[9px] w-7 shrink-0">
          <span className={isCapturing && displayInt > 4 ? 'text-cyan-400 font-semibold' : 'text-zinc-600'}>
            {displayInt}%
          </span>
          <span className={isCapturing && displayCand > 4 ? 'text-violet-400 font-semibold' : 'text-zinc-600'}>
            {displayCand}%
          </span>
        </div>
      )}
    </div>
  );
};
