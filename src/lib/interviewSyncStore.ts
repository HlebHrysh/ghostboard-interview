// Shared state for live interview synchronization across devices (PC, web and phone companion).
//
// Backends:
//  - Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN): shared across all Cloud Run
//    instances, 4h TTL per sync session. Used through the async `syncStore` facade.
//  - globalThis + /tmp file: single-process fallback ONLY when Redis is not configured AND
//    NODE_ENV !== 'production' (dev/test). Used by the sync `interviewSyncStore` (legacy API) and
//    transparently by `syncStore`.
// In production without Redis every access throws an EnvConfigError (fail-fast, no split-brain).
export interface SyncQAItem {
  id: string;
  question: string;
  startHook: string;
  quickAnswer: string;
  hints: string[];
  codeSnippet?: string;
  deliveryTip?: string;
  tag?: string;
  timestamp?: number;
  nativeTranslation?: string;
  // Screenshot-specific breakdown
  codeFound?: boolean;
  language?: string;
  summary?: string;
  complexity?: string;
  timecode?: string;
  lineByLine?: Array<{ line: string | number; explanation: string }>;
  bugsAndFlaws?: string[];
  howToImprove?: string[];
}

export interface InterviewSyncState {
  qas: SyncQAItem[];
  activeId?: string;
  outputLanguage: 'uk' | 'en' | 'auto' | string;
  speechLanguage: 'uk' | 'en' | 'ru' | 'auto' | string;
  nativeLanguage?: string;
  liveTranscript: string;
  isCapturing: boolean;
  sttStatus?: 'connected' | 'reconnecting' | 'idle' | 'disconnected';
  isFrozen?: boolean;
  isPanic?: boolean;
  connectedDevices?: { desktop?: boolean; web?: boolean; phone?: boolean };
  sessionDuration: number;
  lastUpdated: number;
}

export function getItemTimestamp(q: SyncQAItem): number {
  if (q.timestamp && q.timestamp > 0) return q.timestamp;
  const match = q.id?.match(/\d{10,}/);
  if (match) return Number(match[0]);
  return 0;
}

import fs from 'fs';
import { Redis } from '@upstash/redis';
import { EnvConfigError, isProduction } from './envGuard';
import { logger } from './logger';

const log = logger.child({ component: 'interviewSyncStore' });

type SttStatus = 'connected' | 'reconnecting' | 'idle' | 'disconnected';
type DeviceType = 'desktop' | 'web' | 'phone';

/** TTL of a sync session in Redis (4 hours, refreshed on every write). */
export const SYNC_SESSION_TTL_SECONDS = 4 * 60 * 60;
const REDIS_KEY_PREFIX = 'ghostboard:sync:state:';
const REDIS_LOCK_PREFIX = 'ghostboard:sync:lock:';
const ZOMBIE_CAPTURE_MS = 15000;

// ───────────────────────── Backend selection ─────────────────────────

