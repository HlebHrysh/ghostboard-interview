import { NextRequest, NextResponse } from 'next/server';
import type { SupportedLocale } from '@/lib/geoLang';

const COUNTRY_LOCALE_MAP: Record<string, SupportedLocale> = {
  UA: 'ua',
  // English-speaking countries
  US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en', IE: 'en', ZA: 'en', SG: 'en', IN: 'en',
  // Polish
  PL: 'pl',
  // German-speaking
  DE: 'de', AT: 'de', LI: 'de',
  // French-speaking
  FR: 'fr', MC: 'fr', LU: 'fr',
  // Spanish-speaking
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', BO: 'es', PY: 'es', UY: 'es',
  // Portuguese-speaking
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',
  // Italian-speaking
  IT: 'it', SM: 'it', VA: 'it',
  // Czech/Slovak
  CZ: 'cs', SK: 'cs',
  // Dutch-speaking
  NL: 'nl', BE: 'nl', SR: 'nl',
};

export async function GET(req: NextRequest) {
  // Check standard Geo-IP headers supplied by modern cloud providers & CDNs
  const countryHeader =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-country-code') ||
    req.headers.get('cloudfront-viewer-country') ||
    req.headers.get('geoip-country-code') ||
    req.headers.get('x-appengine-country');

  const country = (countryHeader || '').toUpperCase().trim();

  // Check Accept-Language header as supplementary hint
  const acceptLang = req.headers.get('accept-language') || '';
  const prefersUk = /uk([-_][a-zA-Z]{2})?([\s;,]|$)/i.test(acceptLang);

  // Map country to locale
  let suggestedLang: SupportedLocale = 'en';

  if (country && COUNTRY_LOCALE_MAP[country]) {
    suggestedLang = COUNTRY_LOCALE_MAP[country];
  } else if (prefersUk) {
    suggestedLang = 'ua';
  } else {
    // Try to infer from Accept-Language header
    const langPrefixes: Record<string, SupportedLocale> = {
      uk: 'ua', pl: 'pl', de: 'de', fr: 'fr', es: 'es', pt: 'pt', it: 'it', cs: 'cs', sk: 'cs', nl: 'nl',
    };
    const firstLang = acceptLang.split(',')[0]?.split(';')[0]?.trim().toLowerCase().split(/[-_]/)[0];
    if (firstLang && langPrefixes[firstLang]) {
      suggestedLang = langPrefixes[firstLang];
    }
  }

  const isUkraine = suggestedLang === 'ua';

  return NextResponse.json(
    {
      country: country || 'GLOBAL',
      isUkraine,
      suggestedLang,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    }
  );
}
