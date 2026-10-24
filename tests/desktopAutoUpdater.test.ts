import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTauriEnvironment,
  checkForUpdates,
  quitAndInstallUpdate,
  setupWindowCompatibilityShim,
} from '../desktop/src/lib/tauriBridge';

interface MockTauriGlobal {
  window?: unknown;
  __TAURI_INTERNALS__?: {
    invoke: ReturnType<typeof vi.fn>;
  };
  __TAURI__?: unknown;
  isTauri?: boolean;
  ghostboard?: {
    checkForUpdates?: () => Promise<unknown>;
    quitAndInstallUpdate?: () => Promise<unknown>;
    installUpdate?: () => Promise<unknown>;
  };
  desktopAPI?: {
    checkForUpdates?: () => Promise<unknown>;
    quitAndInstallUpdate?: () => Promise<unknown>;
  };
}

const mockGlobal = globalThis as unknown as MockTauriGlobal;

describe('Desktop Auto-Updater Bridge & Native Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockGlobal.window = globalThis;
    delete mockGlobal.__TAURI_INTERNALS__;
    delete mockGlobal.__TAURI__;
    delete mockGlobal.isTauri;
    delete mockGlobal.ghostboard;
    delete mockGlobal.desktopAPI;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete mockGlobal.__TAURI_INTERNALS__;
    delete mockGlobal.__TAURI__;
    delete mockGlobal.isTauri;
    delete mockGlobal.ghostboard;
    delete mockGlobal.desktopAPI;
    delete mockGlobal.window;
  });

  describe('1. Non-Tauri / Browser Fallback Mode', () => {
    it('returns available: false without calling native invoke', async () => {
      expect(isTauriEnvironment()).toBe(false);

      const result = await checkForUpdates();
      expect(result).toEqual({
        available: false,
        version: null,
        body: null,
        date: null,
      });
    });

    it('quitAndInstallUpdate returns false without calling native invoke', async () => {
      expect(isTauriEnvironment()).toBe(false);

      const success = await quitAndInstallUpdate();
      expect(success).toBe(false);
    });
  });

  describe('2. Live Tauri Environment Mode', () => {
    let mockInvoke: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockInvoke = vi.fn();
      mockGlobal.window = globalThis;
      mockGlobal.__TAURI_INTERNALS__ = {
        invoke: mockInvoke,
      };
    });

    it('invokes check_for_updates and returns structured update info when available', async () => {
      expect(isTauriEnvironment()).toBe(true);

      mockInvoke.mockResolvedValueOnce({
        available: true,
        version: '1.3.0',
        body: 'Ghostboard v1.3.0: High-frequency STT enhancements',
        date: '2026-10-25T00:00:00Z',
      });

      const result = await checkForUpdates();
      expect(mockInvoke).toHaveBeenCalledWith('check_for_updates', {}, undefined);
      expect(result.available).toBe(true);
      expect(result.version).toBe('1.3.0');
      expect(result.body).toContain('High-frequency STT');
      expect(result.date).toBe('2026-10-25T00:00:00Z');
    });

    it('gracefully handles offline/dev errors in check_for_updates without throwing', async () => {
      expect(isTauriEnvironment()).toBe(true);

      mockInvoke.mockRejectedValueOnce(new Error('Network error: server unreachable'));

      const result = await checkForUpdates();
      expect(mockInvoke).toHaveBeenCalledWith('check_for_updates', {}, undefined);
      expect(result).toEqual({
        available: false,
        version: null,
        body: null,
        date: null,
      });
    });

    it('invokes install_update on quitAndInstallUpdate and returns true on success', async () => {
      expect(isTauriEnvironment()).toBe(true);

      mockInvoke.mockResolvedValueOnce(undefined);

      const success = await quitAndInstallUpdate();
      expect(mockInvoke).toHaveBeenCalledWith('install_update', {}, undefined);
      expect(success).toBe(true);
    });

    it('handles failure during install_update gracefully returning false', async () => {
      expect(isTauriEnvironment()).toBe(true);

      mockInvoke.mockRejectedValueOnce(new Error('Signature verification failed'));

      const success = await quitAndInstallUpdate();
      expect(mockInvoke).toHaveBeenCalledWith('install_update', {}, undefined);
      expect(success).toBe(false);
    });
  });

  describe('3. Global Compatibility Shim', () => {
    it('registers checkForUpdates and quitAndInstallUpdate on window.ghostboard', () => {
      setupWindowCompatibilityShim();

      expect(mockGlobal.ghostboard).toBeDefined();
      expect(typeof mockGlobal.ghostboard?.checkForUpdates).toBe('function');
      expect(typeof mockGlobal.ghostboard?.quitAndInstallUpdate).toBe('function');
      expect(typeof mockGlobal.ghostboard?.installUpdate).toBe('function');
      expect(typeof mockGlobal.desktopAPI?.checkForUpdates).toBe('function');
    });
  });
});
