/**
 * Ghostboard AI Prompt Core & Zero-Config Brain Engine
 * 
 * Implements:
 * 1. Autonomous domain & profession zero-config classification
 * 2. Anti-Wikipedia conversational first-person prompt generation
 * 3. 3-Phase structured delivery (META -> HOOK -> PILLARS with bold anchors -> DEEP_DIVE)
 * 4. Full multilingualism (auto, chosen language, and bilingual prompter mode)
 * 5. On-the-fly fast modifiers (shorter, simpler, code, re_angle, more_technical, etc.)
 */

import type { PatchTargetSlot } from './speculativeSlotEngine';

export type { PatchTargetSlot };

export type AiDomain =
  | 'Backend'
  | 'Frontend'
  | 'DevOps'
  | 'Data/ML'
  | 'QA'
  | 'Mobile'
  | 'System Design'
  | 'Product/PM'
  | 'Design'
  | 'Marketing/Sales'
  | 'HR/Behavioral'
  | 'LeetCode/Algorithms';

export type AiSeniority = 'Junior' | 'Middle' | 'Senior' | 'Lead/Staff';

export type AiModifier =
  | 'normal'
  | 'shorter'
  | 'simpler'
  | 'code'
  | 're_angle'
  | 'under_the_hood'
  | 'bridge'
  | 'more_technical'
  | 'code_example'
  | 'tradeoffs'
  | 'explain_line';

export interface CandidateContext {
  role?: string;
  primaryStack?: string;
  experienceLevel?: string;
  cvContext?: string;
  resumeContext?: string;
  techStack?: string[];
  petProjects?: Array<{ name?: string; description?: string; keyHighlight?: string }>;
  customBio?: string;
}

export interface MetaTagInfo {
  domain: AiDomain;
  level: AiSeniority;
  language: string;
  raw: string;
}

/**
 * Autonomously infers the technical domain from question text and candidate profile.
 */
export function inferDomainAndRole(question: string, profile?: CandidateContext): {
  domain: AiDomain;
  level: AiSeniority;
} {
  const q = question.toLowerCase();
  const profileRole = (profile?.role || '').toLowerCase();

  // 1. Behavioral & HR questions
  if (
    /розкажи про себе|досвід|сильн.*сторон|хто ти|конфлікт|факап|слабк.*сторон|чому наша компанія|опиши ситуацію|tell me about yourself|introduce yourself|biggest challenge|strength|weakness|conflict|why our company|describe a situation/i.test(
      q
    )
  ) {
    return { domain: 'HR/Behavioral', level: determineSeniority(profile) };
  }

  // 2. LeetCode / Algorithms
  if (
    /leetcode|binary search|two pointers|sliding window|dynamic programming|dfs|bfs|graph|tree|sorting|big-o|complexity|o\(n\)|array rotation|linked list|monotone queue|паліндром|бінарн.*пошук|дерево|динамічне програмування/i.test(
      q
    )
  ) {
    return { domain: 'LeetCode/Algorithms', level: determineSeniority(profile) };
  }

  // 3. System Design
  if (
    /system design|як спроектувати|how to design|how would you architect|архітектур|scalability|high availability|sharding|replication|cap theorem|distributed lock|event-driven|load balanc|cdn|розподілен.*систем/i.test(
      q
    )
  ) {
    return { domain: 'System Design', level: 'Senior' };
  }

  // 4. Backend (processes, threads, concurrency, DBs, queues, APIs)
  if (
    /process|thread|concurrency|mutex|deadlock|postgres|mysql|redis|kafka|rabbitmq|database|sql|mvcc|orm|fastapi|django|express|nestjs|golang|goroutine|spring|jvm|b-tree|асинхрон|потік|процес|транзакц/i.test(
      q
    ) ||
    profileRole.includes('backend')
  ) {
    return { domain: 'Backend', level: determineSeniority(profile) };
  }

  // 5. DevOps & Infrastructure
  if (
    /kubernetes|k8s|docker|helm|ci\/cd|github actions|gitlab ci|terraform|ansible|prometheus|grafana|aws|gcp|nginx|ingress|systemd|деплой|контейнер/i.test(
      q
    ) ||
    profileRole.includes('devops') ||
    profileRole.includes('sre') ||
    profileRole.includes('platform')
  ) {
    return { domain: 'DevOps', level: determineSeniority(profile) };
  }

  // 5. Data & Machine Learning
  if (
    /pytorch|tensorflow|machine learning|deep learning|llm|embeddings|rag|pandas|numpy|spark|airflow|etl|data pipeline|нейромереж|модель|навчання моделей/i.test(
      q
    ) ||
    profileRole.includes('data') ||
    profileRole.includes('ml') ||
    profileRole.includes('ai')
  ) {
    return { domain: 'Data/ML', level: determineSeniority(profile) };
  }

  // 6. Mobile
  if (
    /react native|flutter|swift|swiftui|kotlin|jetpack compose|ios|android|xcode|mobile app|мобільн.*додат/i.test(
      q
    ) ||
    profileRole.includes('mobile') ||
    profileRole.includes('ios') ||
    profileRole.includes('android')
  ) {
    return { domain: 'Mobile', level: determineSeniority(profile) };
  }

  // 7. Frontend
  if (
    /react|next\.js|vue|angular|svelte|css|tailwind|html|dom|browser|hydration|ssr|ssg|csr|redux|zustand|webpack|vite|bundler|frontend|фронтенд|компонент/i.test(
      q
    ) ||
    profileRole.includes('frontend') ||
    profileRole.includes('front-end')
  ) {
    return { domain: 'Frontend', level: determineSeniority(profile) };
  }

  // 8. QA
  if (
    /testing|test suite|unit test|e2e|playwright|cypress|selenium|vitest|jest|mocking|regression|load test|qa|тестуван|тест-кейси/i.test(
      q
    ) ||
    profileRole.includes('qa') ||
    profileRole.includes('test')
  ) {
    return { domain: 'QA', level: determineSeniority(profile) };
  }

  // 9. Product & Project Management
  if (
    /product manager|product management|roadmap|scrum|kanban|kpi|okr|user story|retention|conversion rate|churn|бекворк|пріоритезація/i.test(
      q
    ) ||
    profileRole.includes('product') ||
    profileRole.includes('project')
  ) {
    return { domain: 'Product/PM', level: determineSeniority(profile) };
  }

  // 10. Design
  if (
    /figma|ui\/ux|design system|wireframe|typography|grid|accessibility|a11y|дизайн/i.test(
      q
    ) ||
    profileRole.includes('design')
  ) {
    return { domain: 'Design', level: determineSeniority(profile) };
  }

  // 11. Marketing & Sales
  if (
    /marketing|seo|sales funnel|lead generation|conversion|cold outreach|cac|ltv|продаж|маркетинг/i.test(
      q
    ) ||
    profileRole.includes('marketing') ||
    profileRole.includes('sales')
  ) {
    return { domain: 'Marketing/Sales', level: determineSeniority(profile) };
  }

  // Default to Backend / Engineering
  return { domain: 'Backend', level: determineSeniority(profile) };
}

