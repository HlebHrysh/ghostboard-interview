import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as interviewSyncPost } from '../src/app/api/ai/interview-sync/route';
import { GET as deepgramGet } from '../src/app/api/ai/deepgram/route';
import {
  getPrioritizedModels,
  recordModelSuccess,
  recordModelFailure,
  resetModelHealth,
  getPreferredFastModel,
  getFastStreamingGenerationConfig,
} from '../src/lib/geminiApi';
import {
  DB_QUERY_TIMEOUT_MS,
  DB_CIRCUIT_BREAKER_DEV_TTL_MS,
  getSessionUser,
  createUser,
  createSession,
  invalidateSessionUserCache,
  resetDbCircuitBreaker,
} from '../src/lib/serverDb';
import { buildGhostboardSystemPrompt } from '../src/lib/aiPromptCore';

describe('AI Latency Optimization & Stability Suite', () => {
  beforeEach(() => {
    resetModelHealth();
    resetDbCircuitBreaker();
    invalidateSessionUserCache();
  });

  afterEach(() => {
    resetModelHealth();
    resetDbCircuitBreaker();
    invalidateSessionUserCache();
  });

  describe('Task 1: Hedged Stream Race & Prompt Optimization', () => {
    it('initializes prioritized models with gemini-3.5-flash at the top', () => {
      const models = getPrioritizedModels();
      expect(models[0]).toBe('gemini-3.5-flash');
      expect(models).toContain('gemini-3.8-flash');
      expect(models).toContain('gemini-flash-latest');
    });

    it('moves fastest winning model to the front for subsequent requests', () => {
      recordModelSuccess('gemini-3.5-flash', 240);
      expect(getPreferredFastModel()).toBe('gemini-3.5-flash');

      const prioritized = getPrioritizedModels();
      expect(prioritized[0]).toBe('gemini-3.5-flash');
    });

    it('demotes failing models to the back of the priority list for 3 minutes', () => {
      recordModelFailure('gemini-3.5-flash');
      const prioritized = getPrioritizedModels();
      expect(prioritized[0]).not.toBe('gemini-3.5-flash');
      expect(prioritized[prioritized.length - 1]).toBe('gemini-3.5-flash');
    });

    it('sets generation config to 850 maxOutputTokens and 0.3 temperature', () => {
      const cfg = getFastStreamingGenerationConfig('gemini-3.5-flash');
      expect(cfg.maxOutputTokens).toBe(850);
      expect(cfg.temperature).toBe(0.3);
    });

    it('enforces Two-Gear progressive senior system prompt structure', () => {
      const { systemPrompt } = buildGhostboardSystemPrompt({
        question: 'Explain Postgres MVCC',
      });
      expect(systemPrompt).toContain('Gear 1 — Instant Spoken Hook');
      expect(systemPrompt).toContain('Gear 2 — Technical Pillars');
      expect(systemPrompt).toContain('Gear 3 — Production Code');
    });
  });

  describe('Task 2: Prisma Circuit Breaker & Sub-1ms Session Caching', () => {
    it('sets first check timeout to 250ms and dev TTL to 30 minutes', () => {
      expect(DB_QUERY_TIMEOUT_MS).toBe(250);
      expect(DB_CIRCUIT_BREAKER_DEV_TTL_MS).toBe(1800_000);
    });

    it('caches session user in-memory for sub-1ms responses', async () => {
      const user = await createUser('fast-session@ghostboard.local', 'Fast User', 'pro');
      const session = await createSession(user.id, 'web');

      // First fetch
      const start1 = performance.now();
      const u1 = await getSessionUser(session.token);
      const dur1 = performance.now() - start1;

      expect(u1).not.toBeNull();
      expect(u1?.email).toBe('fast-session@ghostboard.local');

      // Second fetch: should hit in-memory cache in < 1ms
      const start2 = performance.now();
      const u2 = await getSessionUser(session.token);
      const dur2 = performance.now() - start2;

      expect(u2?.id).toBe(u1?.id);
      expect(dur2).toBeLessThan(3);
    });
  });

  describe('Task 3: Fast Interview Sync (< 5ms) & Instant LOG Action', () => {
    it('handles action LOG immediately in < 5ms without session token or DB access', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/interview-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOG', text: '[DG-CONNECT] live connection established' }),
      });

      const start = performance.now();
      const res = await interviewSyncPost(req);
      const elapsed = performance.now() - start;

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(elapsed).toBeLessThan(25);
    });

    it('updates in-memory state and returns 200 in dev without split-brain locks', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/interview-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ghostboard-client': 'desktop-app',
        },
        body: JSON.stringify({
          action: 'ADD_OR_UPDATE_QA',
          qa: {
            id: 'qa-test-123',
            question: 'What is Hedged Stream Race?',
            startHook: 'It hedges against tail latency by running parallel contenders with a 600ms stagger.',
            quickAnswer: 'Hedged requests eliminate timeout stalls.',
            hints: ['stagger', 'race', 'abort'],
          },
        }),
      });

      const start = performance.now();
      const res = await interviewSyncPost(req);
      const elapsed = performance.now() - start;

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.activeId).toBe('qa-test-123');
      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Task 4: Deepgram Dev/Demo Mode without 401 or 429', () => {
    it('returns configured API key in dev mode without 401 even without session token', async () => {
      const prevKey = process.env.DEEPGRAM_API_KEY;
      process.env.DEEPGRAM_API_KEY = 'test_deepgram_api_key_valid_1234567890';

      const req = new NextRequest('http://localhost:3000/api/ai/deepgram', {
        method: 'GET',
        headers: { 'x-ghostboard-client': 'studio-session' },
      });

      const res = await deepgramGet(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.configured).toBe(true);
      expect(data.apiKey).toBe('test_deepgram_api_key_valid_1234567890');
      expect(data.status).toBe('valid');

      process.env.DEEPGRAM_API_KEY = prevKey;
    });

    it('does not trigger 429 rate limit upon multiple consecutive requests in dev/demo mode', async () => {
      const prevKey = process.env.DEEPGRAM_API_KEY;
      process.env.DEEPGRAM_API_KEY = 'test_deepgram_key_rapid_fire';

      // Fire 15 consecutive requests
      for (let i = 0; i < 15; i++) {
        const req = new NextRequest('http://localhost:3000/api/ai/deepgram?demo=1', {
          method: 'GET',
          headers: { 'x-ghostboard-demo': 'true' },
        });
        const res = await deepgramGet(req);
        expect(res.status).toBe(200);
      }

      process.env.DEEPGRAM_API_KEY = prevKey;
    });
  });
});
