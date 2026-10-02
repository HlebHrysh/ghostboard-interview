'use client';

export type SupportedLocale = 'ua' | 'en' | 'pl' | 'de' | 'fr' | 'es' | 'pt' | 'it' | 'cs' | 'nl';

const STORAGE_KEY = 'ghostboard_lang';
const UI_STORAGE_KEY = 'ghostboard_ui_lang';

/** Maps browser language prefix → locale */
const LANG_PREFIX_MAP: Record<string, SupportedLocale> = {
  uk: 'ua',
  en: 'en',
  pl: 'pl',
  de: 'de',
  fr: 'fr',
  es: 'es',
  pt: 'pt',
  it: 'it',
  cs: 'cs',
  sk: 'cs', // Slovak → Czech (closest)
  nl: 'nl',
};

/** Maps ISO-3166-1 alpha-2 country codes → locale */
const COUNTRY_LOCALE_MAP: Record<string, SupportedLocale> = {
  UA: 'ua',
  // English-speaking
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en', SG: 'en', IN: 'en',
  // Polish
  PL: 'pl',
  // German
  DE: 'de', AT: 'de', LI: 'de',
  // French
  FR: 'fr', MC: 'fr', LU: 'fr',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es', PY: 'es', UY: 'es',
  // Portuguese
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',
  // Italian
  IT: 'it', SM: 'it', VA: 'it',
  // Czech / Slovak
  CZ: 'cs', SK: 'cs',
  // Dutch
  NL: 'nl', BE: 'nl', SR: 'nl',
};

/** Ukraine timezones */
const UA_TIMEZONES = /Kyiv|Kiev|Uzhgorod|Zaporozhye/i;

/**
 * Fast, synchronous detection from cache, timezone, or browser language.
 */
export function detectInitialLang(): SupportedLocale {
  if (typeof window === 'undefined') return 'ua';

  // 1. Explicit user choice previously saved
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(UI_STORAGE_KEY);
    if (saved && saved in LANG_PREFIX_MAP || saved === 'ua') {
      const allLocales: SupportedLocale[] = ['ua', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl'];
      if (allLocales.includes(saved as SupportedLocale)) return saved as SupportedLocale;
    }
  } catch {}

  // 2. Client Timezone hint (instant, no network)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (UA_TIMEZONES.test(tz)) return 'ua';
  } catch {}

  // 3. Browser Language list (instant)
  try {
    const langs = navigator.languages || [navigator.language || ''];
    for (const l of langs) {
      const prefix = l.split(/[-_]/)[0].toLowerCase();
      if (prefix in LANG_PREFIX_MAP) {
        return LANG_PREFIX_MAP[prefix];
      }
    }
  } catch {}

  // Default to English for international visitors
  return 'en';
}

/**
 * Background Geo-IP detection — only applies if the user hasn't explicitly chosen a language.
 */
export async function detectGeoCountryLang(
  onCountryDetected?: (lang: SupportedLocale, country: string) => void
): Promise<SupportedLocale> {
  if (typeof window === 'undefined') return 'ua';

  // If user explicitly saved language, do not override
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(UI_STORAGE_KEY);
    const allLocales: SupportedLocale[] = ['ua', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl'];
    if (saved && allLocales.includes(saved as SupportedLocale)) {
      return saved as SupportedLocale;
    }
  } catch {}

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('/api/geo', {
      signal: controller.signal,
      cache: 'default',
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const detectedLang: SupportedLocale = (data.suggestedLang as SupportedLocale) || 'en';

      if (onCountryDetected) {
        onCountryDetected(detectedLang, data.country || 'GLOBAL');
      }

      return detectedLang;
    }
  } catch {
    // Fallback to client-side detection
  }

  return detectInitialLang();
}

/**
 * Persist user language choice and notify all listening components.
 */
export function setStoredLang(lang: SupportedLocale) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(UI_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('ghostboard:lang_change', { detail: lang }));
  } catch {}
}

export { COUNTRY_LOCALE_MAP, LANG_PREFIX_MAP };