function determineSeniority(profile?: CandidateContext): AiSeniority {
  const levelStr = (profile?.experienceLevel || profile?.role || '').toLowerCase();
  if (levelStr.includes('staff') || levelStr.includes('principal') || levelStr.includes('lead')) {
    return 'Lead/Staff';
  }
  if (levelStr.includes('senior')) {
    return 'Senior';
  }
  if (levelStr.includes('junior')) {
    return 'Junior';
  }
  return 'Senior';
}

/**
 * Builds language rules and instructions.
 */
export function buildLanguageInstruction(
  outputLanguage = 'auto',
  helperLanguage = 'uk',
  question = ''
): {
  targetLangCode: string;
  instruction: string;
  isBilingual: boolean;
} {
  const isBilingual =
    outputLanguage === 'bilingual' ||
    (outputLanguage === 'auto' && !/[а-яА-ЯёЁіІїЇєЄґҐ]/.test(question) && (helperLanguage === 'uk' || helperLanguage === 'ru'));

  if (isBilingual) {
    const helperName =
      helperLanguage === 'ru'
        ? 'Russian (Русский)'
        : helperLanguage === 'pl'
        ? 'Polish (Polski)'
        : helperLanguage === 'de'
        ? 'German (Deutsch)'
        : 'Ukrainian (Українська)';

    return {
      targetLangCode: 'bilingual',
      isBilingual: true,
      instruction: `BILINGUAL PROMPTER MODE:
- Spoken words MUST be in natural, conversational, clear Technical English (B2/C1 level - straightforward and easy for the candidate to read aloud smoothly).
- Beside or beneath each spoken phrase and bullet point, provide a short, clear hint/gist in parentheses in ${helperName} so the candidate instantly grasps the exact nuance without mental strain!
Example: In production, I solve this with optimistic locking. (У продакшені я вирішую це через оптимістичні блокування)`,
    };
  }

  if (outputLanguage === 'auto') {
    const hasCyrillic = /[а-яА-ЯёЁіІїЇєЄґҐ]/.test(question);
    const isLikelyUk = /[іІїЇєЄґҐ]/.test(question);

    if (hasCyrillic) {
      const langName = isLikelyUk ? 'Ukrainian (Українська)' : 'Russian (Русский)';
      const code = isLikelyUk ? 'uk' : 'ru';
      return {
        targetLangCode: code,
        isBilingual: false,
        instruction: `Language: Respond naturally in ${langName}. Keep all standard industry developer terms in English (e.g. event loop, Redis, connection pool, deadlock, async/await).`,
      };
    }

    return {
      targetLangCode: 'en',
      isBilingual: false,
      instruction: `Language: Respond in natural, conversational Technical English (B2 level - punchy, direct, easy to speak aloud).`,
    };
  }

  const LANG_NAMES: Record<string, string> = {
    uk: 'Ukrainian (Українська мова). Все українською, технічні терміни англійською',
    en: 'English (Clear, natural conversational Technical English at B2 level)',
    ru: 'Russian (Русский язык). Все по-русски, технические термины на английском',
    pl: 'Polish (Język polski)',
    de: 'German (Deutsch)',
    fr: 'French (Français)',
    es: 'Spanish (Español)',
    pt: 'Portuguese (Português)',
    it: 'Italian (Italiano)',
    cs: 'Czech (Čeština)',
    nl: 'Dutch (Nederlands)',
  };

  const name = LANG_NAMES[outputLanguage] || `the language with code "${outputLanguage}"`;
  return {
    targetLangCode: outputLanguage,
    isBilingual: false,
    instruction: `Language: Respond strictly in ${name}. Keep standard software industry terms in English.`,
  };
}

