import { getSessionUser, incrementUserTrialQuestions, createUser } from '@/lib/serverDb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGeminiWithFallback, FLASH_MODELS, getCleanGeminiKey } from '@/lib/geminiApi';
import { normalizeTechnicalSpeech, detectQuestionLanguage, isolateTargetQuestionHeuristics } from '@/lib/techSpeechNormalizer';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';
import { interviewSyncStore } from '@/lib/interviewSyncStore';

export const CopilotPayloadSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(3000, 'Question exceeds maximum length'),
  locale: z.string().optional().default('auto'),
  outputLanguage: z.enum(['uk', 'en', 'ru', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl', 'auto']).optional().default('uk'),
  nativeLanguage: z.string().optional().default('auto'),
  candidateProfile: z.any().optional(),
  history: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    )
    .optional()
    .default([]),
  refinement: z.string().optional(),
  existingQA: z.any().optional(),
  isConcise: z.boolean().optional().default(false),
  triggerMode: z.enum(['auto', 'enter']).optional().default('auto'),
  sessionMode: z.enum(['interview', 'meeting']).optional().default('interview'),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ghostboard-client',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    const token =
      req.cookies.get("ghostboard_session")?.value ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, '');

    const user = token ? await getSessionUser(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to use Copilot.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "Your account has been suspended.", code: "ACCOUNT_SUSPENDED" },
        { status: 403 }
      );
    }

    const isPro = user.plan === 'pro' || user.plan === 'lifetime';
    const trialQuestionsUsed = user.trialQuestionsUsed || 0;

    if (!isPro && trialQuestionsUsed >= 5) {
      return NextResponse.json(
        { 
          error: "Trial limit reached (5 questions). Please upgrade to an Emergency Pass or Pro Plan.",
          code: "TRIAL_LIMIT_REACHED"
        },
        { status: 403 }
      );
    }

    const rateLimit = await checkRateLimit(req, 25, 60000, 'copilot_ai');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Ліміт запитів до ШІ перевищено. Зачекайте ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = CopilotPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      question,
      locale,
      outputLanguage,
      nativeLanguage,
      candidateProfile,
      history,
      refinement,
      existingQA,
      isConcise,
      triggerMode,
      sessionMode,
    } = parseResult.data;

    // Security & DoS prevention: enforce sane length limit
    const safeRawQuestion = question.trim().slice(0, 2500);
    const normalizedQuestion = normalizeTechnicalSpeech(safeRawQuestion);
    const heuristic = isolateTargetQuestionHeuristics(normalizedQuestion);
    
    // Language directive map for all 11 supported locales
    const LANG_DIRECTIVES: Record<string, string> = {
      uk: `OUTPUT LANGUAGE: STRICTLY UKRAINIAN (Українська мова).
      - ALWAYS formulate all answer fields ("startHook", "quickAnswer", "hints", "deliveryTip") strictly in NATURAL, CONVERSATIONAL UKRAINIAN.
      - NEVER output in Russian!
      - Keep standard English technical terms intact (e.g. FastAPI, PostgreSQL, Celery, Redis, SQL, Docker, REST).`,
      en: `OUTPUT LANGUAGE: STRICTLY ENGLISH (Natural, Clear Technical English at B2 level).
      - Formulate ALL answer fields strictly in CLEAR, NATURAL, CONVERSATIONAL TECHNICAL ENGLISH (B2 level).
      - Keep sentences direct, punchy, confident, and easy to speak during an interview.`,
      ru: `OUTPUT LANGUAGE: STRICTLY RUSSIAN (Русский язык).
      - Formulate ALL answer fields strictly in CLEAR, NATURAL, CONVERSATIONAL TECHNICAL RUSSIAN (B2 level).
      - Keep standard English technical terms intact (e.g. FastAPI, PostgreSQL, Celery, Redis, Docker, REST).`,
      pl: `OUTPUT LANGUAGE: STRICTLY POLISH (język polski).
      - Formulate ALL answer fields in natural, conversational Polish (B2 level). Keep English technical terms intact.`,
      de: `OUTPUT LANGUAGE: STRICTLY GERMAN (Deutsch).
      - Formulate ALL answer fields in natural, clear German (B2 level). Keep English technical terms intact.`,
      fr: `OUTPUT LANGUAGE: STRICTLY FRENCH (Français).
      - Formulate ALL answer fields in natural, clear French (B2 level). Keep English technical terms intact.`,
      es: `OUTPUT LANGUAGE: STRICTLY SPANISH (Español).
      - Formulate ALL answer fields in natural, clear Spanish (B2 level). Keep English technical terms intact.`,
      pt: `OUTPUT LANGUAGE: STRICTLY PORTUGUESE (Português).
      - Formulate ALL answer fields in natural, clear Portuguese (B2 level). Keep English technical terms intact.`,
      it: `OUTPUT LANGUAGE: STRICTLY ITALIAN (Italiano).
      - Formulate ALL answer fields in natural, clear Italian (B2 level). Keep English technical terms intact.`,
      cs: `OUTPUT LANGUAGE: STRICTLY CZECH (Čeština).
      - Formulate ALL answer fields in natural, clear Czech (B2 level). Keep English technical terms intact.`,
      nl: `OUTPUT LANGUAGE: STRICTLY DUTCH (Nederlands).
      - Formulate ALL answer fields in natural, clear Dutch (B2 level). Keep English technical terms intact.`,
    };

    // Determine effective output language
    let effectiveOutputLang = outputLanguage || 'uk';
    if (effectiveOutputLang === 'auto') {
      const detected = detectQuestionLanguage(normalizedQuestion, locale);
      effectiveOutputLang = detected;
    }

    let effectiveNativeLang = nativeLanguage || 'auto';
    if (effectiveNativeLang === 'auto') {
      effectiveNativeLang = effectiveOutputLang === 'en' ? 'uk' : effectiveOutputLang;
    }

    const languageDirective = LANG_DIRECTIVES[effectiveOutputLang] || LANG_DIRECTIVES['en'];
    const translationDirective = (effectiveNativeLang && effectiveNativeLang !== effectiveOutputLang)
      ? `\nBILINGUAL DUAL-STREAM CRIB-SHEET DIRECTIVE:
- Candidate's native language is "${effectiveNativeLang}", while the spoken interview answer must be in "${effectiveOutputLang}".
- In "nativeTranslation": provide an accurate, high-clarity 1-2 sentence translation or gist in ${effectiveNativeLang} so the candidate can instantly understand subtle technical nuances without mental strain.`
      : '';
    const isEn = effectiveOutputLang === 'en';
    const geminiApiKey = getCleanGeminiKey();

    const candidateRole = candidateProfile?.role?.trim() || 'Software Engineer';
    const candidateLevel = candidateProfile?.level || (candidateProfile?.age ? (candidateProfile.age >= 28 ? 'senior' : candidateProfile.age >= 23 ? 'middle' : 'junior') : 'middle');
    const techStackStr = Array.isArray(candidateProfile?.techStack) && candidateProfile.techStack.length > 0
      ? candidateProfile.techStack.join(', ')
      : 'TypeScript, JavaScript, React, Next.js, Node.js, Python, PostgreSQL, Docker, REST API, Git';
    const petProjectsStr = Array.isArray(candidateProfile?.petProjects) && candidateProfile.petProjects.length > 0
      ? candidateProfile.petProjects.map((p: any) => `- ${p.name}: ${p.description} (Key highlight: ${p.keyHighlight})`).join('\n')
      : '- Scalable Production Platform: Modern stack with automated CI/CD, database indexing, and clean service architecture';
    const customContextStr = candidateProfile?.customContext || 'Software Engineer with deep understanding of CS fundamentals, architecture patterns, performance optimization and production reliability.';
    
    const jobDescriptionStr = candidateProfile?.jobDescription || '';
    const cvContextStr = [candidateProfile?.cvContext, user?.resumeContext].filter(Boolean).join('\n\n');
    const customNuancesStr = (
      candidateProfile?.customNuances ||
      candidateProfile?.aiDirectives?.customNuances ||
      ''
    ).trim();
    const speakingStyleStr = (
      candidateProfile?.speakingStyle ||
      candidateProfile?.speakingStyleBrief ||
      ''
    ).trim();

    const aiDirectives = candidateProfile?.aiDirectives;
    let compiledAiDirectives = '';
    if (aiDirectives) {
      const dirParts: string[] = [];
      if (aiDirectives.responseLength === 'ultra-concise') dirParts.push('• LENGTH: ULTRA-CONCISE (1-2 sentences max).');
      else if (aiDirectives.responseLength === 'bullets') dirParts.push('• STRUCTURE: BULLET POINTS ONLY (3 structured bullets with bold keywords).');
      else if (aiDirectives.responseLength === 'structured') dirParts.push('• STRUCTURE: STRUCTURED & IN-DEPTH.');
      
      if (aiDirectives.toneOfVoice === 'authoritative') dirParts.push(`• TONE: AUTHORITATIVE ${candidateLevel.toUpperCase()} ARCHITECT.`);
      else if (aiDirectives.toneOfVoice === 'pragmatic') dirParts.push('• TONE: PRAGMATIC & DIRECT.');
      else if (aiDirectives.toneOfVoice === 'star') dirParts.push('• TONE: STAR METHOD (Situation, Task, Action, Result).');

      if (aiDirectives.engineeringFocus === 'architecture') dirParts.push('• FOCUS: SYSTEM ARCHITECTURE & BOTTLENECK MITIGATION.');
      else if (aiDirectives.engineeringFocus === 'clean_code') dirParts.push('• FOCUS: CLEAN CODE & ALGORITHMIC RIGOR.');
      else if (aiDirectives.engineeringFocus === 'business_impact') dirParts.push('• FOCUS: BUSINESS IMPACT & ROI.');

      if (Array.isArray(aiDirectives.guardrails)) {
        if (aiDirectives.guardrails.includes('no_fluff')) dirParts.push('• GUARDRAIL: ZERO FLUFF (No "Sure!", "Great question!", "Under the hood").');
        if (aiDirectives.guardrails.includes('challenge_weak')) dirParts.push('• GUARDRAIL: CHALLENGE WEAK ASSUMPTIONS.');
        if (aiDirectives.guardrails.includes('show_tradeoffs')) dirParts.push('• GUARDRAIL: ALWAYS MENTION PRODUCTION TRADE-OFFS.');
      }
      if (dirParts.length > 0) {
        compiledAiDirectives = `\nAI BEHAVIORAL DIRECTIVES & PERSONA TUNING:\n${dirParts.join('\n')}\n`;
      }
    }

    const userWishesDirective = customNuancesStr ? `
🚨 CRITICAL USER WISHES FOR ANSWER STYLE (TOP PRIORITY - STRICTLY FOLLOW WHAT THE USER WROTE):
The candidate specifically instructed:
"${customNuancesStr}"
Honor this instruction with maximum fidelity while maintaining authentic first-person delivery.
` : '';

    const speakingStyleDirective = speakingStyleStr ? `
CANDIDATE'S NATURAL SPEAKING STYLE & VOICE:
"${speakingStyleStr}"
` : '';

    let refinementDirective = '';
    if (refinement === 'under_the_hood') {
      refinementDirective = `
CRITICAL ADJUSTMENT - DEEP ARCHITECTURE & LOW-LEVEL MECHANICS:
- Explain internal mechanics directly: memory layout, runtime event loop / goroutines / JVM garbage collection, DB page buffers, B-Tree nodes, or concurrency locking.
- Start immediately with the core technical mechanism without preamble.`;
    } else if (refinement === 'code') {
      refinementDirective = `
CRITICAL ADJUSTMENT - "GIVE CODE" (ДАЙ КОД):
The interviewer asks for a practical code implementation!
- "codeSnippet": Must provide an elegant, production-grade code snippet (5-12 lines) demonstrating the solution in the candidate's primary programming language/stack (${candidateRole} / ${techStackStr}) with clean typing, error handling, and realistic parameters.
- "startHook": Introduce the implementation naturally in the OUTPUT LANGUAGE (a phrase meaning "Here is how this is implemented concisely in practice:").
- "hints": Highlight 3 key patterns in this code snippet.`;
    } else if (refinement === 'shorter' || isConcise) {
      refinementDirective = `
CRITICAL ADJUSTMENT - "ULTRA-CONCISE 3-BULLET MODE" (КОРОТШЕ / СТИСЛО):
The candidate needs an ultra-short, punchy response (1 punchline sentence + 3 crystal-clear bullet points with bold technical keywords) to answer in 5-10 seconds without rambling.
- "startHook": 1 direct, punchy sentence (max 10-15 words).
- "quickAnswer": 1 tight, crystal-clear sentence containing the direct answer.
- "hints": Exactly 3 crisp bullet points with **bold technical keywords**.`;
    } else if (refinement === 're_angle') {
      refinementDirective = `
CRITICAL ADJUSTMENT - "ALTERNATIVE ANGLE" (ІНШИЙ РАКУРС):
Re-frame the question from an alternative perspective!
- Focus on practical production trade-offs, architecture decisions, resilience, scaling, or another tool in candidate's stack (e.g. relational DB vs cache, sync vs async worker).
- "startHook": open with a phrase meaning "From a production-architecture and reliability standpoint..." in the OUTPUT LANGUAGE.`;
    }

    const previousQAContext = existingQA ? `
PREVIOUS ANSWER GIVEN (IMPROVE / ADJUST THIS):
- Previous Answer: "${existingQA.quickAnswer || existingQA.startHook || ''}"
- Previous Hints: ${JSON.stringify(existingQA.hints || [])}
` : '';

    const historyContext = Array.isArray(history) && history.length > 0
      ? `
RECENT CONVERSATION HISTORY (ACTIVE INTERVIEW SESSION):
${history
  .slice(-3)
  .map((h, i) => `Turn ${i + 1}:\n- Interviewer asked: "${h.question}"\n- Candidate answered: "${h.answer.slice(0, 300)}"`)
  .join('\n\n')}

CRITICAL DIRECTIVE ON FOLLOW-UP QUESTIONS:
If the current question is a follow-up or refers to previous topics (e.g. "А чому саме так?", "Які мінуси цього підходу?", "Як би ти це тестував?", "А якщо навантаження зросте?"):
- Directly contextualize your answer based on the tools, architectural decisions, and technologies discussed in the turns above.
- Do NOT answer vaguely or ask for clarification; maintain seamless continuity with the preceding discussion.
`
      : '';

    const personaDefinition = sessionMode === 'meeting'
      ? `You are an elite, world-class real-time AI assistant for a software engineer during a live team meeting, sprint planning, or architectural review.
The candidate works as a ${candidateLevel.toUpperCase()} ${candidateRole}. Your job is to help them answer technical questions seamlessly, report progress, and defend architectural decisions with supreme confidence.`
      : `You are an elite, world-class real-time technical interview copilot and coach.
The candidate is taking a high-stakes technical interview specifically for the target position: "${candidateRole}" at a ${candidateLevel.toUpperCase()} level.`;

    const systemPrompt = `${personaDefinition}

CANDIDATE'S TARGET VACANCY & ACTIVE PROFILE:
- Target Position / Vacancy: "${candidateRole}"
- Target Seniority Level: ${candidateLevel.toUpperCase()}
- Active Tech Stack: ${techStackStr}
- Actual Pet-Projects to reference:
${petProjectsStr}
- Background Highlights: ${customContextStr}
${jobDescriptionStr ? `- JOB DESCRIPTION (TARGET ROLE REQUIREMENTS): ${jobDescriptionStr}` : ''}
${cvContextStr ? `- CANDIDATE'S EXTENDED CV CONTEXT: ${cvContextStr}` : ''}
${compiledAiDirectives}
${userWishesDirective}
${speakingStyleDirective}

