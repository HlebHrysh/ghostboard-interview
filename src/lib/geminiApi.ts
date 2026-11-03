/**
 * Shared Gemini API Client with model fallback and robust error handling.
 */
import { logger } from './logger';

const log = logger.child({ component: 'geminiApi' });

export const FLASH_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
];

export const PRO_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
];

/** In-process cache of models that rejected thinkingConfig to avoid repeated 400 retries */
export const modelsRejectingThinking = new Set<string>();

/** Model health tracking for low-latency smart routing */
interface ModelHealth {
  demotedUntil: number;
  lastLatencyMs?: number;
}
const modelHealthMap = new Map<string, ModelHealth>();
let preferredFastModel: string | null = null;

export const MODEL_DEMOTION_TTL_MS = 3 * 60 * 1000; // 3-minute demotion on timeout/503

export function getPreferredFastModel(): string | null {
  return preferredFastModel;
}

export function recordModelSuccess(model: string, latencyMs?: number): void {
  preferredFastModel = model;
  modelHealthMap.set(model, { demotedUntil: 0, lastLatencyMs: latencyMs });
}

export function recordModelFailure(model: string): void {
  modelHealthMap.set(model, {
    demotedUntil: Date.now() + MODEL_DEMOTION_TTL_MS,
  });
  if (preferredFastModel === model) {
    preferredFastModel = null;
  }
}

export function resetModelHealth(): void {
  modelHealthMap.clear();
  preferredFastModel = null;
}

export function getPrioritizedModels(pool: string[] = FLASH_MODELS): string[] {
  const now = Date.now();
  const healthy: string[] = [];
  const demoted: string[] = [];

  for (const m of pool) {
    const health = modelHealthMap.get(m);
    if (health && health.demotedUntil > now) {
      demoted.push(m);
    } else {
      healthy.push(m);
    }
  }

  // If preferredFastModel is set and healthy, move it to the very front
  if (preferredFastModel && healthy.includes(preferredFastModel)) {
    const idx = healthy.indexOf(preferredFastModel);
    healthy.splice(idx, 1);
    healthy.unshift(preferredFastModel);
  }

  return [...healthy, ...demoted];
}

