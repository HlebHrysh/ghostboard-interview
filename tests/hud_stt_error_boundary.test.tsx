import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { HudErrorBoundary } from '../desktop/src/components/HudErrorBoundary';
import * as tauriBridge from '../desktop/src/lib/tauriBridge';
import type { HudEvent } from '../desktop/src/types/hud';

const NormalChild: React.FC = () => {
  return React.createElement('div', { id: 'normal-child' }, 'HUD Normal Operation');
};

describe('Stage 3: Frontend Stabilization, Error Boundary & STT Status Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. HudErrorBoundary Component', () => {
    it('renders child components cleanly when no error occurs', () => {
      const html = renderToString(
        React.createElement(HudErrorBoundary, null, React.createElement(NormalChild))
      );
      expect(html).toContain('HUD Normal Operation');
      expect(html).toContain('id="normal-child"');
    });

    it('getDerivedStateFromError captures error into state', () => {
      const error = new Error('Empirical UI crash simulation');
      const derived = HudErrorBoundary.getDerivedStateFromError(error);

      expect(derived.hasError).toBe(true);
      expect(derived.error).toBe(error);
    });

    it('renders stealth HUD error card with data-tauri-drag-region, error message, and controls when error occurs', () => {
      const boundary = new HudErrorBoundary({
        children: React.createElement(NormalChild),
      });

      boundary.state = {
        hasError: true,
        error: new Error('Simulated Webview GPU crash'),
        errorInfo: null,
      };

      const rendered = boundary.render();
      const html = renderToString(rendered as React.ReactElement);

      expect(html).toContain('Ghostboard HUD');
      expect(html).toContain('UI Crash Guard');
      expect(html).toContain('Simulated Webview GPU crash');
      expect(html).toContain('data-tauri-drag-region');
      expect(html).toContain('DRAG REGION');
      expect(html).toContain('Перезавантажити HUD');
      expect(html).toContain('Сховати вікно');
    });

    it('invokes panicHide when handlePanicHide is called', async () => {
      const panicHideSpy = vi.spyOn(tauriBridge, 'panicHide').mockResolvedValue(true);

      const boundary = new HudErrorBoundary({
        children: React.createElement(NormalChild),
      });

      boundary.handlePanicHide();
      expect(panicHideSpy).toHaveBeenCalled();
    });

    it('resets error state and triggers window reload when handleReload is called', () => {
      const reloadMock = vi.fn();
      const mockWindow = { location: { reload: reloadMock } };
      (globalThis as unknown as Record<string, unknown>).window = mockWindow;

      const boundary = new HudErrorBoundary({
        children: React.createElement(NormalChild),
      });

      boundary.state = {
        hasError: true,
        error: new Error('Test crash'),
        errorInfo: null,
      };

      (boundary as unknown as { updater: unknown }).updater = {
        enqueueSetState: (inst: { state: Record<string, unknown> }, state: Record<string, unknown>) => {
          Object.assign(inst.state, state);
        },
      };

      boundary.handleReload();
      expect(reloadMock).toHaveBeenCalled();
      expect(boundary.state.hasError).toBe(false);
      expect(boundary.state.error).toBeNull();

      delete (globalThis as unknown as Record<string, unknown>).window;
    });
  });

  describe('2. STT Status Event & AUDIO_PIPELINE_ERROR Handling in useHudStream', () => {
    it('verifies HudEvent supports sttStatus and SttStatusPayload contracts', () => {
      const event: HudEvent = {
        type: 'sttStatus',
        payload: {
          speaker: 'interlocutor',
          status: 'reconnecting',
          attempt: 3,
          retry_in_ms: 2000,
          message: 'Deepgram connection retry #3',
        },
      };

      expect(event.type).toBe('sttStatus');
      expect(event.payload.status).toBe('reconnecting');
      expect(event.payload.attempt).toBe(3);
      expect(event.payload.retry_in_ms).toBe(2000);
      expect(event.payload.message).toBe('Deepgram connection retry #3');
    });

    it('verifies useHudStream source code has sttStatus, AUDIO_PIPELINE_ERROR, and restartCapture', () => {
      const hookPath = path.resolve(__dirname, '../desktop/src/hooks/useHudStream.ts');
      const content = fs.readFileSync(hookPath, 'utf8');

      expect(content).toContain("case 'sttStatus':");
      expect(content).toContain('AUDIO_PIPELINE_ERROR');
      expect(content).toContain('restartCapture');
      expect(content).toContain('sttStatus');
    });

    it('verifies EyelineNotch and HudWindow render STT status badges and restart controls', () => {
      const notchPath = path.resolve(__dirname, '../desktop/src/hud/EyelineNotch.tsx');
      const notchContent = fs.readFileSync(notchPath, 'utf8');

      expect(notchContent).toContain("stt?.status === 'reconnecting'");
      expect(notchContent).toContain("stt?.status === 'failed'");
      expect(notchContent).toContain('Перепідключення STT');
      expect(notchContent).toContain('Збій STT');
      expect(notchContent).toContain('onRestartAudio');

      const splitPath = path.resolve(__dirname, '../desktop/src/hud/SplitChat.tsx');
      const splitContent = fs.readFileSync(splitPath, 'utf8');
      expect(splitContent).toContain("stt?.status === 'reconnecting'");
      expect(splitContent).toContain("stt?.status === 'failed'");
      expect(splitContent).toContain('nativeError');
      expect(splitContent).toContain('onRestartAudio');

      const hudPath = path.resolve(__dirname, '../desktop/src/hud/HudWindow.tsx');
      const hudContent = fs.readFileSync(hudPath, 'utf8');
      expect(hudContent).toContain('handleRestartAudio');
      expect(hudContent).toContain('session.stt');
      expect(hudContent).toContain('session.nativeError');
    });
  });

  describe('3. CSP for AudioWorklet and Single Source of Truth', () => {
    it('verifies tauri.conf.json allows AudioWorklet blob execution via worker-src and script-src', () => {
      const confPath = path.resolve(__dirname, '../desktop/src-tauri/tauri.conf.json');
      const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
      const csp: string = conf.app.security.csp;

      expect(csp).toContain("worker-src 'self' blob:");
      expect(csp).toContain("script-src 'self' blob:");
    });

    it('verifies desktop/src/index.html does not duplicate or conflict with tauri CSP', () => {
      const htmlPath = path.resolve(__dirname, '../desktop/src/index.html');
      const htmlContent = fs.readFileSync(htmlPath, 'utf8');

      // CSP meta tag must be removed so tauri.conf.json is the single source of truth
      expect(htmlContent).not.toContain('http-equiv="Content-Security-Policy"');
    });
  });

  describe('4. Electron Legacy Deprecation & Tauri Contracts', () => {
    it('verifies desktop/src/types/electron.d.ts is completely removed', () => {
      const electronTypesPath = path.resolve(__dirname, '../desktop/src/types/electron.d.ts');
      expect(fs.existsSync(electronTypesPath)).toBe(false);
    });

    it('verifies desktop/src/types/tauri.d.ts exists and exports DesktopMediaSource and GhostboardAPI', () => {
      const tauriTypesPath = path.resolve(__dirname, '../desktop/src/types/tauri.d.ts');
      expect(fs.existsSync(tauriTypesPath)).toBe(true);

      const content = fs.readFileSync(tauriTypesPath, 'utf8');
      expect(content).toContain('export interface DesktopMediaSource');
      expect(content).toContain('export interface GhostboardAPI');
      expect(content).toContain('interface Window');
    });
  });
});