CRITICAL RULES FOR TARGET ROLE ALIGNMENT & AUTHENTICITY:
0. EXACT VACANCY ALIGNMENT: The candidate wrote "${candidateRole}" as their target vacancy. Every explanation, code sample, performance optimization, and architectural consideration MUST strictly match this target vacancy and their active tech stack (${techStackStr}).
1. SENIORITY CALIBRATION: Calibrate depth to a ${candidateLevel.toUpperCase()} level. Balance technical rigor with real production trade-offs, runtime mechanics, scale bottlenecks, and resilience patterns.
2. QUESTION INTENT-BASED STRUCTURING:
   - FOR THEORETICAL / CONCEPTUAL QUESTIONS ("що таке", "різниця між", "як працює", "what is", "difference between"):
     * "startHook": 1 crystal-clear, punchy sentence delivering the direct technical definition or core distinction immediately (e.g. "The fundamental difference lies in memory isolation: processes have separate virtual address spaces, while threads share the process heap.").
     * "quickAnswer": 1-2 authoritative sentences detailing runtime/engine mechanics and scale implications.
     * "hints": Exactly 3 bullet points with **bold technical keywords** covering (1) internal runtime mechanism, (2) production trade-offs/edge cases, (3) real-world scenario from ${techStackStr}.
   - FOR ARCHITECTURE / SYSTEM DESIGN QUESTIONS ("як спроектувати", "як масштабувати", "how to design", "how to scale"):
     * "startHook": Direct architectural decision (e.g. "For this workload I would choose an event-driven decoupled architecture using a distributed log...").
     * "hints": Focus on latency vs throughput, consistency models (CAP), partition resilience, and bottleneck mitigation.
   - FOR BEHAVIORAL / RESUME QUESTIONS ("розкажи про себе", "досвід", "сильні сторони", "tell about yourself", "biggest challenge"):
     * Natural, confident first-person narrative matching candidate role (${candidateRole}), background, and stack (STAR method: Situation, Task, Action, Result).
   - FOR ALGORITHM / CODING QUESTIONS:
     * Time & Space complexity ($O(N)$, $O(1)$) in "startHook", followed by idiomatic code in candidate's primary language.
