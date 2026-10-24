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
});
