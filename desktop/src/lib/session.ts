/**
 * Interview session state: live dialogue messages <-> streamed AI answers.
 *
 * A pure reducer (no timers, no IO) so it can be unit tested and driven identically by native
 * `HudEvent`s, HTTP fallback streams and the 1-click demo simulation.
 *
 * Linking model (`messageId <-> answerId`):
 *  - every answer remembers the message that triggered it (`messageId`);
 *  - every message remembers its latest answer (`answerId`) -> "⚡ Відповідь #N" badge;
 *  - clicking a message selects that answer in the teleprompter (`select`).
 */

import { parseAnswer, stripQuestionContext } from './answerParser';
import { matchSpokenTranscriptToPillars } from './voiceAnchorTracker';

export type MessageSpeaker = 'interviewer' | 'candidate' | 'manual';

export interface ChatMessage {
  id: string;
  speaker: MessageSpeaker;
  text: string;
  ts: number;
  answerId: string | null;
}

export type AnswerStatus = 'streaming' | 'done' | 'error';
export type AnswerSource = 'auto' | 'manual' | 'screen' | 'demo';

export interface AnswerEntry {
  id: string;
  /** Client-side id of a manual ask; survives the rename to the native question id. */
  localId?: string | null;
  /** Human sequence number shown as "Відповідь #N". */
  seq: number;
  messageId: string | null;
  question: string;
  raw: string;
  status: AnswerStatus;
  startedAt: number;
  ttftMs: number | null;
  totalMs: number | null;
  modifier: string | null;
  error: string | null;
  source: AnswerSource;
  completedPillarIndices?: number[];
  activePillarIndex?: number;
  followUpTrap?: { question: string; answer: string };
  isContinuationMerged?: boolean;
  lineExplanations?: Record<number, string>;
}

export interface PendingAsk {
  answerId: string;
  at: number;
}

export interface SessionState {
  messages: ChatMessage[];
  answers: AnswerEntry[];
  /** Interim (not yet final) transcript line. */
  interim: { speaker: MessageSpeaker; text: string } | null;
  /** `null` = follow the latest answer; otherwise the pinned answer id (history / pause). */
  viewAnswerId: string | null;
  paused: boolean;
  pendingAsk: PendingAsk | null;
  counter: number;
}

export const MAX_MESSAGES = 80;
export const MAX_ANSWERS = 40;
const MERGE_WINDOW_MS = 2500;
const PENDING_TTL_MS = 12_000;

export const initialSession: SessionState = {
  messages: [],
  answers: [],
  interim: null,
  viewAnswerId: null,
  paused: false,
  pendingAsk: null,
  counter: 0,
};

export type SessionAction =
  | { type: 'transcript'; speaker: MessageSpeaker; text: string; isFinal: boolean; ts: number }
  | { type: 'question'; id: string; text: string; ts: number }
  | { type: 'chunk'; id: string; token: string; ts: number }
  | { type: 'done'; id: string; full?: string; latencyMs?: number; ts: number }
  | { type: 'fail'; id?: string; message: string }
  | {
      type: 'ask';
      answerId: string;
      messageId: string | null;
      text: string;
      modifier: string | null;
      source: AnswerSource;
      ts: number;
    }
  | { type: 'select'; answerId: string | null }
  | { type: 'togglePause' }
  | { type: 'clear' }
  | { type: 'togglePillar'; answerId: string; pillarIndex: number }
  | { type: 'setLineExplanation'; answerId: string; lineIndex: number; explanation: string };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** True when two utterances are (nearly) the same sentence. */
export function textsOverlap(a: string, b: string): boolean {
  const x = norm(stripQuestionContext(a));
  const y = norm(stripQuestionContext(b));
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const xs = new Set(x.split(' '));
  const ys = new Set(y.split(' '));
  let hit = 0;
  xs.forEach((w) => ys.has(w) && hit++);
  return hit / Math.max(1, Math.min(xs.size, ys.size)) >= 0.7;
}

