import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  updateUserPlan,
  updateUser,
  deleteUser,
  updateUserCandidateProfile,
  updateUserResumeContext,
  tripDbCircuitBreaker,
  resetDbCircuitBreaker,
} from '../src/lib/serverDb';
import { EnvConfigError } from '../src/lib/envGuard';
import { interviewSyncStore, getItemTimestamp } from '../src/lib/interviewSyncStore';
import { buildModifierInstruction, type AiModifier } from '../src/lib/aiPromptCore';
import { NextRequest } from 'next/server';
import { resetRateLimits } from '../src/lib/rateLimit';

describe('Monorepo Audit Remediations & Production Resilience', () => {
  beforeEach(() => {
    resetDbCircuitBreaker();
    resetRateLimits();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetDbCircuitBreaker();
    resetRateLimits();
    vi.unstubAllEnvs();
  });

  describe('P0-1: ServerDb Circuit Breaker Safety in Production', () => {
    it('throws EnvConfigError on updateUserPlan when circuit breaker is tripped and memory DB is disallowed', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/ghostboard');
      delete process.env.ALLOW_MEMORY_DB;

      tripDbCircuitBreaker(60000);

      await expect(updateUserPlan('usr_123', 'pro')).rejects.toThrow(EnvConfigError);
    });

    it('throws EnvConfigError on updateUser when circuit breaker is tripped and memory DB is disallowed', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/ghostboard');
      delete process.env.ALLOW_MEMORY_DB;

      tripDbCircuitBreaker(60000);

      await expect(updateUser('usr_123', { name: 'New Name' })).rejects.toThrow(EnvConfigError);
    });

    it('throws EnvConfigError on deleteUser when circuit breaker is tripped and memory DB is disallowed', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/ghostboard');
      delete process.env.ALLOW_MEMORY_DB;

      tripDbCircuitBreaker(60000);

      await expect(deleteUser('usr_123')).rejects.toThrow(EnvConfigError);
    });

    it('throws EnvConfigError on updateUserCandidateProfile when circuit breaker is tripped and memory DB is disallowed', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/ghostboard');
      delete process.env.ALLOW_MEMORY_DB;

      tripDbCircuitBreaker(60000);

      await expect(
        updateUserCandidateProfile('usr_123', { role: 'Senior Go' })
      ).rejects.toThrow(EnvConfigError);
    });

    it('throws EnvConfigError on updateUserResumeContext when circuit breaker is tripped and memory DB is disallowed', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/ghostboard');
      delete process.env.ALLOW_MEMORY_DB;

      tripDbCircuitBreaker(60000);

      await expect(
        updateUserResumeContext('usr_123', 'Resume contents here')
      ).rejects.toThrow(EnvConfigError);
    });
  });

  describe('P0-2: InterviewSyncStore Initial State & Timestamp Guards', () => {
    it('initializes with timestamp 0 so remote Redis state is not rejected on cold connect', () => {
      interviewSyncStore.clear('user_clean_cold_start');
      const state = interviewSyncStore.getState('user_clean_cold_start');
      expect(state.qas).toEqual([]);
      expect(state.isFrozen).toBe(false);
      expect(state.isPanic).toBe(false);
    });

    it('getItemTimestamp properly resolves number from numeric string or Date timestamp', () => {
      expect(
        getItemTimestamp({
          id: '1',
          question: 'Q',
          startHook: 'H',
          quickAnswer: 'A',
          hints: [],
          timestamp: 1710000000000,
        })
      ).toBe(1710000000000);
      expect(
        getItemTimestamp({
          id: 'qa_1710000005000',
          question: 'Q',
          startHook: 'H',
          quickAnswer: 'A',
          hints: [],
        })
      ).toBe(1710000005000);
    });
  });

  describe('P0-3: AI Prompt Core Modifiers (under_the_hood & bridge)', () => {
    it('buildModifierInstruction returns specialized prompt for under_the_hood', () => {
      const instruction = buildModifierInstruction('under_the_hood');
      expect(instruction).toContain('UNDER THE HOOD');
      expect(instruction).toContain('kernel primitives');
    });

    it('buildModifierInstruction returns specialized prompt for bridge', () => {
      const instruction = buildModifierInstruction('bridge');
      expect(instruction).toContain('DIPLOMATIC BRIDGE');
      expect(instruction).toContain('conversational pivot');
    });

    it('all modifiers in AiModifier union produce non-default instructions', () => {
      const modifiers: AiModifier[] = [
        'shorter',
        'simpler',
        'code',
        're_angle',
        'under_the_hood',
        'bridge',
        'more_technical',
        'code_example',
        'tradeoffs',
        'explain_line',
      ];

      for (const mod of modifiers) {
        const text = buildModifierInstruction(mod);
        expect(text).not.toContain('BALANCED LIVE DELIVERY');
        expect(text.length).toBeGreaterThan(20);
      }
    });
  });

  describe('P0-4: Auth Register Email-Level Rate Limiting', () => {
    it('blocks rapid duplicate registration attempts for the same email address', async () => {
      const { POST } = await import('../src/app/api/auth/register/route');

      const makeRequest = (email: string, ip: string) =>
        new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({
            email,
            password: 'SuperSecretPassword123!',
            name: 'Candidate',
          }),
        });

      // 5 allowed attempts
      for (let i = 1; i <= 5; i++) {
        const res = await POST(makeRequest('victim@example.com', `10.0.0.${i}`));
        expect(res.status).not.toBe(429);
      }

      // 6th attempt with a new IP must be rejected with 429 RATE_LIMITED
      const blockedRes = await POST(makeRequest('victim@example.com', '10.0.0.99'));
      expect(blockedRes.status).toBe(429);
      const json = await blockedRes.json();
      expect(json.code).toBe('RATE_LIMITED');
      expect(json.error).toContain('Too many attempts for this email address');
    });
  });
});
