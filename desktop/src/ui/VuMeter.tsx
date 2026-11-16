import { memo, useEffect, useRef, type CSSProperties } from 'react';
import { getAudioLevels } from '../lib/hudBus';

export type VuChannel = 'interviewer' | 'candidate';

const BAR_GAINS = [0.55, 0.85, 1, 0.8, 0.5, 0.7, 0.9];

/**
 * Publishes the live audio level as the CSS custom property `--vu-level` on `ref`.
 * Runs in its own rAF loop (paused while the window is hidden) and writes the DOM directly:
 * voice activity therefore NEVER re-renders React components, message lists included.
 */
function useVuLevel(channel: VuChannel) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const levels = getAudioLevels();
    let raf = 0;
    let current = 0;
    let last = -1;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      let target = channel === 'interviewer' ? levels.interviewer : levels.candidate;
      if (now - levels.at > 450) target = 0; // decay on silence / when the stream stops
      current += (target - current) * (target > current ? 0.55 : 0.16);
      // sqrt curve makes quiet speech visible without clipping loud peaks.
      const shown = Math.round(Math.sqrt(Math.max(0, Math.min(1, current))) * 100) / 100;
      if (shown !== last) {
        last = shown;
        el.style.setProperty('--vu-level', String(shown));
      }
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [channel]);
  return ref;
}

/** Equalizer bars (HUD island, compact status cards). */
export const VuBars = memo(function VuBars({
  channel,
  bars = 5,
  large = false,
  tone = 'ok',
  label,
}: {
  channel: VuChannel;
  bars?: number;
  large?: boolean;
  tone?: 'ok' | 'bad';
  label?: string;
}) {
  const ref = useVuLevel(channel);
  return (
    <span
      ref={ref}
      role="img"
      aria-label={label ?? `Рівень звуку: ${channel === 'interviewer' ? "інтерв'юер" : 'мікрофон'}`}
      className={`vu ${large ? 'vu-lg' : ''} ${tone === 'bad' ? 'vu-rose' : ''}`}
    >
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="vu-bar" style={{ '--k': BAR_GAINS[i % BAR_GAINS.length] * 1.15 } as CSSProperties} />
      ))}
    </span>
  );
});

/** Horizontal studio level track with broadcast dB scale (Audio Studio soundcheck). */
export const VuTrack = memo(function VuTrack({ channel, label }: { channel: VuChannel; label: string }) {
  const ref = useVuLevel(channel);
  return (
    <div className="space-y-1">
      <span ref={ref} role="img" aria-label={label} className="vu-track block w-full relative overflow-hidden">
        <span className="vu-fill" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, transparent 0, transparent 7px, rgba(9,9,11,0.92) 7px, rgba(9,9,11,0.92) 9px)',
          }}
        />
      </span>
      <div
        aria-hidden="true"
        className="flex items-center justify-between px-0.5 font-mono text-[9px] tabular-nums text-zinc-600"
      >
        <span>-∞</span>
        <span>-36</span>
        <span>-18</span>
        <span>-6</span>
        <span className="text-amber-500/70">0 dB</span>
      </div>
    </div>
  );
});
