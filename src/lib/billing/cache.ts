import { Redis } from '@upstash/redis';
import type { Plan } from '@/lib/plans';
import { invalidateSessionUserCache } from '@/lib/serverDb';
import {
  getCachedUserByEmail,
  getCachedUserById,
  setCachedUser,
} from '@/lib/server/users';
import { logger } from '@/lib/logger';
import type { BillingInterval, BillingProvider } from './plans';

const log = logger.child({ component: 'billingCache' });

export interface BillingEntitlement {
  userId: string;
  email: string;
  plan: Plan;
  planExpiresAt: string | null;
  provider: BillingProvider | null;
  billingCycle: BillingInterval | null;
  lastPaymentId: string | null;
  cardTokenAvailable?: boolean;
  updatedAt: number;
}

const ENTITLEMENT_TTL_MS = 10 * 60 * 1000;
const MAX_L1_ENTRIES = 2000;
const REDIS_ENTITLEMENT_PREFIX = 'billing:entitlement:';
const REDIS_LOCK_PREFIX = 'billing:lock:';
const REDIS_MONOBANK_PUBKEY_KEY = 'billing:monobank:pubkey';

export function setBoundedMapEntry<K, V>(
  map: Map<K, V>,
  key: K,
  value: V,
  maxSize = MAX_L1_ENTRIES,
): void {
  if (map.has(key)) {
    map.delete(key);
  } else if (map.size >= maxSize) {
    const oldest = map.keys().next();
    if (!oldest.done) {
      map.delete(oldest.value);
    }
  }
  map.set(key, value);
}

interface BillingCacheGlobalState {
  byUserId: Map<string, { value: BillingEntitlement; expiresAt: number }>;
  byEmail: Map<string, { value: BillingEntitlement; expiresAt: number }>;
  locks: Map<string, number>;
  monobankPubKey: { key: string; fetchedAt: number } | null;
}

const g = globalThis as typeof globalThis & {
  __ghostboardBillingCache?: BillingCacheGlobalState;
};

function getGlobalCache(): BillingCacheGlobalState {
  if (!g.__ghostboardBillingCache) {
    g.__ghostboardBillingCache = {
      byUserId: new Map(),
      byEmail: new Map(),
      locks: new Map(),
      monobankPubKey: null,
    };
  }
  return g.__ghostboardBillingCache;
}

let billingRedisClient: Redis | null = null;

