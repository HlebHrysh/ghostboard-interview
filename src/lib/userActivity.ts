import { Redis } from '@upstash/redis';
import { listDesktopNodes } from './desktopFleetStore';
import { recordUserActivity } from './serverDb';

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? Redis.fromEnv()
  : null;

export interface ActiveSessionEntry {
  userId: string;
  email: string;
  clientType: 'web' | 'desktop';
  lastSeen: number;
}

// In-memory sliding window cache (survives dev hot-reload)
const g = globalThis as unknown as {
  __livePresenceMap?: Map<string, ActiveSessionEntry>;
};

const livePresenceMap = g.__livePresenceMap || (g.__livePresenceMap = new Map<string, ActiveSessionEntry>());

const ACTIVE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Register user activity (called by heartbeat or active requests).
 * Throttled database update is triggered asynchronously.
 */
export async function registerUserPresence(
  userId: string,
  email: string,
  clientType: 'web' | 'desktop' = 'web'
): Promise<void> {
  if (!userId || userId === 'guest') return;

  const now = Date.now();
  const entry: ActiveSessionEntry = {
    userId,
    email,
    clientType,
    lastSeen: now,
  };

  livePresenceMap.set(userId, entry);

  // Update Redis sliding window set if configured (sorted set with score = timestamp)
  if (redis) {
    try {
      await redis.zadd('ghostboard:live_presence', {
        score: now,
        member: `${userId}:${email}:${clientType}`,
      });
      // Expire entries older than 10 minutes from sorted set
      const cutoff = now - 10 * 60 * 1000;
      await redis.zremrangebyscore('ghostboard:live_presence', 0, cutoff);
    } catch {
      // Non-blocking fallback to memory
    }
  }

  // Trigger throttled database update
  recordUserActivity(userId).catch(() => {});
}

/**
 * Get count and summary of users active in the last 5 minutes.
 * Merges in-memory web sessions with desktop fleet nodes.
 */
export async function getLiveActivePresence(): Promise<{
  totalLive: number;
  webLive: number;
  desktopLive: number;
  activeUserIds: string[];
  activeUsers: Array<{ userId: string; email: string; clientType: 'web' | 'desktop'; lastSeen: number }>;
}> {
  const now = Date.now();
  const cutoff = now - ACTIVE_WINDOW_MS;

  const activeMap = new Map<string, ActiveSessionEntry>();

  // 1. In-memory presence
  for (const [uid, entry] of livePresenceMap.entries()) {
    if (entry.lastSeen >= cutoff) {
      activeMap.set(uid, entry);
    } else {
      livePresenceMap.delete(uid);
    }
  }

  // 2. Redis presence if available
  if (redis) {
    try {
      const redisEntries = await redis.zrange<string[]>('ghostboard:live_presence', cutoff, '+inf', { byScore: true });
      if (Array.isArray(redisEntries)) {
        for (const item of redisEntries) {
          const [uid, em, ctype] = item.split(':');
          if (uid && !activeMap.has(uid)) {
            activeMap.set(uid, {
              userId: uid,
              email: em || 'user',
              clientType: (ctype as 'web' | 'desktop') || 'web',
              lastSeen: now,
            });
          }
        }
      }
    } catch {
      // Fallback to in-memory
    }
  }

  // 3. Desktop fleet active nodes
  try {
    const desktopNodes = listDesktopNodes();
    for (const node of desktopNodes) {
      if (now - node.lastSeen < ACTIVE_WINDOW_MS && node.userId && node.userId !== 'desktop-guest') {
        activeMap.set(node.userId, {
          userId: node.userId,
          email: node.userEmail || 'desktop-user',
          clientType: 'desktop',
          lastSeen: node.lastSeen,
        });
      }
    }
  } catch {}

  const activeList = Array.from(activeMap.values());
  const webCount = activeList.filter((a) => a.clientType === 'web').length;
  const desktopCount = activeList.filter((a) => a.clientType === 'desktop').length;

  return {
    totalLive: activeList.length,
    webLive: webCount,
    desktopLive: desktopCount,
    activeUserIds: Array.from(activeMap.keys()),
    activeUsers: activeList,
  };
}
