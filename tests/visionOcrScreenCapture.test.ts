import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  captureScreen,
  setupWindowCompatibilityShim,
  isTauriEnvironment,
} from '../desktop/src/lib/tauriBridge';

describe('Milestone 3: Multimodal Vision OCR Screen Solver & Tauri Bridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (globalThis as any).window = globalThis;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).__TAURI_INTERNALS__;
    delete (globalThis as any).__TAURI__;
    delete (globalThis as any).isTauri;
    delete (globalThis as any).ghostboard;
    delete (globalThis as any).desktopAPI;
    delete (globalThis as any).window;
  });

  describe('1. Native Screen Capture Bridge (tauriBridge.ts)', () => {
    it('returns a valid fallback PNG with dimensions in non-Tauri browser/test mode', async () => {
      expect(isTauriEnvironment()).toBe(false);
      const res = await captureScreen();
      expect(res).not.toBeNull();
      expect(res?.width).toBe(1920);
      expect(res?.height).toBe(1080);
      expect(res?.base64Png).toBeTruthy();
      expect(typeof res?.base64Png).toBe('string');
      // Valid base64
      const buffer = Buffer.from(res!.base64Png, 'base64');
      // PNG magic bytes
      expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    });

    it('invokes native capture_screen command when in Tauri environment', async () => {
      (globalThis as any).window = globalThis;
      (globalThis as any).__TAURI_INTERNALS__ = {
        invoke: vi.fn().mockResolvedValue({
          base64_png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          width: 2560,
          height: 1440,
        }),
      };
      expect(isTauriEnvironment()).toBe(true);

      const res = await captureScreen();
      expect(res).not.toBeNull();
      expect(res?.width).toBe(2560);
      expect(res?.height).toBe(1440);
      expect(res?.base64Png).toContain('iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB');
      expect((globalThis as any).__TAURI_INTERNALS__.invoke).toHaveBeenCalledWith(
        'capture_screen',
        {},
        undefined
      );
    });

    it('handles capture_screen invocation error gracefully without unhandled rejection', async () => {
      (globalThis as any).__TAURI_INTERNALS__ = {
        invoke: vi.fn().mockRejectedValue(new Error('Hardware display capture denied by OS portal')),
      };
      expect(isTauriEnvironment()).toBe(true);

      const res = await captureScreen();
      expect(res).toBeNull();
    });

    it('registers captureScreen on window.ghostboard and window.desktopAPI compatibility shims', () => {
      setupWindowCompatibilityShim();
      const g = globalThis as any;
      expect(typeof g.ghostboard?.captureScreen).toBe('function');
      expect(typeof g.desktopAPI?.captureScreen).toBe('function');
    });
  });

  describe('2. Multimodal Vision OCR Synthesis & Response Parsing', () => {
    it('formats OCR response into structured 3-phase teleprompter output', () => {
      const mockVisionResponse = {
        success: true,
        codeFound: true,
        language: 'TypeScript',
        topic: 'Two Sum with Monotonic Deque',
        summary: 'Оптимальний підхід використовує монотонний двосторонній черговий буфер для досягнення лінійної складності.',
        quickAnswer: 'Використовуємо монотонну чергу для збереження індексів екстремумів у межах ковзного вікна за O(N).',
        complexity: 'Time: O(N), Space: O(K)',
        hints: [
          'Зберігайте індекси елементів у порядку спадання значень',
          'Видаляйте елементи, що вийшли за межі поточного вікна',
          'Максимум поточного вікна завжди на початку деки',
        ],
        codeSnippet: 'function maxSlidingWindow(nums: number[], k: number): number[] {\n  const q: number[] = [];\n  return [];\n}',
        deliveryTip: 'Почніть із пояснення, чому наївний підхід за O(N*K) є неефективним на великих масивах.',
        bugsAndFlaws: ['Можливе переповнення індексів при k > nums.length', 'Порожній вхідний масив потребує ранньої перевірки'],
        howToImprove: ['Використати TypedArray Int32Array для оптимізації GC у V8'],
      };

      // Construct Deep Dive
      const deepDiveSections: string[] = [];
      if (mockVisionResponse.summary && mockVisionResponse.summary !== mockVisionResponse.quickAnswer) {
        deepDiveSections.push(mockVisionResponse.summary);
      }
      if (mockVisionResponse.codeSnippet) {
        deepDiveSections.push(`### Рефакторинг та оптимізований код\n\`\`\`typescript\n${mockVisionResponse.codeSnippet}\n\`\`\``);
      }
      if (mockVisionResponse.bugsAndFlaws.length > 0) {
        deepDiveSections.push(`### Знайдені нюанси та граничні випадки\n${mockVisionResponse.bugsAndFlaws.map((b) => `- ${b}`).join('\n')}`);
      }
      if (mockVisionResponse.howToImprove.length > 0) {
        deepDiveSections.push(`### Покращення та оптимізація\n${mockVisionResponse.howToImprove.map((i) => `- ${i}`).join('\n')}`);
      }
      if (mockVisionResponse.deliveryTip) {
        deepDiveSections.push(`### Delivery Tip\n> ${mockVisionResponse.deliveryTip}`);
      }

      const deepDiveText = deepDiveSections.join('\n\n');

      expect(deepDiveText).toContain('### Рефакторинг та оптимізований код');
      expect(deepDiveText).toContain('function maxSlidingWindow');
      expect(deepDiveText).toContain('### Знайдені нюанси та граничні випадки');
      expect(deepDiveText).toContain('### Delivery Tip');

      // Verify pillars construction
      const pillars = [
        `Складність: ${mockVisionResponse.complexity}`,
        mockVisionResponse.hints[0],
        mockVisionResponse.hints[1],
      ];
      expect(pillars).toHaveLength(3);
      expect(pillars[0]).toBe('Складність: Time: O(N), Space: O(K)');
    });
  });
});
