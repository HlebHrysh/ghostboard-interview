import { describe, it, expect } from 'vitest';
import { z } from 'zod';

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
  directorModifier: z
    .enum(['normal', 'shorter', 'more_technical', 'code_example', 'tradeoffs'])
    .optional()
    .default('normal'),
  candidateProfile: z
    .object({
      role: z.string().optional(),
      primaryStack: z.string().optional(),
      experienceLevel: z.string().optional(),
    })
    .optional(),
  outputLanguage: z.string().optional().default('en'),
});

function parseStructuredDualStreamOutput(raw: string) {
  let hook = '';
  let pillars: string[] = [];
  let deepDive = '';

  const hookMatch = raw.match(/<<<PHASE_1:HOOK>>>([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<END>>>|$)/);
  if (hookMatch) {
    hook = hookMatch[1].trim();
  }

  const pillarsMatch = raw.match(/<<<PHASE_2:PILLARS>>>([\s\S]*?)(?:<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|$)/);
  if (pillarsMatch) {
    pillars = pillarsMatch[1]
      .split('\n')
      .map((line) => line.replace(/^[•\-\*]\s*/, '').trim())
      .filter((line) => line.length > 0);
  }

  const deepDiveMatch = raw.match(/<<<PHASE_3:DEEP_DIVE>>>([\s\S]*?)(?:<<<END>>>|$)/);
  if (deepDiveMatch) {
    deepDive = deepDiveMatch[1].trim();
  }

  return { hook, pillars, deepDive };
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
      expect(res.data.history).toEqual([]);
      expect(res.data.candidateProfile?.role).toBe('Staff Infrastructure Engineer');
    }
  });
});

describe('DualStream Structured Output Parser (Progressive Phases)', () => {
  it('correctly extracts Phase 1 (Hook), Phase 2 (Pillars), and Phase 3 (Deep-Dive)', () => {
    const mockOutput = `<<<PHASE_1:HOOK>>>
Optimistic locking validates row versions on commit without holding persistent locks, while pessimistic locking reserves exclusive database locks upfront.
<<<PHASE_2:PILLARS>>>
• Concurrency: OCC uses CAS or version increments; PCC uses SELECT FOR UPDATE.
• Read vs Write Contention: OCC maximizes throughput under high reads.
• Failure Mode: PCC risks deadlocks; OCC causes serialization aborts under high contention.
<<<PHASE_3:DEEP_DIVE>>>
\`\`\`sql
SELECT * FROM orders WHERE id = 1 FOR UPDATE;
\`\`\`
<<<END>>>`;

    const parsed = parseStructuredDualStreamOutput(mockOutput);
    expect(parsed.hook).toContain('Optimistic locking validates');
    expect(parsed.pillars).toHaveLength(3);
    expect(parsed.pillars[0]).toContain('Concurrency: OCC uses CAS');
    expect(parsed.deepDive).toContain('SELECT * FROM orders WHERE id = 1 FOR UPDATE;');
  });

  it('handles partial streaming output gracefully before completion', () => {
    const partialPhase1 = `<<<PHASE_1:HOOK>>>
Kafka is a distributed append-only commit log partitioned for horizontal scalability.`;

    const parsed = parseStructuredDualStreamOutput(partialPhase1);
    expect(parsed.hook).toBe('Kafka is a distributed append-only commit log partitioned for horizontal scalability.');
    expect(parsed.pillars).toEqual([]);
    expect(parsed.deepDive).toBe('');
  });
});
