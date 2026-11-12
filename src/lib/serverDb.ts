import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { assertMemoryDbAllowed, failDbInProduction, isMemoryDbAllowed, EnvConfigError } from './envGuard';
import { logger } from './logger';
import {
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
  getCachedUserById,
  getCachedUserByEmail,
  setCachedUser,
  removeCachedUser,
  type CachedUser,
} from './server/users';

export { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH };

const log = logger.child({ component: 'serverDb' });

export const DB_QUERY_TIMEOUT_MS = 250;
export const DB_CIRCUIT_BREAKER_DEV_TTL_MS = 1800_000; // 30 minutes in dev
export const DB_CIRCUIT_BREAKER_PROD_TTL_MS = 60_000; // 60 seconds in prod
export const DB_CIRCUIT_BREAKER_TTL_MS =
  process.env.NODE_ENV === 'production' ? DB_CIRCUIT_BREAKER_PROD_TTL_MS : DB_CIRCUIT_BREAKER_DEV_TTL_MS;

let dbOfflineUntil = 0;
let dbHealthPingTimer: NodeJS.Timeout | null = null;

export function isDbCircuitBroken(): boolean {
  return Date.now() < dbOfflineUntil;
}

export function getDbCircuitBreakerTtl(): number {
  return process.env.NODE_ENV === 'production'
    ? DB_CIRCUIT_BREAKER_PROD_TTL_MS
    : DB_CIRCUIT_BREAKER_DEV_TTL_MS;
}

export function tripDbCircuitBreaker(customTtlMs?: number): void {
  const ttl = customTtlMs ?? getDbCircuitBreakerTtl();
  dbOfflineUntil = Date.now() + ttl;

  // Schedule a quiet background health check outside user requests
  if (!dbHealthPingTimer && process.env.DATABASE_URL) {
    const pingDelay = Math.min(ttl, 120_000);
    dbHealthPingTimer = setTimeout(async () => {
      dbHealthPingTimer = null;
      try {
        await rawPrisma.$queryRaw`SELECT 1`;
        log.info('Database recovered. Resetting circuit breaker.');
        resetDbCircuitBreaker();
      } catch {
        if (isDbCircuitBroken()) {
          tripDbCircuitBreaker();
        }
      }
    }, pingDelay);
    if (dbHealthPingTimer && typeof dbHealthPingTimer.unref === 'function') {
      dbHealthPingTimer.unref();
    }
  }
}

export function resetDbCircuitBreaker(): void {
  dbOfflineUntil = 0;
  if (dbHealthPingTimer) {
    clearTimeout(dbHealthPingTimer);
    dbHealthPingTimer = null;
  }
}

function createPrismaCircuitBreakerProxy(rawClient: PrismaClient): PrismaClient {
  return new Proxy(rawClient, {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol' || prop.startsWith('_') || prop.startsWith('$')) {
        return Reflect.get(target, prop, receiver);
      }
      const modelObj = Reflect.get(target, prop, receiver);
      if (typeof modelObj !== 'object' || modelObj === null) {
        return modelObj;
      }
      return new Proxy(modelObj, {
        get(mTarget, action, mReceiver) {
          const fn = Reflect.get(mTarget, action, mReceiver);
          if (typeof fn !== 'function') {
            return fn;
          }
          return (...args: unknown[]) => {
            if (isDbCircuitBroken()) {
              const err = new Error('Database circuit breaker is active (PostgreSQL unreachable)');
              (err as { code?: string }).code = 'CIRCUIT_BREAKER_ACTIVE';
              return Promise.reject(err);
            }
            let timer: NodeJS.Timeout | null = null;
            return Promise.race([
              fn.apply(mTarget, args),
              new Promise((_, reject) => {
                timer = setTimeout(() => {
                  tripDbCircuitBreaker();
                  log.warn(
                    `Prisma query timed out after ${DB_QUERY_TIMEOUT_MS}ms. Tripping circuit breaker for ${getDbCircuitBreakerTtl()}ms.`,
                    { model: String(prop), action: String(action) }
                  );
                  const timeoutErr = new Error(
                    `DB_TIMEOUT: Prisma query exceeded ${DB_QUERY_TIMEOUT_MS}ms limit`
                  );
                  (timeoutErr as { code?: string }).code = 'DB_TIMEOUT';
                  reject(timeoutErr);
                }, DB_QUERY_TIMEOUT_MS);
              }),
            ])
              .catch((err: unknown) => {
                tripDbCircuitBreaker();
                log.warn(
                  `Prisma query failed. Tripping circuit breaker for ${getDbCircuitBreakerTtl()}ms.`,
                  { model: String(prop), action: String(action) },
                  err
                );
                throw err;
              })
              .finally(() => {
                if (timer) clearTimeout(timer);
              });
          };
        },
      });
    },
  });
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const rawPrisma = globalForPrisma.prisma || new PrismaClient();
export const prisma = createPrismaCircuitBreakerProxy(rawPrisma);
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = rawPrisma;

