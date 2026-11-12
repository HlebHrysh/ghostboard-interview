/**
 * Token-by-token answer streaming for the Copilot HUD.
 *
 * Unlike `DualStreamClient` (which re-parses the whole accumulated buffer into a structured
 * object on every chunk and falls back to canned heuristic answers), this client forwards each
 * SSE text delta to the UI the moment it arrives. There is no JSON assembly step and no waiting
 * for the end of generation: the first token is rendered as soon as the server flushes it.
 */

import { detectBackendUrl } from './apiClient';
import { parseAnswer, parsedAnswerToSlots } from './answerParser';
import { getAccessToken, streamAiAnswer, isTauriEnvironment, listenTauriEvent, clearSession } from './tauriBridge';
import { normalizeTechnicalSpeech } from './techSpeechNormalizer';
import { buildEmergencyCoachingCard } from '../../../src/lib/aiPromptCore';
import {
  mergeSurgicalAnswerSlots,
  resolvePatchSlotForModifier,
  serializeMergedSlotsToTaggedStream,
  type PatchTargetSlot,
  type StructuredAnswerSlots,
} from '../../../src/lib/speculativeSlotEngine';
import type { AnswerLength, AnswerSpeed, HintLanguage } from './desktopSettings';
import type { CandidateProfile } from './profileStore';
import type { HudEvent } from '../types/hud';

export {
  mergeSurgicalAnswerSlots,
  resolvePatchSlotForModifier,
  serializeMergedSlotsToTaggedStream,
  type PatchTargetSlot,
  type StructuredAnswerSlots,
};

export type DirectorModifier =
  | 'normal'
  | 'shorter'
  | 'simpler'
  | 'code'
  | 're_angle'
  | 'under_the_hood'
  | 'explain_line'
  | 'bridge'
  | 'more_technical'
  | 'code_example'
  | 'tradeoffs';

export interface AnswerRequest {
  question: string;
  /** Explicit one-shot override from a quick-action button ("Коротше", "Простіше", "Код", "Інший підхід"). */
  modifier?: DirectorModifier;
  speed: AnswerSpeed;
  length: AnswerLength;
  language: HintLanguage;
  customInstructions?: string;
  profile?: CandidateProfile | null;
  history?: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  /** Optional surgical slot patch mode (Idea #1 / Idea #4). */
  patchSlot?: PatchTargetSlot;
  /** Pre-generated Phase 1 hook text when continuing with `rest_after_hook`. */
  preGeneratedHook?: string;
  /** Existing tagged answer text to preserve untouched slots when patching. */
  existingRaw?: string;
  /** Existing structured slots snapshot to preserve untouched slots when patching. */
  existingSlots?: StructuredAnswerSlots;
}

export interface AnswerStreamHandlers {
  /** Called for every text delta, with the already cleaned full text so far. */
  onToken: (delta: string, cleanedText: string) => void;
  onFirstToken?: (ttftMs: number) => void;
  /** Called when a surgical partial patch is merged onto existing slots. */
  onSlotMerge?: (mergedTagged: string, mergedSlots: StructuredAnswerSlots) => void;
  onDone: (info: { text: string; ttftMs: number | null; totalMs: number; model: string | null }) => void;
  onError: (message: string) => void;
}

export interface AnswerStreamHandle {
  abort: () => void;
}

const MAX_QUESTION_CHARS = 3000;

/** Resolves the output language: explicit choice wins, "auto" follows the question's script. */
export function resolveLanguage(language: HintLanguage, question: string): string {
  if (language === 'bilingual_uk' || language === 'bilingual_ru') {
    return 'bilingual';
  }
  if (language !== 'auto') return language;
  if (/[ыэёъ]/i.test(question)) return 'ru';
  if (/[а-яіїєґ]/i.test(question)) return 'uk';
  return 'en';
}

