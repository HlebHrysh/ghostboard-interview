/**
 * Shared Gemini API Client with model fallback and robust error handling.
 */
import { logger } from './logger';

const log = logger.child({ component: 'geminiApi' });

export const FLASH_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

export const PRO_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
];

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

export interface GeminiCallOptions {
  models?: string[];
  contents: unknown[];
  generationConfig?: Record<string, unknown>;
  /** Per-model request timeout in ms (default 25000). Lower = faster failover. */
  timeoutMs?: number;
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

  const modelsToTry = options.models || FLASH_MODELS;
  let lastError = 'No models available';
  let isQuota = false;
  let isDenied = false;
  let isInvalidKey = false;
  let isPrepayDepleted = false;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const timeoutMs = options.timeoutMs || 25000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: options.contents,
          generationConfig: options.generationConfig || {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
        signal: controller.signal,
      });

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
        isQuota = true;
        continue;
      }

      // If model not found, high demand (503) or deprecated, try next model
      if (res.status === 404 || res.status === 503 || errMsg.includes('not found') || errMsg.includes('no longer available') || errMsg.includes('high demand')) {
        log.warn(`Model ${model} unavailable (status ${res.status}). Trying fallback...`, { model, status: res.status });
        continue;
      }
    } catch (e: unknown) {
      clearTimeout(timeoutId);
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
