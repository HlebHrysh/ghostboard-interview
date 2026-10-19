import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export interface DbUser {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role?: string | null;
  trialQuestionsUsed?: number;
  stripeCustomerId?: string | null;
  resumeContext?: string | null;
  candidateProfile?: any;
  passwordHash?: string | null;
  isBanned?: boolean;
  lastActiveAt?: Date | null;
  createdAt: Date;
}

export type DeviceType = 'web' | 'desktop' | 'phone';

export interface DbSession {
  token: string;
  userId: string;
  deviceType?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface DbSavedSession {
  id: string;
  userId: string;
  title: string;
  timestamp: number;
  durationSec: number;
  questionsCount: number;
  items: any;
  isPublic?: boolean;
  publicSlug?: string | null;
}

// In-memory fallback store for offline/local development without DATABASE_URL
const g = globalThis as unknown as {
  memUsersByEmail?: Map<string, DbUser>;
  memUsersById?: Map<string, DbUser>;
  memSessions?: Map<string, DbSession>;
  memHistory?: Map<string, DbSavedSession[]>;
  memHistoryById?: Map<string, DbSavedSession>;
  memPublicScorecards?: Map<string, DbSavedSession>;
};

const memUsersByEmail = g.memUsersByEmail || (g.memUsersByEmail = new Map<string, DbUser>());
const memUsersById = g.memUsersById || (g.memUsersById = new Map<string, DbUser>());
const memSessions = g.memSessions || (g.memSessions = new Map<string, DbSession>());
const memHistory = g.memHistory || (g.memHistory = new Map<string, DbSavedSession[]>());
const memHistoryById = g.memHistoryById || (g.memHistoryById = new Map<string, DbSavedSession>());
const memPublicScorecards = g.memPublicScorecards || (g.memPublicScorecards = new Map<string, DbSavedSession>());

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ── Password hashing (scrypt, built into Node) ──────────────────────────────
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored || typeof password !== 'string') return false;
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export const MIN_PASSWORD_LENGTH = 8;

export async function setUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = hashPassword(password);
  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
      return;
    } catch {
      // Fallback
    }
  }
  const memUser = memUsersById.get(userId);
  if (memUser) memUser.passwordHash = passwordHash;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const normalized = email.trim().toLowerCase();
  if (process.env.DATABASE_URL) {
    try {
      return await prisma.user.findUnique({ where: { email: normalized } });
    } catch {
      // Fallback to in-memory store if DB is unreachable
    }
  }
  return memUsersByEmail.get(normalized) || null;
}

export async function getUserById(id: string): Promise<DbUser | null> {
  if (process.env.DATABASE_URL) {
    try {
      return await prisma.user.findUnique({ where: { id } });
    } catch {
      // Fallback to in-memory store
    }
  }
  return memUsersById.get(id) || null;
}

export async function createUser(
  email: string,
  name?: string,
  plan: string = 'free',
  role?: string
): Promise<DbUser> {
  const normalized = email.trim().toLowerCase();

  if (process.env.DATABASE_URL) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: normalized } });
      if (existing) {
        return existing;
      }
      return await prisma.user.create({
        data: {
          email: normalized,
          name: name || normalized.split('@')[0],
          plan,
          role: role || 'Python Backend Developer',
        },
      });
    } catch {
      // Fallback to in-memory
    }
  }

  const existingMem = memUsersByEmail.get(normalized);
  if (existingMem) return existingMem;

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

export async function updateUserPlan(userId: string, plan: string): Promise<void> {
  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { plan },
      });
      return;
    } catch {
      // Fallback
    }
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
  if (process.env.DATABASE_URL) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch {
      // Fallback
    }
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

  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: nowDate },
      });
      return;
    } catch {
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
  if (process.env.DATABASE_URL) {
    try {
      const res = await prisma.session.deleteMany({ where: { userId } });
      count = res.count;
    } catch {}
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
  if (process.env.DATABASE_URL) {
    try {
      await prisma.history.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } });
      return true;
    } catch {
      // Fallback
    }
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

  if (process.env.DATABASE_URL) {
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
    } catch {
      // Fallback
    }
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
  if (process.env.DATABASE_URL) {
    try {
      sessions = await prisma.session.findMany({
        where: { userId, expiresAt: { gt: now } },
        orderBy: { createdAt: 'desc' },
      });
      fromDb = true;
    } catch {
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
  if (process.env.DATABASE_URL) {
    try {
      const rows = await prisma.session.findMany({ where: { userId }, select: { token: true } });
      dbTokens = rows.map((r) => r.token);
    } catch {
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
  if (process.env.DATABASE_URL) {
    try {
      const rows = await prisma.session.findMany({
        where: { userId, token: { not: currentToken } },
        select: { token: true },
      });
      dbTokens = rows.map((r) => r.token);
    } catch {
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

  if (process.env.DATABASE_URL) {
    try {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });
      if (session && session.expiresAt > now) {
        return session.user;
      }
    } catch {
      // Fallback
    }
  }

  const memSession = memSessions.get(token);
  if (!memSession || memSession.expiresAt <= now) {
    return null;
  }

  return memUsersById.get(memSession.userId) || null;
}

export const getUserBySessionToken = getSessionUser;

export async function deleteSession(token: string): Promise<void> {
  if (process.env.DATABASE_URL) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  memSessions.delete(token);
}

export async function saveInterviewSession(
  userId: string,
  sessionData: { title?: string; durationSec: number; items: any[] }
): Promise<DbSavedSession> {
  const now = Date.now();
  const title = sessionData.title || `Співбесіда від ${new Date().toLocaleDateString('uk-UA')}`;
  const durationSec = sessionData.durationSec || 0;
  const items = sessionData.items || [];
  const questionsCount = items.length;

  if (process.env.DATABASE_URL) {
    try {
      const newEntry = await prisma.history.create({
        data: {
          userId,
          title,
          timestamp: now,
          durationSec,
          questionsCount,
          items,
        },
      });
      return {
        ...newEntry,
        timestamp: Number(newEntry.timestamp),
      };
    } catch {
      // Fallback
    }
  }

  const entry: DbSavedSession = {
    id: `hist_${crypto.randomBytes(12).toString('hex')}`,
    userId,
    title,
    timestamp: now,
    durationSec,
    questionsCount,
    items,
  };
  memHistoryById.set(entry.id, entry);
  const list = memHistory.get(userId) || [];
  list.unshift(entry);
  memHistory.set(userId, list);
  return entry;
}

export async function makeSessionPublic(historyId: string, slug: string): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    try {
      await prisma.history.update({
        where: { id: historyId },
        data: { isPublic: true, publicSlug: slug },
      });
      return true;
    } catch {
      // Fallback
    }
  }

  const mem = memHistoryById.get(historyId);
  if (mem) {
    (mem as any).isPublic = true;
    (mem as any).publicSlug = slug;
    memPublicScorecards.set(slug, mem);
    return true;
  }
  return false;
}

export async function getPublicScorecard(slug: string): Promise<DbSavedSession | null> {
  if (process.env.DATABASE_URL) {
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
    } catch {
      // Fallback
    }
  }

  return memPublicScorecards.get(slug) || null;
}