/**
 * Builds compact instructions for fast modifiers.
 */
export function buildModifierInstruction(modifier: AiModifier = 'normal'): string {
  switch (modifier) {
    case 'shorter':
      return `MODIFIER: ULTRA-CONCISE (SHORTER).
- Keep Hook to 1 single punchy sentence.
- Give exactly 3 ultra-short bullets of 6–8 words each.
- In Phase 3, provide only 1 sentence takeaway. Skip long code.`;

    case 'simpler':
      return `MODIFIER: EXPLAIN SIMPLY (LIKE TO A JUNIOR / 5-YEAR-OLD).
- Avoid heavy academic terminology, complex mathematical formulas, and obscure acronyms.
- Use an intuitive real-world physical analogy.
- Explain the core concept so simply that anyone understands it immediately.`;

    case 'code':
    case 'code_example':
      return `MODIFIER: CODE-FIRST.
- In Phase 1, state in 1 sentence how this is implemented.
- In Phase 2, highlight 3 key implementation patterns in the code.
- In Phase 3, provide complete, clean, idiomatic code without fluff comments, followed by exact Time & Space Complexity O(n).`;

    case 're_angle':
    case 'tradeoffs':
      return `MODIFIER: ALTERNATIVE ANGLE & PRODUCTION TRADE-OFFS.
- Re-frame the problem from a production-reliability and scaling angle.
- Focus on real-world compromises: Latency vs Throughput, Consistency vs Availability, Memory vs CPU.
- Propose an alternative architectural approach used in modern production systems.`;

    case 'under_the_hood':
    case 'more_technical':
      return `MODIFIER: LOW-LEVEL INTERNALS & KERNEL MECHANICS (UNDER THE HOOD).
- Focus on OS memory layout, kernel primitives (epoll/kqueue), virtual address spaces, cache lines, or concurrency atomics.
- Unpack what happens beneath the runtime/compiler abstraction.`;

    case 'bridge':
      return `MODIFIER: DIPLOMATIC BRIDGE & TRANSITION.
- Provide a smooth, senior conversational pivot from the previous topic into this core question.
- Connect previous architectural context seamlessly before delivering the crisp answer.`;

    case 'explain_line':
      return `MODIFIER: MICRO-EXPLAINER (EXPLAIN LINE).
- Deliver a concise 2-sentence spoken explanation of WHY that specific line/construct is used.
- Explicitly state its exact time and space complexity in plain words.
- Skip long preambles, provide immediate spoken clarity.`;

    case 'normal':
    default:
      return `MODIFIER: BALANCED LIVE DELIVERY.
- Natural spoken fluency, crisp architectural pillars, practical depth.`;
  }
}

/**
 * Resolves the tightest maxOutputTokens budget per patchSlot to minimize LLM latency & token cost.
 */
