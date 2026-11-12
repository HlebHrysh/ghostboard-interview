import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { HudEvent, ScreenRadarSummary } from '../desktop/src/types/hud';
import {
  consumeRadarSnapshot,
  toggleVisionRadar,
  stageBrowserRadarSnapshot,
  setupWindowCompatibilityShim,
  isTauriEnvironment,
} from '../desktop/src/lib/tauriBridge';
import { injectHudEvent, subscribeHudEvents } from '../desktop/src/lib/hudBus';

const mockInvoke = vi.fn();

describe('Idea #5: Context-Aware Zero-Click Screen Delta Radar', () => {
  beforeEach(async () => {
    mockInvoke.mockReset();
    stageBrowserRadarSnapshot(null);
    await toggleVisionRadar(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.__TAURI_INTERNALS__;
    delete g.__TAURI__;
    delete g.isTauri;
    delete g.window;
  });

  describe('1. tauriBridge radar methods (Browser & Tauri IPC)', () => {
    it('returns fallback ROI snapshot in browser mode when radar is enabled', async () => {
      expect(isTauriEnvironment()).toBe(false);
      const snap = await consumeRadarSnapshot();
      expect(snap).not.toBeNull();
      expect(snap?.base64Png).toMatch(/^data:image\/png;base64,/);
      expect(snap?.roiWidth).toBeGreaterThan(0);
      expect(snap?.roiHeight).toBeGreaterThan(0);
    });

    it('consumes a staged browser ROI snapshot once and clears it', async () => {
      stageBrowserRadarSnapshot({
        base64Png: 'data:image/png;base64,CUSTOM_ROI_CROP',
        roiWidth: 960,
        roiHeight: 540,
      });

      const first = await consumeRadarSnapshot();
      expect(first).toEqual({
        base64Png: 'data:image/png;base64,CUSTOM_ROI_CROP',
        roiWidth: 960,
        roiHeight: 540,
      });

      // Second call falls back cleanly rather than returning the stale staged crop
      const second = await consumeRadarSnapshot();
      expect(second?.base64Png).not.toBe('data:image/png;base64,CUSTOM_ROI_CROP');
    });

    it('toggles vision radar off and suppresses browser fallback snapshots', async () => {
      const disabled = await toggleVisionRadar(false);
      expect(disabled).toBe(false);

      const snapWhileDisabled = await consumeRadarSnapshot();
      expect(snapWhileDisabled).toBeNull();

      const reEnabled = await toggleVisionRadar(true);
      expect(reEnabled).toBe(true);
      const snapAfterEnable = await consumeRadarSnapshot();
      expect(snapAfterEnable).not.toBeNull();
    });

    it('invokes native Tauri commands when inside Tauri runtime', async () => {
      const g = globalThis as unknown as Record<string, unknown>;
      g.__TAURI_INTERNALS__ = { invoke: mockInvoke };
      g.window = g;
      expect(isTauriEnvironment()).toBe(true);

      mockInvoke.mockResolvedValueOnce(false);
      const toggled = await toggleVisionRadar(false);
      expect(toggled).toBe(false);
      expect(mockInvoke).toHaveBeenCalledWith('toggle_vision_radar', { enabled: false }, undefined);

      mockInvoke.mockResolvedValueOnce({
        detectionId: 'radar-100',
        hammingDistance: 12,
        roiX: 100,
        roiY: 80,
        roiWidth: 1024,
        roiHeight: 680,
        base64Png: 'data:image/png;base64,RUST_ROI_PNG',
        detectedAtMs: 1700000000000,
      });

      const snap = await consumeRadarSnapshot();
      expect(mockInvoke).toHaveBeenCalledWith('consume_radar_snapshot', {}, undefined);
      expect(snap).toEqual({
        base64Png: 'data:image/png;base64,RUST_ROI_PNG',
        roiWidth: 1024,
        roiHeight: 680,
      });
    });

    it('normalizes snake_case Rust responses in consumeRadarSnapshot', async () => {
      const g = globalThis as unknown as Record<string, unknown>;
      g.__TAURI_INTERNALS__ = { invoke: mockInvoke };
      g.window = g;

      mockInvoke.mockResolvedValueOnce({
        base64_png: 'data:image/png;base64,SNAKE_PNG',
        roi_width: 800,
        roi_height: 600,
      });

      const snap = await consumeRadarSnapshot();
      expect(snap).toEqual({
        base64Png: 'data:image/png;base64,SNAKE_PNG',
        roiWidth: 800,
        roiHeight: 600,
      });
    });

    it('exposes consumeRadarSnapshot and toggleVisionRadar on compatibility shim', () => {
      setupWindowCompatibilityShim();
      const g = globalThis as unknown as Record<string, Record<string, unknown>>;
      expect(typeof g.ghostboard.consumeRadarSnapshot).toBe('function');
      expect(typeof g.ghostboard.toggleVisionRadar).toBe('function');
      expect(typeof g.desktopAPI.consumeRadarSnapshot).toBe('function');
      expect(typeof g.desktopAPI.toggleVisionRadar).toBe('function');
    });
  });

  describe('2. HudEvent screenRadarReady & state transitions', () => {
    it('delivers screenRadarReady events through hudBus subscribers', () => {
      const received: HudEvent[] = [];
      const unsub = subscribeHudEvents((ev) => received.push(ev));

      const event: HudEvent = {
        type: 'screenRadarReady',
        payload: {
          detection_id: 'radar-555',
          hamming_distance: 11,
          roi_width: 1120,
          roi_height: 700,
          detected_at_ms: 1700000005000,
        },
      };

      injectHudEvent(event);
      unsub();

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(event);

      const summary: ScreenRadarSummary = {
        detectionId: event.payload.detectionId ?? event.payload.detection_id ?? '',
        hammingDistance: event.payload.hammingDistance ?? event.payload.hamming_distance ?? 0,
        roiWidth: event.payload.roiWidth ?? event.payload.roi_width ?? 0,
        roiHeight: event.payload.roiHeight ?? event.payload.roi_height ?? 0,
        detectedAtMs: event.payload.detectedAtMs ?? event.payload.detected_at_ms ?? 0,
      };
      expect(summary).toEqual({
        detectionId: 'radar-555',
        hammingDistance: 11,
        roiWidth: 1120,
        roiHeight: 700,
        detectedAtMs: 1700000005000,
      });
    });

    it('wires useHudStream, HudWindow, and Rust vision_radar module cleanly', () => {
      const hookSrc = fs.readFileSync(
        path.resolve(__dirname, '../desktop/src/hooks/useHudStream.ts'),
        'utf-8'
      );
      expect(hookSrc).toContain("case 'screenRadarReady':");
      expect(hookSrc).toContain('radarReady');
      expect(hookSrc).toContain('consumeRadarSnapshot');
      expect(hookSrc).toContain('toggleVisionRadar');

      const hudSrc = fs.readFileSync(
        path.resolve(__dirname, '../desktop/src/hud/HudWindow.tsx'),
        'utf-8'
      );
      expect(hudSrc).toContain('Задачу розпізнано (0ms)');
      expect(hudSrc).toContain('consumeRadarSnapshot');
      expect(hudSrc).toContain('RADAR_FRESH_MS');

      const rustSrc = fs.readFileSync(
        path.resolve(__dirname, '../desktop/src-tauri/src/vision_radar.rs'),
        'utf-8'
      );
      expect(rustSrc).toContain('pub fn compute_dhash_64');
      expect(rustSrc).toContain('pub fn extract_changed_roi_base64');
      expect(rustSrc).toContain('pub struct VisionRadarState');
    });
  });
});
