import crypto from 'crypto';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const scryptAsync = promisify(crypto.scrypt);
const SCRYPT_KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Asynchronous, non-blocking password hashing using Node crypto.scrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Asynchronous, constant-time password verification using Node crypto.scrypt and timingSafeEqual.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored || typeof password !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3) return false;
  const [scheme, salt, hash] = parts;
  if (scheme !== 'scrypt' || !salt || !hash) return false;

  try {
    const expected = Buffer.from(hash, 'hex');
    const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export interface CachedUser {
  id: string;
  email: string;
  name?: string | null;
  plan: string;
  role?: string | null;
  trialQuestionsUsed?: number;
  stripeCustomerId?: string | null;
  resumeContext?: string | null;
  candidateProfile?: unknown;
  passwordHash?: string | null;
  isBanned?: boolean;
  lastActiveAt?: Date | null;
  createdAt: Date;
}

// Global user cache in memory to survive HMR in dev and avoid redundant JSON reads/writes
const g = globalThis as unknown as {
  __ghostboardUserCacheById?: Map<string, CachedUser>;
  __ghostboardUserCacheByEmail?: Map<string, CachedUser>;
  __ghostboardUsersLoaded?: boolean;
};

const userCacheById = (g.__ghostboardUserCacheById ??= new Map<string, CachedUser>());
const userCacheByEmail = (g.__ghostboardUserCacheByEmail ??= new Map<string, CachedUser>());

const DATA_DIR = path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

let saveTimeout: NodeJS.Timeout | null = null;

/**
 * Ensures data directory exists for atomic JSON persistence
 */
function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {}
}

/**
 * Load users from disk once into memory on startup.
 */
export async function loadUsersFromDisk(): Promise<void> {
  if (g.__ghostboardUsersLoaded) return;
  g.__ghostboardUsersLoaded = true;

  try {
    ensureDataDir();
    if (!fs.existsSync(USERS_FILE)) return;

    const content = await fs.promises.readFile(USERS_FILE, 'utf8');
    if (!content.trim()) return;

    const users: CachedUser[] = JSON.parse(content);
    for (const u of users) {
      const userRecord: CachedUser = {
        ...u,
        createdAt: new Date(u.createdAt),
        lastActiveAt: u.lastActiveAt ? new Date(u.lastActiveAt) : null,
      };
      userCacheById.set(userRecord.id, userRecord);
      userCacheByEmail.set(userRecord.email.toLowerCase(), userRecord);
    }
  } catch (err) {
    // Non-fatal fallback for tests and transient read glitches
    console.warn('[users.loadUsersFromDisk] Failed to load users from disk:', err);
  }
}

/**
 * Asynchronously and atomically flushes the in-memory user cache to disk.
 * Uses atomic rename to prevent file corruption during crashes.
 */
export async function flushUsersToDisk(): Promise<void> {
  try {
    ensureDataDir();
    const users = Array.from(userCacheById.values());
    const tempFile = `${USERS_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    await fs.promises.writeFile(tempFile, JSON.stringify(users, null, 2), 'utf8');
    await fs.promises.rename(tempFile, USERS_FILE);
  } catch (err) {
    console.warn('[users.flushUsersToDisk] Failed to flush users to disk:', err);
  }
}

/**
 * Schedule deferred atomic disk write (debounced by 300ms) to prevent I/O disk thrashing
 */
export function scheduleDiskFlush(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    void flushUsersToDisk();
  }, 300);
  if (saveTimeout && typeof saveTimeout.unref === 'function') {
    saveTimeout.unref();
  }
}

export function getCachedUserById(id: string): CachedUser | null {
  return userCacheById.get(id) || null;
}

export function getCachedUserByEmail(email: string): CachedUser | null {
  return userCacheByEmail.get(email.trim().toLowerCase()) || null;
}

export function setCachedUser(user: CachedUser, immediateFlush: boolean = false): void {
  userCacheById.set(user.id, user);
  userCacheByEmail.set(user.email.trim().toLowerCase(), user);

  if (immediateFlush) {
    void flushUsersToDisk();
  } else {
    scheduleDiskFlush();
  }
}

export function removeCachedUser(id: string): void {
  const user = userCacheById.get(id);
  if (user) {
    userCacheByEmail.delete(user.email.trim().toLowerCase());
    userCacheById.delete(id);
    scheduleDiskFlush();
  }
}

export function clearUserCache(): void {
  userCacheById.clear();
  userCacheByEmail.clear();
}