3. AUTHENTIC ENGINEERING VOICE & CV INTEGRATION:
   - Weave the candidate's real tools (${techStackStr}), architectures, and CV context into the hints and trade-offs naturally without sounding like an AI assistant.
   - Speak with confident senior authority, avoiding textbook clichés or evasive preambles.
4. ZERO FILLER & INSTANT OPENING:
   - STRICTLY FORBIDDEN: Conversational filler such as "Sure!", "Great question!", "Basically...", "Under the hood...", "In essence...", "As you know...".
   - Start immediately with the core technical takeaway.
5. ${languageDirective}
${translationDirective}
6. SPOKEN TELEPROMPTER CADENCE:
   - Short, punchy, confident sentences that are easy to read aloud without stumbling.
   - Keep standard developer terms in English (event loop, connection pool, deadlock, middleware, async/await, hooks, ORM, indexes).
   - NEVER translate technical terms into awkward literal phrases.
${refinementDirective}
${previousQAContext}
${historyContext}
CONTINUOUS AUDIO TRANSCRIPT CAPTURED FROM INTERVIEWER:
"""${normalizedQuestion}"""
${heuristic.contextPreamble ? `\nPREVIOUS CONTEXT / REMARKS DETECTED (DO NOT ANSWER THIS PREVIOUS TOPIC):\n"${heuristic.contextPreamble}"` : ''}
${heuristic.hasTransitionMarker ? `\nDETECTED ACTIVE TARGET QUESTION:\n"${heuristic.isolatedQuestion}"` : ''}
${triggerMode === 'enter' ? '\nNOTE: The candidate triggered this response on-demand by pressing [Enter] at the conclusion of the interviewer\'s thought. Focus with laser precision on the active question asked at the end of the thought.' : ''}