export function getMaxOutputTokensForPatchSlot(
  patchSlot: PatchTargetSlot = 'full',
  modifier: AiModifier = 'normal'
): number {
  switch (patchSlot) {
    case 'speculative_hook':
      return 95;
    case 'deep_dive':
      return 380;
    case 'hook_and_pillars':
      return 260;
    case 'trap':
      return 180;
    case 'rest_after_hook':
      return modifier === 'shorter' || modifier === 'explain_line' ? 320 : 850;
    case 'full':
    default:
      return modifier === 'shorter' || modifier === 'explain_line' ? 350 : 850;
  }
}

function buildPhaseSequenceDirective(
  domain: AiDomain,
  level: AiSeniority,
  langTag: string,
  patchSlot: PatchTargetSlot,
  preGeneratedHook?: string
): string {
  switch (patchSlot) {
    case 'speculative_hook':
      return `MANDATORY SPECULATIVE HOOK MODE (STOP IMMEDIATELY AFTER PHASE 1):
Output ONLY <<<META: ...>>> and <<<PHASE_1:HOOK>>> (1–2 natural spoken sentences, max 35 words) and stop immediately with <<<END>>>. Do NOT output PHASE_2, PHASE_3, or PHASE_4!
<<<META: ${domain} | ${level} | ${langTag}>>>
<<<PHASE_1:HOOK>>>
[Gear 1 — Instant Spoken Hook: 1–2 natural, confident sentences (max 35 words). Directly answers core mechanic.]
<<<END>>>`;

    case 'rest_after_hook': {
      const hookPreview = (preGeneratedHook || '').trim();
      return `MANDATORY CONTINUATION AFTER PRE-DISPLAYED HOOK:
<<<PHASE_1:HOOK>>> is ALREADY shown to the candidate: "${hookPreview}"
DO NOT repeat <<<META>>> or <<<PHASE_1:HOOK>>>! Start IMMEDIATELY at <<<PHASE_2:PILLARS>>> followed by <<<PHASE_3:DEEP_DIVE>>> and <<<PHASE_4:TRAP>>>:

<<<PHASE_2:PILLARS>>>
[Gear 2 — Technical Pillars: 3 bullets (18–28 words). Each starts with a **Bold Technical Anchor**:]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]
• **KeyAnchor**: [Pillar 2 anchor]
• **KeyAnchor**: [Pillar 3 anchor]

<<<PHASE_3:DEEP_DIVE>>>
[Gear 3 — Production Code / Case: 8–16 lines of clean idiomatic code OR architecture case (💡 Key nuance).]

<<<PHASE_4:TRAP>>>
Q: [1 short sentence: the sharpest follow-up trap question a Senior/Staff interviewer will ask next based on your answer above]
A: [1–2 punchy sentences: the exact killer counter-answer with a concrete metric or mechanism]

<<<END>>>`;
    }

    case 'deep_dive':
      return `MANDATORY SURGICAL SLOT PATCH (PHASE 3 ONLY):
<<<PHASE_1:HOOK>>> and <<<PHASE_2:PILLARS>>> are ALREADY frozen on screen.
Output ONLY <<<PHASE_3:DEEP_DIVE>>> with a clean, production-grade code snippet and complexity analysis, then <<<END>>>. Do NOT output META, PHASE_1, PHASE_2, or PHASE_4!
<<<PHASE_3:DEEP_DIVE>>>
[Clean, production-grade code snippet (8–18 lines, idiomatic, no fluff comments) and exact Time & Space Complexity analysis, or concrete low-level mechanics.]
<<<END>>>`;

    case 'hook_and_pillars':
      return `MANDATORY SURGICAL SLOT PATCH (PHASE 1 & PHASE 2 ONLY):
<<<PHASE_3:DEEP_DIVE>>> is ALREADY frozen on screen and untouched.
Output ONLY a tighter, simpler <<<PHASE_1:HOOK>>> and <<<PHASE_2:PILLARS>>> followed by <<<END>>>. Do NOT output PHASE_3 or PHASE_4!
<<<META: ${domain} | ${level} | ${langTag}>>>
<<<PHASE_1:HOOK>>>
[1–2 crisp, simpler spoken sentences (15–25 words). Directly answers core mechanic.]

<<<PHASE_2:PILLARS>>>
• **KeyAnchor**: [Short spoken point, 6–10 words]
• **KeyAnchor**: [Short spoken point, 6–10 words]
• **KeyAnchor**: [Short spoken point, 6–10 words]

<<<END>>>`;

    case 'trap':
      return `MANDATORY SURGICAL SLOT PATCH (PHASE 4 ONLY):
Output ONLY <<<PHASE_4:TRAP>>> followed by <<<END>>>.
<<<PHASE_4:TRAP>>>
Q: [1 short sentence: the sharpest follow-up trap question]
A: [1–2 punchy sentences: the exact killer counter-answer with a concrete metric or mechanism]
<<<END>>>`;

    case 'full':
    default:
      return `MANDATORY 4-PHASE SEQUENCE (START IMMEDIATELY WITH LINE 1):
<<<META: ${domain} | ${level} | ${langTag}>>>
<<<PHASE_1:HOOK>>>
[Gear 1 — Instant Spoken Hook: 1–2 natural, confident sentences (20–35 words). Directly answers core mechanic.]

<<<PHASE_2:PILLARS>>>
[Gear 2 — Technical Pillars: 3 bullets (18–28 words). Each starts with a **Bold Technical Anchor**:]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]
• **KeyAnchor**: [Pillar 2 anchor]
• **KeyAnchor**: [Pillar 3 anchor]

<<<PHASE_3:DEEP_DIVE>>>
[Gear 3 — Production Code / Case: 8–16 lines of clean idiomatic code OR architecture case (💡 Key nuance).]

<<<PHASE_4:TRAP>>>
Q: [1 short sentence: the sharpest follow-up trap question a Senior/Staff interviewer will ask next based on your answer above]
A: [1–2 punchy sentences: the exact killer counter-answer with a concrete metric or mechanism]

<<<END>>>`;
  }
}

