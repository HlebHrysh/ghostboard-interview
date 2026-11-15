import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDevTelemetry } from '../src/app/api/dev/telemetry/route';
import { POST as postDevAction } from '../src/app/api/dev/action/route';
import { PATCH as patchUserRole } from '../src/app/api/admin/users/[id]/role/route';
import { createAdminToken } from '../src/lib/adminGuard';
import {
  banUser,
  createSession,
  createUser,
  deleteSession,
  deleteUser,
  findOrCreateUser,
  getSessionUser,
  getUserById,
  incrementUserTrialQuestions,
  invalidateSessionUserCache,
} from '../src/lib/serverDb';
import {
  clearDevOverrides,
  DEV_PLAN_OVERRIDE_COOKIE,
  getEffectiveEntitlements,
  hasDeveloperAccess,
  resolveEffectivePlan,
  signDevCookieValue,
  verifyDevCookieValue,
} from '../src/lib/devGuard';
import {
  isModelCircuitBroken,
  resetModelCircuitBreaker,
  resetModelHealth,
  tripModelCircuitBreaker,
} from '../src/lib/geminiApi';
import { resetRateLimits } from '../src/lib/rateLimit';

describe('Developer RBAC, Admin Role Assignment & Dev Control API', () => {
  const TEST_IP = '127.0.0.91';
  const createdUserIds: string[] = [];
  const createdTokens: string[] = [];

  beforeEach(() => {
    resetRateLimits();
    clearDevOverrides();
    resetModelHealth();
    resetModelCircuitBreaker();
  });

  afterEach(() => {
    resetRateLimits();
    clearDevOverrides();
  });

  afterAll(async () => {
    for (const token of createdTokens) {
      await deleteSession(token).catch(() => {});
    }
    for (const id of createdUserIds) {
      await deleteUser(id).catch(() => {});
    }
    invalidateSessionUserCache();
  });

  async function createTestUserWithSession(plan: string = 'free') {
    const email = `rbac_dev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@ghostboard.ai`;
    const user = await createUser(email, 'RBAC Test User', plan);
    createdUserIds.push(user.id);
    const session = await createSession(user.id, 'web');
    createdTokens.push(session.token);
    return { user, token: session.token };
  }

  it('prevents self-assignment of elevated roles via public createUser / findOrCreateUser', async () => {
    const email1 = `self_reg_dev_${Date.now()}@ghostboard.ai`;
    const u1 = await createUser(email1, 'Attempt Dev', 'free', 'developer');
    createdUserIds.push(u1.id);
    expect(u1.role).toBe('user');
    expect(hasDeveloperAccess(u1)).toBe(false);

    const email2 = `self_oauth_admin_${Date.now()}@ghostboard.ai`;
    const u2 = await findOrCreateUser(email2, 'Attempt Admin', 'admin');
    createdUserIds.push(u2.id);
    expect(u2.role).toBe('user');
    expect(hasDeveloperAccess(u2)).toBe(false);
  });

  it('returns 403 Forbidden for unauthenticated and regular user requests even with forged headers or query params', async () => {
    const { user, token } = await createTestUserWithSession('pro');
    expect(user.role).toBe('user');
    expect(hasDeveloperAccess(user)).toBe(false);

    // 1. Unauthenticated with forged escalation headers & query params
    const unauthReq = new NextRequest(
      'http://localhost:3000/api/dev/telemetry?role=developer&dev=1&admin=true',
      {
        headers: {
          'cf-connecting-ip': TEST_IP,
          'x-ghostboard-role': 'developer',
          'x-user-role': 'admin',
          'x-dev-override': 'true',
          'x-ghostboard-client': 'studio-session',
        },
      }
    );
    const unauthRes = await getDevTelemetry(unauthReq);
    expect(unauthRes.status).toBe(403);

    // 2. Authenticated regular user ('user' role, even with 'pro' billing plan) + forged headers
    const regularTelemetryReq = new NextRequest(
      'http://localhost:3000/api/dev/telemetry?role=developer&override=lifetime',
      {
        headers: {
          cookie: `ghostboard_session=${token}; ghostboard_dev_plan_override=lifetime; ghostboard_admin_session=authenticated`,
          authorization: `Bearer ${token}`,
          'cf-connecting-ip': TEST_IP,
          'x-ghostboard-role': 'developer',
          'x-user-role': 'developer',
          'x-dev-override': '1',
        },
      }
    );
    const regularTelemetryRes = await getDevTelemetry(regularTelemetryReq);
    expect(regularTelemetryRes.status).toBe(403);

    // 3. Regular user attempting POST /api/dev/action with forged headers
    const regularActionReq = new NextRequest(
      'http://localhost:3000/api/dev/action?role=developer',
      {
        method: 'POST',
        headers: {
          cookie: `ghostboard_session=${token}`,
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
          'x-ghostboard-role': 'developer',
        },
        body: JSON.stringify({ action: 'flush_caches' }),
      }
    );
    const regularActionRes = await postDevAction(regularActionReq);
    expect(regularActionRes.status).toBe(403);
  });

  it('requires authenticated admin session for PATCH /api/admin/users/[id]/role', async () => {
    const { user } = await createTestUserWithSession('free');

    const unauthReq = new NextRequest(`http://localhost:3000/api/admin/users/${user.id}/role`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': TEST_IP,
      },
      body: JSON.stringify({ role: 'developer' }),
    });
    const unauthRes = await patchUserRole(unauthReq, {
      params: Promise.resolve({ id: user.id }),
    });
    expect(unauthRes.status).toBe(401);

    const invalidRoleReq = new NextRequest(`http://localhost:3000/api/admin/users/${user.id}/role`, {
      method: 'PATCH',
      headers: {
        cookie: `ghostboard_admin_session=${await createAdminToken()}`,
        'content-type': 'application/json',
        'cf-connecting-ip': TEST_IP,
      },
      body: JSON.stringify({ role: 'superroot' }),
    });
    const invalidRoleRes = await patchUserRole(invalidRoleReq, {
      params: Promise.resolve({ id: user.id }),
    });
    expect(invalidRoleRes.status).toBe(400);
  });

  it('allows admin to promote user to developer, immediately invalidates L1 cache, grants unlimited Pro/Lifetime, and supports paywall simulation', async () => {
    const { user, token } = await createTestUserWithSession('free');

    // Warm L1 sessionUserCache as regular 'user'
    const cachedBefore = await getSessionUser(token);
    expect(cachedBefore?.role).toBe('user');
    expect(resolveEffectivePlan(cachedBefore)).toBe('free');

    // Admin promotes user -> 'developer'
    const adminToken = await createAdminToken();
    const promoteReq = new NextRequest(`http://localhost:3000/api/admin/users/${user.id}/role`, {
      method: 'PATCH',
      headers: {
        cookie: `ghostboard_admin_session=${adminToken}`,
        'content-type': 'application/json',
        'cf-connecting-ip': TEST_IP,
      },
      body: JSON.stringify({ role: 'developer' }),
    });
    const promoteRes = await patchUserRole(promoteReq, {
      params: Promise.resolve({ id: user.id }),
    });
    expect(promoteRes.status).toBe(200);
    const promoteBody = await promoteRes.json();
    expect(promoteBody.success).toBe(true);
    expect(promoteBody.role).toBe('developer');
    expect(promoteBody.user.role).toBe('developer');

    // Same existing session token immediately sees developer role without relogging (L1 cache invalidated)
    const sessionAfter = await getSessionUser(token);
    expect(sessionAfter?.role).toBe('developer');
    expect(hasDeveloperAccess(sessionAfter)).toBe(true);

    // Unlimited Pro / Lifetime entitlements granted automatically even though DB plan === 'free'
    expect(sessionAfter?.plan).toBe('free');
    expect(resolveEffectivePlan(sessionAfter)).toBe('lifetime');
    const devEntitlements = getEffectiveEntitlements(sessionAfter);
    expect(devEntitlements.isDeveloper).toBe(true);
    expect(devEntitlements.aiStreamsUnlimited).toBe(true);
    expect(devEntitlements.unlimitedDuration).toBe(true);
    expect(devEntitlements.ocrScreenshots).toBe(true);
    expect(devEntitlements.desktopSync).toBe(true);
    expect(devEntitlements.panicShield).toBe(true);
    expect(devEntitlements.mockInterview).toBe(true);

    // Developer can now access GET /api/dev/telemetry
    const devTelemetryReq = new NextRequest('http://localhost:3000/api/dev/telemetry', {
      headers: {
        cookie: `ghostboard_session=${token}`,
        'cf-connecting-ip': TEST_IP,
      },
    });
    const devTelemetryRes = await getDevTelemetry(devTelemetryReq);
    expect(devTelemetryRes.status).toBe(200);
    const telemetry = await devTelemetryRes.json();
    expect(telemetry.developer.role).toBe('developer');
    expect(telemetry.developer.effectivePlan).toBe('lifetime');
    expect(telemetry.developer.entitlements.ocrScreenshots).toBe(true);

    // Simulate FREE paywall via POST /api/dev/action { action: 'override_plan', plan: 'free' }
    const spoofFreeReq = new NextRequest('http://localhost:3000/api/dev/action', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'cf-connecting-ip': TEST_IP,
      },
      body: JSON.stringify({ action: 'override_plan', plan: 'free' }),
    });
    const spoofFreeRes = await postDevAction(spoofFreeReq);
    expect(spoofFreeRes.status).toBe(200);
    const spoofData = await spoofFreeRes.json();
    expect(spoofData.effectivePlan).toBe('free');
    expect(spoofData.entitlements.ocrScreenshots).toBe(false);
    expect(spoofData.entitlements.aiStreamsUnlimited).toBe(false);

    // Server helper resolveEffectivePlan reflects active free paywall simulation
    expect(resolveEffectivePlan(sessionAfter)).toBe('free');
    // Underlying billing plan remains untouched
    const dbRecord = await getUserById(user.id);
    expect(dbRecord?.plan).toBe('free');

    // Reset back to Dev Unlimited
    const resetPlanReq = new NextRequest('http://localhost:3000/api/dev/action', {
      method: 'POST',
      headers: {
        cookie: `ghostboard_session=${token}`,
        'content-type': 'application/json',
        'cf-connecting-ip': TEST_IP,
      },
      body: JSON.stringify({ action: 'override_plan', plan: 'reset_to_dev_unlimited' }),
    });
    const resetPlanRes = await postDevAction(resetPlanReq);
    expect(resetPlanRes.status).toBe(200);
    expect(resolveEffectivePlan(sessionAfter)).toBe('lifetime');

    // Admin revokes developer role -> immediate 403 on next request without relogging
    const revokeReq = new NextRequest(`http://localhost:3000/api/admin/users/${user.id}/role`, {
      method: 'PATCH',
      headers: {
        cookie: `ghostboard_admin_session=${await createAdminToken()}`,
        'content-type': 'application/json',
        'cf-connecting-ip': TEST_IP,
      },
      body: JSON.stringify({ role: 'user' }),
    });
    const revokeRes = await patchUserRole(revokeReq, {
      params: Promise.resolve({ id: user.id }),
    });
    expect(revokeRes.status).toBe(200);

    const revokedSessionUser = await getSessionUser(token);
    expect(revokedSessionUser?.role).toBe('user');
    expect(hasDeveloperAccess(revokedSessionUser)).toBe(false);
    expect(resolveEffectivePlan(revokedSessionUser)).toBe('free');

    const postRevokeTelemetryRes = await getDevTelemetry(
      new NextRequest('http://localhost:3000/api/dev/telemetry', {
        headers: { cookie: `ghostboard_session=${token}`, 'cf-connecting-ip': TEST_IP },
      })
    );
    expect(postRevokeTelemetryRes.status).toBe(403);
  });

  it('supports flush_caches, reset_quotas, force_model, and blocks cross-site origin on /api/dev/*', async () => {
    const { user, token } = await createTestUserWithSession('free');

    // Promote user to developer
    await patchUserRole(
      new NextRequest(`http://localhost:3000/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          cookie: `ghostboard_admin_session=${await createAdminToken()}`,
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
        },
        body: JSON.stringify({ role: 'developer' }),
      }),
      { params: Promise.resolve({ id: user.id }) }
    );

    // 1. Cross-site origin rejected with 403
    const badOriginRes = await postDevAction(
      new NextRequest('http://localhost:3000/api/dev/action', {
        method: 'POST',
        headers: {
          cookie: `ghostboard_session=${token}`,
          origin: 'https://evil-attacker.example.com',
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
        },
        body: JSON.stringify({ action: 'flush_caches' }),
      })
    );
    expect(badOriginRes.status).toBe(403);

    // 2. Trip AI circuit breaker, then flush_caches resets it
    tripModelCircuitBreaker('gemini-3.8-flash', 15000);
    expect(isModelCircuitBroken('gemini-3.8-flash')).toBe(true);

    const flushRes = await postDevAction(
      new NextRequest('http://localhost:3000/api/dev/action', {
        method: 'POST',
        headers: {
          cookie: `ghostboard_session=${token}`,
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
        },
        body: JSON.stringify({ action: 'flush_caches' }),
      })
    );
    expect(flushRes.status).toBe(200);
    expect(isModelCircuitBroken('gemini-3.8-flash')).toBe(false);

    // 3. Increment trial questions then reset_quotas
    await incrementUserTrialQuestions(user.id);
    const resetQuotaRes = await postDevAction(
      new NextRequest('http://localhost:3000/api/dev/action', {
        method: 'POST',
        headers: {
          cookie: `ghostboard_session=${token}`,
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
        },
        body: JSON.stringify({ action: 'reset_quotas' }),
      })
    );
    expect(resetQuotaRes.status).toBe(200);
    const afterQuota = await getUserById(user.id);
    expect(afterQuota?.trialQuestionsUsed ?? 0).toBe(0);

    // 4. force_model reflected in telemetry
    const forceModelRes = await postDevAction(
      new NextRequest('http://localhost:3000/api/dev/action', {
        method: 'POST',
        headers: {
          cookie: `ghostboard_session=${token}`,
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
        },
        body: JSON.stringify({ action: 'force_model', model: 'gemini-2.5-flash' }),
      })
    );
    expect(forceModelRes.status).toBe(200);

    const telemetryRes = await getDevTelemetry(
      new NextRequest('http://localhost:3000/api/dev/telemetry', {
        headers: {
          cookie: `ghostboard_session=${token}`,
          'cf-connecting-ip': TEST_IP,
        },
      })
    );
    expect(telemetryRes.status).toBe(200);
    const telemetryJson = await telemetryRes.json();
    expect(telemetryJson.ai.forcedModel).toBe('gemini-2.5-flash');
  });

  it('grants developer access to admin role and immediately blocks banned developer accounts', async () => {
    const { user, token } = await createTestUserWithSession('free');

    // Promote user to admin
    const promoteAdminRes = await patchUserRole(
      new NextRequest(`http://localhost:3000/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          cookie: `ghostboard_admin_session=${await createAdminToken()}`,
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
        },
        body: JSON.stringify({ role: 'admin' }),
      }),
      { params: Promise.resolve({ id: user.id }) }
    );
    expect(promoteAdminRes.status).toBe(200);

    const adminUser = await getSessionUser(token);
    expect(hasDeveloperAccess(adminUser)).toBe(true);
    expect(resolveEffectivePlan(adminUser)).toBe('lifetime');

    const telemetryOk = await getDevTelemetry(
      new NextRequest('http://localhost:3000/api/dev/telemetry', {
        headers: {
          cookie: `ghostboard_session=${token}`,
          'cf-connecting-ip': TEST_IP,
        },
      })
    );
    expect(telemetryOk.status).toBe(200);

    // Banning immediately blocks developer privileges
    await banUser(user.id, true);
    const bannedUser = await getUserById(user.id);
    expect(hasDeveloperAccess(bannedUser)).toBe(false);

    const telemetryBlocked = await getDevTelemetry(
      new NextRequest('http://localhost:3000/api/dev/telemetry', {
        headers: {
          cookie: `ghostboard_session=${token}`,
          'cf-connecting-ip': TEST_IP,
        },
      })
    );
    expect(telemetryBlocked.status).toBe(403);
  });

  it('hydrates signed dev override cookies on cold worker and rejects tampered or cross-user cookies', async () => {
    const { user, token } = await createTestUserWithSession('free');

    await patchUserRole(
      new NextRequest(`http://localhost:3000/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          cookie: `ghostboard_admin_session=${await createAdminToken()}`,
          'content-type': 'application/json',
          'cf-connecting-ip': TEST_IP,
        },
        body: JSON.stringify({ role: 'developer' }),
      }),
      { params: Promise.resolve({ id: user.id }) }
    );

    const signedCookie = signDevCookieValue(user.id, 'plan', 'free');
    expect(verifyDevCookieValue(user.id, 'plan', signedCookie)).toBe('free');
    expect(verifyDevCookieValue('other-user-id', 'plan', signedCookie)).toBeNull();
    expect(verifyDevCookieValue(user.id, 'plan', 'free.tampered_sig')).toBeNull();

    // Simulate cold worker where globalThis override map was cleared
    clearDevOverrides(user.id);
    const hydratedTelemetryRes = await getDevTelemetry(
      new NextRequest('http://localhost:3000/api/dev/telemetry', {
        headers: {
          cookie: `ghostboard_session=${token}; ${DEV_PLAN_OVERRIDE_COOKIE}=${signedCookie}`,
          'cf-connecting-ip': TEST_IP,
        },
      })
    );
    expect(hydratedTelemetryRes.status).toBe(200);
    const hydratedJson = await hydratedTelemetryRes.json();
    expect(hydratedJson.developer.effectivePlan).toBe('free');
    expect(hydratedJson.meta.telemetryLatencyMs).toBeTypeOf('number');
  });

  it('immediately evicts L1 sessionUserCache on deleteUser', async () => {
    const { user, token } = await createTestUserWithSession('free');

    // Warm L1 session cache
    const cached = await getSessionUser(token);
    expect(cached?.id).toBe(user.id);

    // Deleting user immediately invalidates L1 session cache
    const deleted = await deleteUser(user.id);
    expect(deleted).toBe(true);
    const afterDelete = await getSessionUser(token);
    expect(afterDelete).toBeNull();
  });
});
