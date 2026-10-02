/**
 * Shared Gemini API Client with model fallback and robust error handling.
 */

export const FLASH_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
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
  contents: any[];
  generationConfig?: any;
}

export interface GeminiCallResult {
  ok: boolean;
  modelUsed?: string;
  data?: any;
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
  let lastError = '';
  let isQuota = false;
  let isDenied = false;
  let isInvalidKey = false;
  let isPrepayDepleted = false;

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: options.contents,
          generationConfig: options.generationConfig,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return {
          ok: true,
          modelUsed: model,
          data,
          text,
        };
      }

      const errText = await res.text();
      let errMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error?.message || errText;
      } catch {}

      lastError = errMsg;

      // Check if invalid API key (fatal across all models)
      if (res.status === 401 || errMsg.includes('UNAUTHENTICATED') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('invalid authentication credentials') || errMsg.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED')) {
        isInvalidKey = true;
        break;
      }

      // Check if prepayment credits are depleted
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
        console.warn(`Model ${model} quota/rate limit reached (429). Trying fallback model...`);
        isQuota = true;
        continue;
      }

      // If model not found, high demand (503) or deprecated, try next model
      if (res.status === 404 || res.status === 503 || errMsg.includes('not found') || errMsg.includes('no longer available') || errMsg.includes('high demand')) {
        console.warn(`Model ${model} unavailable (status ${res.status}). Trying fallback...`);
        continue;
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e.message || 'Network error';
      console.warn(`Model ${model} request error: ${lastError}. Trying fallback...`);
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
