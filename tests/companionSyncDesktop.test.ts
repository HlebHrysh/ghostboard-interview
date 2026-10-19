import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateSessionId,
  generatePairingToken,
  formatCompanionUrl,
  formatSyncPayload,
  convertStructuredAnswerToCompanionQA,
  formatSingleQAClipboardText,
  formatMarkdownExport,
  copyToClipboard,
  requestPairingSession,
  sendCompanionSync,
  CompanionSyncManager,
  CompanionQAItem,
  InterviewSyncPayload,
} from '../desktop/src/lib/companionSync';
import type { StructuredAnswerOutput } from '../desktop/src/lib/streamClient';
import type { SessionQAItem } from '../desktop/src/components/HistoryDrawer';

describe('Milestone 5: Mobile Companion Sync & Session History (Desktop)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Companion QR URL Generation
  // =========================================================================
  describe('1. Companion QR URL Generation', () => {
    it('formats standard companion URL with serverBaseUrl, sessionId, and pairingToken', () => {
      const url = formatCompanionUrl(
        'http://localhost:3001',
        'sess_12345',
        'pair_token_abc'
      );
      expect(url).toBe('http://localhost:3001/companion/sess_12345?token=pair_token_abc');
    });

    it('strips trailing slashes from serverBaseUrl cleanly', () => {
      const urlWithSlash = formatCompanionUrl(
        'https://ghostboard.ai///',
        'sess_room_99',
        'token_secret'
      );
      expect(urlWithSlash).toBe('https://ghostboard.ai/companion/sess_room_99?token=token_secret');
    });

    it('falls back to sessionId when pairingToken is omitted', () => {
      const url = formatCompanionUrl('http://192.168.1.105:3001', 'sess_auto_token');
      expect(url).toBe('http://192.168.1.105:3001/companion/sess_auto_token?token=sess_auto_token');
    });

    it('properly URL-encodes special characters in sessionId and pairingToken', () => {
      const url = formatCompanionUrl(
        'http://localhost:3001',
        'sess user#1?ready',
        'token&key=val+x'
      );
      expect(url).toBe(
        'http://localhost:3001/companion/sess%20user%231%3Fready?token=token%26key%3Dval%2Bx'
      );
    });

    it('defaults to localhost:3001 if serverBaseUrl is empty', () => {
      const url = formatCompanionUrl('', 'sess_empty_base', 'token_123');
      expect(url).toBe('http://localhost:3001/companion/sess_empty_base?token=token_123');
    });
  });

  // =========================================================================
  // 2. Pairing Token & Session ID Generation Logic
  // =========================================================================
  describe('2. Pairing Token & Session ID Logic', () => {
    it('generates unique session IDs with prefix and timestamp component', () => {
      const sId = generateSessionId();
      expect(sId).toMatch(/^sess_[a-z0-9]+_[a-z0-9]+$/);

      const customPrefix = generateSessionId('interview');
      expect(customPrefix).toMatch(/^interview_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('generates secure pairing tokens with high entropy', () => {
      const token1 = generatePairingToken();
      const token2 = generatePairingToken();

      expect(token1).toMatch(/^pair_[a-z0-9]+_[a-z0-9]+$/);
      expect(token2).toMatch(/^pair_[a-z0-9]+_[a-z0-9]+$/);
      expect(token1).not.toBe(token2);
    });

    it('guarantees zero collisions across 500 consecutive generated tokens', () => {
      const generated = new Set<string>();
      for (let i = 0; i < 500; i++) {
        const token = generatePairingToken();
        expect(generated.has(token)).toBe(false);
        generated.add(token);
      }
      expect(generated.size).toBe(500);
    });

    it('requests pairing session from /api/companion/pair with bearer authorization', async () => {
      const mockResponse = {
        success: true,
        token: 'dev_sess_token_999',
        companionUrl: 'http://localhost:3001/companion/dev_sess_token_999?token=dev_sess_token_999',
        desktopDeepLink: 'ghostboard://pair?token=dev_sess_token_999',
        expiresAt: Date.now() + 86400000,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      (globalThis as any).fetch = mockFetch;

      const result = await requestPairingSession(
        'http://localhost:3001',
        'auth-token-jwt-mock'
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe('dev_sess_token_999');
      expect(result.companionUrl).toContain('/companion/dev_sess_token_999');
      expect(result.desktopDeepLink).toBe('ghostboard://pair?token=dev_sess_token_999');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/companion/pair',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer auth-token-jwt-mock',
            'x-ghostboard-client': 'desktop-app',
          }),
        })
      );
    });

    it('falls back gracefully to offline pairing session when server request fails', async () => {
      (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const result = await requestPairingSession('http://localhost:3001');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.companionUrl).toMatch(/^http:\/\/localhost:3001\/companion\/sess_/);
    });
  });

  // =========================================================================
  // 3. Real-Time Companion State Sync Payload Formatting
  // =========================================================================
  describe('3. Real-Time Companion Sync Payload Formatting', () => {
    it('converts Desktop StructuredAnswerOutput to CompanionQAItem schema', () => {
      const answer: StructuredAnswerOutput = {
        hook: 'Clean Architecture guarantees strict isolation of domain entities.',
        pillars: [
          'Domain entities have zero external dependencies',
          'Use cases orchestrate business transactions',
          'Adapters implement interfaces defined by domain',
        ],
        deepDive: '```typescript\nclass ProcessOrderUseCase {\n  execute() {}\n}\n```',
        rawText: '...',
        ttftMs: 250,
        totalDurationMs: 450,
        model: 'Gemini 3.8 Flash',
      };

      const qa = convertStructuredAnswerToCompanionQA(
        'How does Clean Architecture structure dependencies?',
        answer,
        'qa_arch_1'
      );

      expect(qa.id).toBe('qa_arch_1');
      expect(qa.question).toBe('How does Clean Architecture structure dependencies?');
      expect(qa.startHook).toBe('Clean Architecture guarantees strict isolation of domain entities.');
      expect(qa.quickAnswer).toBe('Clean Architecture guarantees strict isolation of domain entities.');
      expect(qa.hints).toHaveLength(3);
      expect(qa.hints?.[0]).toContain('Domain entities');
      expect(qa.codeSnippet).toContain('class ProcessOrderUseCase');
      expect(qa.timestamp).toBeGreaterThan(0);
    });

    it('converts null answer to valid placeholder CompanionQAItem', () => {
      const qa = convertStructuredAnswerToCompanionQA('What is an Event Loop?', null);
      expect(qa.id).toMatch(/^qa_/);
      expect(qa.question).toBe('What is an Event Loop?');
      expect(qa.quickAnswer).toBe('Формулюю відповідь...');
      expect(qa.hints).toEqual([]);
    });

    it('formats ADD_OR_UPDATE_QA sync payload correctly', () => {
      const qaItem: CompanionQAItem = {
        id: 'qa_sync_1',
        question: 'Explain PostgreSQL MVCC',
        quickAnswer: 'Multi-Version Concurrency Control stores tuple versions with xmin and xmax.',
      };

      const payload = formatSyncPayload('ADD_OR_UPDATE_QA', {
        qa: qaItem,
        activeId: qaItem.id,
      });

      expect(payload.action).toBe('ADD_OR_UPDATE_QA');
      expect(payload.qa).toEqual(qaItem);
      expect(payload.activeId).toBe('qa_sync_1');
    });

    it('formats STATUS sync payload correctly', () => {
      const payload = formatSyncPayload('STATUS', {
        isCapturing: true,
        isFrozen: false,
        isPanic: false,
      });

      expect(payload.action).toBe('STATUS');
      expect(payload.isCapturing).toBe(true);
      expect(payload.isFrozen).toBe(false);
      expect(payload.isPanic).toBe(false);
    });

    it('formats FREEZE_TOGGLE and defaults isFrozen to true if unspecified', () => {
      const payloadDefault = formatSyncPayload('FREEZE_TOGGLE');
      expect(payloadDefault.action).toBe('FREEZE_TOGGLE');
      expect(payloadDefault.isFrozen).toBe(true);

      const payloadExplicit = formatSyncPayload('FREEZE_TOGGLE', { isFrozen: false });
      expect(payloadExplicit.isFrozen).toBe(false);
    });

    it('formats PANIC_TOGGLE and defaults isPanic to true if unspecified', () => {
      const payloadDefault = formatSyncPayload('PANIC_TOGGLE');
      expect(payloadDefault.action).toBe('PANIC_TOGGLE');
      expect(payloadDefault.isPanic).toBe(true);

      const payloadExplicit = formatSyncPayload('PANIC_TOGGLE', { isPanic: false });
      expect(payloadExplicit.isPanic).toBe(false);
    });

    it('sends companion sync POST request to /api/ai/interview-sync', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      (globalThis as any).fetch = mockFetch;

      const payload: InterviewSyncPayload = {
        action: 'STATUS',
        isCapturing: true,
      };

      const success = await sendCompanionSync(
        'http://localhost:3001',
        payload,
        'bearer-token-123'
      );

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/ai/interview-sync',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer bearer-token-123',
            'x-ghostboard-client': 'desktop-app',
          }),
          body: JSON.stringify(payload),
        })
      );
    });

    it('sendCompanionSync returns false safely without throwing on network failure', async () => {
      (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const payload = formatSyncPayload('FREEZE_TOGGLE', { isFrozen: true });
      const success = await sendCompanionSync('http://localhost:3001', payload);

      expect(success).toBe(false);
    });

    it('CompanionSyncManager debounces rapid streaming updates and syncs final immediately', async () => {
      vi.useFakeTimers();
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      (globalThis as any).fetch = mockFetch;

      const manager = new CompanionSyncManager('http://localhost:3001', 'token-abc');

      const answerInterim1: StructuredAnswerOutput = {
        hook: 'Step 1...',
        pillars: [],
        deepDive: '',
        rawText: '',
        ttftMs: 120,
        totalDurationMs: 200,
        model: 'Gemini 3.8 Flash',
      };
      const answerInterim2: StructuredAnswerOutput = {
        hook: 'Step 1 and Step 2...',
        pillars: ['P1'],
        deepDive: '',
        rawText: '',
        ttftMs: 140,
        totalDurationMs: 250,
        model: 'Gemini 3.8 Flash',
      };
      const answerFinal: StructuredAnswerOutput = {
        hook: 'Final answer with complete breakdown.',
        pillars: ['P1', 'P2', 'P3'],
        deepDive: 'code',
        rawText: '',
        ttftMs: 150,
        totalDurationMs: 450,
        model: 'Gemini 3.8 Flash',
      };

      // 1. Send interim stream tokens in rapid succession
      manager.syncQA('Question 1', answerInterim1, false);
      manager.syncQA('Question 1', answerInterim2, false);

      // Rapid streaming is debounced, should not have fired yet
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance clock by 800ms
      vi.advanceTimersByTime(800);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 2. Finalized answer triggers immediately
      manager.syncQA('Question 1', answerFinal, true);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  // =========================================================================
  // 4. Clipboard Copy Operations & Markdown Formatting
  // =========================================================================
  describe('4. Clipboard Copy Operations & Formatting', () => {
    it('formats single QA item into clean Markdown text for clipboard copying', () => {
      const qaItem: SessionQAItem = {
        id: 'qa_1',
        question: 'What are B-Tree indexes in PostgreSQL?',
        answer: {
          hook: 'B-Trees provide balanced O(log N) search and range scans.',
          pillars: [
            'Keeps keys sorted in leaf pages',
            'Supports equality and range comparisons (<, <=, =, >=, >)',
            'Page split overhead on heavy random insertions',
          ],
          deepDive: '```sql\nCREATE INDEX idx_user_email ON users USING btree(email);\n```',
          rawText: '',
          ttftMs: 120,
          totalDurationMs: 300,
          model: 'Gemini 3.8 Flash',
        },
        timestamp: Date.now(),
      };

      const formatted = formatSingleQAClipboardText(qaItem);

      expect(formatted).toContain('### What are B-Tree indexes in PostgreSQL?');
      expect(formatted).toContain('> **Spoken Hook:**');
      expect(formatted).toContain('"B-Trees provide balanced O(log N) search and range scans."');
      expect(formatted).toContain('**Ключові тези:**');
      expect(formatted).toContain('- Keeps keys sorted in leaf pages');
      expect(formatted).toContain('CREATE INDEX idx_user_email');
    });

    it('formats entire interview session history into complete Markdown debrief', () => {
      const items: SessionQAItem[] = [
        {
          id: 'qa_1',
          question: 'Question One',
          answer: {
            hook: 'Answer One Hook',
            pillars: ['Pillar 1A', 'Pillar 1B'],
            deepDive: 'Code snippet 1',
            rawText: '',
            ttftMs: 100,
            totalDurationMs: 250,
            model: 'Gemini 3.8 Flash',
          },
          timestamp: 1700000000000,
        },
        {
          id: 'qa_2',
          question: 'Question Two',
          answer: {
            hook: 'Answer Two Hook',
            pillars: ['Pillar 2A'],
            deepDive: '',
            rawText: '',
            ttftMs: 110,
            totalDurationMs: 280,
            model: 'Gemini 3.8 Flash',
          },
          timestamp: 1700000010000,
        },
      ];

      const report = formatMarkdownExport('Senior Systems Engineer', items);

      expect(report).toContain('# Звіт Технічної Співбесіди — Ghostboard AI');
      expect(report).toContain('**Сесія:** Senior Systems Engineer');
      expect(report).toContain('**Кількість запитань:** 2');
      expect(report).toContain('### 1. Question One');
      expect(report).toContain('"Answer One Hook"');
      expect(report).toContain('- Pillar 1A');
      expect(report).toContain('### 2. Question Two');
      expect(report).toContain('## 2. Проект Follow-up Листа Співрозмовнику (Thank You Email)');
      expect(report).toContain('Тема: Дякую за технічну співбесіду');
    });

    it('copies text to clipboard via navigator.clipboard.writeText and returns true', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        configurable: true,
        writable: true,
      });

      const result = await copyToClipboard('Markdown report text content');

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('Markdown report text content');
    });

    it('returns false safely when text is empty', async () => {
      const result = await copyToClipboard('');
      expect(result).toBe(false);
    });

    it('falls back safely to execCommand when navigator.clipboard fails', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));
      const mockExecCommand = vi.fn().mockReturnValue(true);

      const mockBody = {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      };

      Object.defineProperty(globalThis.navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        configurable: true,
        writable: true,
      });

      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue({
          style: {},
          focus: vi.fn(),
          select: vi.fn(),
        }),
        body: mockBody,
        execCommand: mockExecCommand,
      };

      const result = await copyToClipboard('Fallback clipboard text');

      expect(result).toBe(true);
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
      expect(mockBody.appendChild).toHaveBeenCalled();
      expect(mockBody.removeChild).toHaveBeenCalled();
    });
  });
});