/**
 * Builds the high-speed, zero-fluff system prompt for Ghostboard real-time teleprompter.
 * Optimized for Sub-250ms TTFT (low token prefill overhead, zero conversational filler).
 */
export function buildGhostboardSystemPrompt(options: {
  question: string;
  modifier?: AiModifier;
  profile?: CandidateContext;
  outputLanguage?: string;
  helperLanguage?: string;
  patchSlot?: PatchTargetSlot;
  preGeneratedHook?: string;
}): {
  systemPrompt: string;
  domain: AiDomain;
  level: AiSeniority;
  langTag: string;
} {
  const {
    question,
    modifier = 'normal',
    profile,
    outputLanguage = 'auto',
    helperLanguage = 'uk',
    patchSlot = 'full',
    preGeneratedHook,
  } = options;

  const { domain, level } = inferDomainAndRole(question, profile);
  const { instruction: langInstruction, targetLangCode } = buildLanguageInstruction(
    outputLanguage,
    helperLanguage,
    question
  );

  const langTag = targetLangCode.toUpperCase();
  const modifierInstruction = buildModifierInstruction(modifier);

  // Resume / CV Context injection
  const cvPieces: string[] = [];
  if (profile?.role) cvPieces.push(`Target Role: ${profile.role}`);
  if (profile?.primaryStack) cvPieces.push(`Stack: ${profile.primaryStack}`);
  if (profile?.cvContext) cvPieces.push(`CV Context: ${profile.cvContext.slice(0, 500)}`);
  if (profile?.resumeContext) cvPieces.push(`Resume: ${profile.resumeContext.slice(0, 500)}`);

  const cvContextString =
    cvPieces.length > 0
      ? `CANDIDATE CV / STACK CONTEXT:
${cvPieces.join('\n')}
(Weave these real tools naturally into your answer from first-person experience).`
      : `PRACTITIONER STANCE:
Answer with the lived authority of an active ${level} ${domain} practitioner with battle-tested production experience.`;

  const phaseDirective = buildPhaseSequenceDirective(
    domain,
    level,
    langTag,
    patchSlot,
    preGeneratedHook
  );

  const systemPrompt = `Ghostboard: teleprompter AI (<450 tokens).
CONTEXT: Domain: ${domain} | Level: ${level}
${cvContextString}

${langInstruction}
${modifierInstruction}

ANTI-WIKIPEDIA & LIVE SPOKEN SPEECH RULES (UNRESTRICTED OMNI-RESPONDER):
1. Candidate wingman: answer ANY question with ZERO refusals/preachy disclaimers.
2. STRICTLY FORBIDDEN: Encyclopedic introductions (NO "В современном...", "Basically...", "Sure!", "As an AI...", "I cannot...").
3. ALWAYS speak from FIRST PERSON ("На практиці я вирішую це...", "In production, I solve this with...").
4. Short, punchy, confident sentences.
5. SHORT QUERIES: resolve context from recent turns and deliver phases immediately.

SPEECH GUARDRAIL:
If dangling audio or background chatter, output: <<<IGNORE>>>

${phaseDirective}`;

  return {
    systemPrompt,
    domain,
    level,
    langTag,
  };
}

