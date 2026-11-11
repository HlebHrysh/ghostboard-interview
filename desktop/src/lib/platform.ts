/**
 * OS detection + shortcut label adaptation.
 *
 * The UI shows `⌘` on macOS and `Ctrl` on Windows / Linux. Detection is synchronous (user agent)
 * so the very first paint is already correct; the native `get_environment_info` result refines
 * Linux details (Wayland / Hyprland) afterwards without ever changing the modifier label.
 */

import { useEffect, useState } from 'react';
import { getEnvironmentInfo, type EnvironmentInfo } from './tauriBridge';

export type OsFamily = 'mac' | 'windows' | 'linux';

export function detectOsFamily(userAgent?: string, platform?: string): OsFamily {
  const ua = (userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')) || '';
  const pf = (platform ?? (typeof navigator !== 'undefined' ? navigator.platform : '')) || '';
  const hay = `${ua} ${pf}`.toLowerCase();
  if (/mac|iphone|ipad|darwin/.test(hay)) return 'mac';
  if (/win/.test(hay) && !/darwin/.test(hay)) return 'windows';
  return 'linux';
}

export interface ShortcutSpec {
  /** Physical modifier chord, e.g. `['mod', 'shift']`; `mod` becomes ⌘ / Ctrl. */
  mods?: Array<'mod' | 'shift' | 'alt'>;
  key: string;
}

/** Splits a shortcut into display tokens for `<Kbd>` badges. */
export function shortcutTokens(spec: ShortcutSpec, os: OsFamily): string[] {
  const tokens: string[] = [];
  for (const m of spec.mods ?? []) {
    if (m === 'mod') tokens.push(os === 'mac' ? '⌘' : 'Ctrl');
    else if (m === 'shift') tokens.push(os === 'mac' ? '⇧' : 'Shift');
    else if (m === 'alt') tokens.push(os === 'mac' ? '⌥' : 'Alt');
  }
  tokens.push(spec.key);
  return tokens;
}

export function formatShortcut(spec: ShortcutSpec, os: OsFamily): string {
  const tokens = shortcutTokens(spec, os);
  return os === 'mac' ? tokens.join('') : tokens.join('+');
}

/** Platform-aware global shortcut registry (mirrors the native Rust registrations). */
export const SHORTCUTS = {
  launch: { mods: ['mod'], key: 'Enter' },
  panic: { key: 'F12' },
  panicAlt: { mods: ['mod', 'shift'], key: 'H' },
  clickThrough: { mods: ['mod', 'shift'], key: 'X' },
  screenshot: { mods: ['mod', 'shift'], key: 'S' },
  pause: { key: 'Space' },
  askLast: { mods: ['mod'], key: 'Enter' },
  layout: { mods: ['mod'], key: 'L' },
} as const satisfies Record<string, ShortcutSpec>;

const OS = detectOsFamily();

/** Synchronous OS family for the current webview. */
export function useOsFamily(): OsFamily {
  return OS;
}

export function getOsFamily(): OsFamily {
  return OS;
}

/** Native environment info (Wayland / Hyprland), resolved once per window. */
let envPromise: Promise<EnvironmentInfo> | null = null;
export function useEnvironmentInfo(): EnvironmentInfo | null {
  const [info, setInfo] = useState<EnvironmentInfo | null>(null);
  useEffect(() => {
    let alive = true;
    envPromise ??= getEnvironmentInfo();
    void envPromise.then((e) => alive && setInfo(e));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}

export const OS_LABEL: Record<OsFamily, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};