export function getCleanGeminiKey(): string | null {
  const rawKey = process.env.GEMINI_API_KEY;
  if (!rawKey) return null;

  // Clean key: strip "GEMINI_API_KEY = ", quotes, whitespace
  let clean = rawKey.trim();
  if (clean.includes('=')) {
    clean = clean.split('=').pop()?.trim() || clean;
  }
  clean = clean.replace(/^["']|["']$/g, '').trim();
  return clean || null;
}

export function getCleanGroqKey(): string | null {
  const rawKey = process.env.GROQ_API_KEY;
  if (!rawKey) return null;

  let clean = rawKey.trim();
  if (clean.includes('=')) {
    clean = clean.split('=').pop()?.trim() || clean;
  }
  clean = clean.replace(/^["']|["']$/g, '').trim();
  return clean || null;
}

export interface GeminiCallOptions {
  models?: string[];
  contents: unknown[];
  generationConfig?: Record<string, unknown>;
  /** Per-model request timeout in ms (default 4000). Lower = faster failover. */
  timeoutMs?: number;
  /** Disable thinking budget to ensure sub-250ms TTFT (default: true for flash models) */
  zeroThinkingBudget?: boolean;
}

export function getFastStreamingGenerationConfig(
  modelOrTokens: string | number = 'gemini-3.8-flash',
  maybeTokens?: number
): Record<string, unknown> {
  const isLegacyNumber = typeof modelOrTokens === 'number';
  const model = isLegacyNumber ? 'gemini-3.8-flash' : modelOrTokens;
  const maxTokens = isLegacyNumber ? modelOrTokens : (maybeTokens ?? 850);
  const cfg: Record<string, unknown> = {
    temperature: isLegacyNumber ? 0.25 : 0.3,
    topP: 0.9,
    maxOutputTokens: maxTokens,
  };
  if (typeof model === 'string' && !modelsRejectingThinking.has(model) && !model.includes('flash-lite')) {
    cfg.thinkingConfig = {
      thinkingBudget: 0,
    };
  }
  return cfg;
}

export interface GeminiCallResult {
  ok: boolean;
  modelUsed?: string;
  data?: unknown;
  text?: string;
  error?: string;
  isQuotaError?: boolean;
  isDeniedError?: boolean;
}

export async function callGeminiWithFallback(options: GeminiCallOptions): Promise<GeminiCallResult> {
  const apiKey = getCleanGeminiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: 'GEMINI_API_KEY is not configured in .env.local',
    };
  }

  const modelsToTry = getPrioritizedModels(options.models || FLASH_MODELS);
  let lastError = 'No models available';
  let isQuota = false;
  let isDenied = false;
  let isInvalidKey = false;
  let isPrepayDepleted = false;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const timeoutMs = options.timeoutMs || 3000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const genConfig: Record<string, unknown> = {
        temperature: 0.25,
        maxOutputTokens: 2048,
        ...(options.generationConfig || {}),
      };

      if (
        options.zeroThinkingBudget !== false &&
        !genConfig.thinkingConfig &&
        !modelsRejectingThinking.has(model) &&
        !model.includes('flash-lite')
      ) {
        genConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: options.contents,
          generationConfig: genConfig,
        }),
        signal: controller.signal,
      });

      if (!res.ok && res.status === 400 && genConfig.thinkingConfig) {
        let errBody = '';
        try {
          errBody = await res.text();
        } catch {}
        if (
          errBody.includes('thinkingConfig') ||
          errBody.includes('invalid argument') ||
          errBody.includes('unknown field') ||
          errBody.includes('INVALID_ARGUMENT')
        ) {
          modelsRejectingThinking.add(model);
          delete genConfig.thinkingConfig;
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: options.contents,
              generationConfig: genConfig,
            }),
            signal: controller.signal,
          });
        }
      }

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          recordModelSuccess(model);
          return {
            ok: true,
            modelUsed: model,
            data,
            text,
          };
        }
      }

      // If not ok, analyze the error
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {
        // ignore
      }

      const errMsg = `${res.statusText} ${errBody}`;
      lastError = errMsg;

      // Check if API key is invalid
      if (res.status === 400 && (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid'))) {
        isInvalidKey = true;
        break; // Key is dead, fail fast without hammering further models
      }

      // Check for Google Prepay zero-balance lock
      if (errMsg.includes('prepayment credits are depleted')) {
        isPrepayDepleted = true;
        break;
      }

      // Check if access is denied to project
      if (errMsg.includes('denied access') || errMsg.includes('PERMISSION_DENIED')) {
        isDenied = true;
        break;
      }

      // Check if rate limited / quota exhausted on THIS specific model: try the next model!
      if (res.status === 429 || errMsg.includes('Quota exceeded') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('free_tier_requests, limit: 0')) {
        log.warn(`Model ${model} quota/rate limit reached (429). Trying fallback model...`, { model, status: res.status });
        recordModelFailure(model);
        isQuota = true;
        continue;
      }

      // If model not found, high demand (503) or deprecated, try next model
      if (res.status === 404 || res.status === 503 || errMsg.includes('not found') || errMsg.includes('no longer available') || errMsg.includes('high demand')) {
        log.warn(`Model ${model} unavailable (status ${res.status}). Trying fallback...`, { model, status: res.status });
        recordModelFailure(model);
        continue;
      }
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      recordModelFailure(model);
      lastError = e instanceof Error ? e.message : 'Network error';
      log.warn(`Model ${model} request error: ${lastError}. Trying fallback...`, { model }, e);
    }
  }

  let humanExplanation = lastError;
  if (isPrepayDepleted) {
    humanExplanation = 'Google AI Studio: увімкнено режим Prepay з $0 балансу. Перейдіть на aistudio.google.com/app/plan_information та перемкніть проєкт на "Pay-as-you-go" або "Free".';
  } else if (isInvalidKey) {
    humanExplanation = 'Помилка авторизації хмарного сервісу ШІ. Спробуйте оновити сторінку або зв’яжіться з підтримкою.';
  } else if (isQuota) {
    humanExplanation = 'Gemini API: Всі доступні моделі тимчасово вичерпали ліміт запитів (Rate limit 429). Спробуйте за хвилину.';
  } else if (isDenied) {
    humanExplanation = 'Gemini API: Доступ заборонено (Project denied access). Отримайте дійсний ключ.';
  }

  return {
    ok: false,
    error: humanExplanation,
    isQuotaError: isQuota,
    isDeniedError: isDenied,
  };
}

export interface HedgedStreamContender {
  model: string;
  firstChunk: string;
  remainingLines: string[];
  reader: ReadableStreamDefaultReader<Uint8Array>;
  decoder: TextDecoder;
  initialBuffer: string;
  type: 'groq' | 'gemini';
  ttftMs: number;
}