export function isRedisSyncConfigured(): boolean {
  return !!(
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

function assertLocalFallbackAllowed() {
  if (isProduction()) {
    throw new EnvConfigError(
      'Interview sync store requires Upstash Redis in production (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN). ' +
        'The in-memory//tmp fallback is disabled in production to prevent split-brain across Cloud Run instances.'
    );
  }
}

// ───────────────────────── State helpers ─────────────────────────

function getInitialState(): InterviewSyncState {
  return {
    qas: [],
    activeId: undefined,
    outputLanguage: 'uk',
    speechLanguage: 'uk',
    nativeLanguage: 'uk',
    liveTranscript: '',
    isCapturing: false,
    sttStatus: 'idle',
    isFrozen: false,
    isPanic: false,
    connectedDevices: { desktop: false, web: false, phone: false },
    sessionDuration: 0,
    lastUpdated: Date.now(),
  };
}

function normalizeUserId(userId?: string): string {
  return !userId || userId === 'default' ? 'default' : userId;
}

/** Auto-expire a zombie capture session if no ping was received for > 15s. */
function expireZombieCapture(state: InterviewSyncState) {
  if (state.isCapturing && Date.now() - state.lastUpdated > ZOMBIE_CAPTURE_MS) {
    state.isCapturing = false;
    state.sttStatus = 'idle';
    state.liveTranscript = '';
  }
}

// ───────────────────────── Pure mutators (shared by every backend) ─────────────────────────

interface Mutation {
  apply: (state: InterviewSyncState) => void;
  /** Persist default-user state to the local /tmp file (local backend only). */
  persist: boolean;
}

function touch(state: InterviewSyncState) {
  state.lastUpdated = Date.now();
}

const mutations = {
  addOrUpdateQA(qa: SyncQAItem, activeId?: string): Mutation {
    return {
      persist: true,
      apply(state) {
        const ts = getItemTimestamp(qa) || Date.now();
        const qaWithTime: SyncQAItem = { ...qa, timestamp: ts };
        const idx = state.qas.findIndex((item) => item.id === qa.id);
        if (idx >= 0) {
          state.qas[idx] = { ...state.qas[idx], ...qaWithTime };
        } else {
          state.qas.unshift(qaWithTime);
        }
        // Always sort newest cards first
        state.qas.sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));
        if (state.qas.length > 50) {
          state.qas = state.qas.slice(0, 50);
        }
        // Only switch activeId if not currently frozen
        if (!state.isFrozen || !state.activeId) {
          state.activeId = activeId || qa.id;
        }
        touch(state);
      },
    };
  },

  setActiveId(activeId: string): Mutation {
    return { persist: true, apply: (s) => { s.activeId = activeId; touch(s); } };
  },

  setFrozen(isFrozen: boolean): Mutation {
    return { persist: true, apply: (s) => { s.isFrozen = isFrozen; touch(s); } };
  },

  setPanic(isPanic: boolean): Mutation {
    return { persist: true, apply: (s) => { s.isPanic = isPanic; touch(s); } };
  },

  registerDevice(device: DeviceType, active: boolean): Mutation {
    return {
      persist: false,
      apply(state) {
        if (!state.connectedDevices) {
          state.connectedDevices = { desktop: false, web: false, phone: false };
        }
        state.connectedDevices[device] = active;
        touch(state);
      },
    };
  },

  syncAll(
    qas: SyncQAItem[],
    isCapturing?: boolean,
    sessionDuration?: number,
    activeId?: string,
    sttStatus?: SttStatus
  ): Mutation {
    return {
      persist: true,
      apply(state) {
        if (Array.isArray(qas)) {
          const existingMap = new Map(state.qas.map((q) => [q.id, q]));
          qas.forEach((q) => {
            const ts = getItemTimestamp(q) || Date.now();
            existingMap.set(q.id, { ...q, timestamp: ts });
          });
          state.qas = Array.from(existingMap.values()).sort(
            (a, b) => getItemTimestamp(b) - getItemTimestamp(a)
          );
          if (state.qas.length > 50) state.qas = state.qas.slice(0, 50);
        }
        if (activeId) {
          state.activeId = activeId;
        } else if (!state.activeId && state.qas.length > 0) {
          state.activeId = state.qas[0].id;
        }
        if (typeof isCapturing === 'boolean') state.isCapturing = isCapturing;
        if (sttStatus) state.sttStatus = sttStatus;
        if (typeof sessionDuration === 'number') state.sessionDuration = sessionDuration;
        touch(state);
      },
    };
  },

  setLiveTranscript(text: string): Mutation {
    return { persist: false, apply: (s) => { s.liveTranscript = text; touch(s); } };
  },

  setCapturingStatus(isCapturing: boolean): Mutation {
    return {
      persist: true,
      apply(state) {
        state.isCapturing = isCapturing;
        if (!isCapturing) {
          state.sttStatus = 'idle';
          state.liveTranscript = '';
        }
        touch(state);
      },
    };
  },

  setSttStatus(sttStatus: SttStatus): Mutation {
    return { persist: true, apply: (s) => { s.sttStatus = sttStatus; touch(s); } };
  },

  setOutputLanguage(lang: string): Mutation {
    return { persist: true, apply: (s) => { s.outputLanguage = lang; touch(s); } };
  },

  setSpeechLanguage(lang: string): Mutation {
    return { persist: true, apply: (s) => { s.speechLanguage = lang; touch(s); } };
  },

  setNativeLanguage(lang: string): Mutation {
    return { persist: true, apply: (s) => { s.nativeLanguage = lang; touch(s); } };
  },

  clear(): Mutation {
    return {
      persist: true,
      apply(state) {
        state.qas = [];
        state.liveTranscript = '';
        state.sttStatus = 'idle';
        state.isFrozen = false;
        state.isPanic = false;
        touch(state);
      },
    };
  },
};

// ───────────────────────── Local backend (globalThis + /tmp) ─────────────────────────

const globalForSync = globalThis as unknown as {
  __interviewSyncState?: InterviewSyncState;
  __userInterviewSyncStates?: Map<string, InterviewSyncState>;
};

