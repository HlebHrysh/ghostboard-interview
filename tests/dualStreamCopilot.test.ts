import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  parseStructuredGhostboardOutput,
  buildGhostboardSystemPrompt,
  inferDomainAndRole,
} from '../src/lib/aiPromptCore';

const ALLOWED_MODIFIERS = [
  'normal',
  'shorter',
  'simpler',
  'code',
  're_angle',
  'more_technical',
  'code_example',
  'tradeoffs',
] as const;

const DualStreamPayloadSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(3000),
  history: z
    .array(
      z.object({
        speaker: z.enum(['interviewer', 'candidate']),
        text: z.string(),
      })
    )
    .optional()
    .default([]),
  directorModifier: z.enum(ALLOWED_MODIFIERS).optional().default('normal'),
  modifier: z.enum(ALLOWED_MODIFIERS).optional(),
  mode: z.enum(ALLOWED_MODIFIERS).optional(),
  candidateProfile: z
    .object({
      role: z.string().optional(),
      primaryStack: z.string().optional(),
      experienceLevel: z.string().optional(),
      cvContext: z.string().optional(),
      resumeContext: z.string().optional(),
      techStack: z.array(z.string()).optional(),
      petProjects: z.array(z.any()).optional(),
    })
    .optional(),
  outputLanguage: z.string().optional().default('en'),
  helperLanguage: z.string().optional().default('uk'),
});

function parseStructuredDualStreamOutput(raw: string) {
  let meta = '';
  let hook = '';
  let pillars: string[] = [];
  let deepDive = '';

  const metaMatch = raw.match(/<<<META:\s*([^>]+)>>>/i);
  if (metaMatch) {
    meta = metaMatch[1].trim();
  }

  const hookMatch = raw.match(/<<<PHASE_1:HOOK>>>([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<END>>>|$)/i);
  if (hookMatch) {
    hook = hookMatch[1].trim();
  }

  const pillarsMatch = raw.match(/<<<PHASE_2:PILLARS>>>([\s\S]*?)(?:<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|$)/i);
  if (pillarsMatch) {
    pillars = pillarsMatch[1]
      .split('\n')
      .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
      .filter((line) => line.length > 0);
  }

  const deepDiveMatch = raw.match(/<<<PHASE_3:DEEP_DIVE>>>([\s\S]*?)(?:<<<END>>>|$)/i);
  if (deepDiveMatch) {
    deepDive = deepDiveMatch[1].trim();
  }

  return { meta, hook, pillars, deepDive };
}

describe('DualStreamCopilot Payload Schema & Validation', () => {
  it('rejects empty or whitespace-only questions', () => {
    expect(DualStreamPayloadSchema.safeParse({ question: '' }).success).toBe(false);
    expect(DualStreamPayloadSchema.safeParse({ question: '   ' }).success).toBe(false);
  });

  it('rejects invalid director modifiers', () => {
    expect(
      DualStreamPayloadSchema.safeParse({
        question: 'Explain Raft consensus',
        directorModifier: 'non_existent_modifier' as any,
      }).success
    ).toBe(false);
  });

  it('accepts new fast on-the-fly modifiers: shorter, simpler, code, re_angle', () => {
    for (const mod of ['shorter', 'simpler', 'code', 're_angle', 'more_technical', 'tradeoffs'] as const) {
      const res = DualStreamPayloadSchema.safeParse({
        question: 'How do goroutines schedule work?',
        directorModifier: mod,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.directorModifier).toBe(mod);
      }
    }
  });

  it('accepts valid request with director modifiers and defaults', () => {
    const res = DualStreamPayloadSchema.safeParse({
      question: 'What is CAP theorem?',
      directorModifier: 'tradeoffs',
      candidateProfile: {
        role: 'Staff Infrastructure Engineer',
        primaryStack: 'Kubernetes / Golang / Raft',
      },
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.directorModifier).toBe('tradeoffs');
      expect(res.data.outputLanguage).toBe('en');
      expect(res.data.helperLanguage).toBe('uk');
      expect(res.data.history).toEqual([]);
      expect(res.data.candidateProfile?.role).toBe('Staff Infrastructure Engineer');
    }
  });

  it('accepts bilingual outputLanguage with helperLanguage', () => {
    const res = DualStreamPayloadSchema.safeParse({
      question: 'Explain React Server Components',
      outputLanguage: 'bilingual',
      helperLanguage: 'uk',
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.outputLanguage).toBe('bilingual');
      expect(res.data.helperLanguage).toBe('uk');
    }
  });
});

describe('DualStream Structured Output Parser (Progressive Phases & Meta)', () => {
  it('correctly extracts Meta tag, Phase 1 (Hook), Phase 2 (Pillars), and Phase 3 (Deep-Dive)', () => {
    const mockOutput = `<<<META: System Design | Senior | EN>>>
<<<PHASE_1:HOOK>>>
Optimistic locking validates row versions on commit without holding persistent locks, while pessimistic locking reserves exclusive database locks upfront.
<<<PHASE_2:PILLARS>>>
• **Concurrency**: OCC uses CAS or version increments; PCC uses SELECT FOR UPDATE.
• **Contention**: OCC maximizes throughput under predominantly read-heavy workloads.
• **Failure Mode**: PCC risks deadlocks; OCC causes serialization aborts under high write collisions.
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`sql
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
\`\`\`
<<<END>>>`;

    const parsed = parseStructuredDualStreamOutput(mockOutput);
    expect(parsed.meta).toBe('System Design | Senior | EN');
    expect(parsed.hook).toContain('Optimistic locking validates');
    expect(parsed.pillars).toHaveLength(3);
    expect(parsed.pillars[0]).toContain('**Concurrency**: OCC uses CAS');
    expect(parsed.deepDive).toContain('SELECT * FROM orders WHERE id = 1 FOR UPDATE;');

    // Test with aiPromptCore parser
    const coreParsed = parseStructuredGhostboardOutput(mockOutput);
    expect(coreParsed.meta?.domain).toBe('System Design');
    expect(coreParsed.meta?.level).toBe('Senior');
    expect(coreParsed.meta?.language).toBe('EN');
    expect(coreParsed.hook).toContain('Optimistic locking validates');
    expect(coreParsed.pillars).toHaveLength(3);
  });

  it('handles partial streaming output gracefully before completion', () => {
    const partialPhase1 = `<<<META: Backend | Senior | UK>>>
<<<PHASE_1:HOOK>>>
Kafka is a distributed append-only commit log partitioned for horizontal scalability.`;

    const parsed = parseStructuredDualStreamOutput(partialPhase1);
    expect(parsed.meta).toBe('Backend | Senior | UK');
    expect(parsed.hook).toBe('Kafka is a distributed append-only commit log partitioned for horizontal scalability.');
    expect(parsed.pillars).toEqual([]);
    expect(parsed.deepDive).toBe('');
  });
});
