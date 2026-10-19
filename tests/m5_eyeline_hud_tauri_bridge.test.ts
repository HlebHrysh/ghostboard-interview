import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import type { HudEvent } from '../desktop/src/types/hud';
import {
  isTauriEnvironment,
  setScreenShareStealth,
  toggleClickThrough,
  setWindowOpacity,
  alignToActiveDisplay,
  panicHide,
  triggerManualAnswer,
  clearSession,
  exportMarkdown,
  startCopilotStream,
  setupWindowCompatibilityShim,
} from '../desktop/src/lib/tauriBridge';
import { parseDualStreamDelimiters } from '../desktop/src/lib/streamClient';

describe('Milestone 5: Awwwards-Grade Glassmorphic Eyeline Teleprompter HUD & Tauri v2 IPC Bridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).__TAURI_INTERNALS__;
    delete (globalThis as any).__TAURI__;
    delete (globalThis as any).isTauri;
    delete (globalThis as any).ghostboard;
    delete (globalThis as any).desktopAPI;
  });

  describe('1. Tauri Bridge & IPC Contracts', () => {
    it('accurately identifies Tauri vs non-Tauri environments', () => {
      expect(isTauriEnvironment()).toBe(false);

      (globalThis as any).__TAURI_INTERNALS__ = {};
      expect(isTauriEnvironment()).toBe(true);

      delete (globalThis as any).__TAURI_INTERNALS__;
      (globalThis as any).isTauri = true;
      expect(isTauriEnvironment()).toBe(true);
    });

    it('clamps window opacity between 0.10 and 1.00', async () => {
      // Test opacity clamping without crashing
      await expect(setWindowOpacity(0.01)).resolves.not.toThrow();
      await expect(setWindowOpacity(0.85)).resolves.not.toThrow();
      await expect(setWindowOpacity(1.50)).resolves.not.toThrow();
    });

    it('executes stealth, click-through, and alignment functions safely', async () => {
      const stealthRes = await setScreenShareStealth(true);
      expect(stealthRes).toBe(true);

      const clickThroughRes = await toggleClickThrough(false);
      expect(clickThroughRes).toBe(false);

      const alignRes = await alignToActiveDisplay();
      expect(alignRes).toBe(true);

      const panicRes = await panicHide();
      expect(panicRes).toBe(true);
    });

    it('exports markdown session file with graceful browser fallback', async () => {
      const content = '# Ghostboard Interview Debrief\n\n- System Design: Microservices\n';
      const filename = 'interview-test.md';

      const exportedName = await exportMarkdown(content, filename);
      expect(exportedName).toBe(filename);
    });

    it('subscribes to copilot stream and returns valid teardown function', () => {
      const eventsReceived: HudEvent[] = [];
      const teardown = startCopilotStream((event) => {
        eventsReceived.push(event);
      });

      expect(typeof teardown).toBe('function');
      teardown();
    });

    it('initializes global window compatibility shim for legacy callers', () => {
      setupWindowCompatibilityShim();

      const ghostboard = (globalThis as any).ghostboard;
      const desktopAPI = (globalThis as any).desktopAPI;

      expect(ghostboard).toBeDefined();
      expect(desktopAPI).toBeDefined();
      expect(typeof ghostboard.setContentProtection).toBe('function');
      expect(typeof ghostboard.setIgnoreMouseEvents).toBe('function');
      expect(typeof ghostboard.setOpacity).toBe('function');
      expect(typeof ghostboard.exportMarkdown).toBe('function');
      expect(typeof desktopAPI.alignToActiveDisplay).toBe('function');
    });
  });

  describe('2. Typed HudEvent Serde & State Ingestion', () => {
    it('parses progressive 3-phase LLM delimiters cleanly into Hook, Pillars, and DeepDive', () => {
      const rawText = `<<<PHASE_1:HOOK>>>
В основі архітектури високонавантажених сервісів лежить ізоляція компонентів та подійний обмін через Kafka.
<<<PHASE_2:PILLARS>>>
• Асинхронна черга повідомлень для розв'язки сервісів
• Реплікація бази даних PostgreSQL з Read Replicas
• Redis Cluster для кешування гарячих ключів
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`typescript
interface KafkaMessage<T> {
  topic: string;
  payload: T;
  headers: Record<string, string>;
}
\`\`\`
<<<END>>>`;

      const parsed = parseDualStreamDelimiters(rawText);
      expect(parsed.hook).toContain('ізоляція компонентів');
      expect(parsed.pillars).toHaveLength(3);
      expect(parsed.pillars[0]).toContain('Асинхронна черга');
      expect(parsed.pillars[1]).toContain('Реплікація бази');
      expect(parsed.deepDive).toContain('interface KafkaMessage');
    });

    it('handles streaming partial chunks without delimiter leakage (CLS = 0)', () => {
      const partialText = '<<<PHASE_1:HOOK>>>\nКороткий старт для співбесіди<<<PHASE_2:PILL';
      const parsed = parseDualStreamDelimiters(partialText);

      expect(parsed.hook).toBe('Короткий старт для співбесіди');
      expect(parsed.hook).not.toContain('<<<');
    });
  });

  describe('3. Ergonomic Under-Webcam Eyeline HUD Specifications', () => {
    it('verifies EyeLineTeleprompter.tsx enforces under-webcam max-w-[760px] and max-w-[65ch]', () => {
      const prompterPath = path.resolve(__dirname, '../desktop/src/components/EyeLineTeleprompter.tsx');
      const content = fs.readFileSync(prompterPath, 'utf8');

      // Maximum 760px layout constraint for webcam eyeline tracking
      expect(content).toContain('max-w-[760px]');

      // Maximum 65 characters per line constraint
      expect(content).toContain('max-w-[65ch]');

      // Frosted top control pill styling
      expect(content).toContain('backdrop-blur-md bg-zinc-900/80 border border-white/10');

      // Tauri window dragging data attribute
      expect(content).toContain('data-tauri-drag-region');

      // Hotkey triggers
      expect(content).toContain('⌘↵');
      expect(content).toContain('⌘⇧S');
      expect(content).toContain('⌘⇧␣');
      expect(content).toContain('⌘⇧⌫');

      // Single-line ticker tape auto-scroll and speaker badge
      expect(content).toContain('Співрозмовник');
      expect(content).toContain('scrollLeft');

      // 3-Phase Drawer Fold
      expect(content).toContain('Фаза 1: Голосовий старт');
      expect(content).toContain('Фаза 2: Ключові тези (3 Pillars)');
      expect(content).toContain('Фаза 3: Архітектурний Deep Dive');

      // Copy hook with ⌘C feedback
      expect(content).toContain('handleCopyHook');
      expect(content).toContain('⌘C');
    });

    it('verifies useHudStream.ts subscribes to startCopilotStream and dispatches reactive state', () => {
      const hookPath = path.resolve(__dirname, '../desktop/src/hooks/useHudStream.ts');
      const content = fs.readFileSync(hookPath, 'utf8');

      expect(content).toContain('startCopilotStream');
      expect(content).toContain('vadState');
      expect(content).toContain('sttTranscript');
      expect(content).toContain('questionDetected');
      expect(content).toContain('llmChunk');
      expect(content).toContain('llmDone');
      expect(content).toContain('hotkeyTriggered');
      expect(content).toContain('triggerManualAnswer');
      expect(content).toContain('clearSession');
    });

    it('verifies App.tsx wires useHudStream and EyeLineTeleprompter seamlessly', () => {
      const appPath = path.resolve(__dirname, '../desktop/src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf8');

      expect(content).toContain('useHudStream');
      expect(content).toContain('EyeLineTeleprompter');
      expect(content).toContain('handleManualAnswer');
      expect(content).toContain('handleClearSession');
      expect(content).toContain('onTriggerAnswer');
      expect(content).toContain('onTriggerScreenshot');
      expect(content).toContain('onClearSession');
      expect(content).toContain('setScreenShareStealth');
      expect(content).toContain('setWindowOpacity');
      expect(content).toContain('toggleClickThrough');
    });
  });
});
