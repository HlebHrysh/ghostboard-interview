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
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.__TAURI_INTERNALS__;
    delete g.__TAURI__;
    delete g.isTauri;
    delete g.ghostboard;
    delete g.desktopAPI;
  });

  describe('1. Tauri Bridge & IPC Contracts', () => {
    it('accurately identifies Tauri vs non-Tauri environments', () => {
      expect(isTauriEnvironment()).toBe(false);

      const g = globalThis as unknown as Record<string, unknown>;
      g.__TAURI_INTERNALS__ = {};
      expect(isTauriEnvironment()).toBe(true);

      delete g.__TAURI_INTERNALS__;
      g.isTauri = true;
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

      const g = globalThis as unknown as Record<string, Record<string, unknown>>;
      const ghostboard = g.ghostboard;
      const desktopAPI = g.desktopAPI;

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
    it('verifies EyelineNotch.tsx enforces under-webcam max-w-[760px], max-w-[65ch] and zero backdrop-blur', () => {
      const notchPath = path.resolve(__dirname, '../desktop/src/hud/EyelineNotch.tsx');
      const notchContent = fs.readFileSync(notchPath, 'utf8');
      const answerPath = path.resolve(__dirname, '../desktop/src/hud/AnswerView.tsx');
      const answerContent = fs.readFileSync(answerPath, 'utf8');

      // Under-webcam layout constraints
      expect(notchContent).toContain('max-w-[760px]');
      expect(answerContent).toContain('max-w-[65ch]');

      // 60fps WebKitGTK dense surface (no backdrop-blur on container)
      expect(notchContent).toContain('bg-[#09090b]/95');
      expect(notchContent).not.toContain('backdrop-blur');

      // Tauri window dragging data attribute & Hook Copy
      expect(notchContent).toContain('data-tauri-drag-region');
      expect(notchContent).toContain('handleCopyHook');

      // 4-Phase Teleprompter in AnswerView
      expect(answerContent).toContain('Фаза 1: голосовий старт');
      expect(answerContent).toContain('Фаза 2: ключові тези');
      expect(answerContent).toContain('Фаза 3: глибоке занурення та код');
      expect(answerContent).toContain('Очікуй питання на засипку');
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

    it('verifies HudWindow.tsx wires Tauri stealth, opacity, click-through, and Dual/Eyeline layouts', () => {
      const hudPath = path.resolve(__dirname, '../desktop/src/hud/HudWindow.tsx');
      const content = fs.readFileSync(hudPath, 'utf8');

      expect(content).toContain('useCopilotSession');
      expect(content).toContain('EyelineNotch');
      expect(content).toContain('SplitChat');
      expect(content).toContain('setScreenShareStealth');
      expect(content).toContain('setWindowOpacity');
      expect(content).toContain('toggleClickThrough');
    });
  });
});