const SYNC_FILE = '/tmp/ghostboard_interview_sync.json';

function loadPersistedState(): InterviewSyncState | null {
  try {
    if (fs.existsSync(SYNC_FILE)) {
      const data = fs.readFileSync(SYNC_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed?.qas)) {
        // Ensure all persisted items have valid timestamps and are sorted newest-first
        parsed.qas.forEach((q: SyncQAItem) => {
          q.timestamp = getItemTimestamp(q);
        });
        parsed.qas.sort((a: SyncQAItem, b: SyncQAItem) => getItemTimestamp(b) - getItemTimestamp(a));
        if (!parsed.activeId && parsed.qas.length > 0) {
          parsed.activeId = parsed.qas[0].id;
        }
        if (!parsed.outputLanguage) parsed.outputLanguage = 'uk';
        if (!parsed.speechLanguage) parsed.speechLanguage = 'uk';
        // Audio capture and STT status are transient runtime states — never restore zombie capturing state!
        parsed.isCapturing = false;
        parsed.sttStatus = 'idle';
        parsed.liveTranscript = '';
        return parsed;
      }
    }
  } catch {}
  return null;
}

function savePersistedState(state: InterviewSyncState) {
  try {
    fs.writeFileSync(SYNC_FILE, JSON.stringify(state), 'utf8');
  } catch {}
}

function resolveLocalState(userId?: string): InterviewSyncState {
  assertLocalFallbackAllowed();
  if (!globalForSync.__userInterviewSyncStates) {
    globalForSync.__userInterviewSyncStates = new Map<string, InterviewSyncState>();
  }
  if (!globalForSync.__interviewSyncState) {
    globalForSync.__interviewSyncState = loadPersistedState() || getInitialState();
  }
  if (normalizeUserId(userId) === 'default') {
    return globalForSync.__interviewSyncState;
  }
  let userState = globalForSync.__userInterviewSyncStates.get(userId!);
  if (!userState) {
    userState = getInitialState();
    globalForSync.__userInterviewSyncStates.set(userId!, userState);
  }
  return userState;
}

function applyLocal(m: Mutation, userId?: string): InterviewSyncState {
  const state = resolveLocalState(userId);
  m.apply(state);
  if (m.persist && normalizeUserId(userId) === 'default') savePersistedState(state);
  return state;
}

// ───────────────────────── Redis backend (Upstash) ─────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadRedisState(userId?: string): Promise<InterviewSyncState> {
  const raw = await getRedis().get<InterviewSyncState | string>(REDIS_KEY_PREFIX + normalizeUserId(userId));
  if (!raw) return getInitialState();
  const state: InterviewSyncState = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return { ...getInitialState(), ...state, qas: Array.isArray(state.qas) ? state.qas : [] };
}

async function saveRedisState(state: InterviewSyncState, userId?: string) {
  await getRedis().set(REDIS_KEY_PREFIX + normalizeUserId(userId), JSON.stringify(state), {
    ex: SYNC_SESSION_TTL_SECONDS,
  });
}

/**
 * Read-modify-write under a short-lived Redis lock (SET NX PX) so concurrent devices
 * (desktop + phone + web) do not clobber each other's updates. If the lock cannot be
 * acquired within ~1s we proceed anyway (last-write-wins) rather than dropping the update.
 */
async function applyRedis(m: Mutation, userId?: string): Promise<InterviewSyncState> {
  const redis = getRedis();
  const lockKey = REDIS_LOCK_PREFIX + normalizeUserId(userId);
  const lockToken = Math.random().toString(36).slice(2);
  let locked = false;
  for (let attempt = 0; attempt < 10 && !locked; attempt++) {
    locked = (await redis.set(lockKey, lockToken, { nx: true, px: 2000 })) === 'OK';
    if (!locked) await sleep(40 + Math.random() * 60);
  }
  try {
    const state = await loadRedisState(userId);
    m.apply(state);
    await saveRedisState(state, userId);
    return state;
  } catch (err: unknown) {
    log.error('Failed to apply Redis mutation', { userId }, err);
    throw err;
  } finally {
    if (locked) {
      try {
        if ((await redis.get<string>(lockKey)) === lockToken) await redis.del(lockKey);
      } catch (err: unknown) {
        log.warn('Failed to release Redis sync lock', { lockKey }, err);
      }
    }
  }
}

async function runMutation(m: Mutation, userId?: string): Promise<InterviewSyncState> {
  if (isRedisSyncConfigured()) return applyRedis(m, userId);
  return applyLocal(m, userId);
}

