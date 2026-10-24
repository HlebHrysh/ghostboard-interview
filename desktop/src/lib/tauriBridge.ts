import { invoke, Channel } from '@tauri-apps/api/core';
import type { HudEvent, UserProfile } from '../types/hud';
import type { UpdateCheckResult } from '../types/tauri';

interface TauriGlobals {
  isTauri?: boolean;
  __TAURI_INTERNALS__?: unknown;
  __TAURI__?: unknown;
  ghostboard?: unknown;
  desktopAPI?: unknown;
}

const getGlobalObject = (): (Window & typeof globalThis & TauriGlobals) | undefined => {
  if (typeof window !== 'undefined') return window as Window & typeof globalThis & TauriGlobals;
  if (typeof globalThis !== 'undefined') return globalThis as unknown as Window & typeof globalThis & TauriGlobals;
  return undefined;
};

/**
 * Checks whether the current runtime environment is a live Tauri webview.
 */
export const isTauriEnvironment = (): boolean => {
  const g = getGlobalObject();
  if (!g) return false;
  return Boolean(
    g.isTauri ||
    g.__TAURI_INTERNALS__ ||
    g.__TAURI__
  );
};

/**
 * Subscribes to the live Rust Copilot IPC channel stream (`tauri::ipc::Channel<HudEvent>`).
 * Receives real-time VAD states, STT transcripts, question detections, and LLM streaming tokens.
 *
 * @param onEvent Callback invoked for every incoming HudEvent.
 * @returns Teardown function to unsubscribe and free the channel.
 */
export function startCopilotStream(onEvent: (event: HudEvent) => void): () => void {
  let active = true;

  if (!isTauriEnvironment()) {
    // Non-Tauri (headless/mock/vite dev) fallback
    return () => {
      active = false;
    };
  }

  try {
    const channel = new Channel<HudEvent>();
    channel.onmessage = (event: HudEvent) => {
      if (active) {
        onEvent(event);
      }
    };

    invoke('start_copilot_stream', { onEvent: channel }).catch((err) => {
      if (active) {
        console.warn('[tauriBridge] start_copilot_stream invocation error:', err);
      }
    });

    return () => {
      active = false;
      invoke('stop_hud_stream').catch(() => {});
    };
  } catch (err) {
    console.warn('[tauriBridge] Channel registration error:', err);
    return () => {
      active = false;
    };
  }
}

/**
 * Starts native audio capture via Tauri IPC with graceful fallback.
 * @param source Optional capture source ('dual' | 'loopback' | 'mic')
 */
export async function startAudioCapture(source?: string): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return false;
  }
  try {
    return await invoke<boolean>('start_audio_capture', { source: source || 'dual' });
  } catch (err) {
    console.warn('[tauriBridge] start_audio_capture failed:', err);
    return false;
  }
}

/**
 * Stops native audio capture via Tauri IPC.
 */
export async function stopAudioCapture(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return false;
  }
  try {
    return await invoke<boolean>('stop_audio_capture');
  } catch (err) {
    console.warn('[tauriBridge] stop_audio_capture failed:', err);
    return false;
  }
}

/**
 * Native command to toggle Screen Sharing Invisibility across OSes
 * (Windows WDA_EXCLUDEFROMCAPTURE, macOS NSWindowSharingNone, Linux skip-taskbar).
 */
export async function setScreenShareStealth(enabled: boolean = true): Promise<boolean> {
  if (!isTauriEnvironment()) return enabled;
  try {
    return await invoke<boolean>('set_screen_share_stealth', {
      enabled,
      enable: enabled,
    });
  } catch (err) {
    console.warn('[tauriBridge] setScreenShareStealth error:', err);
    return false;
  }
}

/**
 * Native command to toggle click-through cursor transparency (`set_ignore_cursor_events`).
 */
export async function toggleClickThrough(enabled: boolean = true): Promise<boolean> {
  if (!isTauriEnvironment()) return enabled;
  try {
    return await invoke<boolean>('toggle_click_through', {
      enabled,
      enable: enabled,
    });
  } catch (err) {
    console.warn('[tauriBridge] toggleClickThrough error:', err);
    return false;
  }
}

/**
 * Native command to set HUD window opacity.
 */