export async function getUserInterviewSessions(userId: string): Promise<DbSavedSession[]> {
  if (process.env.DATABASE_URL) {
    try {
      const items = await prisma.history.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
      });
      return items.map((item) => ({
        ...item,
        timestamp: Number(item.timestamp),
      }));
    } catch {
      // Fallback
    }
  }

  return memHistory.get(userId) || [];
}

export const getUserSessions = getUserInterviewSessions;

export async function deleteSavedSession(sessionId: string): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    try {
      await prisma.history.delete({ where: { id: sessionId } });
      return true;
    } catch {
      // Fallback
    }
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


export interface DbPayment {
  id: string;
  userId: string;
  email: string;
  plan: string;
  amountCents: number;
  timestamp: number;
  status: string;
}

const memPayments: Map<string, DbPayment> = (g as any).memPayments || ((g as any).memPayments = new Map<string, DbPayment>());

export async function getAllUsers(): Promise<DbUser[]> {
  if (process.env.DATABASE_URL) {
    try {
      return await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    } catch {}
  }
  return Array.from(memUsersById.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getAllSessions(): Promise<DbSavedSession[]> {
  if (process.env.DATABASE_URL) {
    try {
      const items = await prisma.history.findMany({ orderBy: { timestamp: 'desc' } });
      return items.map((item) => ({ ...item, timestamp: Number(item.timestamp) }));
    } catch {}
  }
  return Array.from(memHistoryById.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export async function logPayment(payment: Omit<DbPayment, 'id' | 'timestamp'>): Promise<DbPayment> {
  const now = Date.now();
  if (process.env.DATABASE_URL) {
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
    } catch (err: any) {
      console.warn('[serverDb.logPayment] Prisma payment save failed, using memory fallback:', err?.message);
    }
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
  if (process.env.DATABASE_URL) {
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
    } catch (err: any) {
      console.warn('[serverDb.getAllPayments] Prisma findMany failed, using memory fallback:', err?.message);
    }
  }
  return Array.from(memPayments.values()).sort((a: DbPayment, b: DbPayment) => b.timestamp - a.timestamp);
}

export async function updateUserCandidateProfile(userId: string, candidateProfile: any): Promise<void> {
  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { candidateProfile },
      });
      return;
    } catch (err: any) {
      console.warn('[serverDb.updateUserCandidateProfile] Prisma update failed:', err?.message);
    }
  }
  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.candidateProfile = candidateProfile;
  }
}

export async function getUserCandidateProfile(userId: string): Promise<any | null> {
  if (process.env.DATABASE_URL) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { candidateProfile: true },
      });
      return user?.candidateProfile ?? null;
    } catch (err: any) {
      console.warn('[serverDb.getUserCandidateProfile] Prisma select failed:', err?.message);
    }
  }
  const memUser = memUsersById.get(userId);
  return memUser?.candidateProfile ?? null;
}

export async function incrementUserTrialQuestions(userId: string): Promise<number> {
  if (process.env.DATABASE_URL) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { trialQuestionsUsed: { increment: 1 } },
      });
      return user.trialQuestionsUsed;
    } catch {}
  }
  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.trialQuestionsUsed = (memUser.trialQuestionsUsed || 0) + 1;
    return memUser.trialQuestionsUsed;
  }
  return 1;
}

export async function updateUserResumeContext(userId: string, context: string): Promise<void> {
  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { resumeContext: context },
      });
      return;
    } catch {}
  }
  const memUser = memUsersById.get(userId);
  if (memUser) {
    memUser.resumeContext = context;
  }
}


// Since we can't reliably update serverDb from the webhook without importing logPayment,
// let's make sure it's exported in serverDb.ts. Oh wait, it IS exported.
