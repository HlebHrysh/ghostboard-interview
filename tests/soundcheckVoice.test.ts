import { describe, it, expect } from 'vitest';
import { MODALS_I18N, getModalsTranslations } from '../src/lib/modalsI18n';
import { SUPPORTED_LOCALES, LOCALE_META, type SupportedLocale } from '../src/lib/i18n';

describe('SoundCheck Voice & Multi-Language Calibration Suite', () => {
  const allLocales: SupportedLocale[] = ['ua', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl'];

  it('contains testSpeechText in all 10 locales', () => {
    for (const loc of allLocales) {
      const modal = getModalsTranslations(loc);
      expect(modal.soundcheck.testSpeechText, `Missing testSpeechText for ${loc}`).toBeDefined();
      expect(modal.soundcheck.testSpeechText.length).toBeGreaterThan(10);
    }
  });

  it('contains step-by-step guidance in all 10 locales', () => {
    for (const loc of allLocales) {
      const sc = MODALS_I18N[loc].soundcheck;
      expect(sc.step1Title.length).toBeGreaterThan(0);
      expect(sc.step1Desc.length).toBeGreaterThan(0);
      expect(sc.step2Title.length).toBeGreaterThan(0);
      expect(sc.step2Desc.length).toBeGreaterThan(0);
      expect(sc.step3Title.length).toBeGreaterThan(0);
      expect(sc.step3Desc.length).toBeGreaterThan(0);
      expect(sc.tabAudioAlert.length).toBeGreaterThan(0);
      expect(sc.voicePlaying.length).toBeGreaterThan(0);
      expect(sc.stopVoice.length).toBeGreaterThan(0);
      expect(sc.checkSource.length).toBeGreaterThan(0);
      expect(sc.checkVolume.length).toBeGreaterThan(0);
      expect(sc.checkSTT.length).toBeGreaterThan(0);
      expect(sc.transcriptionPlaceholder.length).toBeGreaterThan(0);
    }
  });

  it('has valid LOCALE_META flags and native names for all locales', () => {
    for (const loc of allLocales) {
      const meta = LOCALE_META[loc];
      expect(meta).toBeDefined();
      expect(meta.flag.length).toBeGreaterThan(0);
      expect(meta.nativeName.length).toBeGreaterThan(0);
    }
  });

  it('validates BCP-47 speech tags for all supported languages', () => {
    const BCP47_LANG_MAP: Record<SupportedLocale, string> = {
      ua: 'uk-UA',
      en: 'en-US',
      pl: 'pl-PL',
      de: 'de-DE',
      fr: 'fr-FR',
      es: 'es-ES',
      pt: 'pt-PT',
      it: 'it-IT',
      cs: 'cs-CZ',
      nl: 'nl-NL',
    };

    for (const loc of allLocales) {
      const tag = BCP47_LANG_MAP[loc];
      expect(tag).toBeDefined();
      expect(tag).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });
});
