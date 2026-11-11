import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as dualStreamPost } from '../src/app/api/ai/dual-stream/route';
import { GET as screenshotGet, POST as screenshotPost } from '../src/app/api/ai/screenshot/route';
import { createUser, createSession, updateUser, deleteUser } from '../src/lib/serverDb';

describe('Task 1: Production Pipeline Enforcement (No Silent Dev Bypasses)', () => {
  let freeUser: { id: string; email: string };
  let freeToken: string;
  let proUser: { id: string; email: string };
  let proToken: string;

  beforeEach(async () => {
    // Provision fresh test users directly in DB
    const freeEmail = `test_free_${Date.now()}@ghostboard.ai`;
    const fUser = await createUser(freeEmail, 'Free User', 'free');
    const fSess = await createSession(fUser.id);
    freeUser = { id: fUser.id, email: freeEmail };
    freeToken = fSess.token;

    const proEmail = `test_pro_${Date.now()}@ghostboard.ai`;
    const pUser = await createUser(proEmail, 'Pro User', 'pro');
    const pSess = await createSession(pUser.id);
    proUser = { id: pUser.id, email: proEmail };
    proToken = pSess.token;
  });

  afterEach(async () => {
    if (freeUser) await deleteUser(freeUser.id).catch(() => {});
    if (proUser) await deleteUser(proUser.id).catch(() => {});
  });

  it('rejects unauthenticated requests to /api/ai/dual-stream with 401 AUTH_REQUIRED', async () => {
    const req = new NextRequest('http://localhost:3000/api/ai/dual-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: 'Explain TCP vs UDP' }),
    });

    const res = await dualStreamPost(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe('AUTH_REQUIRED');
  });

  it('enforces 5-question trial limit on free tier in /api/ai/dual-stream', async () => {
    // Set trial questions to 5
    await updateUser(freeUser.id, { trialQuestionsUsed: 5 });

    const req = new NextRequest('http://localhost:3000/api/ai/dual-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({ question: 'Explain CAP theorem tradeoffs' }),
    });

    const res = await dualStreamPost(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe('TRIAL_LIMIT_REACHED');
  });

  it('enforces Pro/Lifetime tier for Vision OCR /api/ai/screenshot', async () => {
    // 1. Free user is blocked from screenshot OCR with 403 TIER_REQUIRED
    const freeReq = new NextRequest('http://localhost:3000/api/ai/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freeToken}`,
      },
      body: JSON.stringify({ imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }),
    });

    const freeRes = await screenshotPost(freeReq);
    expect(freeRes.status).toBe(403);
    const freeData = await freeRes.json();
    expect(freeData.code).toBe('TIER_REQUIRED');

    // 2. Pro user passes the tier check (and reaches payload/key validation)
    const proReq = new NextRequest('http://localhost:3000/api/ai/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${proToken}`,
      },
      body: JSON.stringify({ imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }),
    });

    const proRes = await screenshotPost(proReq);
    // Should NOT be 403 or 401
    expect(proRes.status).not.toBe(403);
    expect(proRes.status).not.toBe(401);
  });
});
