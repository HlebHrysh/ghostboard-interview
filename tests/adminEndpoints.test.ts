import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getStats } from '../src/app/api/admin/stats/route';
import { GET as getUsers, POST as createUser } from '../src/app/api/admin/users/route';
import { PATCH as updateUser, DELETE as deleteUser } from '../src/app/api/admin/users/[id]/route';
import { GET as getSessions, DELETE as deleteSession } from '../src/app/api/admin/sessions/route';
import { GET as getSystem } from '../src/app/api/admin/system/route';
import { createAdminToken } from '../src/lib/adminGuard';

describe('Admin API Endpoints & Operations', () => {
  const adminHeaders = {
    cookie: `ghostboard_admin_session=${createAdminToken()}`,
  };

  it('rejects unauthenticated requests to admin stats', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stats');
    const res = await getStats(req);
    expect(res.status).toBe(401);
  });

  it('rejects forged plain string "authenticated" cookie', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/stats', {
      headers: { cookie: 'ghostboard_admin_session=authenticated' },
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

  it('creates and manages a candidate via admin user API', async () => {
    const adminTestEmail = `admin_test_${Date.now()}@ghostboard.ai`;
    // 1. Create candidate
    const createReq = new NextRequest('http://localhost:3000/api/admin/users', {
      method: 'POST',
      headers: { ...adminHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: adminTestEmail,
        name: 'Test Candidate',
        role: 'Fullstack Engineer',
        plan: 'pro',
      }),
    });

    const createRes = await createUser(createReq);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    expect(createData.user.email).toBe(adminTestEmail);
    expect(createData.user.plan).toBe('pro');

    const userId = createData.user.id;

    // 2. Update candidate plan
    const updateReq = new NextRequest(`http://localhost:3000/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({ plan: 'lifetime', name: 'Updated Candidate' }),
    });

    const updateRes = await updateUser(updateReq, { params: Promise.resolve({ id: userId }) });
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.user.plan).toBe('lifetime');
    expect(updateData.user.name).toBe('Updated Candidate');

    // 3. Delete candidate
    const deleteReq = new NextRequest(`http://localhost:3000/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });

    const deleteRes = await deleteUser(deleteReq, { params: Promise.resolve({ id: userId }) });
    expect(deleteRes.status).toBe(200);
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