export interface UserRecord {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role?: string | null;
  trialQuestionsUsed?: number;
  stripeCustomerId?: string | null;
  resumeContext?: string | null;
  candidateProfile?: Prisma.JsonValue;
  passwordHash?: string | null;
  isBanned?: boolean;
  lastActiveAt?: Date | null;
  createdAt: Date;
}
export type DbUser = UserRecord;

export type DeviceType = 'web' | 'desktop' | 'phone';

export interface SessionRecord {
  token: string;
  userId: string;
  deviceType?: string;
  createdAt: Date;
  expiresAt: Date;
}
export type DbSession = SessionRecord;

export interface HistoryRecord {
  id: string;
  userId: string;
  title: string;
  timestamp: number;
  durationSec: number;
  questionsCount: number;
  items: Prisma.JsonValue;
  isPublic?: boolean;
  publicSlug?: string | null;
}
export type DbSavedSession = HistoryRecord;

export interface PaymentRecord {
  id: string;
  userId: string;
  email: string;
  plan: string;
  amountCents: number;
  timestamp: number;
  status: string;
}
export type DbPayment = PaymentRecord;

// In-memory fallback store for offline/local development without DATABASE_URL
const g = globalThis as unknown as {
  memUsersByEmail?: Map<string, DbUser>;
  memUsersById?: Map<string, DbUser>;
  memSessions?: Map<string, DbSession>;
  memHistory?: Map<string, DbSavedSession[]>;
  memHistoryById?: Map<string, DbSavedSession>;
  memPublicScorecards?: Map<string, DbSavedSession>;
  memPayments?: Map<string, DbPayment>;
};

/**
 * In-memory stores are a dev/test convenience only. In production, when DATABASE_URL is missing
 * (and ALLOW_MEMORY_DB !== 'true') any access throws a critical EnvConfigError so user data is
 * never silently kept in container memory. When DATABASE_URL is set the maps stay accessible
 * (read-only in practice: writes only happen on the DB-failure fallback paths, which are guarded
 * separately by failDbInProduction()).
 */
function guardMemoryMap<K, V>(name: string, map: Map<K, V>): Map<K, V> {
  return new Proxy(map, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        if (!isMemoryDbAllowed()) assertMemoryDbAllowed(name);
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  });
}

const memUsersByEmail = guardMemoryMap('memUsersByEmail', g.memUsersByEmail || (g.memUsersByEmail = new Map<string, DbUser>()));
const memUsersById = guardMemoryMap('memUsersById', g.memUsersById || (g.memUsersById = new Map<string, DbUser>()));
const memSessions = guardMemoryMap('memSessions', g.memSessions || (g.memSessions = new Map<string, DbSession>()));
const memHistory = guardMemoryMap('memHistory', g.memHistory || (g.memHistory = new Map<string, DbSavedSession[]>()));
const memHistoryById = guardMemoryMap('memHistoryById', g.memHistoryById || (g.memHistoryById = new Map<string, DbSavedSession>()));
const memPublicScorecards = guardMemoryMap('memPublicScorecards', g.memPublicScorecards || (g.memPublicScorecards = new Map<string, DbSavedSession>()));

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function setUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
      const cached = getCachedUserById(userId);
      if (cached) cached.passwordHash = passwordHash;
      return;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }
  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }
  const memUser = memUsersById.get(userId);
  if (memUser) memUser.passwordHash = passwordHash;
  const cached = getCachedUserById(userId);
  if (cached) cached.passwordHash = passwordHash;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const normalized = email.trim().toLowerCase();
  const cached = getCachedUserByEmail(normalized);
  if (cached) return cached as DbUser;

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const user = await prisma.user.findUnique({ where: { email: normalized } });
      if (user) setCachedUser(user as CachedUser);
      return user;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback to in-memory store if DB is unreachable
    }
  }
  const mem = memUsersByEmail.get(normalized) || null;
  if (mem) setCachedUser(mem as CachedUser);
  return mem;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const cached = getCachedUserById(id);
  if (cached) return cached as DbUser;

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      if (user) setCachedUser(user as CachedUser);
      return user;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback to in-memory store
    }
  }
  const mem = memUsersById.get(id) || null;
  if (mem) setCachedUser(mem as CachedUser);
  return mem;
}