🚨 CRITICAL DIRECTIVE: TARGET QUESTION EXTRACTION & RELEVANCE ISOLATION:
1. The transcript above represents continuous speech captured up to the candidate pressing [Enter] (or after an interviewer speech pause).
2. Distinguish the actual target question from previous remarks, filler, or preamble.
3. In the "question" output field: Return the CLEAN, PROFESSIONALLY FORMULATED, SPECIFIC TARGET QUESTION.
4. "quickAnswer", "startHook", and "hints" MUST ANSWER THIS TARGET QUESTION DIRECTLY.
5. For behavioral or self-introductory questions ("розкажи про себе", "досвід", "сильні сторони"): Formulate a strong, natural, authentic developer pitch matching the candidate's background, core role (${candidateRole}), stack (${techStackStr}), and competitive strengths.
6. For technical questions: Give personal lived experience, concrete architectural decisions, and trade-offs.
7. "startHook": Direct, confident spoken opening sentence for the candidate to say aloud immediately (10-18 words maximum, zero conversational filler, straight into the core mechanism).
8. "quickAnswer": 1-2 tight, authoritative sentences containing the direct answer and core architecture decision.
9. "hints": Exactly 3 realistic, practical bullet points with **bold technical keywords**, edge cases, and real-life production trade-offs.
10. "codeSnippet":
   - ONLY provide code if the question is an algorithmic problem, coding question, or explicitly asks for code/syntax implementation.
   - For behavioral questions, self-introductions, architecture overviews: STRICTLY SET "codeSnippet": null. DO NOT invent dummy code!
