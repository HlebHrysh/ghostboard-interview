/**
 * Shared Office <-> HUD settings.
 *
 * The Office (main window) edits them, the detached HUD window consumes them. They are
 * persisted in localStorage and broadcast to every window via a Tauri event so changes apply
 * to a running HUD instantly (opacity, font size, stealth, click-through, mode, AI style).
 */

import { useCallback, useEffect, useState } from 'react';
import { emitTauriEvent, listenTauriEvent } from './tauriBridge';
import type { CopilotMode } from './tauriBridge';

export type AnswerSpeed = 'fast' | 'deep';
export type AnswerLength = 'short' | 'detailed' | 'code';
export type HintLanguage = 'auto' | 'uk' | 'en' | 'ru';

export interface DesktopSettings {
  copilotMode: CopilotMode;

  // Audio
  loopbackDevice: string | null;
  micDevice: string | null;
  splitChannels: boolean;

  // AI
  answerSpeed: AnswerSpeed;
  answerLength: AnswerLength;
  hintLanguage: HintLanguage;
  customInstructions: string;

  // HUD window
  hudOpacity: number; // 0.2 .. 1
  hudFontSize: number; // px, 12 .. 28
  stealth: boolean;
  clickThrough: boolean;
}

export const SETTINGS_STORAGE_KEY = 'ghostboard_desktop_settings_v2';
export const SETTINGS_EVENT = 'gb:settings-changed';

export const OPACITY_RANGE = { min: 0.2, max: 1 } as const;
export const FONT_RANGE = { min: 12, max: 28 } as const;

export const DEFAULT_SETTINGS: DesktopSettings = {
  copilotMode: 'chat',
  loopbackDevice: null,
  micDevice: null,
  splitChannels: true,
  answerSpeed: 'fast',
  answerLength: 'detailed',
  hintLanguage: 'auto',
  customInstructions: '',
  hudOpacity: 0.95,
  hudFontSize: 16,
  stealth: true,
  clickThrough: false,
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Validates and normalizes untrusted (stored / cross-window) input. */
export function sanitizeSettings(input: Partial<DesktopSettings> | null | undefined): DesktopSettings {
  const src = input ?? {};
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

  return {
    copilotMode: pick(src.copilotMode, ['chat', 'top_bar'] as const, DEFAULT_SETTINGS.copilotMode),
    loopbackDevice: str(src.loopbackDevice),
    micDevice: str(src.micDevice),
    splitChannels: bool(src.splitChannels, DEFAULT_SETTINGS.splitChannels),
    answerSpeed: pick(src.answerSpeed, ['fast', 'deep'] as const, DEFAULT_SETTINGS.answerSpeed),
    answerLength: pick(src.answerLength, ['short', 'detailed', 'code'] as const, DEFAULT_SETTINGS.answerLength),
    hintLanguage: pick(src.hintLanguage, ['auto', 'uk', 'en', 'ru'] as const, DEFAULT_SETTINGS.hintLanguage),
    customInstructions:
      typeof src.customInstructions === 'string' ? src.customInstructions.slice(0, 1200) : '',
    hudOpacity: clamp(num(src.hudOpacity, DEFAULT_SETTINGS.hudOpacity), OPACITY_RANGE.min, OPACITY_RANGE.max),
    hudFontSize: Math.round(clamp(num(src.hudFontSize, DEFAULT_SETTINGS.hudFontSize), FONT_RANGE.min, FONT_RANGE.max)),
    stealth: bool(src.stealth, DEFAULT_SETTINGS.stealth),
    clickThrough: bool(src.clickThrough, DEFAULT_SETTINGS.clickThrough),
  };
}

export function loadSettings(): DesktopSettings {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    return sanitizeSettings(raw ? (JSON.parse(raw) as Partial<DesktopSettings>) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Merges `patch` into the stored settings, persists them and notifies every window. */
export function saveSettings(patch: Partial<DesktopSettings>): DesktopSettings {
  const next = sanitizeSettings({ ...loadSettings(), ...patch });
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable (private mode) - the event below still syncs live windows */
  }
  void emitTauriEvent(SETTINGS_EVENT, next);
  return next;
}

/** Subscribes to settings changes coming from any window. */
export function subscribeSettings(onChange: (settings: DesktopSettings) => void): () => void {
  const offTauri = listenTauriEvent<Partial<DesktopSettings>>(SETTINGS_EVENT, (payload) =>
    onChange(sanitizeSettings(payload))
  );
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_STORAGE_KEY) onChange(loadSettings());
  };
  window.addEventListener('storage', onStorage);
  return () => {
    offTauri();
    window.removeEventListener('storage', onStorage);
  };
}

/** React binding: live settings + a patch function that persists and broadcasts. */
export function useDesktopSettings(): [DesktopSettings, (patch: Partial<DesktopSettings>) => void] {
  const [settings, setSettings] = useState<DesktopSettings>(() => loadSettings());

  useEffect(() => subscribeSettings(setSettings), []);

  const update = useCallback((patch: Partial<DesktopSettings>) => {
    setSettings(saveSettings(patch));
  }, []);

  return [settings, update];
}