export async function createUser(
  email: string,
  name?: string,
  plan: string = 'free',
  role?: string
): Promise<DbUser> {
  const normalized = email.trim().toLowerCase();

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: normalized } });
      if (existing) {
        setCachedUser(existing as CachedUser);
        return existing;
      }
      const created = await prisma.user.create({
        data: {
          email: normalized,
          name: name || normalized.split('@')[0],
          plan,
          role: role || 'Python Backend Developer',
        },
      });
      setCachedUser(created as CachedUser);
      return created;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback to in-memory
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const existingMem = memUsersByEmail.get(normalized);
  if (existingMem) {
    setCachedUser(existingMem as CachedUser);
    return existingMem;
  }

  const newUser: DbUser = {
    id: `usr_${crypto.randomBytes(12).toString('hex')}`,
    email: normalized,
    name: name || normalized.split('@')[0],
    plan,
    role: role || 'Python Backend Developer',
    createdAt: new Date(),
  };
  memUsersByEmail.set(normalized, newUser);
  memUsersById.set(newUser.id, newUser);
  setCachedUser(newUser as CachedUser);
  return newUser;
}

export async function findOrCreateUser(
  email: string,
  name?: string,
  role?: string
): Promise<DbUser> {
  const existing = await getUserByEmail(email);
  if (existing) {
    return existing;
  }
  return createUser(email, name, 'free', role);
}

interface CachedSessionUser {
  user: DbUser | null;
  expiresAt: number;
}
const sessionUserCache = new Map<string, CachedSessionUser>();
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000; // 5-minute fast in-memory cache

export function invalidateSessionUserCache(token?: string, userId?: string): void {
  if (token) {
    sessionUserCache.delete(token);
  } else if (userId) {
    for (const [t, entry] of sessionUserCache.entries()) {
      if (entry.user?.id === userId) {
        sessionUserCache.delete(t);
      }
    }
  } else {
    sessionUserCache.clear();
  }
}

export async function updateUserPlan(userId: string, plan: string): Promise<void> {
  invalidateSessionUserCache(undefined, userId);
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { plan },
      });
      return;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.plan = plan;
  }
}

export async function updateUser(
  userId: string,
  data: {
    plan?: string;
    name?: string;
    role?: string;
    isBanned?: boolean;
    lastActiveAt?: Date | null;
    trialQuestionsUsed?: number;
  }
): Promise<DbUser | null> {
  invalidateSessionUserCache(undefined, userId);
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const memUser = memUsersById.get(userId);
  if (memUser) {
    if (data.plan !== undefined) memUser.plan = data.plan;
    if (data.name !== undefined) memUser.name = data.name;
    if (data.role !== undefined) memUser.role = data.role;
    if (data.isBanned !== undefined) memUser.isBanned = data.isBanned;
    if (data.lastActiveAt !== undefined) memUser.lastActiveAt = data.lastActiveAt;
    if (data.trialQuestionsUsed !== undefined) memUser.trialQuestionsUsed = data.trialQuestionsUsed;
    return memUser;
  }
  return null;
}

// In-memory throttle map to prevent write storms on PostgreSQL
const userActivityThrottle = new Map<string, number>();
const ACTIVITY_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

