import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateCvBattleCards,
  generateBattleCardsMarkdown,
  CVBattleCard,
} from '../src/app/profile/cvBattleCardGenerator';
import {
  generateArenaEvaluationFallback,
  normalizeEvaluationResult,
} from '../src/app/api/ai/arena/evaluationHelper';
import { GET as healthGet } from '../src/app/api/health/route';

describe('Sprint Upgrade: Arena, Profile Battle Cards & Health Diagnostics', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. CV BATTLE CARDS GENERATOR
  // ─────────────────────────────────────────────────────────────────────────────
  describe('CV Battle Card Generator', () => {
    it('generates exactly 6 high-yield battle cards for frontend profile', () => {
      const cards = generateCvBattleCards({
        primaryStack: ['TypeScript', 'React', 'Next.js', 'Tailwind'],
        experienceLevel: 'Senior',
        role: 'Lead Frontend Architect',
        locale: 'ua',
      });

      expect(cards).toHaveLength(6);

      cards.forEach((card: CVBattleCard) => {
        expect(card.id).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.domain).toBeTruthy();
        expect(card.domainBadge).toBeTruthy();
        expect(card.hook.length).toBeGreaterThan(15);
        expect(card.pillars).toHaveLength(3);
        card.pillars.forEach((pillar) => {
          expect(pillar.length).toBeGreaterThan(10);
        });
        expect(card.trap).toBeDefined();
        expect(card.trap.question.length).toBeGreaterThan(10);
        expect(card.trap.counterAnswer.length).toBeGreaterThan(15);
      });
    });

    it('generates tailored cards for backend/highload profiles', () => {
      const cards = generateCvBattleCards({
        primaryStack: ['Go', 'PostgreSQL', 'Kafka', 'Redis'],
        experienceLevel: 'Staff',
        role: 'Principal Backend Engineer',
        cvContext: 'Highload payment gateways processing 15k RPS with strict idempotency and zero-downtime migrations',
        locale: 'en',
      });

      expect(cards).toHaveLength(6);
      const titles = cards.map((c) => c.title.toLowerCase()).join(' ');
      // Should include database/concurrency/idempotency concepts
      expect(titles).toMatch(/postgresql|mvcc|repeatable read|idempotency|event loop|cache/i);
    });

    it('formats clean, high-density Markdown cheat-sheet', () => {
      const cards = generateCvBattleCards({
        primaryStack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        experienceLevel: 'Senior',
        role: 'Senior Fullstack Engineer',
        locale: 'ua',
      });

      const markdown = generateBattleCardsMarkdown(cards, {
        role: 'Senior Fullstack Engineer',
        level: 'Senior',
        stack: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      });

      expect(markdown).toContain('# ⚡ GHOSTBOARD CV BATTLE CHEAT-SHEET');
      expect(markdown).toContain('Перша фраза вголос (Hook)');
      expect(markdown).toContain('3 Ключові архітектурні якорі (Pillars)');
      expect(markdown).toContain('Пастка рекрутера та контраргумент');
      expect(markdown).toContain('Картка #1:');
      expect(markdown).toContain('Картка #6:');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ARENA EVALUATION SENIOR RUBRIC & FALLBACK STRUCTURE
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Arena Evaluation Senior Rubric & Fallback', () => {
    it('generates complete senior rubric structure in fallback mode', () => {
      const fallback = generateArenaEvaluationFallback({
        question: 'Як усунути race condition при одночасному списанні коштів?',
        candidateAnswer: 'Ми використовуємо SELECT FOR UPDATE та унікальний Idempotency-Key у заголовку.',
        track: 'backend',
        level: 'Senior',
        language: 'uk',
        calculatedSpeed: 90,
      });

      expect(fallback.score).toBeGreaterThanOrEqual(60);
      expect(fallback.verdict).toBeTruthy();
      expect(fallback.scores.technicalAccuracy).toBeGreaterThan(0);
      expect(fallback.scores.architecturalVision).toBeGreaterThan(0);
      expect(fallback.scores.communication).toBeGreaterThan(0);
      expect(fallback.scores.stressResilience).toBeGreaterThan(0);
      expect(fallback.scores.thinkingSpeed).toBe(90);

      expect(fallback.whatWorked.length).toBeGreaterThanOrEqual(2);
      expect(fallback.weakSpots.length).toBeGreaterThanOrEqual(2);

      // Senior Benchmark 3 phases
      expect(fallback.seniorBenchmark).toBeDefined();
      expect(fallback.seniorBenchmark.hook.length).toBeGreaterThan(20);
      expect(fallback.seniorBenchmark.pillars.length).toBeGreaterThanOrEqual(3);
      expect(fallback.seniorBenchmark.productionExample.length).toBeGreaterThan(15);

      // Follow-up Trap Drill
      expect(fallback.trapDrill).toBeDefined();
      expect(fallback.trapDrill.trapQuestion.length).toBeGreaterThan(20);
      expect(fallback.trapDrill.interviewerAngle.length).toBeGreaterThan(15);
      expect(fallback.trapDrill.idealDefense.length).toBeGreaterThan(20);

      // Staff reference text
      expect(fallback.staffEngineerAnswer).toContain(fallback.seniorBenchmark.hook);
    });

    it('normalizes partial raw AI output into valid senior rubric contract', () => {
      const rawIncompleteAI = {
        score: 82,
        verdict: 'Good effort',
        scores: {
          technicalAccuracy: 85,
        },
        strengths: ['Clear voice'],
        missingKeyConcepts: ['Metrics missing'],
      };

      const normalized = normalizeEvaluationResult(rawIncompleteAI, {
        track: 'frontend',
        language: 'en',
      });

      expect(normalized.score).toBe(82);
      expect(normalized.verdict).toBe('Good effort');
      expect(normalized.scores.technicalAccuracy).toBe(85);
      expect(normalized.scores.architecturalVision).toBeGreaterThan(0);
      expect(normalized.whatWorked).toContain('Clear voice');
      expect(normalized.weakSpots).toContain('Metrics missing');

      // Hook and pillars should be filled by fallback
      expect(normalized.seniorBenchmark.hook).toBeTruthy();
      expect(normalized.seniorBenchmark.pillars).toHaveLength(3);
      expect(normalized.trapDrill.trapQuestion).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. /api/health DIAGNOSTIC CONTRACT
  // ─────────────────────────────────────────────────────────────────────────────
  describe('/api/health Diagnostic Contract', () => {
    it('returns fast JSON diagnostic payload with ok, aiConfigured, sttConfigured, redisConfigured, timestamp', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'test_gemini_key');
      vi.stubEnv('DEEPGRAM_API_KEY', 'test_deepgram_key');
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test-redis.upstash.io');

      const start = Date.now();
      const res = await healthGet();
      const duration = Date.now() - start;

      // Must respond quickly without blocking
      expect(duration).toBeLessThan(100);

      expect(res.status).toBe(200);
      const data = await res.json();

      // Check required fields
      expect(data).toHaveProperty('ok');
      expect(typeof data.ok).toBe('boolean');
      expect(data.ok).toBe(true);

      expect(data).toHaveProperty('aiConfigured');
      expect(data.aiConfigured).toBe(true);

      expect(data).toHaveProperty('sttConfigured');
      expect(data.sttConfigured).toBe(true);

      expect(data).toHaveProperty('redisConfigured');
      expect(data.redisConfigured).toBe(true);

      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('number');
      expect(data.timestamp).toBeGreaterThan(0);

      // Maintain backwards compatibility
      expect(data.status).toBe('healthy');
      expect(data.services.geminiAi).toBe('ready');
      expect(data.services.deepgramStt).toBe('ready');
      expect(data.services.storage).toBe('ready');
    });

    it('reports missing keys accurately in degraded state', async () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('DEEPGRAM_API_KEY', '');
      vi.stubEnv('UPSTASH_REDIS_REST_URL', '');

      const res = await healthGet();
      const data = await res.json();

      expect(data.ok).toBe(false);
      expect(data.aiConfigured).toBe(false);
      expect(data.sttConfigured).toBe(false);
      expect(data.redisConfigured).toBe(false);
      expect(typeof data.timestamp).toBe('number');
      expect(data.status).toBe('degraded');
    });
  });
});
