import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { checkRateLimit, validateOrigin } from '../src/lib/rateLimit';

describe('Rate Limiter and Security Utilities', () => {
  it('allows requests within the configured threshold and blocks when limit is exceeded', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/interview-copilot', {
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });

    // Bucket with limit 3 per minute
    const res1 = await checkRateLimit(req, 3, 60000, 'test_bucket_1');
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await checkRateLimit(req, 3, 60000, 'test_bucket_1');
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await checkRateLimit(req, 3, 60000, 'test_bucket_1');
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request must be rejected
    const res4 = await checkRateLimit(req, 3, 60000, 'test_bucket_1');
    expect(res4.allowed).toBe(false);
    expect(res4.retryAfterSec).toBeGreaterThan(0);
  });

  it('validates allowed same-origin and localhost origins', () => {
    const validReq = new NextRequest('http://localhost:3000/api/ai/deepgram', {
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    expect(validateOrigin(validReq)).toBe(true);

    const maliciousReq = new NextRequest('http://localhost:3000/api/ai/deepgram', {
      headers: {
        host: 'localhost:3000',
        origin: 'https://evil-hacker-site.com',
      },
    });
    expect(validateOrigin(maliciousReq)).toBe(false);
  });
});