export async function recordUserActivity(userId: string): Promise<void> {
  if (!userId) return;
  const now = Date.now();
  const lastRecorded = userActivityThrottle.get(userId);
  if (lastRecorded && now - lastRecorded < ACTIVITY_THROTTLE_MS) {
    return; // Throttled
  }

  userActivityThrottle.set(userId, now);
  const nowDate = new Date();

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: nowDate },
      });
      return;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.lastActiveAt = nowDate;
  }
}

export async function banUser(userId: string, isBanned: boolean = true): Promise<boolean> {
  const updated = await updateUser(userId, { isBanned });
  if (isBanned) {
    // Invalidate user sessions when banned
    await resetUserSessions(userId);
  }
  return !!updated;
}

export async function resetUserSessions(userId: string): Promise<number> {
  let count = 0;
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const res = await prisma.session.deleteMany({ where: { userId } });
      count = res.count;
    } catch (dbErr) {
      failDbInProduction(dbErr);
    }
  }
  for (const [token, session] of memSessions.entries()) {
    if (session.userId === userId) {
      memSessions.delete(token);
      count++;
    }
  }
  return count;
}


export async function deleteUser(userId: string): Promise<boolean> {
  removeCachedUser(userId);
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.history.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } });
      return true;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const user = memUsersById.get(userId);
  if (user) {
    memUsersByEmail.delete(user.email);
    memUsersById.delete(userId);
    memHistory.delete(userId);
    return true;
  }
  return false;
}


export async function createSession(
  userId: string,
  deviceType: DeviceType = 'web',
  ttlMs: number = 30 * 24 * 60 * 60 * 1000
): Promise<DbSession> {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      return await prisma.session.create({
        data: {
          token,
          userId,
          deviceType,
          createdAt: now,
          expiresAt,
        },
      });
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const session: DbSession = {
    token,
    userId,
    deviceType,
    createdAt: now,
    expiresAt,
  };
  memSessions.set(token, session);
  return session;
}

export interface PublicSessionInfo {
  id: string; // short, non-secret identifier (hash prefix of token)
  publicId: string; // alias for id used in revocation API
  deviceType: string;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

function sessionPublicId(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}

export async function listUserSessions(userId: string, currentToken?: string): Promise<PublicSessionInfo[]> {
  const now = new Date();
  let sessions: DbSession[] = [];
  let fromDb = false;
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      sessions = await prisma.session.findMany({
        where: { userId, expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
      });
      fromDb = true;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }
  if (!fromDb) {
    sessions = Array.from(memSessions.values())
      .filter((s) => s.userId === userId && s.expiresAt > now)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    // Also include any active in-memory sessions for this user not yet in DB
    const dbTokenSet = new Set(sessions.map((s) => s.token));
    const extraMem = Array.from(memSessions.values())
      .filter((s) => s.userId === userId && s.expiresAt > now && !dbTokenSet.has(s.token));
    sessions = [...sessions, ...extraMem];
  }
  return sessions.map((s) => ({
    id: sessionPublicId(s.token),
    publicId: sessionPublicId(s.token),
    deviceType: s.deviceType || 'web',
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    isCurrent: !!currentToken && s.token === currentToken,
  }));
}

/** Revoke a session by its public id, only if it belongs to the given user. */
export async function revokeUserSession(userId: string, publicId: string): Promise<boolean> {
  const memTokens = Array.from(memSessions.values()).filter((s) => s.userId === userId).map((s) => s.token);
  let dbTokens: string[] = [];
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const rows = await prisma.session.findMany({ where: { userId }, select: { token: true } });
      dbTokens = rows.map((r) => r.token);
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }
  const allTokens = Array.from(new Set([...dbTokens, ...memTokens]));
  const match = allTokens.find((t) => sessionPublicId(t) === publicId);
  if (!match) return false;
  await deleteSession(match);
  return true;
}

/** Revoke all sessions belonging to the user except the specified current token. */
export async function revokeAllOtherUserSessions(userId: string, currentToken: string): Promise<number> {
  const memTokens = Array.from(memSessions.values())
    .filter((s) => s.userId === userId && s.token !== currentToken)
    .map((s) => s.token);

  let dbTokens: string[] = [];
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const rows = await prisma.session.findMany({
        where: { userId, token: { not: currentToken } },
        select: { token: true },
      });
      dbTokens = rows.map((r) => r.token);
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  const allTokensToRevoke = Array.from(new Set([...dbTokens, ...memTokens]));
  for (const t of allTokensToRevoke) {
    await deleteSession(t);
  }
  return allTokensToRevoke.length;
}