export function isBillingRedisConfigured(): boolean {
  if (process.env.VITEST && process.env.BILLING_FORCE_REDIS !== 'true') {
    return false;
  }
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function getBillingRedis(): Redis | null {
  if (!isBillingRedisConfigured()) {
    return null;
  }
  if (!billingRedisClient) {
    billingRedisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return billingRedisClient;
}

export function setL1BillingEntitlement(entitlement: BillingEntitlement): void {
  const store = getGlobalCache();
  const expiresAt = Date.now() + ENTITLEMENT_TTL_MS;
  const entry = { value: entitlement, expiresAt };
  if (entitlement.userId) {
    setBoundedMapEntry(store.byUserId, entitlement.userId, entry);
  }
  if (entitlement.email) {
    setBoundedMapEntry(store.byEmail, entitlement.email.toLowerCase(), entry);
  }
}

export function getL1BillingEntitlement(
  userId?: string | null,
  email?: string | null,
): BillingEntitlement | null {
  const store = getGlobalCache();
  const now = Date.now();

  if (userId) {
    const entry = store.byUserId.get(userId);
    if (entry) {
      if (entry.expiresAt > now) {
        return entry.value;
      }
      store.byUserId.delete(userId);
    }
  }

  if (email) {
    const normalized = email.toLowerCase();
    const entry = store.byEmail.get(normalized);
    if (entry) {
      if (entry.expiresAt > now) {
        return entry.value;
      }
      store.byEmail.delete(normalized);
    }
  }

  return null;
}

export function clearL1BillingEntitlement(
  userId?: string | null,
  email?: string | null,
): void {
  const store = getGlobalCache();
  if (userId) {
    store.byUserId.delete(userId);
  }
  if (email) {
    store.byEmail.delete(email.toLowerCase());
  }
}

export async function getRedisBillingEntitlement(
  userId: string,
): Promise<BillingEntitlement | null> {
  const redis = getBillingRedis();
  if (!redis) return null;
  try {
    const data = await redis.get<BillingEntitlement>(
      `${REDIS_ENTITLEMENT_PREFIX}${userId}`,
    );
    if (data) {
      setL1BillingEntitlement(data);
      return data;
    }
  } catch (err) {
    log.warn('Failed to read billing entitlement from Redis', { userId }, err);
  }
  return null;
}

export async function invalidateAndRefreshUserL1Caches(params: {
  userId: string;
  email?: string | null;
  plan: Plan;
  planExpiresAt: string | null;
  provider?: BillingProvider | null;
  billingCycle?: BillingInterval | null;
  lastPaymentId?: string | null;
  cardTokenAvailable?: boolean;
}): Promise<BillingEntitlement> {
  const normalizedEmail = (params.email || '').toLowerCase();
  const entitlement: BillingEntitlement = {
    userId: params.userId,
    email: normalizedEmail,
    plan: params.plan,
    planExpiresAt: params.planExpiresAt,
    provider: params.provider ?? null,
    billingCycle: params.billingCycle ?? null,
    lastPaymentId: params.lastPaymentId ?? null,
    cardTokenAvailable: params.cardTokenAvailable ?? false,
    updatedAt: Date.now(),
  };

  // 1. Update L1 billing entitlement cache immediately (<1ms).
  setL1BillingEntitlement(entitlement);

  // 2. Patch in-memory user caches (both by ID and by email) so `getUserById`/`getUserByEmail`
  //    never return stale pre-payment `plan` values.
  const cachedById = getCachedUserById(params.userId);
  if (cachedById) {
    setCachedUser(
      {
        ...cachedById,
        plan: params.plan,
      },
      false,
    );
  }

  if (normalizedEmail) {
    const cachedByEmail = getCachedUserByEmail(normalizedEmail);
    if (cachedByEmail) {
      setCachedUser(
        {
          ...cachedByEmail,
          plan: params.plan,
        },
        false,
      );
    }
  }

  // 3. Purge L1 sessionUserCache (`serverDb.ts`) so active Bearer/cookie sessions
  //    resolve fresh plan status on the very next request without re-logging in.
  invalidateSessionUserCache(undefined, params.userId);

  // 4. Mirror into Upstash Redis for cross-instance propagation when available.
  const redis = getBillingRedis();
  if (redis) {
    try {
      await redis.set(
        `${REDIS_ENTITLEMENT_PREFIX}${params.userId}`,
        entitlement,
        { ex: 86_400 },
      );
    } catch (err) {
      log.warn(
        'Failed to propagate L1 entitlement update to Redis',
        { userId: params.userId },
        err,
      );
    }
  }

  return entitlement;
}

export interface BillingLockHandle {
  acquired: boolean;
  release: () => Promise<void>;
}

/**
 * Acquires a short-lived lock for `billing:lock:<invoiceId>` using Redis SET NX EX
 * with a process-local Map guard for single-instance/dev/test runs.
 */
export async function acquireBillingLock(
  invoiceOrEventId: string,
  ttlSeconds = 30,
): Promise<BillingLockHandle> {
  const cleanId = invoiceOrEventId.trim();
  if (!cleanId) {
    return { acquired: false, release: async () => {} };
  }

  const store = getGlobalCache();
  const now = Date.now();
  if (store.locks.size > 200) {
    for (const [k, exp] of store.locks.entries()) {
      if (exp <= now) store.locks.delete(k);
    }
  }
  const existingExp = store.locks.get(cleanId);
  if (existingExp && existingExp > now) {
    return { acquired: false, release: async () => {} };
  }

  setBoundedMapEntry(store.locks, cleanId, now + ttlSeconds * 1000);

  const redis = getBillingRedis();
  const redisKey = `${REDIS_LOCK_PREFIX}${cleanId}`;

  if (redis) {
    try {
      const result = await redis.set(redisKey, String(now), {
        nx: true,
        ex: ttlSeconds,
      });
      if (result !== 'OK') {
        store.locks.delete(cleanId);
        return { acquired: false, release: async () => {} };
      }
    } catch (err) {
      log.warn('Redis billing lock unavailable; using local lock', { lockKey: redisKey }, err);
    }
  }

  return {
    acquired: true,
    release: async () => {
      store.locks.delete(cleanId);
      if (redis) {
        try {
          await redis.del(redisKey);
        } catch (err) {
          log.warn('Failed to release Redis billing lock', { lockKey: redisKey }, err);
        }
      }
    },
  };
}

export async function getCachedMonobankPubKey(): Promise<string | null> {
  const store = getGlobalCache();
  const now = Date.now();
  if (
    store.monobankPubKey &&
    now - store.monobankPubKey.fetchedAt < 6 * 60 * 60 * 1000
  ) {
    return store.monobankPubKey.key;
  }

  const redis = getBillingRedis();
  if (redis) {
    try {
      const fromRedis = await redis.get<string>(REDIS_MONOBANK_PUBKEY_KEY);
      if (fromRedis) {
        store.monobankPubKey = { key: fromRedis, fetchedAt: now };
        return fromRedis;
      }
    } catch (err) {
      log.warn('Failed to load Monobank pubkey from Redis', undefined, err);
    }
  }

  return null;
}

export async function setCachedMonobankPubKey(key: string): Promise<void> {
  const store = getGlobalCache();
  store.monobankPubKey = { key, fetchedAt: Date.now() };
  const redis = getBillingRedis();
  if (redis) {
    try {
      await redis.set(REDIS_MONOBANK_PUBKEY_KEY, key, { ex: 6 * 60 * 60 });
    } catch (err) {
      log.warn('Failed to cache Monobank pubkey in Redis', undefined, err);
    }
  }
}

export function resetBillingCacheForTests(): void {
  const store = getGlobalCache();
  store.byUserId.clear();
  store.byEmail.clear();
  store.locks.clear();
  store.monobankPubKey = null;
}
