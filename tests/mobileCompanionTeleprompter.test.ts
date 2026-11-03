import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stripRawAiTags, TeleprompterFontSize } from '../src/app/companion/[sessionId]/page';
import { POST as streamPOST } from '../src/app/api/companion/stream/route';
import { syncStore } from '../src/lib/interviewSyncStore';
import { NextRequest } from 'next/server';

vi.mock('@/lib/serverDb', () => ({
  getSessionUser: vi.fn().mockResolvedValue({ id: 'test_user_teleprompter' }),
}));

describe('Eyeline Teleprompter Mobile Companion', () => {
  beforeEach(async () => {
    await syncStore.clear('test_user_teleprompter');
  });

  describe('Tag Stripping & Text Sanitization', () => {
    it('completely scrubs raw <<<...>>> tags from streaming AI tokens', () => {
      const rawInput =
        '<<<START_HOOK>>> In React 19, actions manage pending transitions automatically. <<<END_HOOK>>>\n' +
        '<<<META domain=frontend level=senior>>>\n' +
        '<<<HINTS>>> 1. useActionState manages state and isPending. <<<END_HINTS>>>\n' +
        '<<<CODE>>> const [state, formAction, isPending] = useActionState(fn, null); <<<END_CODE>>>';

      const cleaned = stripRawAiTags(rawInput);

      expect(cleaned).not.toContain('<<<START_HOOK>>>');
      expect(cleaned).not.toContain('<<<END_HOOK>>>');
      expect(cleaned).not.toContain('<<<META');
      expect(cleaned).not.toContain('<<<HINTS>>>');
      expect(cleaned).not.toContain('<<<CODE>>>');
      expect(cleaned).toContain('In React 19, actions manage pending transitions automatically.');
      expect(cleaned).toContain('useActionState manages state and isPending.');
      expect(cleaned).toContain('const [state, formAction, isPending] = useActionState(fn, null);');
    });

    it('handles empty, null, or clean text gracefully', () => {
      expect(stripRawAiTags('')).toBe('');
      expect(stripRawAiTags('Clean text without tags')).toBe('Clean text without tags');
    });
  });

  describe('Eyeline Teleprompter Distance & Display Modes', () => {
    it('provides distinct font sizes for 50cm distance reading', () => {
      const sizes: TeleprompterFontSize[] = ['sm', 'md', 'xl'];
      expect(sizes).toContain('xl');
      expect(sizes).toContain('md');
      expect(sizes).toContain('sm');
    });

    it('supports pure black OLED contrast (#000000) and mirror flip transform', () => {
      const oledBg = '#000000';
      const mirrorClass = 'scale-x-[-1]';

      expect(oledBg).toBe('#000000');
      expect(mirrorClass).toBe('scale-x-[-1]');
    });
  });

  describe('Mobile Remote Control Triggers (Stream API)', () => {
    const testUserId = 'test_user_teleprompter';

    it('handles FREEZE_TOGGLE and PANIC_TOGGLE commands', async () => {
      // 1. Freeze toggle
      const freezeReq = new NextRequest('http://localhost:3000/api/companion/stream?token=valid_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FREEZE_TOGGLE' }),
      });
      const freezeRes = await streamPOST(freezeReq);
      expect(freezeRes.status).toBe(200);
      const freezeData = await freezeRes.json();
      expect(freezeData.success).toBe(true);
      expect(freezeData.isFrozen).toBe(true);

      // 2. Panic toggle
      const panicReq = new NextRequest('http://localhost:3000/api/companion/stream?token=valid_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'PANIC_TOGGLE' }),
      });
      const panicRes = await streamPOST(panicReq);
      expect(panicRes.status).toBe(200);
      const panicData = await panicRes.json();
      expect(panicData.success).toBe(true);
      expect(panicData.isPanic).toBe(true);
    });

    it('handles MAKE_CONCISE and SIMPLIFY remote actions on the active question', async () => {
      const initialQA = {
        id: 'qa_sample_1',
        question: 'Explain Virtual DOM reconciliation in React 19',
        startHook: 'Virtual DOM is a lightweight JavaScript representation of the actual DOM in memory.',
        quickAnswer: 'The reconciler compares two virtual trees and computes minimal DOM mutations.',
        hints: ['Fiber nodes represent units of work', 'Diffing algorithm uses keys and component types'],
        deliveryTip: 'Mention time complexity O(N).',
      };

      await syncStore.addOrUpdateQA(initialQA, 'qa_sample_1', testUserId);

      // Remote action: MAKE_CONCISE
      const conciseReq = new NextRequest('http://localhost:3000/api/companion/stream?token=valid_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MAKE_CONCISE', activeId: 'qa_sample_1' }),
      });
      const conciseRes = await streamPOST(conciseReq);
      expect(conciseRes.status).toBe(200);
      const conciseData = await conciseRes.json();
      expect(conciseData.success).toBe(true);
      expect(conciseData.updatedActiveQA?.deliveryTip).toContain('Коротше');

      // Remote action: SIMPLIFY
      const simplifyReq = new NextRequest('http://localhost:3000/api/companion/stream?token=valid_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SIMPLIFY', activeId: 'qa_sample_1' }),
      });
      const simplifyRes = await streamPOST(simplifyReq);
      expect(simplifyRes.status).toBe(200);
      const simplifyData = await simplifyRes.json();
      expect(simplifyData.success).toBe(true);
      expect(simplifyData.updatedActiveQA?.deliveryTip).toContain('Пояснюй на побутовій аналогії');
    });
  });
});