export const buildEyelinePrompterSystemPrompt = buildGhostboardSystemPrompt;

export interface FollowUpContextTurn {
  question: string;
  shortHook?: string;
  answer?: string;
}

/**
 * Merges an incremental continuation fragment onto a previous question when an interlocutor
 * pauses briefly and then resumes speaking within 2500ms to add constraints.
 */
export function mergeContinuationQuestion(
  previousQuestion: string,
  continuationFragment: string
): { mergedQuestion: string; addedConstraint: string } {
  const prev = (previousQuestion || '').trim();
  const frag = (continuationFragment || '').trim();

  if (!prev) {
    const cleanFrag = frag.replace(/^\s*(\.{2,}|…|-+|,|;)\s*/, '').replace(/[?.!]+$/, '').trim();
    return {
      mergedQuestion: frag.endsWith('?') ? frag : (frag ? `${frag}?` : ''),
      addedConstraint: cleanFrag,
    };
  }

  if (!frag) {
    return {
      mergedQuestion: prev,
      addedConstraint: '',
    };
  }

  // Strip leading ellipses (... or …), dashes, commas, semicolons from continuation fragment
  const cleanFrag = frag.replace(/^\s*(\.{2,}|…|-+|,|;)\s*/, '').trim();
  const addedConstraint = cleanFrag.replace(/[?.!]+$/, '').trim();

  // Strip trailing punctuation from previous question for merging
  const basePrev = prev.replace(/[?.!]+$/, '').trim();

  // Subordinate words / prepositions / conjunctions that seamlessly continue the sentence
  const isSubordinate = /^(assuming|given|with|without|if|when|but|and|or|where|considering|specifically|let's say|якщо|але|при цьому|враховуючи|скажімо)\b/i.test(
    cleanFrag
  );

  let mergedQuestion = '';
  if (isSubordinate || /^[a-zа-яіїєґ]/.test(cleanFrag)) {
    const normalizedFrag = cleanFrag.charAt(0).toLowerCase() + cleanFrag.slice(1);
    mergedQuestion = `${basePrev}, ${normalizedFrag}`;
  } else {
    mergedQuestion = `${basePrev}? ${cleanFrag}`;
  }

  if (!mergedQuestion.endsWith('?')) {
    mergedQuestion = `${mergedQuestion.replace(/[.!]+$/, '')}?`;
  }

  return {
    mergedQuestion,
    addedConstraint,
  };
}

/**
 * Builds user prompt incorporating rolling 2-turn follow-up context memory.
 * Resolves follow-ups like "Why?", "How would you scale that?", and pronouns ("this", "that", "це").
 */
export function buildGhostboardUserPrompt(
  question: string,
  recentTurns?: FollowUpContextTurn[] | string,
  continuationConstraint?: string
): string {
  let prompt = '';
  if (Array.isArray(recentTurns) && recentTurns.length > 0) {
    const turns = recentTurns.slice(-2);
    prompt += 'RECENT CONVERSATION TURNS (use to resolve follow-ups like "Why?", "How to scale that?", "Write code for this", pronouns "this"/"that"/"це"):\n';
    turns.forEach((turn, idx) => {
      const ans = (turn.shortHook || turn.answer || '').trim();
      const shortAns = ans.length > 160 ? `${ans.slice(0, 160)}...` : ans;
      prompt += `Turn ${idx + 1} Q: ${turn.question.trim()}\nTurn ${idx + 1} A: ${shortAns}\n`;
    });
    prompt += '\n';
  } else if (typeof recentTurns === 'string' && recentTurns.trim().length > 0) {
    prompt += `RECENT CONVERSATION CONTEXT:\n${recentTurns.trim()}\n\n`;
  }
  prompt += `CURRENT INTERVIEWER QUESTION:\n${question.trim()}`;
  if (continuationConstraint) {
    prompt += `\n\n[CONTINUATION REFINEMENT: Keep the opening natural, and specifically address the newly added constraint: "${continuationConstraint}"]`;
  }
  return prompt;
}

/**
 * Splits bilingual answer text into spoken technical phrases and muted native translations.
 * Parentheses containing Cyrillic characters are treated as the candidate's native crib-sheet.
 */
export function parseBilingualParts(text: string): Array<{ text: string; isTranslation: boolean }> {
  if (!text) return [];
  // Matches (any content with Cyrillic)
  const regex = /(\([^)]*[а-яА-ЯёЁіІїЇєЄґҐ][^)]*\))/g;
  const parts: Array<{ text: string; isTranslation: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const normalPart = text.slice(lastIndex, match.index);
      if (normalPart) {
        parts.push({ text: normalPart, isTranslation: false });
      }
    }
    parts.push({ text: match[1], isTranslation: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const trailingPart = text.slice(lastIndex);
    if (trailingPart) {
      parts.push({ text: trailingPart, isTranslation: false });
    }
  }

  return parts;
}

