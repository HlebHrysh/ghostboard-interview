import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as copilotPost } from '../src/app/api/ai/interview-copilot/route';
import { POST as dualStreamPost } from '../src/app/api/ai/dual-stream/route';
import { GET as deepgramGet, POST as deepgramPost } from '../src/app/api/ai/deepgram/route';
import { GET as screenshotGet, POST as screenshotPost } from '../src/app/api/ai/screenshot/route';
import { POST as arenaPost } from '../src/app/api/ai/arena/route';
import { POST as resumeParsePost } from '../src/app/api/resume/parse/route';
import { POST as adminAuthPost } from '../src/app/api/admin/auth/route';
import { GET as retentionGet } from '../src/app/api/cron/retention/route';
import { getClientIp } from '../src/lib/rateLimit';

describe('Security Audit Remediations & Zero-Trust Verifications', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeAll(() => {
    process.env.CRON_SECRET = 'test_cron_secret_high_entropy_32_chars';
  });

  afterAll(() => {
    if (originalCronSecret) {
      process.env.CRON_SECRET = originalCronSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  describe('Vector 1 & 2: Admin Authentication & Timing Attack Protection', () => {
    it('rejects empty or incorrect admin password with 401 using timing-safe comparison', async () => {
      const wrongReq = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.11',
        },
        body: JSON.stringify({ password: 'wrong_password_attempt' }),
      });
      const res = await adminAuthPost(wrongReq);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/пароль|credentials/i);
    });

    it('rejects missing password payload with 400 Bad Request', async () => {
      const emptyReq = new NextRequest('http://localhost:3000/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.12',
        },
        body: JSON.stringify({}),
      });
      const res = await adminAuthPost(emptyReq);
      expect(res.status).toBe(400);
    });

    it('rejects timing attack on cron retention endpoint with forged bearer token', async () => {
      const req = new NextRequest('http://localhost:3000/api/cron/retention', {
        method: 'GET',
        headers: { authorization: 'Bearer invalid_cron_secret_attacker' },
      });
      const res = await retentionGet(req);
      expect(res.status).toBe(401);
    });
  });

  describe('Vector 2: Elimination of Auth Bypasses and Free Pro Backdoors', () => {
    it('blocks x-ghostboard-client: desktop header from minting free Pro sessions', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/interview-copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.21',
          'x-ghostboard-client': 'desktop',
        },
        body: JSON.stringify({ question: 'Explain how event loop works in Node.js' }),
      });
      const res = await copilotPost(req);
      expect(res.status).toBe(401);
    });

    it('blocks x-ghostboard-client: chrome-extension header from minting free sessions', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/interview-copilot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.22',
          'x-ghostboard-client': 'chrome-extension',
        },
        body: JSON.stringify({ question: 'Solve two sum in Python' }),
      });
      const res = await copilotPost(req);
      expect(res.status).toBe(401);
    });

    it('blocks guest_demo_token query param from bypassing authentication', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/interview-copilot?token=guest_demo_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.23',
        },
        body: JSON.stringify({ question: 'Design URL shortener' }),
      });
      const res = await copilotPost(req);
      expect(res.status).toBe(401);
    });

    it('blocks token: "dual-stream-ui" Pro bypass in dual-stream route', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/dual-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.24',
        },
        body: JSON.stringify({
          question: 'What is distributed consensus?',
          token: 'dual-stream-ui',
        }),
      });
      const res = await dualStreamPost(req);
      expect(res.status).toBe(401);
    });

    it('requires valid session for deepgram credentials GET and POST', async () => {
      const getReq = new NextRequest('http://localhost:3000/api/ai/deepgram', {
        headers: { 'cf-connecting-ip': '198.51.100.25' },
      });
      const getRes = await deepgramGet(getReq);
      expect(getRes.status).toBe(401);

      const postReq = new NextRequest('http://localhost:3000/api/ai/deepgram', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '198.51.100.26' },
      });
      const postRes = await deepgramPost(postReq);
      expect(postRes.status).toBe(401);
    });

    it('requires valid session for arena AI prompt execution', async () => {
      const req = new NextRequest('http://localhost:3000/api/ai/arena', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.27',
        },
        body: JSON.stringify({ message: 'Let us start the interview' }),
      });
      const res = await arenaPost(req);
      expect(res.status).toBe(401);
    });
  });

  describe('Vector 3 & 4: Screenshot API & Command Injection Elimination', () => {
    it('rejects unauthenticated requests to screenshot GET and POST', async () => {
      const getReq = new NextRequest('http://localhost:3000/api/ai/screenshot', {
        headers: { 'cf-connecting-ip': '198.51.100.31' },
      });
      const getRes = await screenshotGet(getReq);
      expect(getRes.status).toBe(401);

      const postReq = new NextRequest('http://localhost:3000/api/ai/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.32',
        },
        body: JSON.stringify({}),
      });
      const postRes = await screenshotPost(postReq);
      expect(postRes.status).toBe(401);
    });
  });

  describe('Vector 4: Safe File Upload & Magic Byte Enforcement', () => {
    it('rejects uploaded base64 file with invalid magic bytes (masquerading non-PDF)', async () => {
      const fakePdf = Buffer.from('console.log("malicious code execution attempt");').toString('base64');
      const req = new NextRequest('http://localhost:3000/api/resume/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.41',
        },
        body: JSON.stringify({ fileBase64: fakePdf, fileName: 'exploit.pdf' }),
      });

      const res = await resumeParsePost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/magic bytes/i);
    });

    it('rejects oversized base64 file exceeding 10MB limit', async () => {
      const hugeBase64 = 'A'.repeat(16 * 1024 * 1024);
      const req = new NextRequest('http://localhost:3000/api/resume/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': '198.51.100.42',
        },
        body: JSON.stringify({ fileBase64: hugeBase64, fileName: 'huge.pdf' }),
      });

      const res = await resumeParsePost(req);
      expect(res.status).toBe(413);
      const data = await res.json();
      expect(data.error).toMatch(/exceeds/i);
    });
  });

  describe('Vector 5: Client IP Resolution & Spoofing Defense', () => {
    it('prioritizes cf-connecting-ip over spoofed x-forwarded-for header', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'cf-connecting-ip': '203.0.113.195',
          'x-forwarded-for': '198.51.100.1, 10.0.0.1',
        },
      });
      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.195');
    });

    it('correctly extracts first IP from comma-separated x-forwarded-for when CF header absent', () => {
      const req = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '198.51.100.42, 10.0.0.1, 192.168.1.1',
        },
      });
      const ip = getClientIp(req);
      expect(ip).toBe('198.51.100.42');
    });

    it('falls back to default safe IP when headers are missing or empty', () => {
      const req = new NextRequest('http://localhost:3000/api/test');
      const ip = getClientIp(req);
      expect(ip).toBe('127.0.0.1');
    });
  });
});
