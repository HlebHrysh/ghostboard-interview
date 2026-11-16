import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  EnvConfigError,
  assertProductionEnv,
  assertSimulatorAllowed,
  failDbInProduction,
  isMemoryDbAllowed,
  isProdSimulatorAllowed,
  validateProductionEnv,
} from '../src/lib/envGuard';

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe('envGuard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows memory DB and simulator outside production', () => {
    expect(isMemoryDbAllowed(env({ NODE_ENV: 'development' }))).toBe(true);
    expect(isMemoryDbAllowed(env({ NODE_ENV: 'test' }))).toBe(true);
    expect(isProdSimulatorAllowed(env({ NODE_ENV: 'test' }))).toBe(true);
  });

  it('blocks memory DB and simulator in production unless explicitly enabled', () => {
    expect(isMemoryDbAllowed(env({ NODE_ENV: 'production' }))).toBe(false);
    expect(isMemoryDbAllowed(env({ NODE_ENV: 'production', ALLOW_MEMORY_DB: 'true' }))).toBe(true);
    expect(isProdSimulatorAllowed(env({ NODE_ENV: 'production' }))).toBe(false);
    expect(isProdSimulatorAllowed(env({ NODE_ENV: 'production', NEXT_PUBLIC_QA_MODE: 'true' }))).toBe(false);
    expect(isProdSimulatorAllowed(env({ NODE_ENV: 'production', ENABLE_PROD_SIMULATOR: 'true' }))).toBe(true);
  });

  it('reports missing production infra env and throws', () => {
    const res = validateProductionEnv(env({ NODE_ENV: 'production' }));
    expect(res.ok).toBe(false);
    expect(res.missing).toEqual(['DATABASE_URL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']);
    expect(() => assertProductionEnv(env({ NODE_ENV: 'production' }))).toThrow(EnvConfigError);
    expect(
      validateProductionEnv(
        env({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://x',
          UPSTASH_REDIS_REST_URL: 'https://r',
          UPSTASH_REDIS_REST_TOKEN: 't',
        })
      ).ok
    ).toBe(true);
  });

  it('failDbInProduction rethrows DB errors only in production (P2025 is ignored)', () => {
    expect(() => failDbInProduction(new Error('boom'))).not.toThrow();
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => failDbInProduction(new Error('connection refused'))).toThrow(/refusing to fall back/);
    expect(() => failDbInProduction({ code: 'P2025' })).not.toThrow();
    vi.stubEnv('ALLOW_MEMORY_DB', 'true');
    expect(() => failDbInProduction(new Error('boom'))).not.toThrow();
  });

  it('assertSimulatorAllowed throws a configuration error in production', () => {
    expect(() => assertSimulatorAllowed('Email')).not.toThrow();
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => assertSimulatorAllowed('Email')).toThrow(EnvConfigError);
  });
});

describe('serverDb production fail-fast', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('refuses to use in-memory storage in production without DATABASE_URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', '');
    const db = await import('../src/lib/serverDb');
    await expect(db.getUserByEmail('a@b.c')).rejects.toThrow(EnvConfigError);
    await expect(db.createUser('a@b.c')).rejects.toThrow(/DATABASE_URL/);
  });

  it('throws EnvConfigError on write mutations in production when circuit breaker is active even if DATABASE_URL is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgresql://example:5432/db');
    const db = await import('../src/lib/serverDb');
    db.tripDbCircuitBreaker(5000);
    try {
      await expect(db.createUser('prod-cb@example.com')).rejects.toThrow(EnvConfigError);
      await expect(db.createSession('usr_1', 'web')).rejects.toThrow(EnvConfigError);
      await expect(
        db.saveInterviewSession('usr_1', { durationSec: 10, items: [] })
      ).rejects.toThrow(EnvConfigError);
      await expect(
        db.logPayment({
          userId: 'usr_1',
          email: 'prod-cb@example.com',
          plan: 'pro',
          amountCents: 1500,
          status: 'succeeded',
        })
      ).rejects.toThrow(EnvConfigError);
    } finally {
      db.resetDbCircuitBreaker();
    }
  });
});

