import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a new ratelimiter, that allows X requests per window
// We use a dummy fallback for local dev if keys are not set, to avoid crashing.
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN && process.env.NODE_ENV !== 'test' && !process.env.VITEST)
  ? Redis.fromEnv()
  : null;

// Simple IPv4/IPv6 format validator to prevent header injection
function isValidIp(ip: string): boolean {
  if (!ip || ip.length > 45) return false;
  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplified check)
  const ipv6 = /^[0-9a-f:]{2,39}$/i;
  return ipv4.test(ip) || ipv6.test(ip);
}

export function getClientIp(req: NextRequest): string {
  // Cloudflare Connecting IP (most trusted when behind Cloudflare proxy)
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  // x-real-ip is set by trusted reverse proxies (Nginx/Vercel/Cloud Run)
  const realIp = req.headers.get('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // Next.js socket connection IP
  const nextIp = (req as unknown as { ip?: string }).ip;
  if (nextIp && isValidIp(nextIp)) {
    return nextIp;
  }

  // x-forwarded-for: take first IP only (leftmost = original client)
  // Validate format to prevent header injection
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (isValidIp(firstIp)) return firstIp;
  }

  return '127.0.0.1';
}


export function validateOrigin(req: NextRequest): boolean {
  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  if (!origin && !referer) {
    return true;
  }

  // Allow browser extensions (Chrome / Firefox)
  if (origin?.startsWith('chrome-extension://') || origin?.startsWith('moz-extension://')) {
    return true;
  }

  const allowedHosts = [
    host,
    'localhost:3000',
    'localhost:3001',
    'localhost:5173',
    '127.0.0.1:3000',
    '127.0.0.1:3001',
    '127.0.0.1:5173',
    'tauri.localhost',
    'leetcode.com',
  ].filter(Boolean);

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (allowedHosts.includes(originHost) || originHost.endsWith('.leetcode.com')) return true;
    } catch {}
  }

  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (allowedHosts.includes(refererHost) || refererHost.endsWith('.leetcode.com')) return true;
    } catch {}
  }

  return false;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSec: number;
}

const inMemoryStore: Map<string, { count: number; resetAt: number }> =
  ((globalThis as unknown as { __ghostboardRateLimitStore?: Map<string, { count: number; resetAt: number }> }).__ghostboardRateLimitStore ??= new Map<string, { count: number; resetAt: number }>());

// Prevent memory leak by cleaning up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (now > value.resetAt) {
      inMemoryStore.delete(key);
    }
  }
}, 60000);

export function resetRateLimits(): void {
  inMemoryStore.clear();
}

/**
 * Enforces rate limiting per client IP and action bucket using Upstash Redis.
 */
export async function checkRateLimit(
  req: NextRequest,
  limit: number = 30,
  windowMs: number = 60000,
  bucket: string = 'general'
): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  const identifier = `${bucket}:${ip}`;

  // Fallback for local development and test environment without Redis keys
  if (!redis) {
    const now = Date.now();
    const current = inMemoryStore.get(identifier);
    if (!current || now > current.resetAt) {
      inMemoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, limit, retryAfterSec: 0 };
    }
    if (current.count < limit) {
      current.count++;
      return { allowed: true, remaining: limit - current.count, limit, retryAfterSec: 0 };
    }
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return { allowed: false, remaining: 0, limit, retryAfterSec };
  }

  const windowString = `${Math.ceil(windowMs / 1000)} s` as Parameters<typeof Ratelimit.slidingWindow>[1];
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, windowString),
    analytics: true,
  });

  const { success, pending, limit: rlLimit, remaining, reset } = await ratelimit.limit(identifier);

  return {
    allowed: success,
    remaining,
    limit: rlLimit,
    retryAfterSec: success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  };
}