export async function setWindowOpacity(opacity: number): Promise<void> {
  const clamped = Math.min(1.0, Math.max(0.1, opacity));
  if (!isTauriEnvironment()) return;
  try {
    await invoke('set_window_opacity', { opacity: clamped });
  } catch (err) {
    console.warn('[tauriBridge] setWindowOpacity error:', err);
  }
}

/**
 * Native command to center and align the HUD directly under the active webcam lens.
 */
export async function alignToActiveDisplay(): Promise<boolean> {
  if (!isTauriEnvironment()) return true;
  try {
    return await invoke<boolean>('align_to_active_display');
  } catch (err) {
    console.warn('[tauriBridge] alignToActiveDisplay error:', err);
    return false;
  }
}

/**
 * Native command for panic shield instant hide (<16ms).
 */
export async function panicHide(): Promise<boolean> {
  if (!isTauriEnvironment()) return true;
  try {
    return await invoke<boolean>('panic_hide');
  } catch (err) {
    console.warn('[tauriBridge] panicHide error:', err);
    return false;
  }
}

/**
 * Triggers manual AI prompt generation (for instant answers or modifier buttons).
 */
export async function triggerManualAnswer(prompt?: string): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    await invoke('trigger_manual_answer', { prompt });
  } catch (err) {
    console.warn('[tauriBridge] triggerManualAnswer error:', err);
  }
}

/**
 * Clears the active session state in the native pipeline.
 */
export async function clearSession(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    await invoke('clear_session');
  } catch (err) {
    console.warn('[tauriBridge] clearSession error:', err);
  }
}

/**
 * Exports session debrief content to a markdown file on disk.
 * Falls back to browser blob download if running outside Tauri.
 */
export async function exportMarkdown(
  content: string,
  defaultFilename?: string
): Promise<string> {
  const filename = defaultFilename || `ghostboard-session-${Date.now()}.md`;

  if (isTauriEnvironment()) {
    try {
      return await invoke<string>('export_markdown', {
        content,
        filename,
        default_filename: filename,
      });
    } catch (err) {
      console.warn('[tauriBridge] Native export_markdown failed, falling back to blob:', err);
    }
  }

  // Fallback to browser blob download
  if (typeof document !== 'undefined') {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return filename;
  }

  return filename;
}

/**
 * Native auth functions for OAuth 2.0 PKCE, Deep Linking & Device Code Flow
 */
export async function startPkceLogin(baseUrl?: string): Promise<{ auth_url: string; state: string } | null> {
  if (!isTauriEnvironment()) {
    console.log('[tauriBridge] Mock startPkceLogin in browser mode');
    return { auth_url: 'https://ghostboard.ai/auth/authorize', state: 'mock_state' };
  }
  try {
    return await invoke('start_pkce_login', { baseUrl });
  } catch (err) {
    console.warn('[tauriBridge] start_pkce_login error:', err);
    return null;
  }
}

export async function handleDeepLinkCode(code: string, state: string): Promise<Record<string, unknown> | null> {
  if (!isTauriEnvironment()) return null;
  try {
    return await invoke<Record<string, unknown>>('handle_deep_link_code', { code, state });
  } catch (err: unknown) {
    console.warn('[tauriBridge] handle_deep_link_code error:', err);
    return null;
  }
}

export async function startDeviceCodeFlow(baseUrl?: string): Promise<{
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
} | null> {
  if (!isTauriEnvironment()) {
    return {
      device_code: 'mock_dc_123',
      user_code: 'GB8-492',
      verification_uri: 'https://ghostboard.ai/activate',
      verification_uri_complete: 'https://ghostboard.ai/activate?user_code=GB8-492',
      expires_in: 600,
      interval: 5,
    };
  }
  try {
    return await invoke('start_device_code_flow', { baseUrl });
  } catch (err: unknown) {
    console.warn('[tauriBridge] start_device_code_flow error:', err);
    return null;
  }
}

export async function getAuthState(): Promise<{ authenticated: boolean; user: UserProfile | null; plan: string }> {
  if (!isTauriEnvironment()) {
    return { authenticated: false, user: null, plan: 'free' };
  }
  try {
    return await invoke<{ authenticated: boolean; user: UserProfile | null; plan: string }>('get_auth_state');
  } catch (err: unknown) {
    console.warn('[tauriBridge] get_auth_state error:', err);
    return { authenticated: false, user: null, plan: 'free' };
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!isTauriEnvironment()) {
    return null;
  }
  try {
    return await invoke<string | null>('get_access_token');
  } catch (err) {
    console.warn('[tauriBridge] get_access_token error:', err);
    return null;
  }
}