/**
 * Strips partial stream delimiters and unclosed tags that occur at the trailing end
 * of an in-flight stream buffer before they fully arrive, preventing flicker.
 */
export function stripTrailingPartialTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:\r?\n|\s)*(?:<<<END>>>|\[DONE\])\s*$/gi, '')
    // Strip trailing partial delimiters: e.g. <<<PHASE_4:TRAP, <<<PHASE_4, <<, <
    .replace(/(?:\r?\n|\s)*(?:<{3,}[A-Za-z0-9_:>|\s\-]*>{0,2}|<{1,2})$/i, '')
    .replace(/(?:\r?\n|\s)*\[(?:D(?:O(?:N(?:E\]?)?)?)?)?$/i, '')
    .replace(/(?:\r?\n|\s)*(?:<{3,}|>{3,})\s*$/g, '')
    .trim();
}

/**
 * Parses full or partial structured progressive text generated by Ghostboard.
 * Guaranteed zero tag flicker, resilient fallback, and clean meta-tag & phase 4 trap extraction.
 */
export function parseStructuredGhostboardOutput(raw: string): {
  meta?: MetaTagInfo;
  hook: string;
  pillars: string[];
  deepDive: string;
  followUpTrap?: { question: string; answer: string };
} {
  let meta: MetaTagInfo | undefined = undefined;
  let hook = '';
  let pillars: string[] = [];
  let deepDive = '';
  let followUpTrap: { question: string; answer: string } | undefined = undefined;

  if (!raw) {
    return { hook, pillars, deepDive, followUpTrap };
  }

  // 1. Meta Tag extraction (even from partial/early chunks)
  const metaMatch = raw.match(/<<<META:\s*([^>]+)>>>/i);
  if (metaMatch) {
    const parts = metaMatch[1].split('|').map((p) => p.trim());
    meta = {
      domain: (parts[0] as AiDomain) || 'Backend',
      level: (parts[1] as AiSeniority) || 'Senior',
      language: parts[2] || 'EN',
      raw: metaMatch[1].trim(),
    };
  }

  // Remove meta tag and clean trailing partial delimiters
  const cleanRaw = raw
    .replace(/<<<META:[^>]+>>>/gi, '')
    .replace(/(?:\r?\n|\s)*(?:<{3,}[A-Za-z0-9_:|\s\-]*>{0,2}|<{1,2})$/i, '');

  // 2. Phase 1: Hook
  const hasPhase1 = /<<<PHASE_1:HOOK>>>/i.test(cleanRaw);
  if (hasPhase1) {
    const hookMatch = cleanRaw.match(
      /<<<PHASE_1:HOOK>>>([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<PHASE_3:DEEP_DIVE>>>|<<<PHASE_4:TRAP>>>|<<<END>>>|\[DONE\]|$)/i
    );
    if (hookMatch) {
      hook = stripTrailingPartialTags(hookMatch[1]);
    }
  } else {
    // Resilient fallback: LLM omitted <<<PHASE_1:HOOK>>> or text is streaming before tag arrives
    const fallbackMatch = cleanRaw.match(
      /^([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<PHASE_3:DEEP_DIVE>>>|<<<PHASE_4:TRAP>>>|<<<END>>>|\[DONE\]|$)/i
    );
    if (fallbackMatch) {
      hook = stripTrailingPartialTags(fallbackMatch[1]);
    }
  }

  // 3. Phase 2: Pillars
  const pillarsMatch = cleanRaw.match(
    /<<<PHASE_2:PILLARS>>>([\s\S]*?)(?:<<<PHASE_3:DEEP_DIVE>>>|<<<PHASE_4:TRAP>>>|<<<END>>>|\[DONE\]|$)/i
  );
  if (pillarsMatch) {
    pillars = pillarsMatch[1]
      .split('\n')
      .map((line) =>
        stripTrailingPartialTags(
          line
            .replace(/^[•\-\*]\s*/, '')
            .replace(/<<<\s*PHASE[-_]?[1-4]:[A-Za-z0-9_]+\s*>>>/gi, '')
            .replace(/<<<\s*END\s*>>>/gi, '')
        )
      )
      .filter((line) => line.length > 0 && !line.startsWith('<<<') && !line.includes('[DONE]'));
  }

  // 4. Phase 3: Deep Dive
  const deepDiveMatch = cleanRaw.match(
    /<<<PHASE_3:DEEP_DIVE>>>([\s\S]*?)(?:<<<PHASE_4:TRAP>>>|<<<END>>>|\[DONE\]|$)/i
  );
  if (deepDiveMatch) {
    deepDive = stripTrailingPartialTags(deepDiveMatch[1]);
  }

  // 5. Phase 4: Follow-Up Trap Shield
  const hasPhase4 = /<<<PHASE_4:TRAP>>>/i.test(cleanRaw);
  if (hasPhase4) {
    const trapMatch = cleanRaw.match(
      /<<<PHASE_4:TRAP>>>([\s\S]*?)(?:<<<END>>>|\[DONE\]|$)/i
    );
    if (trapMatch) {
      const rawTrap = stripTrailingPartialTags(trapMatch[1]);
      if (rawTrap.trim()) {
        const qMatch = rawTrap.match(/(?:^|\n)\s*(?:Q|Question)\s*:\s*([^\n]+)/i);
        const aMatch = rawTrap.match(/(?:^|\n)\s*(?:A|Answer)\s*:\s*([\s\S]+)/i);
        let question = qMatch ? stripTrailingPartialTags(qMatch[1].trim()) : '';
        let answer = aMatch ? stripTrailingPartialTags(aMatch[1].trim()) : '';

        if (!question && !answer && rawTrap.trim()) {
          const lines = rawTrap.split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length > 0) question = lines[0];
          if (lines.length > 1) answer = lines.slice(1).join(' ');
        }

        if (question || answer) {
          followUpTrap = { question, answer };
        }
      }
    }
  }

  return { meta, hook, pillars, deepDive, followUpTrap };
}

/**
 * Builds an Emergency Instant Structured Coaching Card in standard 4-phase format.
 * Rendered when all network models are unavailable so the candidate always has a calm,
 * structured framework to speak from with a 1-click retry button.
 */
export function buildEmergencyCoachingCard(question = '', language = 'en'): string {
  const isUk = language.startsWith('uk') || language.startsWith('bilingual');
  const isRu = language.startsWith('ru');

  if (isUk) {
    return `<<<META: System Architecture | Senior | uk>>>
<<<PHASE_1:HOOK>>>
Почніть відповідь упевнено за структурою STAR/CAR: дайте чітке визначення або тезу та опишіть практичний бізнес-контекст. (ШІ тимчасово не відповів, натисніть кнопку для миттєвого повтору).
<<<PHASE_2:PILLARS>>>
• **Архітектура та компоненти**: Окресліть призначення технології, ключові компоненти та потік даних.
• **Механізми під капотом**: Поясніть роботу з пам'яттю, конкурентністю, кешуванням, транзакціями чи мережею.
• **Trade-offs та Best Practices**: Наведіть плюси, мінуси, обмеження та альтернативні підходи.
<<<PHASE_3:DEEP_DIVE>>>
// [🔄 Повторити запит (1 клік)]
<<<END>>>`;
  }

  if (isRu) {
    return `<<<META: System Architecture | Senior | ru>>>
<<<PHASE_1:HOOK>>>
Начните ответ уверенно по структуре STAR/CAR: дайте чёткое определение или тезис и опишите практический бизнес-контекст. (ИИ временно задержал ответ, нажмите кнопку для быстрого повтора).
<<<PHASE_2:PILLARS>>>
• **Архитектура и компоненты**: Обозначьте назначение технологии, ключевые компоненты и поток данных.
• **Механизмы под капотом**: Объясните работу с памятью, конкурентностью, кэшированием или транзакциями.
• **Trade-offs и Best Practices**: Приведите плюсы, минусы, ограничения и альтернативные подходы.
<<<PHASE_3:DEEP_DIVE>>>
// [🔄 Повторить запрос (1 клик)]
<<<END>>>`;
  }

  return `<<<META: System Architecture | Senior | en>>>
<<<PHASE_1:HOOK>>>
Answer confidently using the STAR/CAR framework: state your core thesis and practical business context upfront. (AI connection timed out, click below to retry instantly).
<<<PHASE_2:PILLARS>>>
• **Core Architecture & Flow**: Define key system entities, data flow, and core responsibilities.
• **Under the Hood Mechanics**: Explain memory management, concurrency models, caching, or transaction guarantees.
• **Trade-offs & Production Scale**: Discuss bottlenecks, failure recovery, and architectural alternatives.
<<<PHASE_3:DEEP_DIVE>>>
// [🔄 Повторити запит (1 клік)]
<<<END>>>`;
}


