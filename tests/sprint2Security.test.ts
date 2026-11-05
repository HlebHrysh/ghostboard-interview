import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp, checkRateLimit, checkKeyRateLimit, resetRateLimits } from '../src/lib/rateLimit';
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '../src/lib/server/users';
import { validateSessionSecret, assertSessionSecretValid, getSessionSecret } from '../src/lib/server/session';
import { proxy } from '../src/proxy';
import { POST as loginPost } from '../src/app/api/auth/login/route';
import { POST as sessionPost, GET as sessionGet } from '../src/app/api/auth/session/route';
import { GET as healthGet } from '../src/app/api/health/route';
import { GET as deepgramGet, POST as deepgramPost } from '../src/app/api/ai/deepgram/route';
import { POST as stripeConfigPost } from '../src/app/api/stripe/config/route';
import { createUser } from '../src/lib/serverDb';

describe('Sprint 2 Security & DoS Hardening Suite', () => {
  beforeEach(() => {
    resetRateLimits();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('P0-4: IP Anti-Spoofing & Keyed Rate Limiting', () => {
    it('never trusts client-spoofed leftmost IP from x-forwarded-for', () => {
      // In trusted proxy mode, rightmost (last hop) must be extracted
      vi.stubEnv('TRUST_PROXY', '1');
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': 'attacker-spoofed-ip, 198.51.100.99',
        },
      });
      expect(getClientIp(req)).toBe('198.51.100.99');
    });

    it('returns default safe 127.0.0.1 in production if no trusted proxy header exists', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('TRUST_PROXY', '');
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        },
      });
      expect(getClientIp(req)).toBe('127.0.0.1');
    });

    it('enforces rate limit per key (checkKeyRateLimit)', async () => {
      const key = 'test_entity_1';
      const r1 = await checkKeyRateLimit(key, 2, 60000, 'test_bucket');
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = await checkKeyRateLimit(key, 2, 60000, 'test_bucket');
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(0);

      const r3 = await checkKeyRateLimit(key, 2, 60000, 'test_bucket');
      expect(r3.allowed).toBe(false);
      expect(r3.retryAfterSec).toBeGreaterThan(0);
    });

    it('enforces email-based brute-force rate limit in /api/auth/login (5 attempts per 15m)', async () => {
      const email = `brute_force_${Date.now()}@ghostboard.ai`;

      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            host: 'localhost:3000',
            origin: 'http://localhost:3000',
            'cf-connecting-ip': `10.0.0.${i + 1}`, // different IPs to isolate email limit
          },
          body: JSON.stringify({ email, password: 'WrongPassword!' }),
        });
        const res = await loginPost(req);
        // First 5 attempts return 404 (user not found)
        expect(res.status).toBe(404);
      }

      // 6th attempt with same email from any IP must be blocked by email rate limit
      const blockedReq = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'cf-connecting-ip': '10.0.0.99',
        },
        body: JSON.stringify({ email, password: 'WrongPassword!' }),
      });
      const blockedRes = await loginPost(blockedReq);
      expect(blockedRes.status).toBe(429);
      const data = await blockedRes.json();
      expect(data.code).toBe('RATE_LIMITED');
    });

    it('rate-limits guest session minting in /api/auth/session (max 5 per window)', async () => {
      const ip = '198.51.100.77';

      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            host: 'localhost:3000',
            origin: 'http://localhost:3000',
            'cf-connecting-ip': ip,
          },
          body: JSON.stringify({ client: 'desktop' }),
        });
        const res = await sessionPost(req);
        expect(res.status).toBe(200);
      }

      // 6th request from same IP must be rate-limited
      const req6 = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          'cf-connecting-ip': ip,
        },
        body: JSON.stringify({ client: 'desktop' }),
      });
      const res6 = await sessionPost(req6);
      expect(res6.status).toBe(429);
      const data = await res6.json();
      expect(data.code).toBe('RATE_LIMITED');
    });
  });

  describe('P1-1: Asynchronous Scrypt Hashing & User Caching', () => {
    it('hashes passwords asynchronously using scrypt and verifies matches', async () => {
      const rawPassword = 'SecretP@ssword2026!';
      const hashPromise = hashPassword(rawPassword);
      expect(hashPromise instanceof Promise).toBe(true);

      const hash = await hashPromise;
      expect(hash.startsWith('scrypt$')).toBe(true);

      const isValid = await verifyPassword(rawPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('rejects malformed hash strings gracefully without throwing', async () => {
      expect(await verifyPassword('pass', null)).toBe(false);
      expect(await verifyPassword('pass', '')).toBe(false);
      expect(await verifyPassword('pass', 'plain$bad')).toBe(false);
      expect(await verifyPassword('pass', 'bcrypt$xyz$abc')).toBe(false);
    });
  });

  describe('P1-6: Body Size Enforcement & Chunked Transfer Guard (proxy.ts)', () => {
    it('rejects mutating API requests with Transfer-Encoding: chunked without Content-Length (411)', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/interview-copilot', {
        method: 'POST',
        headers: {
          'transfer-encoding': 'chunked',
        },
      });
      const res = await proxy(req);
      expect(res.status).toBe(411);
      const data = await res.json();
      expect(data.error).toMatch(/Length Required/i);
    });

    it('rejects mutating API requests exceeding 2MB Content-Length with 413 Payload Too Large', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/interview-copilot', {
        method: 'POST',
        headers: {
          'content-length': String(3 * 1024 * 1024), // 3MB
        },
      });
      const res = await proxy(req);
      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data.error).toMatch(/Payload Too Large/i);
    });

    it('allows mutating API requests with valid Content-Length <= 2MB', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        headers: {
          'content-length': '128',
        },
      });
      const res = await proxy(req);
      expect(res.status).toBe(200);
    });
  });

  describe('P1-7: Server Fail-Fast & SESSION_SECRET Validation', () => {
    it('validates SESSION_SECRET requires at least 32 characters', () => {
      expect(validateSessionSecret('').valid).toBe(false);
      expect(validateSessionSecret('too-short').valid).toBe(false);
      expect(validateSessionSecret('01234567890123456789012345678901').valid).toBe(true);
    });

    it('throws in production when SESSION_SECRET is missing or insecure', () => {
      expect(() => {
        assertSessionSecretValid({
          NODE_ENV: 'production',
          SESSION_SECRET: 'short_key',
        } as unknown as NodeJS.ProcessEnv);
      }).toThrow(/Production SESSION_SECRET validation failed/);

      expect(() => {
        assertSessionSecretValid({
          NODE_ENV: 'production',
          SESSION_SECRET: 'a_very_secure_secret_key_that_has_over_32_characters_length',
        } as unknown as NodeJS.ProcessEnv);
      }).not.toThrow();
    });

    it('blocks runtime key modification in POST /api/ai/deepgram in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const req = new NextRequest('http://localhost:3000/api/ai/deepgram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'new-key-123' }),
      });
      const res = await deepgramPost(req);
      expect(res.status).toBe(403);
    });

    it('blocks runtime config modification in POST /api/stripe/config in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const req = new NextRequest('http://localhost:3000/api/stripe/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: 'sk_test_123' }),
      });
      const res = await stripeConfigPost(req);
      expect(res.status).toBe(403);
    });
  });

  describe('P1-7: Readiness Probe /api/health (200 vs 503)', () => {
    it('returns status 200 when keys and storage write are ready', async () => {
      vi.stubEnv('GEMINI_API_KEY', 'valid_gemini_api_key_for_testing');
      vi.stubEnv('DEEPGRAM_API_KEY', 'valid_deepgram_api_key_for_testing');

      const res = await healthGet();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
      expect(data.services.geminiAi).toBe('ready');
      expect(data.services.deepgramStt).toBe('ready');
      expect(data.services.storage).toBe('ready');
    });

    it('returns status 503 degraded when required AI keys are missing', async () => {
      vi.stubEnv('GEMINI_API_KEY', '');
      vi.stubEnv('DEEPGRAM_API_KEY', '');

      const res = await healthGet();
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe('degraded');
      expect(data.services.geminiAi).toBe('missing_key');
      expect(data.services.deepgramStt).toBe('missing_key');
    });
  });
});
