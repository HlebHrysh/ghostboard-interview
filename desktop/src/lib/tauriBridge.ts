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
 * Native command to dynamically set the Tauri window size.
 */
export async function setWindowSize(width: number, height: number): Promise<boolean> {
  if (!isTauriEnvironment()) return true;
  try {
    const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setSize(new LogicalSize(width, height));
    return true;
  } catch (_e) {
    try {
      await invoke('set_window_size', { width, height });
      return true;
    } catch (err) {
      console.warn('[tauriBridge] setWindowSize error:', err);
      return false;
    }
  }
}

/**
 * Native command to switch HUD window mode and adjust physical geometry.
 */
export async function setWindowMode(
  mode: 'full' | 'chat' | 'notch' | 'notch_answering' | 'ticker' | 'launcher' | 'stealth'
): Promise<boolean> {
  if (!isTauriEnvironment()) return true;
  const normalized = mode === 'stealth' ? 'notch' : mode;
  try {
    return await invoke<boolean>('set_window_mode', { mode: normalized });
  } catch (err) {
    console.warn('[tauriBridge] setWindowMode error:', err);
    return false;
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
function devLocalBase(): string | undefined {
  const isDev = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  if (!isDev) return undefined;
  try {
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('ghostboard_backend_url') : null;
    if (cached && !cached.includes('ghostboard.ai')) {
      // The Vite origin (5173) proxies /api only; browser pages live on the Next.js server.
      return cached.includes(':5173') ? 'http://localhost:3000' : cached;
    }
  } catch {}
  return 'http://localhost:3000';
}

export async function startPkceLogin(baseUrl?: string): Promise<{ auth_url: string; state: string } | null> {
  if (!isTauriEnvironment()) {
    console.log('[tauriBridge] Mock startPkceLogin in browser mode');
    return { auth_url: 'https://ghostboard.ai/auth/authorize', state: 'mock_state' };
  }
  try {
    const devBase = devLocalBase();
    const resolved = baseUrl ?? (devBase ? `${devBase}/auth/authorize` : undefined);
    return await invoke('start_pkce_login', { baseUrl: resolved });
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
    return await invoke('start_device_code_flow', { baseUrl: baseUrl ?? devLocalBase() });
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
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ghostboard_desktop_token');
    }
    return null;
  }
  try {
    return await invoke<string | null>('get_access_token');
  } catch (err) {
    console.warn('[tauriBridge] get_access_token error:', err);
    return null;
  }
}

/**
 * Stores verified tokens into the native OS Keyring via Rust IPC
 */
export async function saveTokens(
  token: string,
  options: {
    refreshToken?: string;
    userId?: string;
    email?: string;
    plan?: string;
    expiresAtMs?: number;
  } = {}
): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ghostboard_desktop_token', token);
    } catch {}
  }

  if (!isTauriEnvironment()) {
    return true;
  }

  try {
    await invoke('save_tokens', {
      token,
      refreshToken: options.refreshToken,
      userId: options.userId,
      email: options.email,
      plan: options.plan || 'pro',
      expiresAtMs: options.expiresAtMs,
    });
    return true;
  } catch (err) {
    console.warn('[tauriBridge] save_tokens error:', err);
    return false;
  }
}

export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('ghostboard_desktop_token');
    } catch {}
  }
  if (!isTauriEnvironment()) return;
  try {
    await invoke('logout');
  } catch (err) {
    console.warn('[tauriBridge] logout error:', err);
  }
}

/**
 * Native command to open a URL in the user's default system browser
 */
export async function openBrowser(url: string): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      await invoke('open_browser', { url });
      return;
    } catch (err) {
      console.warn('[tauriBridge] open_browser error:', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
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

// ============================================================================
// Two-window architecture: Office (main) + detached transparent HUD
// ============================================================================

export type CopilotMode = 'chat' | 'top_bar';

export interface CopilotLaunchReport {
  mode: CopilotMode;
  created: boolean;
  hyprland: boolean;
  hyprlandRulesApplied: number;
  hyprlandRulesFailed: number;
}

export interface EnvironmentInfo {
  platform: string;
  wayland: boolean;
  hyprland: boolean;
}

export interface AudioDevice {
  name: string;
  isDefault: boolean;
  isLoopbackCapable: boolean;
  sampleRate: number;
  channels: number;
}

/**
 * Opens (or re-uses) the detached transparent Copilot HUD window.
 * Rejects with a readable message on failure so the caller can show it - never swallows errors.
 * Outside Tauri (plain `vite` in a browser) falls back to a popup window for development.
 */
export async function launchCopilotWindow(mode: CopilotMode): Promise<CopilotLaunchReport> {
  if (!isTauriEnvironment()) {
    const features = mode === 'chat' ? 'width=780,height=460' : 'width=680,height=150';
    const popup = window.open(`${window.location.pathname}?window=hud&mode=${mode}`, 'ghostboard-hud', features);
    if (!popup) throw new Error('Браузер заблокував спливаюче вікно HUD');
    return { mode, created: true, hyprland: false, hyprlandRulesApplied: 0, hyprlandRulesFailed: 0 };
  }
  try {
    return await invoke<CopilotLaunchReport>('launch_copilot_window', { mode });
  } catch (err) {
    throw new Error(typeof err === 'string' ? err : err instanceof Error ? err.message : JSON.stringify(err));
  }
}

/** Closes the HUD window and brings the Office back. */
export async function closeCopilotWindow(): Promise<void> {
  if (!isTauriEnvironment()) {
    window.close();
    return;
  }
  try {
    await invoke('close_copilot_window');
  } catch (err) {
    console.warn('[tauriBridge] close_copilot_window error:', err);
  }
}

/** Focuses the Office (main) window. */
export async function openOffice(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    await invoke('open_office');
  } catch (err) {
    console.warn('[tauriBridge] open_office error:', err);
  }
}

/** Frameless-window chrome actions for the window that issues the call. */
export async function windowControl(action: 'minimize' | 'close' | 'toggle_maximize'): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    await invoke('window_control', { action });
  } catch (err) {
    console.warn('[tauriBridge] window_control error:', err);
  }
}

