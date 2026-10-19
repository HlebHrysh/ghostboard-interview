import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getStats } from '../src/app/api/admin/stats/route';
import { GET as getMetrics } from '../src/app/api/admin/metrics/route';
import { GET as getUsers, POST as createUser } from '../src/app/api/admin/users/route';
import { PATCH as updateUser, DELETE as deleteUser } from '../src/app/api/admin/users/[id]/route';
import { POST as executeUserAction } from '../src/app/api/admin/users/[id]/action/route';
import { GET as getSessions } from '../src/app/api/admin/sessions/route';
import { GET as getSystem } from '../src/app/api/admin/system/route';
import { POST as clientHeartbeat } from '../src/app/api/client/heartbeat/route';
import { createAdminToken } from '../src/lib/adminGuard';
import { resetRateLimits } from '../src/lib/rateLimit';

describe('Admin API Endpoints & Operations', () => {
  // Dedicated test IP ensures complete rate limiter isolation across parallel vitest workers
  const TEST_ADMIN_IP = '127.0.0.88';
  let adminHeaders: Record<string, string>;

  beforeEach(async () => {
    resetRateLimits();
    adminHeaders = {
      cookie: `ghostboard_admin_session=${await createAdminToken()}`,
      'cf-connecting-ip': TEST_ADMIN_IP,
    };
  });

  afterEach(() => {
    resetRateLimits();
  });

  it('rejects unauthenticated requests to admin stats', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stats', {
      headers: { 'cf-connecting-ip': TEST_ADMIN_IP },
    });
    const res = await getStats(req);
    expect(res.status).toBe(401);
  });

  it('rejects forged plain string "authenticated" cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stats', {
      headers: {
        cookie: 'ghostboard_admin_session=authenticated',
        'cf-connecting-ip': TEST_ADMIN_IP,
      },
    });
    const res = await getStats(req);
    expect(res.status).toBe(401);
  });

  it('allows authenticated admin to fetch stats with enriched metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stats', {
      headers: adminHeaders,
    });
    const res = await getStats(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('totalUsers');
    expect(data).toHaveProperty('conversionRate');
    expect(data).toHaveProperty('recentActivity');
    expect(Array.isArray(data.weekSessions)).toBe(true);
  });

  it('fetches high-performance executive metrics from /api/admin/metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/metrics?range=30d', {
      headers: adminHeaders,
    });
    const res = await getMetrics(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('timeSeries');
    expect(data).toHaveProperty('planBreakdown');
    expect(data.summary).toHaveProperty('totalUsers');
    expect(data.summary).toHaveProperty('dau');
    expect(data.summary).toHaveProperty('mau');
    expect(data.summary).toHaveProperty('stickinessRatio');
    expect(data.summary).toHaveProperty('liveActiveNow');
    expect(data.summary).toHaveProperty('aiLatencyP50');
    expect(Array.isArray(data.timeSeries)).toBe(true);
  });

  it('supports pagination and search filtering in /api/admin/users', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/users?page=1&limit=5', {
      headers: adminHeaders,
    });
    const res = await getUsers(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.users.length).toBeLessThanOrEqual(5);
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('totalPages');
  });

  it('creates, manages, and executes administrative actions on candidates', async () => {
    const adminTestEmail = `action_test_${Date.now()}@ghostboard.ai`;

    // 1. Create candidate
    const createReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { ...adminHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminTestEmail,
        name: 'Action Test Candidate',
        role: 'Fullstack Engineer',
        plan: 'free',
      }),
    });

    const createRes = await createUser(createReq);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    const userId = createData.user.id;

    // 2. Grant VIP via Action Endpoint
    const grantVipReq = new NextRequest(`http://localhost:3000/api/admin/users/${userId}/action`, {
      method: 'POST',
      headers: { ...adminHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'grant_vip' }),
    });
    const grantVipRes = await executeUserAction(grantVipReq, { params: Promise.resolve({ id: userId }) });
    expect(grantVipRes.status).toBe(200);
    const vipData = await grantVipRes.json();
    expect(vipData.success).toBe(true);
    expect(vipData.user.plan).toBe('lifetime');

    // 3. Toggle ban
    const banReq = new NextRequest(`http://localhost:3000/api/admin/users/${userId}/action`, {
      method: 'POST',
      headers: { ...adminHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_ban' }),
    });
    const banRes = await executeUserAction(banReq, { params: Promise.resolve({ id: userId }) });
    expect(banRes.status).toBe(200);
    const banData = await banRes.json();
    expect(banData.user.isBanned).toBe(true);

    // 4. Revoke plan to free
    const revokeReq = new NextRequest(`http://localhost:3000/api/admin/users/${userId}/action`, {
      method: 'POST',
      headers: { ...adminHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'revoke_plan' }),
    });
    const revokeRes = await executeUserAction(revokeReq, { params: Promise.resolve({ id: userId }) });
    expect(revokeRes.status).toBe(200);
    const revokeData = await revokeRes.json();
    expect(revokeData.user.plan).toBe('free');

    // 5. Delete candidate
    const deleteReq = new NextRequest(`http://localhost:3000/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    const deleteRes = await deleteUser(deleteReq, { params: Promise.resolve({ id: userId }) });
    expect(deleteRes.status).toBe(200);
  });

  it('processes client heartbeat pings', async () => {
    const req = new NextRequest('http://localhost:3000/api/client/heartbeat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': TEST_ADMIN_IP },
      body: JSON.stringify({ clientType: 'web' }),
    });
    const res = await clientHeartbeat(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data).toHaveProperty('timestamp');
  });

  it('fetches system health and masked environment data', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/system', {
      headers: adminHeaders,
    });
    const res = await getSystem(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.services).toHaveProperty('gemini');
    expect(data.services).toHaveProperty('deepgram');
    expect(data.services).toHaveProperty('stripe');
    expect(data.runtime).toHaveProperty('nodeVersion');
  });
});