export async function getSessionUser(token: string): Promise<DbUser | null> {
  if (!token) return null;
  const now = new Date();
  const cached = sessionUserCache.get(token);
  if (cached && cached.expiresAt > now.getTime()) {
    return cached.user;
  }

  let user: DbUser | null = null;

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });
      if (session && session.expiresAt > now) {
        user = session.user;
      }
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (!user) {
    const memSession = memSessions.get(token);
    if (memSession && memSession.expiresAt > now) {
      user = memUsersById.get(memSession.userId) || null;
    }
  }

  if (user) {
    sessionUserCache.set(token, { user, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  }

  return user;
}

export const getUserBySessionToken = getSessionUser;

export async function deleteSession(token: string): Promise<void> {
  invalidateSessionUserCache(token);
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  memSessions.delete(token);
}

export async function saveInterviewSession(
  userId: string,
  sessionData: { title?: string; durationSec: number; items: unknown[] }
): Promise<DbSavedSession> {
  const now = Date.now();
  const title = sessionData.title || `Співбесіда від ${new Date().toLocaleDateString('uk-UA')}`;
  const durationSec = sessionData.durationSec || 0;
  const items = sessionData.items || [];
  const questionsCount = items.length;

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const newEntry = await prisma.history.create({
        data: {
          userId,
          title,
          timestamp: now,
          durationSec,
          questionsCount,
          items: items as unknown as Prisma.InputJsonValue,
        },
      });
      return {
        ...newEntry,
        timestamp: Number(newEntry.timestamp),
      };
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const entry: DbSavedSession = {
    id: `hist_${crypto.randomBytes(12).toString('hex')}`,
    userId,
    title,
    timestamp: now,
    durationSec,
    questionsCount,
    items: items as unknown as Prisma.JsonValue,
  };
  memHistoryById.set(entry.id, entry);
  const list = memHistory.get(userId) || [];
  list.unshift(entry);
  memHistory.set(userId, list);
  return entry;
}

export async function makeSessionPublic(historyId: string, slug: string): Promise<boolean> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.history.update({
        where: { id: historyId },
        data: { isPublic: true, publicSlug: slug },
      });
      return true;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const mem = memHistoryById.get(historyId);
  if (mem) {
    mem.isPublic = true;
    mem.publicSlug = slug;
    memPublicScorecards.set(slug, mem);
    return true;
  }
  return false;
}

export async function getPublicScorecard(slug: string): Promise<DbSavedSession | null> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const history = await prisma.history.findUnique({
        where: { publicSlug: slug },
      });
      if (history && history.isPublic) {
        return {
          ...history,
          timestamp: Number(history.timestamp),
        };
      }
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  return memPublicScorecards.get(slug) || null;
}

export async function getUserInterviewSessions(userId: string): Promise<DbSavedSession[]> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const items = await prisma.history.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      });
      return items.map((item) => ({
        ...item,
        timestamp: Number(item.timestamp),
      }));
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  return memHistory.get(userId) || [];
}

export const getUserSessions = getUserInterviewSessions;

export async function deleteSavedSession(sessionId: string): Promise<boolean> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.history.delete({ where: { id: sessionId } });
      return true;
    } catch (dbErr) {
      failDbInProduction(dbErr);
      // Fallback
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const session = memHistoryById.get(sessionId);
  if (session) {
    memHistoryById.delete(sessionId);
    if (session.publicSlug) {
      memPublicScorecards.delete(session.publicSlug);
    }
    const userSessions = memHistory.get(session.userId);
    if (userSessions) {
      memHistory.set(session.userId, userSessions.filter(s => s.id !== sessionId));
    }
    return true;
  }
  return false;
}


const memPayments: Map<string, DbPayment> = guardMemoryMap('memPayments', g.memPayments || (g.memPayments = new Map<string, DbPayment>()));

