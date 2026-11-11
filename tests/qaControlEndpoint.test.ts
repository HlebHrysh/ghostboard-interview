import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/qa/control/route';
import { getSessionUser, getUserByEmail, getAllPayments } from '../src/lib/serverDb';

describe('QA Control Endpoint (/api/qa/control)', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_QA_MODE = 'true';
    process.env.ENABLE_PROD_SIMULATOR = 'true';
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('blocks GET requests with 403 when QA mode is disabled', async () => {
    delete process.env.NEXT_PUBLIC_QA_MODE;
    delete process.env.ENABLE_PROD_SIMULATOR;

    const req = new NextRequest('http://localhost:3000/api/qa/control');
    const res = await GET(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe('QA_DISABLED');
  });

  it('blocks POST requests with 403 when QA mode is disabled', async () => {
    delete process.env.NEXT_PUBLIC_QA_MODE;
    delete process.env.ENABLE_PROD_SIMULATOR;

    const req = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      body: JSON.stringify({ action: 'seed_test_user' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns complete infrastructure status matrix on GET probe', async () => {
    const req = new NextRequest('http://localhost:3000/api/qa/control');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.qaMode).toBe(true);
    expect(data.infrastructure).toBeDefined();
    expect(data.infrastructure.database).toBeDefined();
    expect(data.infrastructure.redis).toBeDefined();
    expect(data.infrastructure.gemini).toBeDefined();
    expect(data.infrastructure.deepgram).toBeDefined();
    expect(data.infrastructure.stripe).toBeDefined();
  });

  it('action: "seed_test_user" creates or logs in persistent test user with real session', async () => {
    const req = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed_test_user' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe('qa@ghostboard.ai');
    expect(data.token).toBeDefined();

    // Verify session actually exists in DB
    const dbUser = await getSessionUser(data.token);
    expect(dbUser).not.toBeNull();
    expect(dbUser?.email).toBe('qa@ghostboard.ai');

    // Verify cookie was set
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('ghostboard_session');
  });

  it('action: "set_plan" updates user plan in database and session', async () => {
    // 1. Seed user first
    const seedReq = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed_test_user' }),
    });
    const seedRes = await POST(seedReq);
    const { token } = await seedRes.json();

    // 2. Set plan to free
    const freeReq = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'set_plan', plan: 'free' }),
    });
    const freeRes = await POST(freeReq);
    expect(freeRes.status).toBe(200);
    const freeData = await freeRes.json();
    expect(freeData.plan).toBe('free');

    const checkFree = await getSessionUser(token);
    expect(checkFree?.plan).toBe('free');

    // 3. Set plan to lifetime
    const ltReq = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'set_plan', plan: 'lifetime' }),
    });
    const ltRes = await POST(ltReq);
    expect(ltRes.status).toBe(200);
    const ltData = await ltRes.json();
    expect(ltData.plan).toBe('lifetime');

    const checkLt = await getSessionUser(token);
    expect(checkLt?.plan).toBe('lifetime');
  });

  it('action: "simulate_webhook_payment" upgrades plan and records payment in DB', async () => {
    // 1. Seed user first
    const seedReq = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed_test_user' }),
    });
    const seedRes = await POST(seedReq);
    const { token } = await seedRes.json();

    // 2. Simulate payment for lifetime
    const payReq = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'simulate_webhook_payment', plan: 'lifetime' }),
    });
    const payRes = await POST(payReq);
    expect(payRes.status).toBe(200);
    const payData = await payRes.json();
    expect(payData.success).toBe(true);
    expect(payData.upgradedPlan).toBe('lifetime');
    expect(payData.payment).toBeDefined();
    expect(payData.payment.amountCents).toBe(9900);

    // Verify payment in serverDb
    const payments = await getAllPayments();
    const qaPayment = payments.find((p) => p.email === 'qa@ghostboard.ai');
    expect(qaPayment).toBeDefined();
    expect(qaPayment?.plan).toBe('lifetime');
  });

  it('action: "reset_usage" resets trial questions counter in database', async () => {
    // 1. Seed user
    const seedReq = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed_test_user' }),
    });
    const seedRes = await POST(seedReq);
    const { token } = await seedRes.json();

    // 2. Reset usage
    const resetReq = new NextRequest('http://localhost:3000/api/qa/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'reset_usage' }),
    });
    const resetRes = await POST(resetReq);
    expect(resetRes.status).toBe(200);
    const resetData = await resetRes.json();
    expect(resetData.success).toBe(true);
    expect(resetData.trialQuestionsUsed).toBe(0);
  });
});
