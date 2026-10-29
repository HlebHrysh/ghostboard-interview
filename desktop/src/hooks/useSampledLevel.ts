import { useEffect, useState } from 'react';
import type { MutableRefObject } from 'react';

export interface AudioLevelsRef {
  interviewer: number; // 0 - 100
  candidate: number;   // 0 - 100
}

/**
 * Reads a rapidly-changing audio level from a ref and exposes it as a quantized
 * state value. Because the state only changes when the quantized value changes
 * (and the sampling runs at ~10Hz), only the tiny component calling this hook
 * re-renders — never the whole <App />.
 */
export function useSampledLevel(
  levelsRef: MutableRefObject<AudioLevelsRef>,
  select: (l: AudioLevelsRef) => number,
  step = 1,
  intervalMs = 100,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const next = Math.round(select(levelsRef.current) / step) * step;
      setValue((prev) => (prev === next ? prev : next));
    }, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsRef, step, intervalMs]);

  return value;
}