export async function getAllUsers(): Promise<DbUser[]> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      return await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    } catch (dbErr) {
      failDbInProduction(dbErr);
    }
  }
  return Array.from(memUsersById.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAllSessions(): Promise<DbSavedSession[]> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const items = await prisma.history.findMany({ orderBy: { timestamp: 'desc' } });
      return items.map((item) => ({ ...item, timestamp: Number(item.timestamp) }));
    } catch (dbErr) {
      failDbInProduction(dbErr);
    }
  }
  return Array.from(memHistoryById.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export async function logPayment(payment: Omit<DbPayment, 'id' | 'timestamp'>): Promise<DbPayment> {
  const now = Date.now();
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const created = await prisma.payment.create({
        data: {
          userId: payment.userId,
          email: payment.email,
          plan: payment.plan,
          amountCents: payment.amountCents,
          status: payment.status || 'succeeded',
          timestamp: BigInt(now),
        },
      });
      return {
        id: created.id,
        userId: created.userId,
        email: created.email,
        plan: created.plan,
        amountCents: created.amountCents,
        status: created.status,
        timestamp: Number(created.timestamp),
      };
    } catch (err: unknown) {
      failDbInProduction(err);
      log.warn('[serverDb.logPayment] Prisma payment save failed, using memory fallback:', {
        userId: payment.userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const entry: DbPayment = {
    ...payment,
    id: `pay_${crypto.randomBytes(12).toString('hex')}`,
    timestamp: now,
  };
  memPayments.set(entry.id, entry);
  return entry;
}

export async function getAllPayments(): Promise<DbPayment[]> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const payments = await prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return payments.map((p) => ({
        id: p.id,
        userId: p.userId,
        email: p.email,
        plan: p.plan,
        amountCents: p.amountCents,
        status: p.status,
        timestamp: Number(p.timestamp),
      }));
    } catch (err: unknown) {
      failDbInProduction(err);
      log.warn('[serverDb.getAllPayments] Prisma findMany failed, using memory fallback:', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return Array.from(memPayments.values()).sort((a: DbPayment, b: DbPayment) => b.timestamp - a.timestamp);
}

export async function updateUserCandidateProfile(
  userId: string,
  candidateProfile: Prisma.InputJsonValue | Record<string, unknown>
): Promise<void> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { candidateProfile: candidateProfile as Prisma.InputJsonValue },
      });
      return;
    } catch (err: unknown) {
      failDbInProduction(err);
      log.warn('[serverDb.updateUserCandidateProfile] Prisma update failed:', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }
  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.candidateProfile = candidateProfile as Prisma.JsonValue;
  }
}

export async function getUserCandidateProfile(userId: string): Promise<Prisma.JsonValue | null> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { candidateProfile: true },
      });
      return user?.candidateProfile ?? null;
    } catch (err: unknown) {
      failDbInProduction(err);
      log.warn('[serverDb.getUserCandidateProfile] Prisma select failed:', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const memUser = memUsersById.get(userId);
  return memUser?.candidateProfile ?? null;
}

export async function incrementUserTrialQuestions(userId: string): Promise<number> {
  // Immediately sync in-memory cached session
  for (const entry of sessionUserCache.values()) {
    if (entry.user && entry.user.id === userId) {
      entry.user.trialQuestionsUsed = (entry.user.trialQuestionsUsed || 0) + 1;
    }
  }

  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { trialQuestionsUsed: { increment: 1 } },
      });
      return user.trialQuestionsUsed;
    } catch (dbErr) {
      failDbInProduction(dbErr);
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.trialQuestionsUsed = (memUser.trialQuestionsUsed || 0) + 1;
    return memUser.trialQuestionsUsed;
  }
  return 1;
}

export async function updateUserResumeContext(userId: string, context: string): Promise<void> {
  if (process.env.DATABASE_URL && !isDbCircuitBroken()) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { resumeContext: context },
      });
      return;
    } catch (dbErr) {
      failDbInProduction(dbErr);
    }
  }

  if (isDbCircuitBroken() && !isMemoryDbAllowed()) {
    throw new EnvConfigError('[serverDb] Database is temporarily unavailable (circuit breaker active)');
  }

  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.resumeContext = context;
  }
}


export async function resetUserTrialQuestions(userId: string): Promise<void> {
  await updateUser(userId, { trialQuestionsUsed: 0 });
}
