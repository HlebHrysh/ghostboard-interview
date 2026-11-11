import { describe, it, expect } from 'vitest';
import {
  detectAutoContext,
  getLocalSimulatorAnswer,
  SimulatorModifier,
} from '../src/lib/simulatorLocalEngine';
import { buildGhostboardSystemPrompt } from '../src/lib/aiPromptCore';

describe('Live Try Sandbox — Auto-Context Speculative Pre-Detection', () => {
  it('detects PostgreSQL & Databases keywords instantly', () => {
    expect(detectAutoContext('Як працюють індекси в Postgres?')).toContain('Databases • PostgreSQL • Senior');
    expect(detectAutoContext('postgres b-tree')).toContain('Databases • PostgreSQL • Senior');
    expect(detectAutoContext('sql explain analyze')).toContain('Databases • PostgreSQL • Senior');
    expect(detectAutoContext('що таке індекс')).toContain('Databases • PostgreSQL • Senior');
  });

  it('detects Frontend & JS Runtime keywords instantly', () => {
    expect(detectAutoContext('Event Loop у JS')).toContain('Frontend • JS Runtime • Senior');
    expect(detectAutoContext('react hydration')).toContain('Frontend • JS Runtime • Senior');
    expect(detectAutoContext('microtask queue in javascript')).toContain('Frontend • JS Runtime • Senior');
    expect(detectAutoContext('v8 libuv')).toContain('Frontend • JS Runtime • Senior');
  });

  it('detects System Design & Highload keywords instantly', () => {
    expect(detectAutoContext('Проектування Rate Limiter')).toContain('System Design • Highload');
    expect(detectAutoContext('redis cache stampede')).toContain('System Design • Highload');
    expect(detectAutoContext('kafka partitions')).toContain('System Design • Highload');
    expect(detectAutoContext('consistent hashing for sharding')).toContain('System Design • Highload');
  });

  it('detects OS & Concurrency keywords instantly', () => {
    expect(detectAutoContext('Процес vs Потік')).toContain('OS • Concurrency • Senior');
    expect(detectAutoContext('thread mutex deadlock')).toContain('OS • Concurrency • Senior');
    expect(detectAutoContext('goroutine context switch')).toContain('OS • Concurrency • Senior');
  });

  it('handles empty input gracefully', () => {
    expect(detectAutoContext('')).toBe('');
    expect(detectAutoContext('   ')).toBe('');
  });

  it('falls back to Senior Practitioner on arbitrary engineering queries', () => {
    expect(detectAutoContext('Як організувати релізи?')).toContain('Senior Practitioner');
  });
});

describe('Live Try Sandbox — Local Knowledge Engine & 4 Quick Chips', () => {
  const CHIPS = [
    'Процес vs Потік',
    'Індекси в Postgres',
    'Event Loop у JS',
    'Проектування Rate Limiter',
  ];

  const MODIFIERS: SimulatorModifier[] = ['normal', 'shorter', 'simpler', 'code', 're_angle'];

  for (const chip of CHIPS) {
    describe(`Chip: ${chip}`, () => {
      for (const mod of MODIFIERS) {
        it(`produces structured 3-phase answer for modifier "${mod}"`, () => {
          const ans = getLocalSimulatorAnswer(chip, mod);
          expect(ans.hook).toBeTruthy();
          expect(ans.hook.length).toBeGreaterThan(15);
          expect(ans.bullets.length).toBeGreaterThanOrEqual(3);
          ans.bullets.forEach((b) => {
            expect(b.anchor).toBeTruthy();
            expect(b.text).toBeTruthy();
          });
          expect(ans.codeOrCase.code).toBeTruthy();
          expect(ans.takeaway).toBeTruthy();

          // Zero raw prompt tags in output
          expect(ans.hook).not.toMatch(/<<<[A-Z0-9_:]+>>>/i);
          ans.bullets.forEach((b) => {
            expect(b.text).not.toMatch(/<<<[A-Z0-9_:]+>>>/i);
          });
        });
      }
    });
  }

  it('dynamically synthesizes Senior responses for arbitrary questions', () => {
    const custom = getLocalSimulatorAnswer('Як працює TLS 1.3 handshake?', 'normal');
    expect(custom.hook).toContain('TLS 1.3 handshake');
    expect(custom.bullets.length).toBe(3);
    expect(custom.codeOrCase.code).toBeTruthy();
    expect(custom.takeaway).toBeTruthy();
  });

  it('adapts tone and structure when modifier is "shorter"', () => {
    const shorter = getLocalSimulatorAnswer('Індекси в Postgres', 'shorter');
    expect(shorter.bullets.length).toBe(3);
    // Each shorter bullet should be concise
    shorter.bullets.forEach((b) => {
      expect(b.text.length).toBeLessThan(120);
    });
  });

  it('adapts tone and structure when modifier is "simpler"', () => {
    const simpler = getLocalSimulatorAnswer('Event Loop у JS', 'simpler');
    expect(simpler.hook.toLowerCase()).toMatch(/уяви|лікаря|кабінет|кімнат/);
  });
});

describe('Live Try Sandbox — Telegraphic & Production AI Expansion', () => {
  it('correctly configures system prompt for telegraphic questions like "React + SQL"', () => {
    const { systemPrompt, domain, level } = buildGhostboardSystemPrompt({
      question: 'React + SQL',
    });
    expect(domain).toBe('Backend');
    expect(level).toBe('Senior');
    expect(systemPrompt).toContain('SHORT QUERIES');
    expect(systemPrompt).toContain('<<<PHASE_1:HOOK>>>');
    expect(systemPrompt).toContain('<<<PHASE_2:PILLARS>>>');
    expect(systemPrompt).toContain('<<<PHASE_3:DEEP_DIVE>>>');
  });

  it('correctly configures system prompt for "Docker vs VM"', () => {
    const { systemPrompt, domain, level } = buildGhostboardSystemPrompt({
      question: 'Docker vs VM',
    });
    expect(domain).toBe('DevOps');
    expect(level).toBe('Senior');
    expect(systemPrompt).toContain('SHORT QUERIES');
  });
});