/** Maps UI style settings (+ optional one-shot override) to the server's director modifier. */
export function resolveModifier(req: Pick<AnswerRequest, 'modifier' | 'length' | 'speed'>): DirectorModifier {
  if (req.modifier) return req.modifier;
  if (req.length === 'short') return 'shorter';
  if (req.length === 'code') return 'code';
  return req.speed === 'deep' ? 'more_technical' : 'normal';
}

/**
 * Builds the `/api/ai/dual-stream` body. The endpoint only understands role / stack / level, so
 * CV text and the user's custom instructions ride along as a clearly delimited context block
 * appended to the question (the server then answers *with* them in mind).
 */
export function buildAnswerPayload(req: AnswerRequest): {
  question: string;
  history: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  directorModifier: DirectorModifier;
  candidateProfile?: {
    role?: string;
    primaryStack?: string;
    experienceLevel?: string;
    customBio?: string;
    techStack?: string[];
  };
  outputLanguage: string;
  helperLanguage?: string;
  patchSlot?: PatchTargetSlot;
  preGeneratedHook?: string;
} {
  const cleanQuestion = normalizeTechnicalSpeech(req.question.trim());
  const lang = resolveLanguage(req.language, cleanQuestion);
  const helperLanguage = req.language === 'bilingual_ru' ? 'ru' : 'uk';
  const directorModifier = resolveModifier(req);
  const resolvedPatchSlot: PatchTargetSlot | undefined =
    req.patchSlot ??
    (req.existingRaw || req.existingSlots
      ? resolvePatchSlotForModifier(directorModifier)
      : undefined);

  return {
    question: cleanQuestion.slice(0, MAX_QUESTION_CHARS),
    history: (req.history ?? []).slice(-4).map((h) => ({ speaker: h.speaker, text: h.text.slice(0, 400) })),
    directorModifier,
    candidateProfile: req.profile
      ? {
          role: req.profile.role,
          primaryStack: req.profile.primaryStack || req.profile.techStack?.join(', '),
          experienceLevel: req.profile.experienceLevel,
          customBio: req.profile.customBio,
          techStack: req.profile.techStack,
        }
      : undefined,
    outputLanguage: lang,
    helperLanguage,
    ...(resolvedPatchSlot ? { patchSlot: resolvedPatchSlot } : {}),
    ...(req.preGeneratedHook ? { preGeneratedHook: req.preGeneratedHook } : {}),
  };
}

/**
 * Merges a newly streamed partial slot buffer with an existing slots snapshot
 * so HUD display text and parsed slots stay synchronized without wiping frozen phases.
 */
export function applySlotMergeToBuffer(
  rawAccumulated: string,
  slotMode?: PatchTargetSlot,
  existingSlots?: StructuredAnswerSlots | null
): {
  rawTagged: string;
  cleanedText: string;
  mergedSlots: StructuredAnswerSlots | null;
} {
  if (!existingSlots || !slotMode || slotMode === 'full' || slotMode === 'speculative_hook') {
    return {
      rawTagged: rawAccumulated,
      cleanedText: cleanStreamText(rawAccumulated),
      mergedSlots: null,
    };
  }

  const incomingSlots = parsedAnswerToSlots(parseAnswer(rawAccumulated));
  const mergedSlots = mergeSurgicalAnswerSlots(existingSlots, incomingSlots, slotMode);
  const mergedTagged = serializeMergedSlotsToTaggedStream(mergedSlots);

  return {
    rawTagged: mergedTagged,
    cleanedText: cleanStreamText(mergedTagged),
    mergedSlots,
  };
}

/**
 * Strips the server's progressive phase markers from a *partial* stream so they never flash on
 * screen, and hides a marker that is only half-received at the tail of the buffer.
 */
