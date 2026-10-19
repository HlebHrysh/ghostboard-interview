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

export interface GhostboardAPI {
  // Canonical PROJECT.md IPC contracts
  getSources: (options?: { types?: string[]; thumbnailSize?: { width: number; height: number }; fetchWindowIcons?: boolean }) => Promise<DesktopMediaSource[]>;
  selectSource: (sourceId: string) => Promise<boolean>;
  clearSelectedSource?: () => Promise<boolean | { success: boolean }>;
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward?: boolean }) => Promise<void>;
  setContentProtection: (enable: boolean) => Promise<boolean>;
  setOpacity: (opacity: number) => Promise<number>;
  onShortcut: (callback: (shortcut: string) => void) => () => void;
  exportMarkdown: (content: string, filename?: string) => Promise<boolean | { success: boolean; path: string }>;

  // Window geometry and modes
  setWindowHeight: (height: number) => Promise<any>;
  setWindowMode: (mode: 'launcher' | 'stealth' | 'ticker') => Promise<any>;
  launchSession: () => Promise<any>;
  returnToLauncher: () => Promise<any>;
  alignToActiveDisplay: () => Promise<any>;
  toggleStealth: (enable?: boolean) => Promise<boolean>;
  toggleClickThrough: (enable?: boolean) => Promise<boolean>;
  minimize: () => Promise<void>;
  close: () => Promise<void>;

  // Session & Auth
  getSavedSession: () => Promise<any>;
  saveSession: (data: any) => Promise<boolean>;
  logout: () => Promise<boolean>;
  saveSettings: (settings: any) => Promise<boolean>;
  startBrowserLogin: (serverUrl?: string) => Promise<any>;

  // System
  copyClipboard: (text: string) => Promise<boolean>;
  getSystemInfo: () => Promise<{
    platform: string;
    version: string;
    arch: string;
    isMac: boolean;
    isWin: boolean;
    isLinux: boolean;
    hardwareEncryptionAvailable: boolean;
  }>;
  apiRequest: (opts: any) => Promise<any>;

  // Hardware Permissions
  checkPermissions: () => Promise<{ platform: string; mic: string; screen: string }>;
  requestMicPermission: () => Promise<boolean>;
  openSystemSettings: (target: string) => Promise<boolean>;

  // Updates
  checkForUpdates: () => Promise<any>;
  quitAndInstallUpdate: () => Promise<void>;

  // Event Listeners
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateReady: (callback: (info: any) => void) => () => void;
  onTokenReceived: (callback: (token: string) => void) => () => void;
  onClickThroughToggled: (callback: (state: boolean) => void) => () => void;
  onStealthToggled: (callback: (state: boolean) => void) => () => void;
  onModeToggled: (callback: (mode: string) => void) => () => void;
  onStateChanged: (callback: (state: string) => void) => () => void;
  onToggleFreeze: (callback: () => void) => () => void;
  onTogglePanic: (callback: () => void) => () => void;
  onSystemResumed: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    ghostboard?: GhostboardAPI;
    desktopAPI?: GhostboardAPI;
  }
}
