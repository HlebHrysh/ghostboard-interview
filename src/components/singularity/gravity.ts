/**
 * Singularity physics core — pure functions, no DOM, no allocation in hot paths.
 *
 * LENS MODEL
 *   attenuation(d) = 1 / (1 + d² / R²)            (α = 1/R²)
 *   A point p is pulled toward a mass m by the fraction  f = k · attenuation(|m-p|)
 *   p' = p + (m - p) · f ,  with k < 1  ⇒  p never crosses the mass (no fold-over).
 *   Displacement |m-p|·f vanishes at d→0 (event horizon) and at d→∞, peaking near d≈R,
 *   which is exactly what makes grid lines *curve toward* the focal point.
 *
 * SHOCKWAVE MODEL
 *   ring radius  r(t) = R_MAX · easeOutCubic(t),  t = elapsed / 400ms
 *   radial push  Δ = A · (1-t) · exp(-((d - r)/σ)²)  along the outward unit vector.
 *
 * MAGNETIC PULL (see MagneticElement)
 *   offset = Δcenter · k · 1 / (1 + 3·(edge/radius)²), clamped, inside a 40px halo.
 */

export interface Mass {
  x: number;
  y: number;
  /** Pull fraction, kept < 1. */
  k: number;
  /** Lens radius in px (R in the attenuation formula). */
  r: number;
}

export interface Wave {
  x: number;
  y: number;
  t0: number;
}

export interface Warped {
  x: number;
  y: number;
  /** Accumulated field energy (0‥~1.5) — used to light up strongly bent segments. */
  a: number;
}

export const WAVE_MS = 400;
export const WAVE_RADIUS = 460;
export const WAVE_AMPLITUDE = 26;
export const WAVE_SIGMA = 34;

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** 1 / (1 + α·d²) with α = 1/R². */
export const attenuation = (d2: number, r: number) => 1 / (1 + d2 / (r * r));

export function warpPoint(
  px: number,
  py: number,
  masses: readonly Mass[],
  waves: readonly Wave[],
  now: number,
  out: Warped
): Warped {
  let x = px;
  let y = py;
  let a = 0;

  for (let i = 0; i < masses.length; i++) {
    const m = masses[i];
    const dx = m.x - px;
    const dy = m.y - py;
    const f = m.k * attenuation(dx * dx + dy * dy, m.r);
    x += dx * f;
    y += dy * f;
    a += f;
  }

  for (let i = 0; i < waves.length; i++) {
    const w = waves[i];
    const t = (now - w.t0) / WAVE_MS;
    if (t < 0 || t >= 1) continue;
    const dx = px - w.x;
    const dy = py - w.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const u = (d - WAVE_RADIUS * easeOutCubic(t)) / WAVE_SIGMA;
    if (u > 4 || u < -4) continue;
    const g = Math.exp(-u * u) * (1 - t);
    const push = WAVE_AMPLITUDE * g;
    x += (dx / d) * push;
    y += (dy / d) * push;
    a += g * 0.8;
  }

  out.x = x;
  out.y = y;
  out.a = a;
  return out;
}

/** Deterministic PRNG so the starfield is stable across resizes / reloads. */
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Magnetic offset for an element whose rect is (cx,cy,hw,hh) given a pointer position. */
export function magneticOffset(
  px: number,
  py: number,
  cx: number,
  cy: number,
  hw: number,
  hh: number,
  radius = 40,
  strength = 0.35,
  maxPull = 14
): { x: number; y: number } {
  const dx = px - cx;
  const dy = py - cy;
  const ex = Math.max(Math.abs(dx) - hw, 0);
  const ey = Math.max(Math.abs(dy) - hh, 0);
  const edge = Math.sqrt(ex * ex + ey * ey);
  if (edge > radius) return { x: 0, y: 0 };
  const s = strength / (1 + 3 * (edge / radius) * (edge / radius));
  const clamp = (v: number) => Math.max(-maxPull, Math.min(maxPull, v));
  return { x: clamp(dx * s), y: clamp(dy * s) };
}
