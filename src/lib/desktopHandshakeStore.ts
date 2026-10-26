/**
 * desktopHandshakeStore.ts
 * Manages secure 10-minute pairing handshakes between the Ghostboard Desktop HUD
 * and web-based login / registration.
 *
 * Backends:
 * - Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) in production / cloud
 * - globalThis in-memory Map in development / vitest
 */

import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { isProduction } from './envGuard';
import { logger } from './logger';

const log = logger.child({ component: 'desktopHandshakeStore' });

export interface DesktopHandshakeUser {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role?: string | null;
}

export interface DesktopHandshakeRecord {
  id: string;
  status: 'pending' | 'ready' | 'expired';
  token?: string;
  user?: DesktopHandshakeUser;
  createdAt: number;
  expiresAt: number;
}

export const HANDSHAKE_TTL_SECONDS = 10 * 60; // 10 minutes
const REDIS_HANDSHAKE_PREFIX = 'ghostboard:desktop:handshake:';

// ── In-memory store fallback for dev / tests ──────────────────────────
const g = globalThis as unknown as {
  __desktopHandshakes?: Map<string, DesktopHandshakeRecord>;
};

const memHandshakes = g.__desktopHandshakes || (g.__desktopHandshakes = new Map<string, DesktopHandshakeRecord>());

function isRedisConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    !process.env.VITEST
  );
}

let redisClient: Redis | null = null;
function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisClient;
}

/**
 * Generate cryptographically secure short handshake ID (16 hex chars)
 */
export function generateHandshakeId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Create a new pending handshake for a desktop application instance
 */
export async function createDesktopHandshake(): Promise<DesktopHandshakeRecord> {
  const id = generateHandshakeId();
  const now = Date.now();
  const expiresAt = now + HANDSHAKE_TTL_SECONDS * 1000;

  const record: DesktopHandshakeRecord = {
    id,
    status: 'pending',
    createdAt: now,
    expiresAt,
  };

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(
        `${REDIS_HANDSHAKE_PREFIX}${id}`,
        JSON.stringify(record),
        { ex: HANDSHAKE_TTL_SECONDS }
      );
      return record;
    } catch (err) {
      log.warn('[desktopHandshakeStore] Redis create failed, falling back to memory store:', {
        error: err instanceof Error ? err.message : String(err),
      });
      if (isProduction()) {
        throw new Error('Redis store unavailable in production for desktop handshake');
      }
    }
  }

  // Memory fallback
  memHandshakes.set(id, record);
  return record;
}

/**
 * Bind an authenticated user session token to a pending handshake
 */
export async function bindDesktopHandshake(
  handshakeId: string,
  sessionData: { token: string; user?: DesktopHandshakeUser }
): Promise<DesktopHandshakeRecord | null> {
  if (!handshakeId) return null;
  const now = Date.now();

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const raw = await redis.get<string | DesktopHandshakeRecord>(`${REDIS_HANDSHAKE_PREFIX}${handshakeId}`);
      if (!raw) return null;

      const existing: DesktopHandshakeRecord = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (now > existing.expiresAt) {
        await redis.del(`${REDIS_HANDSHAKE_PREFIX}${handshakeId}`);
        return null;
      }

      const updated: DesktopHandshakeRecord = {
        ...existing,
        status: 'ready',
        token: sessionData.token,
        user: sessionData.user,
      };

      const remainingTtlSec = Math.max(60, Math.floor((existing.expiresAt - now) / 1000));
      await redis.set(
        `${REDIS_HANDSHAKE_PREFIX}${handshakeId}`,
        JSON.stringify(updated),
        { ex: remainingTtlSec }
      );
      return updated;
    } catch (err) {
      log.warn('[desktopHandshakeStore] Redis bind failed, falling back to memory store:', {
        error: err instanceof Error ? err.message : String(err),
      });
      if (isProduction()) {
        throw new Error('Redis store unavailable in production');
      }
    }
  }

  // Memory fallback
  const existing = memHandshakes.get(handshakeId);
  if (!existing || now > existing.expiresAt) {
    memHandshakes.delete(handshakeId);
    return null;
  }

  existing.status = 'ready';
  existing.token = sessionData.token;
  existing.user = sessionData.user;
  memHandshakes.set(handshakeId, existing);
  return existing;
}

/**
 * Poll the status of a desktop handshake
 */
export async function pollDesktopHandshake(
  handshakeId: string
): Promise<DesktopHandshakeRecord | null> {
  if (!handshakeId) return null;
  const now = Date.now();

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const raw = await redis.get<string | DesktopHandshakeRecord>(`${REDIS_HANDSHAKE_PREFIX}${handshakeId}`);
      if (!raw) return null;

      const record: DesktopHandshakeRecord = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (now > record.expiresAt) {
        await redis.del(`${REDIS_HANDSHAKE_PREFIX}${handshakeId}`);
        return null;
      }
      return record;
    } catch (err) {
      log.warn('[desktopHandshakeStore] Redis poll failed, checking memory store:', {
        error: err instanceof Error ? err.message : String(err),
      });
      if (isProduction()) {
        throw new Error('Redis store unavailable in production');
      }
    }
  }

  // Memory fallback
  const record = memHandshakes.get(handshakeId);
  if (!record || now > record.expiresAt) {
    memHandshakes.delete(handshakeId);
    return null;
  }

  return record;
}

/**
 * Invalidate or delete an active handshake
 */
export async function deleteDesktopHandshake(handshakeId: string): Promise<boolean> {
  if (!handshakeId) return false;

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const res = await redis.del(`${REDIS_HANDSHAKE_PREFIX}${handshakeId}`);
      return res > 0;
    } catch {}
  }

  return memHandshakes.delete(handshakeId);
}

export const desktopHandshakeStore = {
  create: createDesktopHandshake,
  bind: bindDesktopHandshake,
  poll: pollDesktopHandshake,
  delete: deleteDesktopHandshake,
};
