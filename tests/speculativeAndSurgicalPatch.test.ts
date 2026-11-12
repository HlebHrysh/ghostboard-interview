import { describe, expect, it } from 'vitest';
import {
  computeIntentOverlap,
  isSpeculativeHookValid,
  mergeSurgicalAnswerSlots,
  resolvePatchSlotForModifier,
  serializeMergedSlotsToTaggedStream,
  tokenizeSignificantWords,
  type StructuredAnswerSlots,
} from '@/lib/speculativeSlotEngine';
import {
  buildGhostboardSystemPrompt,
  getMaxOutputTokensForPatchSlot,
  parseStructuredGhostboardOutput,
} from '@/lib/aiPromptCore';
import {
  mergeRawAnswerWithSlotPatch,
  parseAnswer,
  parsedAnswerToSlots,
} from '../desktop/src/lib/answerParser';
import {
  applySlotMergeToBuffer,
  buildAnswerPayload,
} from '../desktop/src/lib/answerStream';

describe('Idea #1: Speculative Hook Intent Matching Engine', () => {
  it('validates matching interim and final English questions', () => {
    const interim = 'How do you design a distributed rate limiter with Redis';
    const final = 'How do you design a distributed rate limiter with Redis in production';

    const overlap = computeIntentOverlap(interim, final);
    expect(overlap.recall).toBeGreaterThanOrEqual(0.7);
    expect(overlap.precision).toBeGreaterThanOrEqual(0.5);
    expect(overlap.hasNewNegation).toBe(false);
    expect(isSpeculativeHookValid(interim, final)).toBe(true);
  });

  it('validates matching interim and final Ukrainian questions', () => {
    const interim = 'Розкажи як працює React Fiber реконсиляція та';
    const final = 'Розкажи як працює React Fiber реконсиляція та пріоритизація рендеру';

    expect(tokenizeSignificantWords(interim)).toContain('react');
    expect(isSpeculativeHookValid(interim, final)).toBe(true);
  });

  it('rejects short interim utterances with fewer than 2 significant tokens', () => {
    expect(isSpeculativeHookValid('how do you', 'How do you implement distributed caching in Go')).toBe(false);
  });

  it('rejects speculative hit when topic shifts completely', () => {
    const interim = 'Explain Kubernetes pod scheduling lifecycle';
    const final = 'Describe PostgreSQL MVCC vacuum internals and WAL checkpoints';

    const overlap = computeIntentOverlap(interim, final);
    expect(overlap.matched).toBe(0);
    expect(isSpeculativeHookValid(interim, final)).toBe(false);
  });

  it('rejects speculative hit when final question introduces English negation', () => {
    const interim = 'How do you build a rate limiter with Redis';
    const final = 'How do you build a rate limiter without Redis in memory';

    const overlap = computeIntentOverlap(interim, final);
    expect(overlap.hasNewNegation).toBe(true);
    expect(isSpeculativeHookValid(interim, final)).toBe(false);
  });

  it('rejects speculative hit when final question introduces Cyrillic negation (без / не використовуючи)', () => {
    const interim = 'Як реалізувати розподілений кеш через Redis';
    const final = 'Як реалізувати розподілений кеш без Redis';

    const overlap = computeIntentOverlap(interim, final);
    expect(overlap.hasNewNegation).toBe(true);
    expect(isSpeculativeHookValid(interim, final)).toBe(false);

    const interim2 = 'Як кешувати запити через локальний стор';
    const final2 = 'Як кешувати запити не використовуючи сторонній бібліотеки';
    expect(isSpeculativeHookValid(interim2, final2)).toBe(false);
  });

  it('allows speculative hit when negation was already present in interim speech', () => {
    const interim = 'How do you implement rate limiting without Redis';
    const final = 'How do you implement rate limiting without Redis in Node.js';

    expect(isSpeculativeHookValid(interim, final)).toBe(true);
  });
});