let idSeq = 0;
export function nextLocalId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSeq}`;
}

function capped<T>(list: T[], max: number): T[] {
  return list.length > max ? list.slice(list.length - max) : list;
}

function findAnswerIndex(state: SessionState, id: string): number {
  return state.answers.findIndex((a) => a.id === id || a.localId === id);
}

/** Resolves the target of a stream event, adopting a pending placeholder when ids differ. */
function resolveAnswer(state: SessionState, id: string, now: number): { state: SessionState; index: number } {
  const index = findAnswerIndex(state, id);
  if (index >= 0) return { state, index };
  const pending = state.pendingAsk;
  if (pending && now - pending.at < PENDING_TTL_MS) {
    const pIdx = findAnswerIndex(state, pending.answerId);
    if (pIdx >= 0) {
      return { state: renameAnswer(state, pending.answerId, id), index: pIdx };
    }
  }
  return { state, index: -1 };
}

function renameAnswer(state: SessionState, from: string, to: string): SessionState {
  return {
    ...state,
    pendingAsk: null,
    answers: state.answers.map((a) => (a.id === from ? { ...a, id: to } : a)),
    messages: state.messages.map((m) => (m.answerId === from ? { ...m, answerId: to } : m)),
    viewAnswerId: state.viewAnswerId === from ? to : state.viewAnswerId,
  };
}

function appendAnswer(
  state: SessionState,
  entry: Omit<AnswerEntry, 'seq'>,
  linkMessageId: string | null
): SessionState {
  const seq = (state.answers[state.answers.length - 1]?.seq ?? 0) + 1;
  const answers = capped([...state.answers, { ...entry, seq }], MAX_ANSWERS);
  const messages = linkMessageId
    ? state.messages.map((m) => (m.id === linkMessageId ? { ...m, answerId: entry.id } : m))
    : state.messages;
  return { ...state, answers, messages };
}

function removeAnswer(state: SessionState, id: string): SessionState {
  return {
    ...state,
    answers: state.answers.filter((a) => a.id !== id),
    messages: state.messages.map((m) => (m.answerId === id ? { ...m, answerId: null } : m)),
    viewAnswerId: state.viewAnswerId === id ? null : state.viewAnswerId,
    pendingAsk: state.pendingAsk?.answerId === id ? null : state.pendingAsk,
  };
}

const IGNORE_RE = /^\s*<<<\s*IGNORE\s*>>>/i;

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'transcript': {
      const text = action.text.trim();
      if (!text) return state;

      // Real-time Voice Anchor Karaoke tracking for Candidate microphone speech
      let nextAnswers = state.answers;
      if (action.speaker === 'candidate' && state.answers.length > 0) {
        const activeAns = viewedAnswer(state) || state.answers[state.answers.length - 1];
        if (activeAns && activeAns.raw) {
          const parsed = parseAnswer(activeAns.raw);
          if (parsed.pillars && parsed.pillars.length > 0) {
            const trackerRes = matchSpokenTranscriptToPillars(
              text,
              parsed.pillars,
              activeAns.completedPillarIndices || []
            );
            if (
              trackerRes.completedIndices.length > (activeAns.completedPillarIndices?.length || 0) ||
              trackerRes.activeIndex !== activeAns.activePillarIndex
            ) {
              const idx = findAnswerIndex(state, activeAns.id);
              if (idx >= 0) {
                nextAnswers = state.answers.slice();
                nextAnswers[idx] = {
                  ...activeAns,
                  completedPillarIndices: trackerRes.completedIndices,
                  activePillarIndex: trackerRes.activeIndex,
                };
              }
            }
          }
        }
      }

      if (!action.isFinal) {
        return { ...state, answers: nextAnswers, interim: { speaker: action.speaker, text } };
      }
      const last = state.messages[state.messages.length - 1];
      if (last && last.speaker === action.speaker && last.text === text) {
        return { ...state, answers: nextAnswers, interim: null };
      }
      if (
        last &&
        last.speaker === action.speaker &&
        last.speaker !== 'manual' &&
        !last.answerId &&
        action.ts - last.ts < MERGE_WINDOW_MS
      ) {
        const merged = { ...last, text: `${last.text} ${text}`, ts: action.ts };
        return {
          ...state,
          answers: nextAnswers,
          interim: null,
          messages: [...state.messages.slice(0, -1), merged],
        };
      }
      const message: ChatMessage = {
        id: nextLocalId('msg'),
        speaker: action.speaker,
        text,
        ts: action.ts,
        answerId: null,
      };
      return { ...state, answers: nextAnswers, interim: null, messages: capped([...state.messages, message], MAX_MESSAGES) };
    }

    case 'question': {
      const text = stripQuestionContext(action.text) || 'Запитання співрозмовника';
      if (findAnswerIndex(state, action.id) >= 0) return state;

      // 1) Manual / modifier ask: adopt the placeholder created by `ask`.
      const pending = state.pendingAsk;
      if (pending && action.ts - pending.at < PENDING_TTL_MS && findAnswerIndex(state, pending.answerId) >= 0) {
        const looksManual = /^q-(direct|manual)/.test(action.id);
        const placeholder = state.answers[findAnswerIndex(state, pending.answerId)];
        if (looksManual || textsOverlap(placeholder.question, text)) {
          return renameAnswer(state, pending.answerId, action.id);
        }
      }

      // 2) Auto-detected: bind to the interviewer utterance that produced it.
      let linkId: string | null = null;
      for (let i = state.messages.length - 1, seen = 0; i >= 0 && seen < 8; i--) {
        const m = state.messages[i];
        if (m.speaker === 'candidate') continue;
        seen++;
        if (!m.answerId && textsOverlap(m.text, text)) {
          linkId = m.id;
          break;
        }
      }
      if (!linkId) {
        const lastInterviewer = [...state.messages].reverse().find((m) => m.speaker === 'interviewer');
        if (lastInterviewer && !lastInterviewer.answerId && action.ts - lastInterviewer.ts < 15_000) {
          linkId = lastInterviewer.id;
        }
      }
      let next = state;
      if (!linkId) {
        const message: ChatMessage = {
          id: nextLocalId('msg'),
          speaker: 'interviewer',
          text,
          ts: action.ts,
          answerId: null,
        };
        next = { ...state, messages: capped([...state.messages, message], MAX_MESSAGES) };
        linkId = message.id;
      }
      const lastAnswer = state.answers[state.answers.length - 1];
      const isContinuation = Boolean(lastAnswer && action.ts - lastAnswer.startedAt <= MERGE_WINDOW_MS);
      return appendAnswer(
        next,
        {
          id: action.id,
          messageId: linkId,
          question: text,
          raw: '',
          status: 'streaming',
          startedAt: action.ts,
          ttftMs: null,
          totalMs: null,
          modifier: null,
          error: null,
          source: 'auto',
          isContinuationMerged: isContinuation,
        },
        linkId
      );
    }

    case 'ask': {
      let next = state;
      let messageId = action.messageId;
      const text = action.text.trim();
      if (!messageId) {
        const message: ChatMessage = {
          id: nextLocalId('msg'),
          speaker: 'manual',
          text,
          ts: action.ts,
          answerId: null,
        };
        next = { ...state, messages: capped([...state.messages, message], MAX_MESSAGES) };
        messageId = message.id;
      }
      next = appendAnswer(
        next,
        {
          id: action.answerId,
          localId: action.answerId,
          messageId,
          question: text,
          raw: '',
          status: 'streaming',
          startedAt: action.ts,
          ttftMs: null,
          totalMs: null,
          modifier: action.modifier && action.modifier !== 'normal' ? action.modifier : null,
          error: null,
          source: action.source,
        },
        messageId
      );
      return {
        ...next,
        viewAnswerId: null,
        paused: false,
        pendingAsk: action.source === 'screen' ? null : { answerId: action.answerId, at: action.ts },
      };
    }

    case 'chunk': {
      const resolved = resolveAnswer(state, action.id, action.ts);
      let { state: s } = resolved;
      let idx = resolved.index;
      if (idx < 0) {
        // Chunk for an answer we never saw announced: create an orphan card so nothing is lost.
        s = appendAnswer(
          s,
          {
            id: action.id,
            messageId: null,
            question: 'Запитання співрозмовника',
            raw: '',
            status: 'streaming',
            startedAt: action.ts,
            ttftMs: null,
            totalMs: null,
            modifier: null,
            error: null,
            source: 'auto',
          },
          null
        );
        idx = findAnswerIndex(s, action.id);
      }
      const entry = s.answers[idx];
      const raw = entry.raw + action.token;
      if (IGNORE_RE.test(raw)) return removeAnswer(s, entry.id);
      const ttftMs = entry.ttftMs ?? (action.token ? Math.max(0, action.ts - entry.startedAt) : null);
      const parsed = parseAnswer(raw);
      const answers = s.answers.slice();
      answers[idx] = {
        ...entry,
        raw,
        ttftMs,
        status: 'streaming',
        followUpTrap: parsed.followUpTrap ?? entry.followUpTrap,
      };
      return { ...s, answers };
    }

    case 'done': {
      const resolved = resolveAnswer(state, action.id, action.ts);
      const s = resolved.state;
      const idx = resolved.index;
      if (idx < 0) return s;
      const entry = s.answers[idx];
      const raw = action.full && action.full.trim() ? action.full : entry.raw;
      if (IGNORE_RE.test(raw)) return removeAnswer(s, entry.id);
      // A second completion signal (stream promise after the native `llmDone`) must not rewrite timings.
      if (entry.status === 'done' && entry.totalMs !== null && entry.raw === raw) return s;
      const parsed = parseAnswer(raw);
      const answers = s.answers.slice();
      answers[idx] = {
        ...entry,
        raw,
        status: 'done',
        ttftMs: entry.ttftMs ?? (raw ? Math.max(0, action.ts - entry.startedAt) : null),
        totalMs: action.latencyMs && action.latencyMs > 0 ? action.latencyMs : Math.max(0, action.ts - entry.startedAt),
        followUpTrap: parsed.followUpTrap ?? entry.followUpTrap,
      };
      return { ...s, answers, pendingAsk: s.pendingAsk?.answerId === entry.id ? null : s.pendingAsk };
    }

    case 'fail': {
      const answers = state.answers.map((a) => {
        if (a.status !== 'streaming') return a;
        if (action.id && a.id !== action.id && a.localId !== action.id && state.pendingAsk?.answerId !== a.id) return a;
        return { ...a, status: 'error' as const, error: action.message };
      });
      return { ...state, answers, pendingAsk: null };
    }

    case 'select':
      return { ...state, viewAnswerId: action.answerId, paused: action.answerId === null ? false : state.paused };

    case 'togglePause': {
      if (state.paused) return { ...state, paused: false, viewAnswerId: null };
      const latest = state.answers[state.answers.length - 1];
      return { ...state, paused: true, viewAnswerId: state.viewAnswerId ?? latest?.id ?? null };
    }

    case 'clear':
      return { ...initialSession };

    case 'togglePillar': {
      const idx = findAnswerIndex(state, action.answerId);
      if (idx < 0) return state;
      const entry = state.answers[idx];
      const parsed = parseAnswer(entry.raw);
      const pillars = parsed.pillars;
      const currentCompleted = new Set(entry.completedPillarIndices || []);
      if (currentCompleted.has(action.pillarIndex)) {
        currentCompleted.delete(action.pillarIndex);
      } else {
        currentCompleted.add(action.pillarIndex);
      }
      const completedIndices = Array.from(currentCompleted).sort((a, b) => a - b);
      let activeIndex = pillars.length;
      for (let i = 0; i < pillars.length; i++) {
        if (!currentCompleted.has(i)) {
          activeIndex = i;
          break;
        }
      }
      const answers = state.answers.slice();
      answers[idx] = { ...entry, completedPillarIndices: completedIndices, activePillarIndex: activeIndex };
      return { ...state, answers };
    }

    case 'setLineExplanation': {
      const idx = findAnswerIndex(state, action.answerId);
      if (idx < 0) return state;
      const entry = state.answers[idx];
      const lineExplanations = { ...(entry.lineExplanations || {}), [action.lineIndex]: action.explanation };
      const answers = state.answers.slice();
      answers[idx] = { ...entry, lineExplanations };
      return { ...state, answers };
    }

    default:
      return state;
  }
}

// ----------------------------------------------------------------------------- selectors

export function latestAnswer(state: SessionState): AnswerEntry | null {
  return state.answers[state.answers.length - 1] ?? null;
}

export function viewedAnswer(state: SessionState): AnswerEntry | null {
  if (state.viewAnswerId) {
    const pinned = state.answers.find((a) => a.id === state.viewAnswerId);
    if (pinned) return pinned;
  }
  return latestAnswer(state);
}

/** True when the teleprompter shows an answer other than the newest one (history / pause). */
export function isViewingHistory(state: SessionState): boolean {
  const latest = latestAnswer(state);
  const viewed = viewedAnswer(state);
  return Boolean(latest && viewed && latest.id !== viewed.id);
}

export function answerForMessage(state: SessionState, message: ChatMessage): AnswerEntry | null {
  if (!message.answerId) return null;
  return state.answers.find((a) => a.id === message.answerId) ?? null;
}

/** Number of incoming answers that arrived after the currently viewed/frozen one. */
export function queuedAnswersCount(state: SessionState): number {
  if (!state.viewAnswerId && !state.paused) return 0;
  const viewed = viewedAnswer(state);
  if (!viewed) return 0;
  const viewedIdx = state.answers.findIndex((a) => a.id === viewed.id);
  if (viewedIdx === -1) return 0;
  return Math.max(0, state.answers.length - 1 - viewedIdx);
}
