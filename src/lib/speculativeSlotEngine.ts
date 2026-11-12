export type PatchTargetSlot =
  | 'full'
  | 'speculative_hook'
  | 'rest_after_hook'
  | 'hook_and_pillars'
  | 'deep_dive'
  | 'trap';

export interface StructuredAnswerSlots {
  meta?: string;
  hook: string;
  pillars: string[];
  deepDive: string;
  followUpTrap?: {
    question: string;
    answer: string;
  };
}

export interface SpeculativeHookEntry {
  interimQuestion: string;
  normalizedTokens: string[];
  rawHookStream: string;
  meta: string;
  hook: string;
  createdAt: number;
}

export interface IntentOverlapResult {
  recall: number;
  precision: number;
  matched: number;
  hasNewNegation: boolean;
  valid: boolean;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'of', 'to', 'for', 'with', 'and', 'or', 'is', 'are', 'how', 'what', 'why',
  'як', 'що', 'чому', 'це', 'та', 'і', 'в', 'у', 'на', 'про', 'для', 'з', 'із',
  'как', 'что', 'почему', 'это', 'и',
]);

const NEGATION_CONSTRAINT_RE =
  /(?<![\p{L}\p{N}_])(без|не\s+використовуючи|крім|without|except|no\s+redis|not\s+using|не\s+используя)(?![\p{L}\p{N}_])/iu;

export function tokenizeSignificantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+#.-]/gu, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Computes token-overlap recall/precision and negation flip detection between an interim
 * transcript and the final utterance in < 0.05ms.
 */
export function computeIntentOverlap(interimText: string, finalText: string): IntentOverlapResult {
  const interimTokens = tokenizeSignificantWords(interimText);
  const finalTokens = tokenizeSignificantWords(finalText);
  if (interimTokens.length < 2 || finalTokens.length < 2) {
    return {
      recall: 0,
      precision: 0,
      matched: 0,
      hasNewNegation: false,
      valid: false,
    };
  }

  const hasNewNegation =
    NEGATION_CONSTRAINT_RE.test(finalText) && !NEGATION_CONSTRAINT_RE.test(interimText);

  const finalSet = new Set(finalTokens);
  let matched = 0;
  for (const t of interimTokens) {
    if (finalSet.has(t)) matched++;
  }

  const recall = matched / interimTokens.length;
  const precision = matched / finalTokens.length;
  const valid = !hasNewNegation && recall >= 0.7 && precision >= 0.5;

  return {
    recall,
    precision,
    matched,
    hasNewNegation,
    valid,
  };
}

/**
 * Returns true if the pre-fetched PHASE_1:HOOK is valid for instant 0ms display:
 * token recall >= 0.7, precision >= 0.5, and the final utterance did not introduce a new negation constraint.
 */
export function isSpeculativeHookValid(interimText: string, finalText: string): boolean {
  return computeIntentOverlap(interimText, finalText).valid;
}

/**
 * Resolves which slot(s) an AI modifier should regenerate so we don't wipe the entire card.
 */
export function resolvePatchSlotForModifier(modifier?: string): PatchTargetSlot {
  if (!modifier) return 'full';
  switch (modifier) {
    case 'code':
    case 'code_example':
    case 'more_technical':
    case 'under_the_hood':
      return 'deep_dive';
    case 'shorter':
    case 'simpler':
      return 'hook_and_pillars';
    case 're_angle':
    case 'tradeoffs':
    default:
      return 'full';
  }
}

/**
 * Surgically merges newly streamed phase output into an existing answer snapshot without
 * wiping untouched phases (e.g., preserving HOOK & PILLARS while streaming a new DEEP_DIVE code block).
 */
export function mergeSurgicalAnswerSlots(
  existing: StructuredAnswerSlots,
  incoming: StructuredAnswerSlots,
  slotMode: PatchTargetSlot
): StructuredAnswerSlots {
  if (slotMode === 'full') {
    return incoming;
  }

  if (slotMode === 'rest_after_hook') {
    return {
      meta: incoming.meta || existing.meta,
      hook: existing.hook || incoming.hook,
      pillars: incoming.pillars.length > 0 ? incoming.pillars : existing.pillars,
      deepDive: incoming.deepDive || existing.deepDive,
      followUpTrap: incoming.followUpTrap || existing.followUpTrap,
    };
  }

  if (slotMode === 'deep_dive') {
    return {
      meta: existing.meta || incoming.meta,
      hook: existing.hook,
      pillars: existing.pillars,
      deepDive: incoming.deepDive || incoming.hook || existing.deepDive,
      followUpTrap: incoming.followUpTrap || existing.followUpTrap,
    };
  }

  if (slotMode === 'hook_and_pillars') {
    return {
      meta: existing.meta || incoming.meta,
      hook: incoming.hook || existing.hook,
      pillars: incoming.pillars.length > 0 ? incoming.pillars : existing.pillars,
      deepDive: existing.deepDive,
      followUpTrap: existing.followUpTrap,
    };
  }

  if (slotMode === 'trap') {
    return {
      meta: existing.meta || incoming.meta,
      hook: existing.hook,
      pillars: existing.pillars,
      deepDive: existing.deepDive,
      followUpTrap: incoming.followUpTrap || existing.followUpTrap,
    };
  }

  return incoming;
}

/**
 * Reconstructs canonical raw tagged text from merged slots so legacy parsers & desktop stream
 * renderers stay 100% synchronized with zero flickering.
 */
export function serializeMergedSlotsToTaggedStream(slots: StructuredAnswerSlots): string {
  const parts: string[] = [];
  if (slots.meta) {
    parts.push(`<<<META: ${slots.meta}>>>`);
  }
  if (slots.hook) {
    parts.push(`<<<PHASE_1:HOOK>>>\n${slots.hook.trim()}`);
  }
  if (slots.pillars && slots.pillars.length > 0) {
    const bulletLines = slots.pillars
      .map((p) => (p.trim().startsWith('-') || p.trim().startsWith('•') ? p.trim() : `- ${p.trim()}`))
      .join('\n');
    parts.push(`<<<PHASE_2:PILLARS>>>\n${bulletLines}`);
  }
  if (slots.deepDive) {
    parts.push(`<<<PHASE_3:DEEP_DIVE>>>\n${slots.deepDive.trim()}`);
  }
  if (slots.followUpTrap && (slots.followUpTrap.question || slots.followUpTrap.answer)) {
    parts.push(
      `<<<PHASE_4:TRAP>>>\nQ: ${slots.followUpTrap.question.trim()}\nA: ${slots.followUpTrap.answer.trim()}`
    );
  }
  return parts.join('\n\n');
}
