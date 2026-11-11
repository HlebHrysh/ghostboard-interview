/**
 * Per-window HUD event bus.
 *
 * Exactly ONE native channel (`start_copilot_stream`) is opened per webview no matter how many
 * React consumers exist (session store, audio studio, VU meters). Audio levels are written into a
 * plain mutable object and are NEVER pushed through React state: meters read them inside their own
 * `requestAnimationFrame` loop and publish them as the `--vu-level` CSS custom property.
 */

import type { HudEvent } from '../types/hud';
import { startCopilotStream } from './tauriBridge';

export interface AudioLevels {
  /** 0..1 loopback (interviewer) level. */
  interviewer: number;
  /** 0..1 microphone (candidate) level. */
  candidate: number;
  /** `performance.now()` of the last update, used by meters to decay on silence. */
  at: number;
}

const levels: AudioLevels = { interviewer: 0, candidate: 0, at: 0 };
const listeners = new Set<(event: HudEvent) => void>();
let teardown: (() => void) | null = null;

/** Mutable, never-reactive level snapshot (read it from rAF loops). */
export function getAudioLevels(): AudioLevels {
  return levels;
}

/** Normalizes the heterogeneous payload shapes the native layer emits (0..1 or 0..100). */
function norm(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  const n = v <= 1 ? v : v / 100;
  return Math.min(1, Math.max(0, n));
}

/** Pure level extraction, exported for tests. */
export function applyLevelEvent(target: AudioLevels, event: HudEvent, now: number): boolean {
  if (event.type === 'audioLevel') {
    const p = event.payload;
    let touched = false;
    if (p.source !== undefined && p.level !== undefined) {
      const lvl = norm(p.level);
      if (p.source === 'loopback' || p.source === 'interlocutor') target.interviewer = lvl;
      else target.candidate = lvl;
      touched = true;
    }
    if (p.interlocutor !== undefined) {
      target.interviewer = norm(p.interlocutor);
      touched = true;
    }
    if (p.candidate !== undefined) {
      target.candidate = norm(p.candidate);
      touched = true;
    }
    if (touched) target.at = now;
    return touched;
  }
  if (event.type === 'vadState') {
    const speech = event.payload.is_speech ?? event.payload.isSpeaking ?? false;
    const conf = event.payload.confidence ?? 0;
    if (speech) {
      target.interviewer = Math.max(target.interviewer, Math.min(1, conf));
      target.at = now;
      return true;
    }
  }
  return false;
}

function dispatch(event: HudEvent): void {
  if (event.type === 'audioLevel' || event.type === 'vadState') {
    applyLevelEvent(levels, event, typeof performance !== 'undefined' ? performance.now() : Date.now());
  }
  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.warn('[hudBus] listener error:', err);
    }
  });
}

/** Subscribes to every HUD event. The native channel opens on first subscriber, closes on last. */
export function subscribeHudEvents(listener: (event: HudEvent) => void): () => void {
  listeners.add(listener);
  if (!teardown) teardown = startCopilotStream(dispatch);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && teardown) {
      teardown();
      teardown = null;
      levels.interviewer = 0;
      levels.candidate = 0;
    }
  };
}

/** Test / demo hook: injects an event as if it came from the native layer. */
export function injectHudEvent(event: HudEvent): void {
  dispatch(event);
}
