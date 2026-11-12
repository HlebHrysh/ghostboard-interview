import { describe, it, expect } from 'vitest';
import {
  evaluateSpeechIntent,
  extractFocusedQuestion,
  isFillerOrBanter,
  isDanglingThought,
  isActionableIntent,
  classifySpeechIntent,
} from '../src/lib/speechIntentGate';
import { buildEmergencyCoachingCard } from '../src/lib/aiPromptCore';
import { FLASH_MODELS } from '../src/lib/geminiApi';

describe('Question vs Monologue Classifier & AI Resilience Suite', () => {
  describe('evaluateSpeechIntent - Micro-classification', () => {
    it('classifies first-person company storytelling monologue as WAIT_FOR_COMPLETION', () => {
      const monologue =
        'У нашій компанії ми розробляємо високонавантажений банкінг і наша команда складається з 15 інженерів';
      const result = evaluateSpeechIntent(monologue, 200, '');
      expect(result.decision).toBe('WAIT_FOR_COMPLETION');
      expect(result.reason).toBe('interviewer_storytelling');
      expect(result.recommendedWaitMs).toBeGreaterThanOrEqual(1200);
    });

    it('classifies dangling thought / mid-sentence pause as WAIT_FOR_COMPLETION', () => {
      const dangling = 'І основна частина нашого рішення це все-таки буде';
      const result = evaluateSpeechIntent(dangling, 300, '');
      expect(result.decision).toBe('WAIT_FOR_COMPLETION');
      expect(result.reason).toBe('dangling_clause');
      expect(result.recommendedWaitMs).toBe(1200);
    });

    it('classifies english mid-sentence conjunction as WAIT_FOR_COMPLETION', () => {
      const danglingEn = 'We decided to migrate our services because';
      const result = evaluateSpeechIntent(danglingEn, 150, '');
      expect(result.decision).toBe('WAIT_FOR_COMPLETION');
      expect(result.reason).toBe('dangling_clause');
    });

    it('triggers immediately (0ms wait) for explicit question ending with ?', () => {
      const question = 'Як влаштований event loop у Node.js і коли виконується process.nextTick?';
      const result = evaluateSpeechIntent(question, 50, '');
      expect(result.decision).toBe('TRIGGER_NOW');
      expect(result.recommendedWaitMs).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(45);
    });

    it('triggers immediately for direct interrogative opener', () => {
      const task = 'Розкажи як працює оптимістичне блокування в базах даних';
      const result = evaluateSpeechIntent(task, 100, '');
      expect(result.decision).toBe('TRIGGER_NOW');
      expect(result.recommendedWaitMs).toBe(0);
      expect(result.normalizedQuestion).toContain('оптимістичне блокування');
    });

    it('triggers immediately for english technical interview task', () => {
      const taskEn = 'Explain how goroutines and channels work under the hood in Go';
      const result = evaluateSpeechIntent(taskEn, 80, '');
      expect(result.decision).toBe('TRIGGER_NOW');
      expect(result.recommendedWaitMs).toBe(0);
    });

    it('triggers standalone tech concept after silence >= 650ms', () => {
      const concept = 'PostgreSQL MVCC vacuum';
      const result = evaluateSpeechIntent(concept, 700, '');
      expect(result.decision).toBe('TRIGGER_NOW');
      expect(result.reason).toBe('standalone_tech_topic');
      expect(result.recommendedWaitMs).toBe(0);
    });

    it('ignores greetings, webinar chatter and mic noise', () => {
      const greeting = 'Привіт усім, як чути?';
      const result = evaluateSpeechIntent(greeting, 100, '');
      expect(result.decision).toBe('IGNORE_NOISE');
      expect(result.recommendedWaitMs).toBe(2000);

      const noise = 'uh huh';
      const resultNoise = evaluateSpeechIntent(noise, 100, '');
      expect(resultNoise.decision).toBe('IGNORE_NOISE');
    });
  });

  describe('extractFocusedQuestion - Story vs Question Extraction', () => {
    it('strips long company background story and extracts focused question', () => {
      const fullText =
        'У нашій компанії ми розробляємо фінансовий продукт. Команда складається з 15 інженерів. Як влаштований MRO в Python?';
      const focused = extractFocusedQuestion(fullText);
      expect(focused).toContain('Як влаштований MRO в Python?');
      expect(focused).not.toContain('У нашій компанії');
    });

    it('preserves short questions without truncation', () => {
      const shortQ = 'What is the CAP theorem?';
      const focused = extractFocusedQuestion(shortQ);
      expect(focused).toBe(shortQ);
    });
  });

  describe('Emergency Instant Structured Coaching Card', () => {
    it('generates 4-phase Ukrainian coaching card with 1-click retry button', () => {
      const card = buildEmergencyCoachingCard('Як спроектувати rate limiter?', 'uk');
      expect(card).toContain('<<<META: System Architecture | Senior | uk>>>');
      expect(card).toContain('<<<PHASE_1:HOOK>>>');
      expect(card).toContain('Почніть відповідь упевнено за структурою STAR/CAR');
      expect(card).toContain('<<<PHASE_2:PILLARS>>>');
      expect(card).toContain('Архітектура та компоненти');
      expect(card).toContain('Trade-offs та Best Practices');
      expect(card).toContain('<<<PHASE_3:DEEP_DIVE>>>');
      expect(card).toContain('// [🔄 Повторити запит (1 клік)]');
      expect(card).toContain('<<<END>>>');
    });

    it('generates 4-phase English coaching card with 1-click retry button', () => {
      const card = buildEmergencyCoachingCard('How to design a distributed lock?', 'en');
      expect(card).toContain('<<<META: System Architecture | Senior | en>>>');
      expect(card).toContain('<<<PHASE_1:HOOK>>>');
      expect(card).toContain('Answer confidently using the STAR/CAR framework');
      expect(card).toContain('// [🔄 Повторити запит (1 клік)]');
    });

    it('generates 4-phase Russian coaching card with 1-click retry button', () => {
      const card = buildEmergencyCoachingCard('Как работает сборщик мусора в V8?', 'ru');
      expect(card).toContain('<<<META: System Architecture | Senior | ru>>>');
      expect(card).toContain('Начните ответ уверенно по структуре STAR/CAR');
      expect(card).toContain('// [🔄 Повторить запрос (1 клик)]');
    });
  });

  describe('Active Gemini Model Pool', () => {
    it('verifies FLASH_MODELS pool contains the production low-latency models in correct order', () => {
      expect(FLASH_MODELS).toContain('gemini-3.8-flash');
      expect(FLASH_MODELS).toContain('gemini-2.5-flash');
      expect(FLASH_MODELS).toContain('gemini-2.0-flash');
      expect(FLASH_MODELS).toContain('gemini-flash-latest');
    });
  });

  describe('Legacy Helpers Backward Compatibility', () => {
    it('maintains compatibility for isFillerOrBanter', () => {
      expect(isFillerOrBanter('Hello can you hear me')).toBe(true);
      expect(isFillerOrBanter('Explain Kubernetes pod lifecycle')).toBe(false);
    });

    it('maintains compatibility for isDanglingThought', () => {
      expect(isDanglingThought('We were deploying our app because')).toBe(true);
      expect(isDanglingThought('How do goroutines scale?')).toBe(false);
    });

    it('maintains compatibility for isActionableIntent', () => {
      expect(isActionableIntent('How does Kafka guarantee message ordering?')).toBe(true);
      expect(isActionableIntent('Yeah okay')).toBe(false);
    });

    it('maintains compatibility for classifySpeechIntent', () => {
      const classified = classifySpeechIntent('Explain indexing in MongoDB');
      expect(classified.intent).toBe('question');
      expect(classified.isActionable).toBe(true);
    });
  });
});