describe('Idea #4: Surgical Partial Slot Patching & Merging', () => {
  const existingSlots: StructuredAnswerSlots = {
    meta: 'Senior Backend | Latency Budget',
    hook: 'We enforce distributed quotas via sliding-window counters stored in Redis.',
    pillars: [
      'Atomic Lua script avoids race conditions under burst load.',
      'Local token bucket fallback keeps P99 under 5ms if Redis blips.',
    ],
    deepDive: 'Use INCR with EXPIRE or sorted sets by timestamp for strict sliding windows.',
    followUpTrap: {
      question: 'What happens if Redis clocks drift across nodes?',
      answer: 'Use TIME inside Lua or Redis single-primary shard clock.',
    },
  };

  it('resolves modifier names to exact target slots', () => {
    expect(resolvePatchSlotForModifier('code')).toBe('deep_dive');
    expect(resolvePatchSlotForModifier('more_technical')).toBe('deep_dive');
    expect(resolvePatchSlotForModifier('under_the_hood')).toBe('deep_dive');
    expect(resolvePatchSlotForModifier('shorter')).toBe('hook_and_pillars');
    expect(resolvePatchSlotForModifier('simpler')).toBe('hook_and_pillars');
    expect(resolvePatchSlotForModifier('re_angle')).toBe('full');
    expect(resolvePatchSlotForModifier('normal')).toBe('full');
    expect(resolvePatchSlotForModifier(undefined)).toBe('full');
  });

  it('patches ONLY deep_dive while preserving hook, pillars, meta, and trap verbatim', () => {
    const incoming: StructuredAnswerSlots = {
      hook: '',
      pillars: [],
      deepDive: '```ts\nasync function allowRequest(key: string) {\n  return redis.eval(LUA_SLIDING_WINDOW, 1, key);\n}\n```',
    };

    const merged = mergeSurgicalAnswerSlots(existingSlots, incoming, 'deep_dive');
    expect(merged.hook).toBe(existingSlots.hook);
    expect(merged.pillars).toEqual(existingSlots.pillars);
    expect(merged.meta).toBe(existingSlots.meta);
    expect(merged.followUpTrap).toEqual(existingSlots.followUpTrap);
    expect(merged.deepDive).toContain('LUA_SLIDING_WINDOW');
  });

  it('handles untagged early deep_dive streaming chunks that land in incoming.hook fallback', () => {
    const earlyUntaggedIncoming: StructuredAnswerSlots = {
      hook: '```ts\nconst bucket = new Map<string, number>();',
      pillars: [],
      deepDive: '',
    };

    const merged = mergeSurgicalAnswerSlots(existingSlots, earlyUntaggedIncoming, 'deep_dive');
    expect(merged.hook).toBe(existingSlots.hook);
    expect(merged.pillars).toEqual(existingSlots.pillars);
    expect(merged.deepDive).toContain('new Map<string, number>()');
  });

  it('patches ONLY hook_and_pillars while freezing deepDive and followUpTrap', () => {
    const incoming: StructuredAnswerSlots = {
      hook: 'Redis Lua sliding-window counters enforce strict per-tenant limits atomically.',
      pillars: ['Single round-trip per check.', 'Graceful in-memory fallback.'],
      deepDive: '',
    };

    const merged = mergeSurgicalAnswerSlots(existingSlots, incoming, 'hook_and_pillars');
    expect(merged.hook).toBe(incoming.hook);
    expect(merged.pillars).toEqual(incoming.pillars);
    expect(merged.deepDive).toBe(existingSlots.deepDive);
    expect(merged.followUpTrap).toEqual(existingSlots.followUpTrap);
  });

  it('preserves speculative_hook Phase 1 when merging rest_after_hook continuation', () => {
    const speculativeSeed: StructuredAnswerSlots = {
      meta: 'System Design | Speculative',
      hook: 'Partition the rate-limiter state by tenant key and validate atomically in Lua.',
      pillars: [],
      deepDive: '',
    };
    const continuation: StructuredAnswerSlots = {
      hook: '',
      pillars: ['O(1) memory per active tenant', 'Sorted-set pruning inside Lua'],
      deepDive: 'Sharded Redis Cluster eliminates single-node hot keys.',
      followUpTrap: {
        question: 'How do you handle celebrity hot keys?',
        answer: 'Add a short-TTL local jitter cache in the API gateway.',
      },
    };

    const merged = mergeSurgicalAnswerSlots(speculativeSeed, continuation, 'rest_after_hook');
    expect(merged.hook).toBe(speculativeSeed.hook);
    expect(merged.meta).toBe(speculativeSeed.meta);
    expect(merged.pillars).toEqual(continuation.pillars);
    expect(merged.deepDive).toBe(continuation.deepDive);
    expect(merged.followUpTrap).toEqual(continuation.followUpTrap);

    const tagged = serializeMergedSlotsToTaggedStream(merged);
    const parsedWeb = parseStructuredGhostboardOutput(tagged);
    expect(parsedWeb.hook).toBe(speculativeSeed.hook);
    expect(parsedWeb.pillars).toEqual(continuation.pillars);
    expect(parsedWeb.deepDive).toBe(continuation.deepDive);
    expect(parsedWeb.followUpTrap).toEqual(continuation.followUpTrap);
  });
});

