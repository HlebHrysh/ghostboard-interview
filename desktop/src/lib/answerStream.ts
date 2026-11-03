/**
 * Token-by-token answer streaming for the Copilot HUD.
 *
 * Unlike `DualStreamClient` (which re-parses the whole accumulated buffer into a structured
 * object on every chunk and falls back to canned heuristic answers), this client forwards each
 * SSE text delta to the UI the moment it arrives. There is no JSON assembly step and no waiting
 * for the end of generation: the first token is rendered as soon as the server flushes it.
 */

import { detectBackendUrl } from './apiClient';
import { getAccessToken, streamAiAnswer, isTauriEnvironment, listenTauriEvent } from './tauriBridge';
import { normalizeTechnicalSpeech } from './techSpeechNormalizer';
import type { AnswerLength, AnswerSpeed, HintLanguage } from './desktopSettings';
import type { CandidateProfile } from './profileStore';
import type { HudEvent } from '../types/hud';

export type DirectorModifier =
  | 'normal'
  | 'shorter'
  | 'simpler'
  | 'code'
  | 're_angle'
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
}

export interface AnswerStreamHandlers {
  /** Called for every text delta, with the already cleaned full text so far. */
  onToken: (delta: string, cleanedText: string) => void;
  onFirstToken?: (ttftMs: number) => void;
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
  candidateProfile?: { role?: string; primaryStack?: string; experienceLevel?: string };
  outputLanguage: string;
  helperLanguage?: string;
} {
  const cleanQuestion = normalizeTechnicalSpeech(req.question.trim());
  const lang = resolveLanguage(req.language, cleanQuestion);
  const helperLanguage = req.language === 'bilingual_ru' ? 'ru' : 'uk';
  const contextLines: string[] = [];

  if (req.speed === 'deep') {
    contextLines.push('Think step by step internally and give a precise, deeply reasoned answer.');
  } else {
    contextLines.push('Start answering immediately; no preamble.');
  }
  if (req.length === 'detailed') contextLines.push('Give a detailed answer with concrete technical depth.');
  if (req.profile?.customBio?.trim()) {
    contextLines.push(`Candidate CV highlights: ${req.profile.customBio.trim().slice(0, 600)}`);
  }
  if (req.profile?.techStack?.length) {
    contextLines.push(`Candidate tech stack: ${req.profile.techStack.slice(0, 16).join(', ')}`);
  }
  if (req.customInstructions?.trim()) {
    contextLines.push(`Candidate instructions: ${req.customInstructions.trim().slice(0, 600)}`);
  }

  const suffix = `\n\n[ANSWER CONTEXT - not part of the interviewer's question]\n${contextLines.join('\n')}`;
  const room = Math.max(200, MAX_QUESTION_CHARS - suffix.length);
  const question = `${cleanQuestion.slice(0, room)}${suffix}`.slice(0, MAX_QUESTION_CHARS);

  return {
    question,
    history: (req.history ?? []).slice(-4).map((h) => ({ speaker: h.speaker, text: h.text.slice(0, 400) })),
    directorModifier: resolveModifier(req),
    candidateProfile: req.profile
      ? {
          role: req.profile.role,
          primaryStack: req.profile.primaryStack || req.profile.techStack?.join(', '),
          experienceLevel: req.profile.experienceLevel,
        }
      : undefined,
    outputLanguage: lang,
    helperLanguage,
  };
}

/**
 * Strips the server's progressive phase markers from a *partial* stream so they never flash on
 * screen, and hides a marker that is only half-received at the tail of the buffer.
 */
export function cleanStreamText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<<<\s*META:[^>]+>>>/gi, '')
    .replace(/<<<\s*PHASE_1:[A-Za-z_]*\s*>>>/gi, '')
    .replace(/<<<\s*PHASE_[2-9]:[A-Za-z_]*\s*>>>/gi, '\n\n')
    .replace(/<<<\s*END\s*>>>/gi, '')
    .replace(/\[DONE\]/gi, '')
    .replace(/(?:<{3,}[A-Za-z0-9_:>|\s\-]*>{0,2}|<{1,2})$/, '')
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

  // 1. IN TAURI DESKTOP: Direct Rust SSE stream to Gemini/Groq/OpenAI (no Next.js server dependency!)
  if (isTauriEnvironment()) {
    let accumulated = '';
    let ttftMs: number | null = null;
    let completed = false;

    // Listen to real-time streamed chunks from Rust
    const unlisten = listenTauriEvent<HudEvent>('hud-event', (event) => {
      if (completed || controller.signal.aborted) return;

      if (event.type === 'llmChunk') {
        const token = event.payload.token || (event.payload as { delta?: string }).delta || '';
        if (token) {
          if (ttftMs === null) {
            ttftMs = Math.round(performance.now() - startedAt);
            handlers.onFirstToken?.(ttftMs);
          }
          accumulated += token;
          handlers.onToken(token, cleanStreamText(accumulated));
        }
      } else if (event.type === 'error') {
        const err = event.payload.message || 'Помилка потоку ШІ';
        completed = true;
        handlers.onError(err);
      }
    });

    const payload = buildAnswerPayload(req);
    void streamAiAnswer(payload.question, {
      outputLanguage: payload.outputLanguage,
      helperLanguage: payload.helperLanguage,
      modifier: payload.directorModifier,
    })
      .then((fullText) => {
        if (completed || controller.signal.aborted) {
          unlisten();
          return;
        }
        completed = true;
        unlisten();

        const finalText = cleanStreamText(fullText || accumulated);
        if (!finalText.trim()) {
          handlers.onError('ШІ повернув порожню відповідь. Перевірте дійсність GEMINI_API_KEY у файлі .env');
          return;
        }

        handlers.onDone({
          text: finalText,
          ttftMs: ttftMs ?? Math.round(performance.now() - startedAt),
          totalMs: Math.round(performance.now() - startedAt),
          model: 'Gemini 3.8 Flash / Groq',
        });
      })
      .catch((err: unknown) => {
        if (completed || controller.signal.aborted) {
          unlisten();
          return;
        }
        completed = true;
        unlisten();

        const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
        handlers.onError(msg || 'Невідома помилка нативного ШІ');
      });

    return {
      abort: () => {
        completed = true;
        unlisten();
        controller.abort();
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
        body: JSON.stringify(buildAnswerPayload(req)),
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
        handlers.onToken(token, cleanStreamText(accumulated));
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

      if (streamError) {
        handlers.onError(streamError);
        return;
      }
      if (!accumulated.trim()) {
        handlers.onError('ШІ повернув порожню відповідь. Спробуйте ще раз.');
        return;
      }
      handlers.onDone({
        text: cleanStreamText(accumulated),
        ttftMs,
        totalMs: Math.round(performance.now() - startedAt),
        model,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      handlers.onError(
        /failed to fetch|networkerror|load failed/i.test(msg)
          ? 'Немає зв’язку з сервером Ghostboard. Перевірте інтернет і налаштування API у .env.'
          : msg
      );
    }
  })();

  return { abort: () => controller.abort() };
}