// ───────────────────────── Public API ─────────────────────────

/**
 * Async, production-grade facade. Uses Upstash Redis when configured, otherwise the local
 * fallback (dev/test only; throws EnvConfigError in production). All API routes use this.
 */
export const syncStore = {
  async getState(userId?: string): Promise<InterviewSyncState> {
    const state = isRedisSyncConfigured() ? await loadRedisState(userId) : resolveLocalState(userId);
    expireZombieCapture(state);
    return state;
  },
  addOrUpdateQA: (qa: SyncQAItem, activeId?: string, userId?: string) =>
    runMutation(mutations.addOrUpdateQA(qa, activeId), userId),
  setActiveId: (activeId: string, userId?: string) => runMutation(mutations.setActiveId(activeId), userId),
  setFrozen: (isFrozen: boolean, userId?: string) => runMutation(mutations.setFrozen(isFrozen), userId),
  setPanic: (isPanic: boolean, userId?: string) => runMutation(mutations.setPanic(isPanic), userId),
  registerDevice: (device: DeviceType, active: boolean, userId?: string) =>
    runMutation(mutations.registerDevice(device, active), userId),
  syncAll: (
    qas: SyncQAItem[],
    isCapturing?: boolean,
    sessionDuration?: number,
    activeId?: string,
    sttStatus?: SttStatus,
    userId?: string
  ) => runMutation(mutations.syncAll(qas, isCapturing, sessionDuration, activeId, sttStatus), userId),
  setLiveTranscript: (text: string, userId?: string) => runMutation(mutations.setLiveTranscript(text), userId),
  setCapturingStatus: (isCapturing: boolean, userId?: string) =>
    runMutation(mutations.setCapturingStatus(isCapturing), userId),
  setSttStatus: (sttStatus: SttStatus, userId?: string) => runMutation(mutations.setSttStatus(sttStatus), userId),
  setOutputLanguage: (lang: string, userId?: string) => runMutation(mutations.setOutputLanguage(lang), userId),
  setSpeechLanguage: (lang: string, userId?: string) => runMutation(mutations.setSpeechLanguage(lang), userId),
  setNativeLanguage: (lang: string, userId?: string) => runMutation(mutations.setNativeLanguage(lang), userId),
  clear: (userId?: string) => runMutation(mutations.clear(), userId),
};

/**
 * Synchronous local-only store (globalThis + /tmp). Kept for unit tests and local development;
 * it never touches Redis and throws EnvConfigError in production. Production code must use `syncStore`.
 */
export const interviewSyncStore = {
  getState(userId?: string): InterviewSyncState {
    const state = resolveLocalState(userId);
    expireZombieCapture(state);
    return state;
  },
  addOrUpdateQA: (qa: SyncQAItem, activeId?: string, userId?: string) =>
    applyLocal(mutations.addOrUpdateQA(qa, activeId), userId),
  setActiveId: (activeId: string, userId?: string) => applyLocal(mutations.setActiveId(activeId), userId),
  setFrozen: (isFrozen: boolean, userId?: string) => applyLocal(mutations.setFrozen(isFrozen), userId),
  setPanic: (isPanic: boolean, userId?: string) => applyLocal(mutations.setPanic(isPanic), userId),
  registerDevice: (device: DeviceType, active: boolean, userId?: string) =>
    applyLocal(mutations.registerDevice(device, active), userId),
  syncAll: (
    qas: SyncQAItem[],
    isCapturing?: boolean,
    sessionDuration?: number,
    activeId?: string,
    sttStatus?: SttStatus,
    userId?: string
  ) => applyLocal(mutations.syncAll(qas, isCapturing, sessionDuration, activeId, sttStatus), userId),
  setLiveTranscript: (text: string, userId?: string) => applyLocal(mutations.setLiveTranscript(text), userId),
  setCapturingStatus: (isCapturing: boolean, userId?: string) =>
    applyLocal(mutations.setCapturingStatus(isCapturing), userId),
  setSttStatus: (sttStatus: SttStatus, userId?: string) => applyLocal(mutations.setSttStatus(sttStatus), userId),
  setOutputLanguage: (lang: string, userId?: string) => applyLocal(mutations.setOutputLanguage(lang), userId),
  setSpeechLanguage: (lang: string, userId?: string) => applyLocal(mutations.setSpeechLanguage(lang), userId),
  setNativeLanguage: (lang: string, userId?: string) => applyLocal(mutations.setNativeLanguage(lang), userId),
  clear: (userId?: string) => applyLocal(mutations.clear(), userId),
};