export async function getEnvironmentInfo(): Promise<EnvironmentInfo> {
  if (!isTauriEnvironment()) return { platform: 'browser', wayland: false, hyprland: false };
  try {
    return await invoke<EnvironmentInfo>('get_environment_info');
  } catch {
    return { platform: 'unknown', wayland: false, hyprland: false };
  }
}

/** Lists capture devices known to the native audio layer (PipeWire / PulseAudio monitors included). */
export async function listAudioDevices(): Promise<AudioDevice[]> {
  if (!isTauriEnvironment()) return [];
  const raw = await invoke<
    Array<{
      name: string;
      is_default: boolean;
      is_loopback_capable: boolean;
      default_sample_rate: number;
      default_channels: number;
    }>
  >('list_audio_devices');
  return raw.map((d) => ({
    name: d.name,
    isDefault: d.is_default,
    isLoopbackCapable: d.is_loopback_capable,
    sampleRate: d.default_sample_rate,
    channels: d.default_channels,
  }));
}

export interface AudioStartResult {
  ok: boolean;
  error?: string;
}

/**
 * Starts native capture on explicit devices and reports *why* it failed (unlike `startAudioCapture`
 * which only returns a boolean). The HUD still opens on failure and shows this message.
 */
export async function startAudioCaptureDetailed(
  source: 'dual' | 'loopback' | 'mic',
  devices: { loopbackDevice?: string | null; micDevice?: string | null } = {}
): Promise<AudioStartResult> {
  if (!isTauriEnvironment()) return { ok: false, error: 'Нативне захоплення звуку доступне лише у десктопному застосунку' };
  try {
    const ok = await invoke<boolean>('start_audio_capture', {
      source,
      loopbackDevice: devices.loopbackDevice || null,
      micDevice: devices.micDevice || null,
      force: true,
    });
    return { ok };
  } catch (err) {
    return { ok: false, error: typeof err === 'string' ? err : err instanceof Error ? err.message : String(err) };
  }
}

/** Hands provider keys (Deepgram STT etc.) to the native pipeline. */
export async function configureCopilotKeys(keys: { deepgramKey?: string | null }): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke('configure_copilot_keys', {
    deepgramKey: keys.deepgramKey ?? null,
    groqKey: null,
    openaiKey: null,
    anthropicKey: null,
  });
}

/** Subscribes to a Tauri event (no-op outside Tauri). Returns an unsubscribe function. */
export function listenTauriEvent<T = unknown>(event: string, handler: (payload: T) => void): () => void {
  if (!isTauriEnvironment()) return () => {};
  let disposed = false;
  let unlisten: (() => void) | undefined;
  import('@tauri-apps/api/event')
    .then(({ listen }) => listen<T>(event, (e) => handler(e.payload)))
    .then((un) => {
      if (disposed) un();
      else unlisten = un;
    })
    .catch((err) => console.warn(`[tauriBridge] listen(${event}) error:`, err));
  return () => {
    disposed = true;
    unlisten?.();
  };
}

/** Broadcasts a Tauri event to every window (no-op outside Tauri). */
export async function emitTauriEvent(event: string, payload?: unknown): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { emit } = await import('@tauri-apps/api/event');
    await emit(event, payload);
  } catch (err) {
    console.warn(`[tauriBridge] emit(${event}) error:`, err);
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
    setWindowMode: (mode: 'full' | 'chat' | 'notch' | 'ticker' | 'launcher' | 'stealth') => setWindowMode(mode),
    getAccessToken: () => getAccessToken(),
    saveTokens: (token: string, opts?: Parameters<typeof saveTokens>[1]) => saveTokens(token, opts),
    logout: () => logout(),
    getSystemInfo: async () => ({
      platform: typeof navigator !== 'undefined' && navigator.userAgent?.includes('Mac') ? 'darwin' : 'linux',
      arch: 'x64',
      version: '2.0.0-tauri',
    }),
    getSources: async () => [],
    minimize: () => windowControl('minimize'),
    close: () => windowControl('close'),
  };

  if (!g.ghostboard) g.ghostboard = bridgeApi;
  if (!g.desktopAPI) g.desktopAPI = bridgeApi;
}

// Auto-initialize compatibility shim on import
setupWindowCompatibilityShim();