export interface HedgedStreamRaceOptions {
  contents: unknown[];
  systemPrompt: string;
  normalizedQuestion: string;
  history?: Array<{ speaker: string; text: string }>;
  generationConfig?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export async function runHedgedStreamRace(
  options: HedgedStreamRaceOptions
): Promise<HedgedStreamContender | null> {
  const startTime = Date.now();
  const apiKey = getCleanGeminiKey();
  const groqKey = getCleanGroqKey();

  if (!apiKey && !groqKey) {
    return null;
  }

  const maxTokens = options.maxTokens ?? 850;
  const temperature = options.temperature ?? 0.3;

  let winnerDeclared = false;
  let resolveWinner: (winner: HedgedStreamContender | null) => void;
  const winnerPromise = new Promise<HedgedStreamContender | null>((resolve) => {
    resolveWinner = resolve;
  });

  const activeControllers = new Map<string, AbortController>();
  let activeContendersCount = 0;
  let onContenderFinished: (() => void) | null = null;

  const declareWinner = (contender: HedgedStreamContender): boolean => {
    if (winnerDeclared) return false;
    winnerDeclared = true;
    for (const [id, ctrl] of activeControllers.entries()) {
      if (id !== contender.model) {
        try {
          ctrl.abort();
        } catch {}
      }
    }
    recordModelSuccess(contender.model, contender.ttftMs);
    resolveWinner(contender);
    return true;
  };

  const checkContendersDone = () => {
    if (activeContendersCount === 0 && !winnerDeclared) {
      onContenderFinished?.();
    }
  };

  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      winnerDeclared = true;
      for (const ctrl of activeControllers.values()) {
        try {
          ctrl.abort();
        } catch {}
      }
      resolveWinner(null);
    });
  }

  const startGroqContender = async () => {
    if (!groqKey || winnerDeclared) return;
    const modelName = 'Groq / Llama 3.3 70B';
    const ac = new AbortController();
    activeControllers.set(modelName, ac);
    activeContendersCount++;

    try {
      const groqMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: options.systemPrompt },
      ];
      if (options.history && options.history.length > 0) {
        options.history.slice(-4).forEach((h) => {
          groqMessages.push({
            role: h.speaker === 'interviewer' ? 'user' : 'assistant',
            content: `${h.speaker.toUpperCase()}: ${h.text}`,
          });
        });
      }
      groqMessages.push({
        role: 'user',
        content: `INTERVIEW QUESTION: ${options.normalizedQuestion}`,
      });

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: groqMessages,
          stream: true,
          temperature,
          max_tokens: maxTokens,
        }),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        recordModelFailure(modelName);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!winnerDeclared) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || !line.startsWith('data:')) continue;
          const dataStr = line.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const deltaText = parsed.choices?.[0]?.delta?.content;
            if (deltaText) {
              const ttftMs = Date.now() - startTime;
              const claimed = declareWinner({
                model: modelName,
                firstChunk: deltaText,
                remainingLines: lines.slice(i + 1),
                reader,
                decoder,
                initialBuffer: buffer,
                type: 'groq',
                ttftMs,
              });
              if (!claimed) {
                try {
                  reader.cancel();
                } catch {}
              }
              return;
            }
          } catch {}
        }
      }
    } catch {
      recordModelFailure(modelName);
    } finally {
      activeControllers.delete(modelName);
      activeContendersCount--;
      checkContendersDone();
    }
  };

  const startGeminiContender = async (model: string) => {
    if (!apiKey || winnerDeclared) return;
    const ac = new AbortController();
    activeControllers.set(model, ac);
    activeContendersCount++;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
      const genConfig: Record<string, unknown> = {
        temperature,
        topP: 0.9,
        maxOutputTokens: maxTokens,
        ...(options.generationConfig || {}),
      };

      if (!modelsRejectingThinking.has(model) && !model.includes('flash-lite')) {
        genConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: options.contents, generationConfig: genConfig }),
        cache: 'no-store',
        signal: ac.signal,
      });

      if (!res.ok) {
        if (res.status === 503 || res.status === 429 || res.status === 404) {
          recordModelFailure(model);
          return;
        }
        const errBody = await res.text().catch(() => '');
        if (
          res.status === 400 &&
          (errBody.includes('thinkingConfig') ||
            errBody.includes('invalid argument') ||
            errBody.includes('unknown field') ||
            errBody.includes('INVALID_ARGUMENT'))
        ) {
          modelsRejectingThinking.add(model);
          delete genConfig.thinkingConfig;
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: options.contents, generationConfig: genConfig }),
            cache: 'no-store',
            signal: ac.signal,
          });
        }
      }

      if (!res.ok || !res.body) {
        recordModelFailure(model);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!winnerDeclared) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || !line.startsWith('data:')) continue;
          const jsonStr = line.replace(/^data:\s*/, '');
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const candidate = parsed.candidates?.[0];
            const textChunk = candidate?.content?.parts?.[0]?.text;
            if (textChunk) {
              const ttftMs = Date.now() - startTime;
              const claimed = declareWinner({
                model,
                firstChunk: textChunk,
                remainingLines: lines.slice(i + 1),
                reader,
                decoder,
                initialBuffer: buffer,
                type: 'gemini',
                ttftMs,
              });
              if (!claimed) {
                try {
                  reader.cancel();
                } catch {}
              }
              return;
            }
          } catch {}
        }
      }
    } catch {
      recordModelFailure(model);
    } finally {
      activeControllers.delete(model);
      activeContendersCount--;
      checkContendersDone();
    }
  };

  const prioritizedGemini = getPrioritizedModels(FLASH_MODELS);
  let geminiIndex = 0;

  if (groqKey) {
    void startGroqContender();
  }

  if (apiKey && geminiIndex < prioritizedGemini.length) {
    const primaryModel = prioritizedGemini[geminiIndex++];
    void startGeminiContender(primaryModel);
  }

  const hedgeScheduler = async () => {
    while (!winnerDeclared && geminiIndex < prioritizedGemini.length) {
      await new Promise<void>((resolve) => {
        let timer: NodeJS.Timeout | null = null;
        const finishListener = () => {
          if (activeContendersCount === 0) {
            cleanup();
            resolve();
          }
        };
        onContenderFinished = finishListener;
        timer = setTimeout(() => {
          cleanup();
          resolve();
        }, 600);

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (onContenderFinished === finishListener) onContenderFinished = null;
        };
      });

      if (!winnerDeclared && geminiIndex < prioritizedGemini.length) {
        const nextModel = prioritizedGemini[geminiIndex++];
        void startGeminiContender(nextModel);
      }
    }

    if (!winnerDeclared && activeContendersCount === 0) {
      resolveWinner(null);
    }
  };

  void hedgeScheduler();

  return await Promise.race([
    winnerPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
  ]);
}

