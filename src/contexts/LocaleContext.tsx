'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { detectInitialLang, detectGeoCountryLang, setStoredLang, type SupportedLocale } from '@/lib/geoLang';
import { getTranslations, type Translations } from '@/lib/i18n';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (lang: SupportedLocale) => void;
  t: Translations;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Initialize to 'en' so the first client render matches the server render.
  // The useEffect below will immediately update it to the user's actual language.
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  const setLocale = useCallback((lang: SupportedLocale) => {
    setLocaleState(lang);
    setStoredLang(lang);
  }, []);

  useEffect(() => {
    // 1. Fast sync check (cache / timezone / browser lang)
    const initial = detectInitialLang();
    setLocaleState(initial);

    // 2. Background Geo-IP check to refine (only if no explicit user pref saved)
    detectGeoCountryLang((detectedLang) => {
      setLocaleState(detectedLang);
    });

    // 3. Listen for manual lang changes from any component
    const handleLangEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SupportedLocale>;
      if (customEvent.detail) {
        setLocaleState(customEvent.detail);
      }
    };

    window.addEventListener('ghostboard:lang_change', handleLangEvent);
    return () => window.removeEventListener('ghostboard:lang_change', handleLangEvent);
  }, []);

  const t = getTranslations(locale);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fallback for components that are outside the provider (e.g., server components)
    const locale: SupportedLocale = 'en';
    return {
      locale,
      setLocale: () => {},
      t: getTranslations(locale),
    };
  }
  return ctx;
}
