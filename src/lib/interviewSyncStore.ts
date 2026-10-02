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
  outputLanguage: 'uk' | 'en' | 'auto';
  speechLanguage: 'uk' | 'en' | 'ru' | 'auto';
  liveTranscript: string;
  isCapturing: boolean;
  sttStatus?: 'connected' | 'reconnecting' | 'idle' | 'disconnected';
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

if (!globalForSync.__interviewSyncState) {
  globalForSync.__interviewSyncState = persisted || {
    qas: [],
    activeId: undefined,
    outputLanguage: 'uk',
    speechLanguage: 'uk',
    liveTranscript: '',
    isCapturing: false,
    sttStatus: 'idle',
    sessionDuration: 0,
    lastUpdated: Date.now(),
  };
}

export const interviewSyncStore = {
  getState(): InterviewSyncState {
    const state = globalForSync.__interviewSyncState!;
    // Auto-expire zombie capture session if no ping received for > 15s
    if (state.isCapturing && Date.now() - state.lastUpdated > 15000) {
      state.isCapturing = false;
      state.sttStatus = 'idle';
      state.liveTranscript = '';
    }
    return state;
  },

  addOrUpdateQA(qa: SyncQAItem, activeId?: string) {
    const state = globalForSync.__interviewSyncState!;
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
    state.activeId = activeId || qa.id;
    state.lastUpdated = Date.now();
    savePersistedState(state);
    return state;
  },

  setActiveId(activeId: string) {
    const state = globalForSync.__interviewSyncState!;
    state.activeId = activeId;
    state.lastUpdated = Date.now();
    savePersistedState(state);
    return state;
  },

  syncAll(
    qas: SyncQAItem[],
    isCapturing?: boolean,
    sessionDuration?: number,
    activeId?: string,
    sttStatus?: 'connected' | 'reconnecting' | 'idle' | 'disconnected'
  ) {
    const state = globalForSync.__interviewSyncState!;
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
    savePersistedState(state);
    return state;
  },

  setLiveTranscript(text: string) {
    const state = globalForSync.__interviewSyncState!;
    state.liveTranscript = text;
    state.lastUpdated = Date.now();
    return state;
  },

  setCapturingStatus(isCapturing: boolean) {
    const state = globalForSync.__interviewSyncState!;
    state.isCapturing = isCapturing;
    if (!isCapturing) {
      state.sttStatus = 'idle';
      state.liveTranscript = '';
    }
    state.lastUpdated = Date.now();
    savePersistedState(state);
    return state;
  },

  setSttStatus(sttStatus: 'connected' | 'reconnecting' | 'idle' | 'disconnected') {
    const state = globalForSync.__interviewSyncState!;
    state.sttStatus = sttStatus;
    state.lastUpdated = Date.now();
    savePersistedState(state);
    return state;
  },

  setOutputLanguage(lang: 'uk' | 'en' | 'auto') {
    const state = globalForSync.__interviewSyncState!;
    state.outputLanguage = lang;
    state.lastUpdated = Date.now();
    savePersistedState(state);
    return state;
  },

  setSpeechLanguage(lang: 'uk' | 'en' | 'ru' | 'auto') {
    const state = globalForSync.__interviewSyncState!;
    state.speechLanguage = lang;
    state.lastUpdated = Date.now();
    savePersistedState(state);
    return state;
  },

  clear() {
    const state = globalForSync.__interviewSyncState!;
    state.qas = [];
    state.liveTranscript = '';
    state.sttStatus = 'idle';
    state.lastUpdated = Date.now();
    savePersistedState(state);
    return state;
  },
};