describe('Prompt Builder & Token Budgets for Patch Slots', () => {
  it('assigns strict maxOutputTokens per patchSlot', () => {
    expect(getMaxOutputTokensForPatchSlot('speculative_hook')).toBe(95);
    expect(getMaxOutputTokensForPatchSlot('deep_dive')).toBe(380);
    expect(getMaxOutputTokensForPatchSlot('hook_and_pillars')).toBe(260);
    expect(getMaxOutputTokensForPatchSlot('trap')).toBe(180);
    expect(getMaxOutputTokensForPatchSlot('rest_after_hook')).toBe(850);
    expect(getMaxOutputTokensForPatchSlot('full')).toBe(850);
    expect(getMaxOutputTokensForPatchSlot('full', 'shorter')).toBe(350);
  });

  it('builds speculative_hook prompt restricting output to META + PHASE_1:HOOK', () => {
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'How does React concurrent rendering schedule updates?',
      patchSlot: 'speculative_hook',
    });

    expect(systemPrompt).toContain('<<<META:');
    expect(systemPrompt).toContain('<<<PHASE_1:HOOK>>>');
    expect(systemPrompt).toContain('STOP');
    expect(systemPrompt).not.toContain('MANDATORY 4-PHASE SEQUENCE');
  });

  it('builds rest_after_hook prompt injecting preGeneratedHook and starting at PHASE_2:PILLARS', () => {
    const preHook = 'React schedules updates across priority lanes inside the Fiber tree.';
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'How does React concurrent rendering schedule updates?',
      patchSlot: 'rest_after_hook',
      preGeneratedHook: preHook,
    });

    expect(systemPrompt).toContain(preHook);
    expect(systemPrompt).toContain('<<<PHASE_2:PILLARS>>>');
    expect(systemPrompt).toContain('DO NOT repeat <<<META>>> or <<<PHASE_1:HOOK>>>!');
  });

  it('builds deep_dive surgical patch prompt restricting output to PHASE_3:DEEP_DIVE', () => {
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'How do you implement an LRU cache?',
      modifier: 'code',
      patchSlot: 'deep_dive',
    });

    expect(systemPrompt).toContain('MANDATORY SURGICAL SLOT PATCH (PHASE 3 ONLY)');
    expect(systemPrompt).toContain('<<<PHASE_3:DEEP_DIVE>>>');
  });
});

describe('Desktop Answer Parser & Stream Surgical Patching', () => {
  const fullDesktopRaw = [
    '<<<META: Architecture | Cache>>>',
    '<<<PHASE_1:HOOK>>>',
    'Use an LRU cache backed by doubly-linked list plus hash map for O(1) ops.',
    '<<<PHASE_2:PILLARS>>>',
    '- Hash map gives O(1) key lookup.',
    '- Doubly-linked list promotes MRU head and evicts LRU tail.',
    '<<<PHASE_3:DEEP_DIVE>>>',
    'Original deep dive explanation.',
    '<<<PHASE_4:TRAP>>>',
    'Q: Why not use Map directly in JS?',
    'A: JS Map preserves insertion order, which actually simplifies O(1) LRU.',
  ].join('\n');

  it('merges incoming PHASE_3:DEEP_DIVE patch into desktop raw answer preserving Phase 1, 2, and 4', () => {
    const patchRaw = [
      '<<<PHASE_3:DEEP_DIVE>>>',
      '```ts',
      'class LRUCache<K, V> { private map = new Map<K, V>(); }',
      '```',
    ].join('\n');

    const mergedTagged = mergeRawAnswerWithSlotPatch(
      fullDesktopRaw,
      patchRaw,
      'deep_dive'
    );

    const reparsed = parseAnswer(mergedTagged);
    expect(reparsed.mode).toBe('phased');
    expect(reparsed.hook).toContain('doubly-linked list');
    expect(reparsed.pillars).toHaveLength(2);
    expect(reparsed.deepDive).toContain('class LRUCache');
    expect(reparsed.followUpTrap?.question).toContain('Why not use Map');
  });

  it('converts plain untagged desktop fallback text into hook slot cleanly', () => {
    const parsedPlain = parseAnswer('Just use Map insertion order in JavaScript.');
    const slots = parsedAnswerToSlots(parsedPlain);
    expect(slots.hook).toContain('Map insertion order');
    expect(slots.pillars).toEqual([]);
  });

  it('builds desktop payload with auto-resolved patchSlot when existingRaw is supplied', () => {
    const payload = buildAnswerPayload({
      question: 'How do you build an LRU cache?',
      modifier: 'code',
      speed: 'fast',
      length: 'detailed',
      language: 'en',
      existingRaw: fullDesktopRaw,
    });

    expect(payload.patchSlot).toBe('deep_dive');
    expect(payload.directorModifier).toBe('code');
  });

  it('applySlotMergeToBuffer merges incoming deep_dive stream onto existingSlots for zero-flicker HUD', () => {
    const baseSlots = parsedAnswerToSlots(parseAnswer(fullDesktopRaw));
    const streamedChunk = '<<<PHASE_3:DEEP_DIVE>>>\n```ts\nconst map = new Map();\n```';

    const result = applySlotMergeToBuffer(streamedChunk, 'deep_dive', baseSlots);
    expect(result.mergedSlots).not.toBeNull();
    expect(result.mergedSlots?.hook).toBe(baseSlots.hook);
    expect(result.mergedSlots?.deepDive).toContain('const map = new Map()');
    expect(result.cleanedText).toContain('doubly-linked list');
    expect(result.cleanedText).toContain('const map = new Map()');
    expect(result.cleanedText).not.toContain('<<<PHASE_');
  });
});
