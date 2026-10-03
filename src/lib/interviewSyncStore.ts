// In-memory shared state for live interview synchronization across devices (PC and Laptop)
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

const globalForSync = globalThis as unknown as {
  __interviewSyncState?: InterviewSyncState;
  __userInterviewSyncStates?: Map<string, InterviewSyncState>;
};

import fs from 'fs';

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

const persisted = loadPersistedState();

if (!globalForSync.__userInterviewSyncStates) {
  globalForSync.__userInterviewSyncStates = new Map<string, InterviewSyncState>();
}

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

if (!globalForSync.__interviewSyncState) {
  globalForSync.__interviewSyncState = persisted || getInitialState();
}

function resolveState(userId?: string): InterviewSyncState {
  if (!userId || userId === 'default') {
    return globalForSync.__interviewSyncState!;
  }
  let userState = globalForSync.__userInterviewSyncStates!.get(userId);
  if (!userState) {
    userState = getInitialState();
    globalForSync.__userInterviewSyncStates!.set(userId, userState);
  }
  return userState;
}

export const interviewSyncStore = {
  getState(userId?: string): InterviewSyncState {
    const state = resolveState(userId);
    // Auto-expire zombie capture session if no ping received for > 15s
    if (state.isCapturing && Date.now() - state.lastUpdated > 15000) {
      state.isCapturing = false;
      state.sttStatus = 'idle';
      state.liveTranscript = '';
    }
    return state;
  },

  addOrUpdateQA(qa: SyncQAItem, activeId?: string, userId?: string) {
    const state = resolveState(userId);
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
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setActiveId(activeId: string, userId?: string) {
    const state = resolveState(userId);
    state.activeId = activeId;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setFrozen(isFrozen: boolean, userId?: string) {
    const state = resolveState(userId);
    state.isFrozen = isFrozen;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setPanic(isPanic: boolean, userId?: string) {
    const state = resolveState(userId);
    state.isPanic = isPanic;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  registerDevice(device: 'desktop' | 'web' | 'phone', active: boolean, userId?: string) {
    const state = resolveState(userId);
    if (!state.connectedDevices) {
      state.connectedDevices = { desktop: false, web: false, phone: false };
    }
    state.connectedDevices[device] = active;
    state.lastUpdated = Date.now();
    return state;
  },

  syncAll(
    qas: SyncQAItem[],
    isCapturing?: boolean,
    sessionDuration?: number,
    activeId?: string,
    sttStatus?: 'connected' | 'reconnecting' | 'idle' | 'disconnected',
    userId?: string
  ) {
    const state = resolveState(userId);
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
    if (typeof isCapturing === 'boolean') {
      state.isCapturing = isCapturing;
    }
    if (sttStatus) {
      state.sttStatus = sttStatus;
    }
    if (typeof sessionDuration === 'number') {
      state.sessionDuration = sessionDuration;
    }
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setLiveTranscript(text: string, userId?: string) {
    const state = resolveState(userId);
    state.liveTranscript = text;
    state.lastUpdated = Date.now();
    return state;
  },

  setCapturingStatus(isCapturing: boolean, userId?: string) {
    const state = resolveState(userId);
    state.isCapturing = isCapturing;
    if (!isCapturing) {
      state.sttStatus = 'idle';
      state.liveTranscript = '';
    }
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setSttStatus(sttStatus: 'connected' | 'reconnecting' | 'idle' | 'disconnected', userId?: string) {
    const state = resolveState(userId);
    state.sttStatus = sttStatus;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setOutputLanguage(lang: string, userId?: string) {
    const state = resolveState(userId);
    state.outputLanguage = lang;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setSpeechLanguage(lang: string, userId?: string) {
    const state = resolveState(userId);
    state.speechLanguage = lang;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  setNativeLanguage(lang: string, userId?: string) {
    const state = resolveState(userId);
    state.nativeLanguage = lang;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },

  clear(userId?: string) {
    const state = resolveState(userId);
    state.qas = [];
    state.liveTranscript = '';
    state.sttStatus = 'idle';
    state.isFrozen = false;
    state.isPanic = false;
    state.lastUpdated = Date.now();
    if (!userId || userId === 'default') savePersistedState(state);
    return state;
  },
};