export async function logout(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    await invoke('logout');
  } catch (err) {
    console.warn('[tauriBridge] logout error:', err);
  }
}

/**
 * Native command to capture the active display and return a base64-encoded PNG image with dimensions.
 */
export async function captureScreen(): Promise<{
  base64Png: string;
  width: number;
  height: number;
} | null> {
  if (!isTauriEnvironment()) {
    console.log('[tauriBridge] Mock captureScreen in browser mode');
    return {
      base64Png:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      width: 1920,
      height: 1080,
    };
  }
  try {
    const raw = await invoke<{
      base64_png?: string;
      base64Png?: string;
      width: number;
      height: number;
    }>('capture_screen');
    if (!raw) return null;
    return {
      base64Png: raw.base64Png || raw.base64_png || '',
      width: raw.width,
      height: raw.height,
    };
  } catch (err) {
    console.warn('[tauriBridge] capture_screen error:', err);
    return null;
  }
}

/**
 * Checks for application updates via native Tauri v2 updater.
 * Gracefully falls back to { available: false } in non-Tauri browser environments.
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (!isTauriEnvironment()) {
    return { available: false, version: null, body: null, date: null };
  }
  try {
    return await invoke<UpdateCheckResult>('check_for_updates');
  } catch (err: unknown) {
    console.warn('[tauriBridge] check_for_updates error:', err);
    return { available: false, version: null, body: null, date: null };
  }
}

/**
 * Downloads and installs the pending update, then prompts restart.
 * Gracefully handles non-Tauri or offline environments.
 */
export async function quitAndInstallUpdate(): Promise<boolean> {
  if (!isTauriEnvironment()) {
    return false;
  }
  try {
    await invoke('install_update');
    return true;
  } catch (err: unknown) {
    console.warn('[tauriBridge] install_update error:', err);
    return false;
  }
}

/**
 * Ensure global window compatibility shim so legacy callers (`window.desktopAPI` / `window.ghostboard`)
 * gracefully route through Tauri v2 native invoke bindings.
 */
export function setupWindowCompatibilityShim(): void {
  const g = getGlobalObject();
  if (!g) return;

  const bridgeApi = {
    isTauri: isTauriEnvironment(),
    checkForUpdates: () => checkForUpdates(),
    quitAndInstallUpdate: () => quitAndInstallUpdate(),
    installUpdate: () => quitAndInstallUpdate(),
    setContentProtection: (enable: boolean) => setScreenShareStealth(enable),
    setIgnoreMouseEvents: (enable: boolean) => toggleClickThrough(enable),
    setOpacity: (opacity: number) => setWindowOpacity(opacity),
    alignToActiveDisplay: () => alignToActiveDisplay(),
    panicHide: () => panicHide(),
    triggerManualAnswer: (prompt?: string) => triggerManualAnswer(prompt),
    clearSession: () => clearSession(),
    exportMarkdown: (content: string, filename?: string) => exportMarkdown(content, filename),
    captureScreen: () => captureScreen(),
    startAudioCapture: (source?: string) => startAudioCapture(source),
    stopAudioCapture: () => stopAudioCapture(),
    startPkceLogin: (baseUrl?: string) => startPkceLogin(baseUrl),
    startBrowserLogin: (baseUrl?: string) => startPkceLogin(baseUrl),
    startDeviceCodeFlow: (baseUrl?: string) => startDeviceCodeFlow(baseUrl),
    getAuthState: () => getAuthState(),
    getSavedSession: () => getAuthState(),
    getAccessToken: () => getAccessToken(),
    logout: () => logout(),
    getSystemInfo: async () => ({
      platform: typeof navigator !== 'undefined' && navigator.userAgent?.includes('Mac') ? 'darwin' : 'linux',
      arch: 'x64',
      version: '2.0.0-tauri',
    }),
    getSources: async () => [],
    minimize: async () => {},
    close: async () => {},
  };

  if (!g.ghostboard) g.ghostboard = bridgeApi;
  if (!g.desktopAPI) g.desktopAPI = bridgeApi;
}

// Auto-initialize compatibility shim on import
setupWindowCompatibilityShim();
