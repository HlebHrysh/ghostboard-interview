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
  | 'more_technical'
  | 'code_example'
  | 'tradeoffs';

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

    case 'more_technical':
      return `MODIFIER: LOW-LEVEL INTERNALS & KERNEL MECHANICS.
- Focus on OS memory layout, kernel primitives (epoll/kqueue), virtual address spaces, cache lines, or concurrency atomics.`;

    case 'normal':
    default:
      return `MODIFIER: BALANCED LIVE DELIVERY.
- Balance natural spoken fluency, crisp architectural pillars, and concrete practical depth.`;
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
}): {
  systemPrompt: string;
  domain: AiDomain;
  level: AiSeniority;
  langTag: string;
} {
  const { question, modifier = 'normal', profile, outputLanguage = 'auto', helperLanguage = 'uk' } = options;

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
(Weave these real tools and projects naturally into your answer from first-person experience).`
      : `PRACTITIONER STANCE:
Answer with the lived authority of an active ${level} ${domain} practitioner with battle-tested production experience.`;

  const systemPrompt = `Ghostboard: ultra-low latency teleprompter AI (<450 tokens).
Read aloud by candidate during live interview.

CONTEXT: Domain: ${domain} | Level: ${level}
${cvContextString}

${langInstruction}
${modifierInstruction}

ANTI-WIKIPEDIA & LIVE SPOKEN SPEECH RULES:
1. STRICTLY FORBIDDEN: Encyclopedic introductions (NO "В современном...", "Basically...", "Sure!").
2. ALWAYS speak from FIRST PERSON ("На практиці я вирішую це...", "In production, I solve this with...").
3. Short, punchy, confident sentences, effortless to speak aloud.
4. SHORT QUERIES: If brief (e.g. 'React + SQL'): treat as Senior technical question on internal mechanics and trade-offs.

MANDATORY 3-PHASE SEQUENCE (START IMMEDIATELY WITH LINE 1):
<<<META: ${domain} | ${level} | ${langTag}>>>
<<<PHASE_1:HOOK>>>
[Gear 1 — Instant Spoken Hook: 1–2 natural, confident, first-person sentences (20–35 words). Candidate reads aloud in 1st second without filler. Directly answers core mechanic.]

<<<PHASE_2:PILLARS>>>
[Gear 2 — Deep Technical Pillars: 3 bullets (18–28 words each) streamed while candidate speaks Hook. Each bullet starts with a **Bold Technical Anchor** on mechanics/trade-offs:]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]
• **KeyAnchor**: [Mechanic in plain words. Maximum 10-14 words total!]

<<<PHASE_3:DEEP_DIVE>>>
[Gear 3 — Production Code / Concrete Case: 8–16 lines of clean idiomatic code OR concrete architecture case with numbers & trade-offs (💡 Key nuance / interviewer trap).]

<<<END>>>
Start directly with <<<META: ${domain} | ${level} | ${langTag}>>> then <<<PHASE_1:HOOK>>>.`;

  return {
    systemPrompt,
    domain,
    level,
    langTag,
  };
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
    .replace(/(?:\r?\n|\s)*(?:<{3,}[A-Za-z0-9_:|\s\-]*>{0,2}|<{1,2})$/i, '')
    .replace(/(?:\r?\n|\s)*\[(?:D(?:O(?:N(?:E\]?)?)?)?)?$/i, '')
    .replace(/(?:\r?\n|\s)*(?:<{3,}|>{3,})\s*$/g, '')
    .trim();
}

/**
 * Parses full or partial structured 3-phase text generated by Ghostboard.
 * Guaranteed zero tag flicker, resilient fallback, and clean meta-tag extraction.
 */
export function parseStructuredGhostboardOutput(raw: string): {
  meta?: MetaTagInfo;
  hook: string;
  pillars: string[];
  deepDive: string;
} {
  let meta: MetaTagInfo | undefined = undefined;
  let hook = '';
  let pillars: string[] = [];
  let deepDive = '';

  if (!raw) {
    return { hook, pillars, deepDive };
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
      /<<<PHASE_1:HOOK>>>([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|\[DONE\]|$)/i
    );
    if (hookMatch) {
      hook = stripTrailingPartialTags(hookMatch[1]);
    }
  } else {
    // Resilient fallback: LLM omitted <<<PHASE_1:HOOK>>> or text is streaming before tag arrives
    const fallbackMatch = cleanRaw.match(
      /^([\s\S]*?)(?:<<<PHASE_2:PILLARS>>>|<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|\[DONE\]|$)/i
    );
    if (fallbackMatch) {
      hook = stripTrailingPartialTags(fallbackMatch[1]);
    }
  }

  // 3. Phase 2: Pillars
  const pillarsMatch = cleanRaw.match(
    /<<<PHASE_2:PILLARS>>>([\s\S]*?)(?:<<<PHASE_3:DEEP_DIVE>>>|<<<END>>>|\[DONE\]|$)/i
  );
  if (pillarsMatch) {
    pillars = pillarsMatch[1]
      .split('\n')
      .map((line) =>
        stripTrailingPartialTags(
          line
            .replace(/^[•\-\*]\s*/, '')
            .replace(/<<<\s*PHASE_[123]:[A-Za-z0-9_]+\s*>>>/gi, '')
            .replace(/<<<\s*END\s*>>>/gi, '')
        )
      )
      .filter((line) => line.length > 0 && !line.startsWith('<<<') && !line.includes('[DONE]'));
  }

  // 4. Phase 3: Deep Dive
  const deepDiveMatch = cleanRaw.match(
    /<<<PHASE_3:DEEP_DIVE>>>([\s\S]*?)(?:<<<END>>>|\[DONE\]|$)/i
  );
  if (deepDiveMatch) {
    deepDive = stripTrailingPartialTags(deepDiveMatch[1]);
  }

  return { meta, hook, pillars, deepDive };
}