export async function* iterateHedgedStreamChunks(
  winner: HedgedStreamContender,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (winner.firstChunk) {
    yield winner.firstChunk;
  }

  if (winner.remainingLines && winner.remainingLines.length > 0) {
    for (const line of winner.remainingLines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        let textChunk = '';
        if (winner.type === 'groq') {
          textChunk = parsed.choices?.[0]?.delta?.content || '';
        } else {
          textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
        if (textChunk) {
          yield textChunk;
        }
      } catch {}
    }
  }

  let buffer = winner.initialBuffer || '';
  while (true) {
    if (signal?.aborted) break;
    const { value, done } = await winner.reader.read();
    if (done) break;

    buffer += winner.decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const jsonStr = trimmed.replace(/^data:\s*/, '').trim();
      if (jsonStr === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        let textChunk = '';
        if (winner.type === 'groq') {
          textChunk = parsed.choices?.[0]?.delta?.content || '';
        } else {
          textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
        if (textChunk) {
          yield textChunk;
        }
      } catch {}
    }
  }

  if (buffer.trim().startsWith('data:')) {
    const jsonStr = buffer.trim().replace(/^data:\s*/, '').trim();
    if (jsonStr !== '[DONE]') {
      try {
        const parsed = JSON.parse(jsonStr);
        const textChunk =
          winner.type === 'groq'
            ? parsed.choices?.[0]?.delta?.content
            : parsed.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textChunk) {
          yield textChunk;
        }
      } catch {}
    }
  }
}

export async function callFastHedgedLlm(options: HedgedStreamRaceOptions): Promise<{
  ok: boolean;
  text?: string;
  modelUsed?: string;
  ttftMs?: number;
  error?: string;
}> {
  const winner = await runHedgedStreamRace(options);
  if (!winner) {
    return {
      ok: false,
      error: 'All AI models unavailable or timed out during hedged race.',
    };
  }

  let fullText = '';
  try {
    for await (const chunk of iterateHedgedStreamChunks(winner, options.signal)) {
      fullText += chunk;
    }
    return {
      ok: true,
      text: fullText,
      modelUsed: winner.model,
      ttftMs: winner.ttftMs,
    };
  } catch (err: unknown) {
    return {
      ok: fullText.length > 0,
      text: fullText,
      modelUsed: winner.model,
      ttftMs: winner.ttftMs,
      error: (err as Error)?.message,
    };
  }
}
