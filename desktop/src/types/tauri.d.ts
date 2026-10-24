import type { UserProfile, DeviceCodePendingPayload } from './hud';

/**
 * Ghostboard Desktop Tauri v2 Type Definitions & Native Bridge Contracts.
 */

export interface DesktopMediaSource {
  id: string;
  name: string;
  thumbnail: string;
  display_id?: string;
  appIcon?: string | null;
}

export type AudioSourceMode = 'system' | 'window' | 'tab' | 'mic';
export type SpeakerRole = 'interviewer' | 'candidate';

export interface SpeechTranscriptEvent {
  speaker: SpeakerRole;
  text: string;
  isFinal: boolean;
  speechFinal?: boolean;
  confidence?: number;
}

export interface DialogueMessage {
  id: string;
  speaker: 'interlocutor' | 'candidate';
  label: 'Співрозмовник' | 'Ви';
  text: string;
  isFinal: boolean;
  timestamp: number;
  qaId?: string;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

export interface UpdateCheckResult {
  available: boolean;
  version?: string | null;
  body?: string | null;
  date?: string | null;
}

export interface GhostboardAPI {
  isTauri?: boolean;
  checkForUpdates?: () => Promise<UpdateCheckResult>;
  quitAndInstallUpdate?: () => Promise<boolean | void>;
  installUpdate?: () => Promise<boolean | void>;
  getSources: (options?: { types?: string[]; thumbnailSize?: { width: number; height: number }; fetchWindowIcons?: boolean }) => Promise<DesktopMediaSource[]>;
  selectSource?: (sourceId: string) => Promise<boolean>;
  clearSelectedSource?: () => Promise<boolean | { success: boolean }>;
  setIgnoreMouseEvents?: (ignore: boolean, options?: { forward?: boolean }) => Promise<boolean | void>;
  setContentProtection?: (enable: boolean) => Promise<boolean>;
  setOpacity?: (opacity: number) => Promise<number | void>;
  alignToActiveDisplay?: () => Promise<boolean>;
  panicHide?: () => Promise<boolean>;
  triggerManualAnswer?: (prompt?: string) => Promise<void>;
  clearSession?: () => Promise<void>;
  exportMarkdown?: (content: string, filename?: string) => Promise<string | boolean | { success: boolean; path: string }>;
  captureScreen?: () => Promise<{ base64Png: string; width: number; height: number } | null>;
  startAudioCapture?: (source?: string) => Promise<boolean>;
  stopAudioCapture?: () => Promise<boolean>;
  startPkceLogin?: (baseUrl?: string) => Promise<{ auth_url: string; state: string } | null>;
  startBrowserLogin?: (baseUrl?: string) => Promise<boolean | { success: boolean } | { auth_url: string; state: string } | null>;
  startDeviceCodeFlow?: (baseUrl?: string) => Promise<DeviceCodeResponse | DeviceCodePendingPayload | null>;
  getAuthState?: () => Promise<{ authenticated: boolean; user: UserProfile | null; plan: string }>;
  getSavedSession: () => Promise<Record<string, unknown> | null>;
  getAccessToken?: () => Promise<string | null>;
  logout?: () => Promise<void | boolean>;
  getSystemInfo: () => Promise<{
    platform: string;
    version: string;
    arch: string;
    isMac?: boolean;
    isWin?: boolean;
    isLinux?: boolean;
    hardwareEncryptionAvailable?: boolean;
  }>;
  minimize?: () => Promise<void>;
  close?: () => Promise<void>;
  setWindowMode?: (mode: 'launcher' | 'stealth' | 'ticker') => Promise<boolean | void>;
  setWindowHeight?: (height: number) => Promise<number | void>;
  toggleStealth?: (enable?: boolean) => Promise<boolean>;
  toggleClickThrough?: (enable?: boolean) => Promise<boolean>;
  checkPermissions?: () => Promise<{ platform: string; mic: string; screen: string }>;
  openSystemSettings?: (target: string) => Promise<boolean>;
  onShortcut?: (callback: (shortcut: string) => void) => () => void;
  onModeToggled?: (callback: (mode: string) => void) => () => void;
  onStealthToggled?: (callback: (state: boolean) => void) => () => void;
  onClickThroughToggled?: (callback: (state: boolean) => void) => () => void;
  onTogglePanic?: (callback: () => void) => () => void;
  onToggleFreeze?: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    ghostboard?: GhostboardAPI;
    desktopAPI?: GhostboardAPI;
  }
}