describe('syncStore (Redis backend)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock('@upstash/redis');
  });

  it('persists state in Redis with a 4h TTL', async () => {
    const kv = new Map<string, unknown>();
    const setCalls: Array<{ key: string; opts?: Record<string, unknown> }> = [];
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async get(key: string) {
          return kv.get(key) ?? null;
        }
        async set(key: string, value: unknown, opts?: Record<string, unknown>) {
          setCalls.push({ key, opts });
          if (opts?.nx && kv.has(key)) return null;
          kv.set(key, value);
          return 'OK';
        }
        async del(key: string) {
          kv.delete(key);
          return 1;
        }
      },
    }));
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    vi.stubEnv('VITEST', '');
    const mod = await import('../src/lib/interviewSyncStore');
    expect(mod.isRedisSyncConfigured()).toBe(true);

    await mod.syncStore.addOrUpdateQA(
      { id: 'q_1700000000000', question: 'Q?', startHook: 'h', quickAnswer: 'a', hints: [] },
      undefined,
      'user-1'
    );
    await mod.syncStore.registerDevice('phone', true, 'user-1');

    const state = await mod.syncStore.getState('user-1');
    expect(state.qas).toHaveLength(1);
    expect(state.connectedDevices?.phone).toBe(true);
    expect((await mod.syncStore.getState('user-2')).qas).toHaveLength(0);

    const stateWrites = setCalls.filter((c) => c.key.startsWith('ghostboard:sync:state:'));
    expect(stateWrites.length).toBeGreaterThan(0);
    expect(stateWrites.every((c) => c.opts?.ex === 4 * 60 * 60)).toBe(true);
    // locks are released
    expect([...kv.keys()].some((k) => k.startsWith('ghostboard:sync:lock:'))).toBe(false);
  });

  it('throws in production when Redis is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    const mod = await import('../src/lib/interviewSyncStore');
    await expect(mod.syncStore.getState('u')).rejects.toThrow(/requires Upstash Redis in production/);
    expect(() => mod.interviewSyncStore.getState()).toThrow(/requires Upstash Redis in production/);
  });

  it('throws EnvConfigError in production when Redis read or write fails', async () => {
    vi.doMock('@upstash/redis', () => ({
      Redis: class {
        async get() {
          throw new Error('redis read timeout');
        }
        async set() {
          throw new Error('redis write timeout');
        }
        async del() {
          return 1;
        }
      },
    }));
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    vi.stubEnv('VITEST', '');
    const mod = await import('../src/lib/interviewSyncStore');
    await expect(mod.syncStore.getState('u')).rejects.toMatchObject({ name: 'EnvConfigError', code: 'ENV_CONFIG_ERROR' });
    await expect(mod.syncStore.registerDevice('desktop', true, 'u')).rejects.toMatchObject({
      name: 'EnvConfigError',
      code: 'ENV_CONFIG_ERROR',
    });
  });
});

describe('production route & mail lockdown', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns 403 on /api/qa/control and redirects /checkout/simulator in production even with NEXT_PUBLIC_QA_MODE=true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_QA_MODE', 'true');
    vi.stubEnv('ENABLE_PROD_SIMULATOR', 'false');

    const { NextRequest } = await import('next/server');
    const qaRoute = await import('../src/app/api/qa/control/route');
    const qaRes = await qaRoute.GET(new NextRequest('https://ghostboard.ai/api/qa/control'));
    expect(qaRes.status).toBe(403);

    const { proxy } = await import('../src/proxy');
    const simRes = await proxy(new NextRequest('https://ghostboard.ai/checkout/simulator'));
    expect(simRes.status).toBe(307);
    expect(simRes.headers.get('location')).toBe('https://ghostboard.ai/pricing?error=simulator_disabled');
  });

  it('rejects unauthenticated desktop headers on /api/ai/interview-sync, /api/desktop/heartbeat, and /api/audio/ensure-stealth in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { NextRequest } = await import('next/server');

    const syncRoute = await import('../src/app/api/ai/interview-sync/route');
    const syncRes = await syncRoute.POST(
      new NextRequest('https://ghostboard.ai/api/ai/interview-sync', {
        method: 'POST',
        headers: { 'x-ghostboard-client': 'desktop-app', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'STATUS', isCapturing: true }),
      })
    );
    expect(syncRes.status).toBe(401);

    const heartbeatRoute = await import('../src/app/api/desktop/heartbeat/route');
    const hbRes = await heartbeatRoute.POST(
      new NextRequest('https://ghostboard.ai/api/desktop/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'launcher' }),
      })
    );
    expect(hbRes.status).toBe(401);

    const stealthRoute = await import('../src/app/api/audio/ensure-stealth/route');
    const stealthRes = await stealthRoute.POST(
      new NextRequest('https://ghostboard.ai/api/audio/ensure-stealth', {
        method: 'POST',
        headers: { 'x-ghostboard-client': 'desktop-app', 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping' }),
      })
    );
    expect(stealthRes.status).toBe(401);
  });

  it('blocks mock console email fallback in production unless ENABLE_PROD_SIMULATOR=true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_QA_MODE', 'true');
    vi.stubEnv('ENABLE_PROD_SIMULATOR', 'false');

    const { sendRetentionEmail } = await import('../src/lib/mail');
    await expect(sendRetentionEmail('user@example.com', 'Alex')).rejects.toMatchObject({
      name: 'EnvConfigError',
      code: 'ENV_CONFIG_ERROR',
    });
  });

  it('returns null from getSessionUser when DB returns null in production instead of crashing on memSessions', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DATABASE_URL', 'postgresql://example:5432/db');
    const db = await import('../src/lib/serverDb');
    const findUniqueSpy = vi.spyOn(db.rawPrisma.session, 'findUnique').mockResolvedValueOnce(null);
    await expect(db.getSessionUser('nonexistent-session-token')).resolves.toBeNull();
    findUniqueSpy.mockRestore();
  });
});
