import { describe, it, expect } from 'vitest';
import { SUPPORTED_LOCALES, TRANSLATIONS, type SupportedLocale } from '../src/lib/i18n';
import { AUTH_I18N } from '../src/lib/authI18n';
import { PRICING_I18N } from '../src/lib/pricingI18n';
import { LANDING_I18N } from '../src/lib/landingI18n';
import { MODALS_I18N } from '../src/lib/modalsI18n';
import { MOCK_I18N } from '../src/lib/mockI18n';
import { HISTORY_I18N } from '../src/lib/historyI18n';
import { HUD_I18N } from '../src/lib/hudI18n';
import { LEGAL_I18N } from '../src/lib/legalI18n';
import { SIMULATOR_I18N } from '../src/lib/simulatorI18n';
import { SETTINGS_I18N } from '../src/lib/settingsI18n';
import { ARENA_I18N } from '../src/lib/arenaI18n';
import { GUIDE_I18N } from '../src/lib/guideI18n';

describe('i18n 10-Locale Exhaustive Coverage', () => {
  const expectedLocales: SupportedLocale[] = ['ua', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl'];

  it('supports all 10 defined locales in SUPPORTED_LOCALES', () => {
    expect(SUPPORTED_LOCALES).toEqual(expectedLocales);
  });

  it('contains valid translations for all 10 locales in core TRANSLATIONS', () => {
    for (const loc of expectedLocales) {
      const t = TRANSLATIONS[loc];
      expect(t, `Missing core translation for ${loc}`).toBeDefined();
      expect(t.common.save.length).toBeGreaterThan(0);
      expect(t.nav.pricing.length).toBeGreaterThan(0);
      expect(t.hero.line1.length).toBeGreaterThan(0);
      expect(t.settings.title.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in AUTH_I18N', () => {
    for (const loc of expectedLocales) {
      const a = AUTH_I18N[loc];
      expect(a, `Missing auth translation for ${loc}`).toBeDefined();
      expect(a.login.portalTitle.length).toBeGreaterThan(0);
      expect(a.signup.title.length).toBeGreaterThan(0);
      expect(a.signup.roles.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in PRICING_I18N', () => {
    for (const loc of expectedLocales) {
      const p = PRICING_I18N[loc];
      expect(p, `Missing pricing translation for ${loc}`).toBeDefined();
      expect(p.plans.free.name.length).toBeGreaterThan(0);
      expect(p.plans.pro.name.length).toBeGreaterThan(0);
      expect(p.plans.life.name.length).toBeGreaterThan(0);
      expect(p.matrix.rows.length).toBeGreaterThan(0);
      expect(p.faq.items.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in LANDING_I18N', () => {
    for (const loc of expectedLocales) {
      const l = LANDING_I18N[loc];
      expect(l, `Missing landing translation for ${loc}`).toBeDefined();
      expect(l.hero.line1.length).toBeGreaterThan(0);
      expect(l.demo.title.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in MODALS_I18N', () => {
    for (const loc of expectedLocales) {
      const m = MODALS_I18N[loc];
      expect(m, `Missing modals translation for ${loc}`).toBeDefined();
      expect(m.soundcheck.title.length).toBeGreaterThan(0);
      expect(m.soundcheck.testSpeechText.length).toBeGreaterThan(0);
      expect(m.soundcheck.step1Title.length).toBeGreaterThan(0);
      expect(m.soundcheck.step2Title.length).toBeGreaterThan(0);
      expect(m.soundcheck.step3Title.length).toBeGreaterThan(0);
      expect(m.soundcheck.tabAudioAlert.length).toBeGreaterThan(0);
      expect(m.soundcheck.voicePlaying.length).toBeGreaterThan(0);
      expect(m.soundcheck.stopVoice.length).toBeGreaterThan(0);
      expect(m.soundcheck.checkSource.length).toBeGreaterThan(0);
      expect(m.soundcheck.checkVolume.length).toBeGreaterThan(0);
      expect(m.soundcheck.checkSTT.length).toBeGreaterThan(0);
      expect(m.soundcheck.transcriptionPlaceholder.length).toBeGreaterThan(0);
      expect(m.trial.title.length).toBeGreaterThan(0);
      expect(m.companion.title.length).toBeGreaterThan(0);
      expect(m.scorecard.matrixTitle.length).toBeGreaterThan(0);
      expect(m.profile.title.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in MOCK_I18N', () => {
    for (const loc of expectedLocales) {
      const mock = MOCK_I18N[loc];
      expect(mock, `Missing mock translation for ${loc}`).toBeDefined();
      expect(mock.title.length).toBeGreaterThan(0);
      expect(mock.evaluateBtn.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in HISTORY_I18N', () => {
    for (const loc of expectedLocales) {
      const h = HISTORY_I18N[loc];
      expect(h, `Missing history translation for ${loc}`).toBeDefined();
      expect(h.title.length).toBeGreaterThan(0);
      expect(h.exportMd.length).toBeGreaterThan(0);
      expect(h.recent.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in HUD_I18N', () => {
    for (const loc of expectedLocales) {
      const hud = HUD_I18N[loc];
      expect(hud, `Missing HUD translation for ${loc}`).toBeDefined();
      expect(hud.dock.startSession.length).toBeGreaterThan(0);
      expect(hud.dock.stopSession.length).toBeGreaterThan(0);
      expect(hud.welcome.readyTitle.length).toBeGreaterThan(0);
      expect(hud.transcript.enterPrompt.length).toBeGreaterThan(0);
      expect(hud.transcript.candidateSpeechLabel.length).toBeGreaterThan(0);
      expect(hud.transcript.candidateShieldNote.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in LEGAL_I18N', () => {
    for (const loc of expectedLocales) {
      const leg = LEGAL_I18N[loc];
      expect(leg, `Missing legal translation for ${loc}`).toBeDefined();
      expect(leg.privacy.title.length).toBeGreaterThan(0);
      expect(leg.terms.title.length).toBeGreaterThan(0);
      expect(leg.privacy.sec1Title.length).toBeGreaterThan(0);
      expect(leg.terms.sec1Title.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in SIMULATOR_I18N', () => {
    for (const loc of expectedLocales) {
      const sim = SIMULATOR_I18N[loc];
      expect(sim, `Missing simulator translation for ${loc}`).toBeDefined();
      expect(sim.badge.length).toBeGreaterThan(0);
      expect(sim.title.length).toBeGreaterThan(0);
      expect(sim.backToPricing.length).toBeGreaterThan(0);
      expect(sim.payBtn('29').length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in SETTINGS_I18N', () => {
    for (const loc of expectedLocales) {
      const set = SETTINGS_I18N[loc];
      expect(set, `Missing settings translation for ${loc}`).toBeDefined();
      expect(set.title.length).toBeGreaterThan(0);
      expect(set.saveKeysBtn.length).toBeGreaterThan(0);
      expect(set.guides.macos.title.length).toBeGreaterThan(0);
      expect(set.guides.windows.title.length).toBeGreaterThan(0);
      expect(set.guides.linux.title.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in ARENA_I18N', () => {
    for (const loc of expectedLocales) {
      const arena = ARENA_I18N[loc];
      expect(arena, `Missing arena translation for ${loc}`).toBeDefined();
      expect(arena.headerTitle.length).toBeGreaterThan(0);
      expect(arena.startBtn.length).toBeGreaterThan(0);
      expect(arena.tracks.length).toBe(3);
      expect(arena.levels.length).toBe(4);
      expect(arena.submitAnswerBtn.length).toBeGreaterThan(0);
    }
  });

  it('contains valid translations for all 10 locales in GUIDE_I18N', () => {
    for (const loc of expectedLocales) {
      const g = GUIDE_I18N[loc];
      expect(g, `Missing guide translation for ${loc}`).toBeDefined();
      expect(g.heroBadge.length).toBeGreaterThan(0);
      expect(g.tabStealth.length).toBeGreaterThan(0);
      expect(g.tabAudio.length).toBeGreaterThan(0);
      expect(g.tabPsychology.length).toBeGreaterThan(0);
      expect(g.tabChecklist.length).toBeGreaterThan(0);
      expect(g.checklistItems.length).toBe(6);
      expect(g.psychRule1Title.length).toBeGreaterThan(0);
      expect(g.ctaTitle.length).toBeGreaterThan(0);
    }
  });
});

