import { describe, it, expect } from 'vitest';
import {
  inferDomainAndRole,
  buildGhostboardSystemPrompt,
  buildLanguageInstruction,
  buildModifierInstruction,
  parseStructuredGhostboardOutput,
  AiDomain,
} from '../src/lib/aiPromptCore';
import { FLASH_MODELS, getFastStreamingGenerationConfig } from '../src/lib/geminiApi';

describe('Task 1: Zero-Config Brain (Autonomous Domain & Profession Classification)', () => {
  const testCases: Array<{ question: string; expectedDomain: AiDomain; roleHint?: string }> = [
    { question: 'How do you design a high availability notification service?', expectedDomain: 'System Design' },
    { question: 'Solve Two Sum using a monotonic stack or binary search in O(N)', expectedDomain: 'LeetCode/Algorithms' },
    { question: 'Tell me about yourself and your proudest achievement', expectedDomain: 'HR/Behavioral' },
    { question: 'What is the difference between processes and threads in Linux kernel?', expectedDomain: 'Backend' },
    { question: 'How does React 19 handle Server Actions and hydration?', expectedDomain: 'Frontend' },
    { question: 'How do you configure Kubernetes Ingress with TLS and Helm?', expectedDomain: 'DevOps' },
    { question: 'Explain RAG pipeline with vector embeddings and PyTorch', expectedDomain: 'Data/ML' },
    { question: 'How do you write E2E tests with Playwright and mock network requests?', expectedDomain: 'QA' },
    { question: 'How does SwiftData handle migrations in SwiftUI on iOS?', expectedDomain: 'Mobile' },
    { question: 'How do you calculate customer churn and prioritize the product roadmap?', expectedDomain: 'Product/PM' },
    { question: 'What are the principles of WCAG accessibility in design systems in Figma?', expectedDomain: 'Design' },
    { question: 'How do you optimize sales conversion in cold email marketing funnels?', expectedDomain: 'Marketing/Sales' },
  ];

  testCases.forEach(({ question, expectedDomain, roleHint }) => {
    it(`classifies "${question.slice(0, 35)}..." as ${expectedDomain}`, () => {
      const res = inferDomainAndRole(question, roleHint ? { role: roleHint } : undefined);
      expect(res.domain).toBe(expectedDomain);
    });
  });

  it('generates meta-tag as the very first line of system prompt structure', () => {
    const { systemPrompt, domain, level, langTag } = buildGhostboardSystemPrompt({
      question: 'What is CAP theorem?',
      outputLanguage: 'en',
    });

    expect(systemPrompt).toContain(`<<<META: ${domain} | ${level} | ${langTag}>>>`);
    expect(domain).toBe('System Design');
    expect(level).toBe('Senior');
    expect(langTag).toBe('EN');
  });

  it('organically injects CV projects and stack when CV is provided', () => {
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'How do you handle background jobs?',
      profile: {
        role: 'Senior Python Engineer',
        primaryStack: 'FastAPI, Celery, Redis, PostgreSQL',
        cvContext: 'Built high-throughput payment processing pipeline handling 10k RPS with zero downtime.',
      },
    });

    expect(systemPrompt).toContain('Target Role: Senior Python Engineer');
    expect(systemPrompt).toContain('FastAPI, Celery, Redis, PostgreSQL');
    expect(systemPrompt).toContain('payment processing pipeline');
    expect(systemPrompt).toContain('CANDIDATE CV / STACK CONTEXT');
  });

  it('answers from practitioner perspective when CV is empty', () => {
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'How do you configure Prometheus alerts?',
    });

    expect(systemPrompt).toContain('PRACTITIONER STANCE');
    expect(systemPrompt).toContain('battle-tested production experience');
  });
});

describe('Task 2: Anti-Wikipedia & Live Spoken Delivery (1-Second Scan)', () => {
  it('strictly forbids encyclopedic and robotic preambles in system prompt', () => {
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'Explain garbage collection in Go',
    });

    expect(systemPrompt).toContain('ANTI-WIKIPEDIA & LIVE SPOKEN SPEECH RULES');
    expect(systemPrompt).toContain('STRICTLY FORBIDDEN: Encyclopedic introductions');
    expect(systemPrompt).toContain('ALWAYS speak from FIRST PERSON');
  });

  it('enforces 3-phase progressive structure with bold anchor words', () => {
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'How does indexing work in PostgreSQL?',
    });

    expect(systemPrompt).toContain('<<<PHASE_1:HOOK>>>');
    expect(systemPrompt).toContain('<<<PHASE_2:PILLARS>>>');
    expect(systemPrompt).toContain('<<<PHASE_3:DEEP_DIVE>>>');
    expect(systemPrompt).toContain('• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]');
  });

  it('parses structured 3-phase output with bold anchor keywords without leakage', () => {
    const sampleOutput = `<<<META: Backend | Senior | UK>>>
<<<PHASE_1:HOOK>>>
На практиці я оптимізую PostgreSQL через вибіркове створення B-Tree та GIN індексів під гарячі запити.
<<<PHASE_2:PILLARS>>>
• **B-Tree**: Забезпечує пошук за O(log N) для діапазонів і точних співпадінь.
• **GIN Індекс**: Прискорює пошук у масивах та JSONB контейнерах у десятки разів.
• **EXPLAIN ANALYZE**: Дозволяє виявити повільні Seq Scan до виходу в продакшн.
<<<PHASE_3:DEEP_DIVE>>>
Проблема: Seq Scan на таблиці замовлень уповільнював запити до 1.8с. Рішення: частковий індекс (WHERE status = 'active'). Результат: запити виконуються за 4мс.
<<<END>>>`;

    const parsed = parseStructuredGhostboardOutput(sampleOutput);
    expect(parsed.meta?.domain).toBe('Backend');
    expect(parsed.meta?.language).toBe('UK');
    expect(parsed.hook).toContain('На практиці я оптимізую PostgreSQL');
    expect(parsed.pillars).toHaveLength(3);
    expect(parsed.pillars[0]).toBe('**B-Tree**: Забезпечує пошук за O(log N) для діапазонів і точних співпадінь.');
    expect(parsed.pillars[1]).toBe('**GIN Індекс**: Прискорює пошук у масивах та JSONB контейнерах у десятки разів.');
    expect(parsed.deepDive).toContain('Проблема: Seq Scan');
    expect(parsed.deepDive).toContain('4мс');
  });
});

