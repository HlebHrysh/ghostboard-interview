import { describe, it, expect } from 'vitest';
import {
  parseStructuredGhostboardOutput,
  stripTrailingPartialTags,
  mergeContinuationQuestion,
  buildGhostboardSystemPrompt,
  buildGhostboardUserPrompt,
} from '@/lib/aiPromptCore';
import {
  parseAnswer,
  cleanStreamText,
  stripQuestionContext,
} from '../desktop/src/lib/answerParser';

describe('AI Phase 4 Trap Shield & Continuation Merge Suite', () => {
  describe('Task 1: Predictive Follow-Up Trap Shield (<<<PHASE_4:TRAP>>>)', () => {
    const fullMockOutput = `<<<META: Backend | Senior | EN>>>
<<<PHASE_1:HOOK>>>
In production, I resolve distributed lock contention by implementing Redis Redlock with jittered exponential backoff.

<<<PHASE_2:PILLARS>>>
• **Consensus**: Acquire locks across odd-numbered Redis instances.
• **TTL Leases**: Set short leases refreshed via background heartbeats.
• **Fencing**: Attach monotonically increasing tokens to prevent out-of-order writes.

<<<PHASE_3:DEEP_DIVE>>>
\`\`\`typescript
const lock = await redlock.acquire(['resource_key'], 1000);
try {
  await processResource();
} finally {
  await lock.release();
}
\`\`\`

<<<PHASE_4:TRAP>>>
Q: How do you handle clock drift between Redis nodes invalidating the TTL lease?
A: We enforce NTP synchronization with maximum drift tolerance under 5ms and discount the drift delta from lock validity time.

<<<END>>>`;

    it('parses <<<PHASE_4:TRAP>>> in parseStructuredGhostboardOutput correctly', () => {
      const parsed = parseStructuredGhostboardOutput(fullMockOutput);

      expect(parsed.meta?.domain).toBe('Backend');
      expect(parsed.meta?.level).toBe('Senior');
      expect(parsed.hook).toContain('In production, I resolve distributed lock contention');
      expect(parsed.pillars).toHaveLength(3);
      expect(parsed.pillars[0]).toContain('Consensus');
      expect(parsed.deepDive).toContain('redlock.acquire');
      expect(parsed.deepDive).not.toContain('PHASE_4:TRAP');

      expect(parsed.followUpTrap).toBeDefined();
      expect(parsed.followUpTrap?.question).toBe(
        'How do you handle clock drift between Redis nodes invalidating the TTL lease?'
      );
      expect(parsed.followUpTrap?.answer).toBe(
        'We enforce NTP synchronization with maximum drift tolerance under 5ms and discount the drift delta from lock validity time.'
      );
    });

    it('returns undefined followUpTrap when Phase 4 is not in output', () => {
      const legacyOutput = `<<<META: DevOps | Lead/Staff | EN>>>
<<<PHASE_1:HOOK>>>
We implement zero-downtime rolling deploys with Kubernetes.
<<<PHASE_2:PILLARS>>>
• **Probes**: Configured readiness and liveness probes.
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`yaml
apiVersion: apps/v1
\`\`\`
<<<END>>>`;

      const parsed = parseStructuredGhostboardOutput(legacyOutput);
      expect(parsed.followUpTrap).toBeUndefined();
      expect(parsed.hook).toContain('zero-downtime rolling deploys');
    });

    it('parses Phase 4 in desktop parseAnswer and updates phase level to 4', () => {
      const parsed = parseAnswer(fullMockOutput);

      expect(parsed.mode).toBe('phased');
      expect(parsed.phase).toBe(4);
      expect(parsed.hook).toContain('In production, I resolve distributed lock contention');
      expect(parsed.pillars).toHaveLength(3);
      expect(parsed.deepDive).toContain('redlock.acquire');
      expect(parsed.deepDive).not.toContain('PHASE_4:TRAP');
      expect(parsed.followUpTrap).toBeDefined();
      expect(parsed.followUpTrap?.question).toContain('clock drift');
      expect(parsed.followUpTrap?.answer).toContain('NTP synchronization');
    });

    it('completely strips partial trailing tags without leaking raw brackets in stripTrailingPartialTags', () => {
      const base = 'Some streaming answer content';

      expect(stripTrailingPartialTags(`${base}\n<<<PHASE_4`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n<<<PHASE_4:TR`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n<<<PHASE_4:TRAP`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n<<<`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n<<`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n<`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n[D`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n[DONE`)).toBe(base);
      expect(stripTrailingPartialTags(`${base}\n<<<END>>>`)).toBe(base);
    });

    it('completely hides trailing partial tags in desktop cleanStreamText during streaming', () => {
      const streamed = 'Phase 1 hook words here.\n\nKey pillars here.';

      expect(cleanStreamText(`${streamed}\n<<<PHASE_4`)).toBe(streamed);
      expect(cleanStreamText(`${streamed}\n<<<PHASE_4:TR`)).toBe(streamed);
      expect(cleanStreamText(`${streamed}\n<<<PHASE_4:TRAP`)).toBe(streamed);
      expect(cleanStreamText(`${streamed}\n<<<`)).toBe(streamed);
      expect(cleanStreamText(`${streamed}\n<<`)).toBe(streamed);
      expect(cleanStreamText(`${streamed}\n<`)).toBe(streamed);
    });
  });

  describe('Task 2: Incremental Question Merge on Speaker Continuation', () => {
    it('merges pause continuation with ellipses prefix cleanly', () => {
      const prev = 'How would you design a rate limiter?';
      const cont = '...assuming we have 50 geo-distributed regions and no central Redis?';

      const result = mergeContinuationQuestion(prev, cont);

      expect(result.mergedQuestion).toBe(
        'How would you design a rate limiter, assuming we have 50 geo-distributed regions and no central Redis?'
      );
      expect(result.addedConstraint).toBe(
        'assuming we have 50 geo-distributed regions and no central Redis'
      );
    });

    it('merges comma and conjunction continuation cleanly', () => {
      const prev = 'Explain the difference between processes and threads.';
      const cont = ', but specifically regarding memory sharing?';

      const result = mergeContinuationQuestion(prev, cont);

      expect(result.mergedQuestion).toBe(
        'Explain the difference between processes and threads, but specifically regarding memory sharing?'
      );
      expect(result.addedConstraint).toBe('but specifically regarding memory sharing');
    });

    it('merges Cyrillic interview questions on continuation', () => {
      const prev = 'Як масштабувати веб-сервер?';
      const cont = '...якщо навантаження зросло у 100 разів?';

      const result = mergeContinuationQuestion(prev, cont);

      expect(result.mergedQuestion).toBe(
        'Як масштабувати веб-сервер, якщо навантаження зросло у 100 разів?'
      );
      expect(result.addedConstraint).toBe('якщо навантаження зросло у 100 разів');
    });

    it('handles empty previous or continuation inputs gracefully', () => {
      const emptyPrev = mergeContinuationQuestion('', '...assuming 50 regions?');
      expect(emptyPrev.mergedQuestion).toBe('...assuming 50 regions?');
      expect(emptyPrev.addedConstraint).toBe('assuming 50 regions');

      const emptyCont = mergeContinuationQuestion('What is Tokio?', '');
      expect(emptyCont.mergedQuestion).toBe('What is Tokio?');
      expect(emptyCont.addedConstraint).toBe('');
    });

    it('injects [CONTINUATION REFINEMENT] into buildGhostboardUserPrompt', () => {
      const userPrompt = buildGhostboardUserPrompt(
        'How would you design a rate limiter, assuming 50 regions?',
        undefined,
        'assuming 50 regions'
      );

      expect(userPrompt).toContain('CURRENT INTERVIEWER QUESTION:');
      expect(userPrompt).toContain(
        '[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: "assuming 50 regions"]'
      );
    });

    it('strips continuation refinement from question context in desktop stripQuestionContext', () => {
      const rawQuestion =
        'How would you design a rate limiter, assuming 50 regions?\n\n[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: "assuming 50 regions"]';

      const stripped = stripQuestionContext(rawQuestion);
      expect(stripped).toBe('How would you design a rate limiter, assuming 50 regions?');
    });
  });

  describe('Task 3: Micro-Explainer Mode (explain_line)', () => {
    it('generates micro-explainer instructions for modifier: explain_line', () => {
      const { systemPrompt } = buildGhostboardSystemPrompt({
        question: 'const x = useMemo(() => compute(), []);',
        modifier: 'explain_line',
      });

      expect(systemPrompt).toContain('MODIFIER: MICRO-EXPLAINER (EXPLAIN LINE)');
      expect(systemPrompt).toContain('concise 2-sentence spoken explanation of WHY');
      expect(systemPrompt).toContain('time and space complexity');
      expect(systemPrompt).toContain('<<<PHASE_4:TRAP>>>');
    });
  });
});