export function cleanStreamText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<<<\s*META:[^>]*>>>/gi, '')
    .replace(/<<<\s*IGNORE\s*>>>/gi, '')
    .replace(/<<<\s*PHASE[-_]?1:[A-Za-z0-9_\-]*\s*>>>/gi, '')
    .replace(/<<<\s*PHASE[-_]?[2-9]:[A-Za-z0-9_\-]*\s*>>>/gi, '\n\n')
    .replace(/<<<\s*PHASE[-_]?[A-Za-z0-9_\-:]*\s*>>>/gi, '')
    .replace(/<<<\s*END\s*>>>/gi, '')
    .replace(/\[DONE\]/gi, '')
    .replace(/\s*<{3,}[A-Za-z0-9_:>|\s\-]*>{0,2}$/, '')
    .replace(/^\s+/, '')
    .replace(/\n{3,}/g, '\n\n');
}

function describeHttpError(status: number, body: string): string {
  let detail = '';
  try {
    const parsed = JSON.parse(body) as { error?: string; message?: string };
    detail = parsed.error || parsed.message || '';
  } catch {
    detail = body.slice(0, 160);
  }
  if (status === 401) return 'Потрібен вхід: сесія Ghostboard недійсна. Увійдіть в Офісі.';
  if (status === 429) return `Ліміт запитів перевищено${detail ? `: ${detail}` : ''}`;
  if (status >= 500) return `Сервер ШІ тимчасово недоступний (${status})${detail ? `: ${detail}` : ''}`;
  return `Помилка запиту (${status})${detail ? `: ${detail}` : ''}`;
}

/**
 * Streams an answer. Each SSE `chunk` is pushed to `onToken` immediately. Always resolves
 * through exactly one of `onDone` / `onError` (aborting calls neither).
 */
