/**
 * Mock Electron ContextBridge IPC Simulator
 * Simulates window.desktopAPI / window.ghostboard methods.
 */

export type DesktopWindowMode = 'launcher' | 'stealth' | 'ticker';

export interface WindowGeometry {
  width: number;
  height: number;
  x: number;
  y: number;
}

export class MockElectronBridge {
  platform: 'linux' | 'darwin' | 'win32' = 'linux';
  contentProtection = false;
  windowMode: DesktopWindowMode = 'launcher';
  ignoreMouseEvents = false;
  mouseForwarding = false;
  opacity = 0.95;
  geometry: WindowGeometry = { width: 840, height: 600, x: 200, y: 100 };
  clipboardContent = '';
  exportedFiles: Array<{ filename: string; content: string; timestamp: number }> = [];
  shortcutListeners: Array<(key: string) => void> = [];

  setPlatform(platform: 'linux' | 'darwin' | 'win32') {
    this.platform = platform;
  }

  async setContentProtection(enable: boolean): Promise<boolean> {
    this.contentProtection = enable;
    return true;
  }

  async setWindowMode(mode: DesktopWindowMode): Promise<WindowGeometry> {
    this.windowMode = mode;
    if (mode === 'stealth') {
      // Eyeline notch pinned under webcam
      this.geometry = { width: 580, height: 220, x: 670, y: 10 };
    } else if (mode === 'ticker') {
      // Ribbon marquee
      this.geometry = { width: 940, height: 40, x: 490, y: 0 };
    } else {
      // Full launcher / dual-column mode
      this.geometry = { width: 840, height: 600, x: 540, y: 150 };
    }
    return this.geometry;
  }

  async setIgnoreMouseEvents(ignore: boolean, options?: { forward?: boolean }): Promise<void> {
    this.ignoreMouseEvents = ignore;
    // Note: Linux ignores { forward: true } to prevent OS hang
    if (this.platform !== 'linux') {
      this.mouseForwarding = !!options?.forward;
    } else {
      this.mouseForwarding = false;
    }
  }

  async setOpacity(val: number): Promise<number> {
    // Clamped between 0.50 and 1.00
    this.opacity = Math.max(0.5, Math.min(1.0, val));
    return this.opacity;
  }

  async copyClipboard(text: string): Promise<boolean> {
    this.clipboardContent = text;
    return true;
  }

  async exportMarkdown(content: string, filename?: string): Promise<{ success: boolean; path: string }> {
    const name = filename || `ghostboard-interview-debrief-${new Date().toISOString().slice(0, 10)}.md`;
    this.exportedFiles.push({
      filename: name,
      content,
      timestamp: Date.now(),
    });
    return { success: true, path: `/home/user/Documents/${name}` };
  }

  onShortcut(callback: (shortcut: string) => void): () => void {
    this.shortcutListeners.push(callback);
    return () => {
      this.shortcutListeners = this.shortcutListeners.filter((cb) => cb !== callback);
    };
  }

  triggerShortcut(key: string) {
    this.shortcutListeners.forEach((cb) => cb(key));
  }
}