describe('Task 3: Full Multilingualism & Bilingual Prompter Mode', () => {
  it('configures auto language detection matching question language', () => {
    const ukLang = buildLanguageInstruction('auto', 'uk', 'Як працює Event Loop у Node.js?');
    expect(ukLang.targetLangCode).toBe('uk');
    expect(ukLang.instruction).toContain('Ukrainian (Українська)');

    const enLang = buildLanguageInstruction('auto', 'en', 'What is the purpose of Kubernetes Ingress?');
    expect(enLang.targetLangCode).toBe('en');
    expect(enLang.instruction).toContain('Technical English');
  });

  it('supports explicit target languages: uk, en, pl, de, es, fr', () => {
    const plLang = buildLanguageInstruction('pl', 'uk', 'Explain microservices');
    expect(plLang.instruction).toContain('Polish (Język polski)');

    const deLang = buildLanguageInstruction('de', 'uk', 'Explain microservices');
    expect(deLang.instruction).toContain('German (Deutsch)');
  });

  it('enables bilingual prompter mode: spoken English + native cheat-sheet hint in parentheses', () => {
    const bilingual = buildLanguageInstruction('bilingual', 'uk', 'How do you handle database deadlocks?');
    expect(bilingual.isBilingual).toBe(true);
    expect(bilingual.targetLangCode).toBe('bilingual');
    expect(bilingual.instruction).toContain('BILINGUAL PROMPTER MODE');
    expect(bilingual.instruction).toContain('Ukrainian (Українська)');
    expect(bilingual.instruction).toContain('Beside or beneath each spoken phrase and bullet point, provide a short, clear hint/gist in parentheses');
  });
});

describe('Task 4: Sub-250ms TTFT (Time to First Token Speed)', () => {
  it('specifies thinkingBudget: 0 in fast streaming configuration', () => {
    const config = getFastStreamingGenerationConfig(850);
    expect((config.thinkingConfig as any)?.thinkingBudget).toBe(0);
    expect(config.maxOutputTokens).toBe(850);
    expect(config.temperature).toBe(0.25);
  });

  it('prioritizes fastest Flash models first in cascade rotation', () => {
    expect(FLASH_MODELS[0]).toBe('gemini-3.5-flash');
    expect(FLASH_MODELS[1]).toBe('gemini-3.8-flash');
    expect(FLASH_MODELS).toContain('gemini-flash-latest');
  });

  it('keeps system prompt dense, compact, and free of fluff tokens', () => {
    const { systemPrompt } = buildGhostboardSystemPrompt({
      question: 'What is database normalization?',
    });

    // Verify token density: prompt should be compact (< 2500 characters)
    expect(systemPrompt.length).toBeLessThan(2500);
    expect(systemPrompt).not.toContain('As a large language model');
    expect(systemPrompt).not.toContain('Feel free to ask follow-up questions');
  });
});

describe('Task 5: Rapid On-the-Fly Modifiers', () => {
  it('applies "shorter" modifier with 3 ultra-short bullets of 6-8 words', () => {
    const shorter = buildModifierInstruction('shorter');
    expect(shorter).toContain('ULTRA-CONCISE');
    expect(shorter).toContain('6–8 words');
  });

  it('applies "simpler" modifier explaining concepts without jargon', () => {
    const simpler = buildModifierInstruction('simpler');
    expect(simpler).toContain('EXPLAIN SIMPLY');
    expect(simpler).toContain('intuitive real-world physical analogy');
  });

  it('applies "code" modifier jumping straight to working code with O(n) complexity', () => {
    const code = buildModifierInstruction('code');
    expect(code).toContain('CODE-FIRST');
    expect(code).toContain('Time & Space Complexity O(n)');
  });

  it('applies "re_angle" modifier offering alternative architecture and trade-offs', () => {
    const reAngle = buildModifierInstruction('re_angle');
    expect(reAngle).toContain('ALTERNATIVE ANGLE');
    expect(reAngle).toContain('Latency vs Throughput');
  });
});