export function streamAnswer(req: AnswerRequest, handlers: AnswerStreamHandlers): AnswerStreamHandle {
  const controller = new AbortController();
  const startedAt = performance.now();
  const payload = buildAnswerPayload(req);
  const slotMode: PatchTargetSlot | undefined = payload.patchSlot;
  const baseSlots: StructuredAnswerSlots | null =
    req.existingSlots ?? (req.existingRaw ? parsedAnswerToSlots(parseAnswer(req.existingRaw)) : null);

  const emitProgress = (delta: string, rawSoFar: string): string => {
    const merged = applySlotMergeToBuffer(rawSoFar, slotMode, baseSlots);
    handlers.onToken(delta, merged.cleanedText);
    if (merged.mergedSlots) {
      handlers.onSlotMerge?.(merged.rawTagged, merged.mergedSlots);
    }
    return merged.cleanedText;
  };

  // 1. IN TAURI DESKTOP: Direct Rust SSE stream to Gemini/Groq/OpenAI (no Next.js server dependency!)
  if (isTauriEnvironment()) {
    let accumulated = '';
    let ttftMs: number | null = null;
    let completed = false;
    let activeQuestionId: string | null = null;

    // Listen to real-time streamed chunks from Rust
    const unlisten = listenTauriEvent<HudEvent>('hud-event', (event) => {
      if (completed || controller.signal.aborted) return;

      if (event.type === 'questionDetected') {
        const p = event.payload as { id?: string; questionId?: string };
        const qid = p.id || p.questionId;
        if (qid) {
          activeQuestionId = qid;
        }
      } else if (event.type === 'llmChunk' || event.type === 'aiChunk') {
        const p = event.payload as { token?: string; delta?: string; text?: string; chunk?: string; question_id?: string; questionId?: string };
        const qid = p.question_id || p.questionId;
        if (activeQuestionId && qid && qid !== activeQuestionId) {
          return;
        }
        if (!activeQuestionId && qid) {
          activeQuestionId = qid;
        }
        const token = p.token || p.delta || p.text || p.chunk || '';
        if (token) {
          if (ttftMs === null) {
            ttftMs = Math.round(performance.now() - startedAt);
            handlers.onFirstToken?.(ttftMs);
          }
          accumulated += token;
          emitProgress(token, accumulated);
        }
      } else if (event.type === 'llmDone' || event.type === 'aiDone') {
        const p = event.payload as { full_text?: string; text?: string; question_id?: string; questionId?: string };
        const qid = p.question_id || p.questionId;
        if (activeQuestionId && qid && qid !== activeQuestionId) {
          return;
        }
        const full = p.full_text || p.text;
        if (full) {
          accumulated = full;
          emitProgress('', accumulated);
        }
      } else if (event.type === 'error') {
        completed = true;
        unlisten();
        const fallbackCard = cleanStreamText(buildEmergencyCoachingCard(payload.question, payload.outputLanguage));
        handlers.onToken('', fallbackCard);
        handlers.onDone({
          text: fallbackCard,
          ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
          totalMs: Math.round(performance.now() - startedAt),
          model: 'Ghostboard Emergency Fallback',
        });
      }
    });

    void streamAiAnswer(payload.question, {
      outputLanguage: payload.outputLanguage,
      helperLanguage: payload.helperLanguage,
      modifier: payload.directorModifier,
      candidateProfile: payload.candidateProfile,
      history: payload.history,
    })
      .then((fullText) => {
        if (completed || controller.signal.aborted) {
          unlisten();
          return;
        }
        completed = true;
        unlisten();

        const rawFinal = fullText || accumulated;
        if (!cleanStreamText(rawFinal).trim()) {
          const fallbackCard = cleanStreamText(buildEmergencyCoachingCard(payload.question, payload.outputLanguage));
          handlers.onToken('', fallbackCard);
          handlers.onDone({
            text: fallbackCard,
            ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
            totalMs: Math.round(performance.now() - startedAt),
            model: 'Ghostboard Emergency Fallback',
          });
          return;
        }

        const finalText = emitProgress('', rawFinal);

        handlers.onDone({
          text: finalText,
          ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
          totalMs: Math.round(performance.now() - startedAt),
          model: 'Gemini 3.8 Flash / Groq',
        });
      })
      .catch(async () => {
        if (completed || controller.signal.aborted) {
          unlisten();
          return;
        }

        // Automatic failover to local Next.js dual-stream backend
        try {
          const [baseUrl, token] = await Promise.all([detectBackendUrl(), getAccessToken()]);
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            'x-ghostboard-client': 'desktop-app',
          };
          if (token) headers.Authorization = `Bearer ${token}`;

          const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/ai/dual-stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          if (response.ok && response.body) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fallbackAcc = '';
            while (true) {
              const { value, done } = await reader.read();
              if (value) {
                const chunk = decoder.decode(value, { stream: !done });
                fallbackAcc += chunk;
                emitProgress(chunk, fallbackAcc);
              }
              if (done) break;
            }
            if (fallbackAcc.trim()) {
              completed = true;
              unlisten();
              const finalFallbackText = applySlotMergeToBuffer(fallbackAcc, slotMode, baseSlots).cleanedText;
              handlers.onDone({
                text: finalFallbackText,
                ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
                totalMs: Math.round(performance.now() - startedAt),
                model: 'Next.js Fallback',
              });
              return;
            }
          }
        } catch {}

        completed = true;
        unlisten();
        const fallbackCard = cleanStreamText(buildEmergencyCoachingCard(payload.question, payload.outputLanguage));
        handlers.onToken('', fallbackCard);
        handlers.onDone({
          text: fallbackCard,
          ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
          totalMs: Math.round(performance.now() - startedAt),
          model: 'Ghostboard Emergency Fallback',
        });
      });

    return {
      abort: () => {
        completed = true;
        unlisten();
        controller.abort();
        void clearSession();
      },
    };
  }

  // 2. NON-TAURI DEV / BROWSER FALLBACK (fetch to Next.js API route)
  void (async () => {
    let accumulated = '';
    let ttftMs: number | null = null;
    let model: string | null = null;
    try {
      const [baseUrl, token] = await Promise.all([detectBackendUrl(), getAccessToken()]);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'x-ghostboard-client': 'desktop-app',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/ai/dual-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const body = await response.text().catch(() => '');
        handlers.onError(describeHttpError(response.status, body));
        return;
      }

      const isSse = (response.headers.get('content-type') || '').includes('text/event-stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let eventName = 'message';
      let dataLines: string[] = [];
      let finished = false;
      let streamError: string | null = null;

      const pushToken = (token: string) => {
        if (!token) return;
        if (ttftMs === null) {
          ttftMs = Math.round(performance.now() - startedAt);
          handlers.onFirstToken?.(ttftMs);
        }
        accumulated += token;
        emitProgress(token, accumulated);
      };

      const dispatch = () => {
        if (dataLines.length === 0) return;
        const data = dataLines.join('\n');
        const name = eventName;
        eventName = 'message';
        dataLines = [];
        if (data === '[DONE]' || data === '<<<END>>>') {
          finished = true;
          return;
        }
        if (name === 'telemetry') {
          try {
            const t = JSON.parse(data) as { model?: string };
            if (t.model) model = t.model;
          } catch {
            /* telemetry is optional */
          }
          return;
        }
        if (name === 'complete') {
          try {
            const c = JSON.parse(data) as { model?: string };
            if (c.model) model = c.model;
          } catch {
            /* optional */
          }
          finished = true;
          return;
        }
        if (name === 'error') {
          try {
            const e = JSON.parse(data) as { error?: string; message?: string };
            streamError = e.error || e.message || 'Помилка потоку ШІ';
          } catch {
            streamError = data || 'Помилка потоку ШІ';
          }
          finished = true;
          return;
        }
        try {
          const parsed = JSON.parse(data) as { text?: string; model?: string; type?: string };
          if (parsed.type === 'TTFT') return;
          if (parsed.model) model = parsed.model;
          if (typeof parsed.text === 'string') pushToken(parsed.text);
        } catch {
          pushToken(data);
        }
      };

      while (!finished) {
        const { value, done } = await reader.read();
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          if (!isSse) {
            pushToken(chunk);
          } else {
            buffer += chunk;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (line === '') {
                dispatch();
              } else if (line.startsWith(':')) {
                continue;
              } else if (line.startsWith('event:')) {
                eventName = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).replace(/^ /, ''));
              }
            }
          }
        }
        if (done) break;
      }
      if (isSse) {
        if (buffer.startsWith('data:')) dataLines.push(buffer.slice(5).replace(/^ /, ''));
        dispatch();
      }
      reader.cancel().catch(() => {});

      if (streamError || !accumulated.trim()) {
        const fallbackCard = cleanStreamText(buildEmergencyCoachingCard(req.question, resolveLanguage(req.language, req.question)));
        handlers.onToken('', fallbackCard);
        handlers.onDone({
          text: fallbackCard,
          ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
          totalMs: Math.round(performance.now() - startedAt),
          model: 'Ghostboard Emergency Fallback',
        });
        return;
      }
      const finalMerged = applySlotMergeToBuffer(accumulated, slotMode, baseSlots);
      if (finalMerged.mergedSlots) {
        handlers.onSlotMerge?.(finalMerged.rawTagged, finalMerged.mergedSlots);
      }
      handlers.onDone({
        text: finalMerged.cleanedText,
        ttftMs,
        totalMs: Math.round(performance.now() - startedAt),
        model,
      });
    } catch {
      if (controller.signal.aborted) return;
      const fallbackCard = cleanStreamText(buildEmergencyCoachingCard(req.question, resolveLanguage(req.language, req.question)));
      handlers.onToken('', fallbackCard);
      handlers.onDone({
        text: fallbackCard,
        ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
        totalMs: Math.round(performance.now() - startedAt),
        model: 'Ghostboard Emergency Fallback',
      });
    }
  })();

  return { abort: () => controller.abort() };
}
