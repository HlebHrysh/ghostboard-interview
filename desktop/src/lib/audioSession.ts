/**
 * Audio session control shared by the Office (launch, soundcheck) and the HUD (live mode switch).
 *
 * Strict isolation contract:
 *  - `interviewer`  -> source `loopback`: the microphone stream is never opened;
 *  - `dual`         -> source `dual`: loopback = [Інтерв'юер] (triggers AI), mic = [Ви] (log only);
 *  - `mic`          -> source `mic`: single room microphone (speakerphone / loudspeaker tests).
 */

import { useEffect, useState } from 'react';
import {
  emitTauriEvent,
  listenTauriEvent,
  setListenMode,
  startAudioCaptureDetailed,
  stopAudioCapture,
} from './tauriBridge';
import type { DesktopSettings, ListenMode } from './desktopSettings';

export const AUDIO_STATUS_KEY = 'gb_audio_status';
export const AUDIO_STATUS_EVENT = 'gb:audio-status';

export interface AudioStatus {
  ok: boolean;
  mode: ListenMode;
  error?: string;
  at: number;
}

export const LISTEN_MODE_META: Record<
  ListenMode,
  { source: 'loopback' | 'dual' | 'mic'; native: 'interviewer_only' | 'both' | 'mic_only'; short: string; badge: string }
> = {
  interviewer: { source: 'loopback', native: 'interviewer_only', short: "Інтерв'юер", badge: "🎯 Тільки Інтерв'юер" },
  dual: { source: 'dual', native: 'both', short: '2 канали', badge: '🔀 2 Канали' },
  mic: { source: 'mic', native: 'mic_only', short: 'Мікрофон', badge: '🎙️ Мікрофон' },
};

export const LISTEN_MODE_ORDER: ListenMode[] = ['interviewer', 'dual', 'mic'];

function persistStatus(status: AudioStatus): void {
  try {
    localStorage.setItem(AUDIO_STATUS_KEY, JSON.stringify(status));
  } catch {
    /* ignore */
  }
  void emitTauriEvent(AUDIO_STATUS_EVENT, status);
}

/**
 * (Re)starts native capture for `mode` with the user's explicit devices. Always stops first so a
 * previously running source set can never leak into the new isolation mode.
 */
export async function startListening(
  settings: Pick<DesktopSettings, 'listenMode' | 'loopbackDevice' | 'micDevice' | 'sttLanguage'>,
  modeOverride?: ListenMode
): Promise<AudioStatus> {
  const mode = modeOverride ?? settings.listenMode;
  const meta = LISTEN_MODE_META[mode];
  await stopAudioCapture().catch(() => false);
  await setListenMode(meta.native).catch(() => meta.native);
  const res = await startAudioCaptureDetailed(meta.source, {
    loopbackDevice: mode === 'mic' ? null : settings.loopbackDevice,
    micDevice: mode === 'interviewer' ? null : settings.micDevice,
    sttLanguage: settings.sttLanguage,
  });
  const status: AudioStatus = { ok: res.ok, mode, error: res.ok ? undefined : res.error, at: Date.now() };
  persistStatus(status);
  return status;
}

export async function stopListening(): Promise<void> {
  await stopAudioCapture().catch(() => false);
  try {
    localStorage.removeItem(AUDIO_STATUS_KEY);
  } catch {
    /* ignore */
  }
}

function readStoredStatus(): AudioStatus | null {
  try {
    const raw = localStorage.getItem(AUDIO_STATUS_KEY);
    return raw ? (JSON.parse(raw) as AudioStatus) : null;
  } catch {
    return null;
  }
}

/** Live view of the last capture start result (written by whichever window started it). */
export function useAudioStatus(): AudioStatus | null {
  const [status, setStatus] = useState<AudioStatus | null>(() => readStoredStatus());
  useEffect(() => {
    const off = listenTauriEvent<AudioStatus>(AUDIO_STATUS_EVENT, (s) => setStatus(s));
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUDIO_STATUS_KEY) setStatus(readStoredStatus());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      off();
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return status;
}