11. "deliveryTip": Friendly, practical tip for delivering this answer smoothly.
12. "tag": Domain tag matching the topic (e.g. "#Frontend", "#Backend", "#Go", "#DevOps", "#Architecture", "#Database").
13. "confidenceScore": Calculate a score from 0-100 indicating your confidence. Give <80 if the question is ambiguous or requires subjective architectural trade-offs.
14. "docReference": Optional short URL or documentation reference if citing specific API behavior.

Return ONLY valid JSON matching this schema:
{
  "question": "Cleaned up version of the question",
  "startHook": "Direct spoken response",
  "quickAnswer": "Direct, concise, high-value developer answer",
  "nativeTranslation": null,
  "hints": ["Point 1", "Point 2", "Point 3"],
  "codeSnippet": null,
  "deliveryTip": "Practical coaching tip",
  "tag": "#Tag",
  "confidenceScore": 95,
  "docReference": null
} `;

    const isIntroQuestion = /про себе|досвід|розкажи про|сильн.*сторон|хто ти|вас звати|резюме|tell.*about yourself|introduce yourself|your background|strengths/i.test(normalizedQuestion);

    if (geminiApiKey) {
      try {
        const wantsCode = refinement === 'code';
        const responseSchema = {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            startHook: { type: 'STRING' },
            quickAnswer: { type: 'STRING' },
            nativeTranslation: { type: 'STRING' },
            hints: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            codeSnippet: { type: 'STRING' },
            deliveryTip: { type: 'STRING' },
            tag: { type: 'STRING' },
            confidenceScore: { type: 'NUMBER' },
            docReference: { type: 'STRING' },
          },
          required: ['question', 'startHook', 'quickAnswer', 'hints', 'tag', 'confidenceScore'],
        };

        const result = await callGeminiWithFallback({
          models: FLASH_MODELS,
          contents: [{ parts: [{ text: systemPrompt }] }],
          timeoutMs: 8000,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
            maxOutputTokens: wantsCode ? 950 : 520,
          },
        });

        if (result.ok && result.text) {
          // Tolerate ```json fences or stray text around the JSON object
          const rawText = result.text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/gi, '').trim();
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
          if (!parsed?.quickAnswer && !parsed?.startHook) {
            throw new Error('Gemini returned empty answer');
          }
          // Never output code snippets for self-introduction / behavioral questions
          const effectiveCodeSnippet = isIntroQuestion ? undefined : (parsed.codeSnippet || undefined);

          // Do not block the response on the DB write
          incrementUserTrialQuestions(user.id)?.catch?.((e: unknown) =>
            console.warn('Trial counter update failed:', e)
          );

          const resolvedQA = {
            id: `qa_${Date.now()}`,
            question: parsed.question || heuristic.isolatedQuestion || question,
            startHook: parsed.startHook || parsed.quickAnswer,
            quickAnswer: parsed.quickAnswer || parsed.startHook,
            nativeTranslation: parsed.nativeTranslation || undefined,
            hints: Array.isArray(parsed.hints) ? parsed.hints : [],
            codeSnippet: effectiveCodeSnippet,
            deliveryTip: parsed.deliveryTip || undefined,
            tag: parsed.tag || (isIntroQuestion ? '#Introduction' : '#TechnicalInterview'),
            confidenceScore: parsed.confidenceScore ?? 95,
            docReference: parsed.docReference || undefined,
          };

          // Synchronize to the user's multi-device room; a sync failure must never break the answer
          try {
            interviewSyncStore.addOrUpdateQA(resolvedQA, resolvedQA.id, user.id);
          } catch (syncErr) {
            console.warn('Interview sync failed:', syncErr);
          }

          return NextResponse.json({
            success: true,
            ...resolvedQA,
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini Copilot generation failed, serving fallback:', geminiErr);
      }
    }

    // Helper for stack-aware fallback code
    const getDynamicFallbackCode = (role: string, stack: string): string => {
      const combined = `${role} ${stack}`.toLowerCase();
      if (combined.includes('go') || combined.includes('golang')) {
        return `func ProcessConcurrent(ctx context.Context, items []string, limit int) error {\n    sem := make(chan struct{}, limit)\n    for _, item := range items {\n        sem <- struct{}{}\n        go func(val string) {\n            defer func() { <-sem }()\n            // Process item with ctx check\n        }(item)\n    }\n    return nil\n}`;
      }
      if (combined.includes('java') || combined.includes('spring')) {
        return `@Service\npublic class TaskProcessor {\n    private final ExecutorService executor = Executors.newFixedThreadPool(5);\n    public CompletableFuture<Void> processAsync(List<String> items) {\n        return CompletableFuture.runAsync(() -> items.forEach(this::handle), executor);\n    }\n}`;
      }
      if (combined.includes('c#') || combined.includes('.net') || combined.includes('dotnet')) {
        return `public async Task ProcessItemsAsync(IEnumerable<string> items, CancellationToken ct = default)\n{\n    using var semaphore = new SemaphoreSlim(5);\n    var tasks = items.Select(async item => {\n        await semaphore.WaitAsync(ct);\n        try { await HandleItemAsync(item, ct); }\n        finally { semaphore.Release(); }\n    });\n    await Task.WhenAll(tasks);\n}`;
      }
      if (combined.includes('react') || combined.includes('frontend') || combined.includes('node') || combined.includes('typescript') || combined.includes('javascript') || combined.includes('vue') || combined.includes('angular')) {
        return `export async function processConcurrent<T>(items: T[], limit = 5): Promise<void> {\n  const queue = [...items];\n  const workers = Array.from({ length: limit }, async () => {\n    while (queue.length > 0) {\n      const item = queue.shift();\n      if (item) await handleItem(item);\n    }\n  });\n  await Promise.all(workers);\n}`;
      }
      if (combined.includes('ios') || combined.includes('swift')) {
        return `func processConcurrently(items: [Item]) async throws {\n    try await withThrowingTaskGroup(of: Void.self) { group in\n        for item in items {\n            group.addTask { try await handle(item) }\n        }\n    }\n}`;
      }
      if (combined.includes('android') || combined.includes('kotlin')) {
        return `suspend fun processItems(items: List<Item>, dispatcher: CoroutineDispatcher = Dispatchers.IO) = withContext(dispatcher) {\n    items.map { item -> async { handleItem(item) } }.awaitAll()\n}`;
      }
      return `async def process_concurrent(items: list, limit: int = 5) -> None:\n    semaphore = asyncio.Semaphore(limit)\n    async def worker(item):\n        async with semaphore:\n            await handle_item(item)\n    await asyncio.gather(*(worker(i) for i in items))`;
    };

    // Context-aware fallback if Gemini is unreachable or rate-limited
    if (isIntroQuestion) {
      return NextResponse.json({
        success: true,
        question: normalizedQuestion,
        startHook: isEn
          ? `I am a ${candidateRole} focused on high-performance architecture, clean code, and reliable systems.`
          : `Мене звати розробник на позицію ${candidateRole}. Мій фокус — чиста архітектура, висока надійність та практичний результат.`,
        quickAnswer: isEn
          ? `My core stack includes ${techStackStr}. My key strength is solid computer science fundamentals, fast debugging, and production-tested engineering practices.`
          : `Мій основний стек — ${techStackStr}. Моя найсильніша сторона — глибоке розуміння архітектури, уникнення вузьких місць і проектування надійних масштабованих рішень.`,
        hints: isEn
          ? [
              `Solid CS foundation and hands-on experience in ${candidateRole}`,
              `Core stack: ${techStackStr.split(',').slice(0, 5).join(', ')}`,
              'Proven track record in solving real production and architecture bottlenecks',
            ]
          : [
              `Міцна інженерна база та практичний досвід у ролі ${candidateRole}`,
              `Практичний стек: ${techStackStr.split(',').slice(0, 5).join(', ')}`,
              'Сильна сторона: проектування чистої архітектури, уникнення bottle-neck та надійність',
            ],
        codeSnippet: undefined,
        deliveryTip: isEn
          ? 'Speak with confidence, keep a steady pace, and focus on the business impact of your technical decisions.'
          : 'Говори спокійно та впевнено, роби акцент на практичних результатах та чистоті архітектури.',
        tag: '#Introduction',
        confidenceScore: 98,
      });
    }

    // General technical fallback
    let fallbackHook = isEn
      ? 'The architecture relies on asynchronous event scheduling, decoupling, and resource isolation.'
      : 'Архітектура базується на подієвій моделі, розвʼязці компонентів та ізоляції ресурсів.';
    let fallbackCode: string | undefined = undefined;

    if (refinement === 'under_the_hood') {
      fallbackHook = isEn
        ? 'The underlying mechanism operates on memory allocation, event scheduling, and non-blocking I/O.'
        : 'Механізм працює на рівні виділення памʼяті, планувальника подій та неблокуючого вводу-виводу.';
    } else if (refinement === 'code') {
      fallbackHook = isEn
        ? `Here is how to implement this cleanly in ${candidateRole}:`
        : `Ось як виглядає чиста реалізація для ${candidateRole}:`;
      fallbackCode = getDynamicFallbackCode(candidateRole, techStackStr);
    } else if (refinement === 'shorter') {
      fallbackHook = isEn
        ? 'In short: modular abstraction, non-blocking execution, and predictable state transitions.'
        : 'Головна суть: модульна абстракція, неблокуюче виконання та передбачуваність стану.';
    } else if (refinement === 're_angle') {
      fallbackHook = isEn
        ? 'From a production reliability viewpoint, fault isolation and resource cleanup are key.'
        : 'З точки зору продакшн-відмовостійкості ключовим є ізоляція помилок та очищення ресурсів.';
    }

    return NextResponse.json({
      success: true,
      question: normalizedQuestion,
      startHook: fallbackHook,
      quickAnswer: isEn
        ? `The solution is built on state abstraction and event handling, ensuring clean separation of concerns.`
        : `Рішення базується на абстракції стану та неблокуючій обробці подій із чітким розділенням відповідальності.`,
      hints: isEn
        ? [
            'Explain the lifecycle and memory implications (Heap / Stack)',
            'Highlight performance trade-offs (O(1) vs O(N)) and indexing/caching',
            `Reference a hands-on case from your ${candidateRole} experience`,
          ]
        : [
            'Поясни життєвий цикл та як це впливає на пам’ять (Heap / Stack)',
            'Згадай про продуктивність (O(1) vs O(N)) та оптимізацію',
            `Наведи практичний приклад зі свого досвіду як ${candidateRole}`,
          ],
      codeSnippet: fallbackCode,
      deliveryTip: !isEn
        ? 'Говори спокійно та впевнено, відповідай чітко по суті питання.'
        : 'Speak with confidence and answer directly on point.',
      tag: '#TechnicalInterview',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
