import { getSessionUser, incrementUserTrialQuestions } from '@/lib/serverDb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGeminiWithFallback, FLASH_MODELS, getCleanGeminiKey } from '@/lib/geminiApi';
import { normalizeTechnicalSpeech, detectQuestionLanguage, isolateTargetQuestionHeuristics } from '@/lib/techSpeechNormalizer';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';

const CopilotPayloadSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(3000, 'Question exceeds maximum length'),
  locale: z.string().optional().default('auto'),
  outputLanguage: z.enum(['uk', 'en', 'pl', 'de', 'fr', 'es', 'pt', 'it', 'cs', 'nl', 'auto']).optional().default('uk'),
  candidateProfile: z.any().optional(),
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

    const token = req.cookies.get("ghostboard_session")?.value;
    const user = token ? await getSessionUser(token) : null;
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please login to use Copilot." },
        { status: 401 }
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
      candidateProfile,
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
    
    // Language directive map for all 10 supported locales
    const LANG_DIRECTIVES: Record<string, string> = {
      uk: `OUTPUT LANGUAGE: STRICTLY UKRAINIAN (Українська мова).
      - ALWAYS formulate all answer fields ("startHook", "quickAnswer", "hints", "deliveryTip") strictly in NATURAL, CONVERSATIONAL UKRAINIAN.
      - NEVER output in Russian!
      - Keep standard English technical terms intact (e.g. FastAPI, PostgreSQL, Celery, Redis, SQL, Docker, REST).`,
      en: `OUTPUT LANGUAGE: STRICTLY ENGLISH (Natural, Clear Technical English at B2 level).
      - Formulate ALL answer fields strictly in CLEAR, NATURAL, CONVERSATIONAL TECHNICAL ENGLISH (B2 level).
      - Keep sentences direct, punchy, confident, and easy to speak during an interview.`,
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

    const languageDirective = LANG_DIRECTIVES[effectiveOutputLang] || LANG_DIRECTIVES['en'];
    const isEn = effectiveOutputLang === 'en';
    const geminiApiKey = getCleanGeminiKey();

    const candidateAge = candidateProfile?.age || 18;
    const candidateRole = candidateProfile?.role || 'Full-Stack Software Engineer';
    const techStackStr = Array.isArray(candidateProfile?.techStack) && candidateProfile.techStack.length > 0
      ? candidateProfile.techStack.join(', ')
      : 'TypeScript, JavaScript, React, Next.js, Node.js, Python, PostgreSQL, Docker, REST API, Git';
    const petProjectsStr = Array.isArray(candidateProfile?.petProjects) && candidateProfile.petProjects.length > 0
      ? candidateProfile.petProjects.map((p: any) => `- ${p.name}: ${p.description} (Ключовий кейс: ${p.keyHighlight})`).join('\n')
      : '- Scalable Production Platform: Modern stack with automated CI/CD, database indexing, and clean service architecture';
    const customContextStr = candidateProfile?.customContext || 'Software Engineer з глибоким розумінням CS фундаментів, архітектурних патернів, оптимізації продуктивності та надійності в продакшні.';
    
    const jobDescriptionStr = candidateProfile?.jobDescription || '';
    const cvContextStr = [candidateProfile?.cvContext, user?.resumeContext].filter(Boolean).join('\n\n');

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
- "startHook": Introduce the implementation naturally in the requested language (e.g. "Ось як це лаконічно реалізується на практиці:").
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
- "startHook": "З точки зору продакшн-архітектури та надійності..."`;
    }

    const previousQAContext = existingQA ? `
PREVIOUS ANSWER GIVEN (IMPROVE / ADJUST THIS):
- Previous Answer: "${existingQA.quickAnswer || existingQA.startHook || ''}"
- Previous Hints: ${JSON.stringify(existingQA.hints || [])}
` : '';

    const personaDefinition = sessionMode === 'meeting'
      ? `You are a world-class real-time AI assistant for a software engineer during a live Daily Standup, sprint planning, or architectural meeting.
The user is a ${candidateAge}-year-old developer employed as a ${candidateRole}. Your job is to help them answer technical questions from their Team Lead, PM, or peers seamlessly, report progress, and defend architectural decisions.`
      : `You are a world-class real-time technical interview copilot and coach.
The user is a talented, ambitious ${candidateAge}-year-old developer taking a high-stakes software engineering interview.`;

    const systemPrompt = `${personaDefinition}

CANDIDATE'S ACTUAL PROFILE & TECH STACK:
- Age: ${candidateAge} years old.
- Target Role: ${candidateRole}.
- Real Tech Stack: ${techStackStr}.
- Actual Pet-Projects to reference:
${petProjectsStr}
- Background Highlights: ${customContextStr}
${jobDescriptionStr ? `- JOB DESCRIPTION (TARGET ROLE REQUIREMENTS): ${jobDescriptionStr}` : ''}
${cvContextStr ? `- CANDIDATE'S EXTENDED CV CONTEXT: ${cvContextStr}` : ''}

CRITICAL RULES FOR AUTHENTICITY:
${jobDescriptionStr || cvContextStr ? '0. MATCH JOB REQUIREMENTS: Explicitly align your answers with the provided Job Description. If the candidate\'s CV Context or Pet Projects match the requirements, seamlessly weave their past experience into the answer to prove they are the perfect fit.' : ''}
1. DO NOT pretend to have "10 years of legacy enterprise experience". Instead, formulate answers from the perspective of an extraordinarily sharp ${candidateAge}-year-old who understands deep core computer science fundamentals, internal runtime mechanics, modern architecture, pet-projects, production best practices, and clean code.
2. ORGANIC PET-PROJECT INJECTION: Whenever relevant, naturally reference one of the candidate's real pet-projects or stack tools (e.g. "У моєму проєкті на ${candidateRole} я якраз вирішував схожу проблему...").
3. ${languageDirective}
4. NATURAL TECHNICAL CODE-SWITCHING:
   - When formulating in Ukrainian or other languages, KEEP standard developer terms in clean English or established developer parlance (e.g. "event loop", "connection pool", "deadlock", "middleware", "async/await", "hooks", "goroutines", "ORM", "indexes").
   - NEVER awkwardly translate technical terms into unnatural literal phrases. Speak the way real modern software engineers talk in meetings.
${refinementDirective}
${previousQAContext}
CONTINUOUS AUDIO TRANSCRIPT CAPTURED FROM INTERVIEWER:
"""${normalizedQuestion}"""
${heuristic.contextPreamble ? `\nPREVIOUS CONTEXT / REMARKS DETECTED (DO NOT ANSWER THIS PREVIOUS TOPIC):\n"${heuristic.contextPreamble}"` : ''}
${heuristic.hasTransitionMarker ? `\nDETECTED ACTIVE TARGET QUESTION:\n"${heuristic.isolatedQuestion}"` : ''}
${triggerMode === 'enter' ? '\nNOTE: The candidate triggered this response on-demand by pressing [Enter] at the conclusion of the interviewer\'s thought. Focus with laser precision on the active question asked at the end of the thought.' : ''}

🚨 CRITICAL DIRECTIVE: TARGET QUESTION EXTRACTION & RELEVANCE ISOLATION:
1. The transcript above represents continuous speech captured up to the candidate pressing [Enter] (or after an interviewer speech pause).
2. It often contains:
   - Remarks or feedback on the PREVIOUS answer (e.g. "Дякую за відповідь, зрозуміло...", "Great answer on that topic...").
   - Conversational filler / transition phrases (e.g. "Так, добре...", "Moving on...", "Рухаємось далі", "Let's see...").
   - Scenario context / preamble (e.g. "У нас високе навантаження на систему...").
   - THE ACTUAL NEW QUESTION asked at the end of the thought!
3. MANDATORY EXTRACTION RULES:
   - ACCURATELY ISOLATE THE TARGET QUESTION: Distinguish the actual question from previous conversational context or feedback!
   - STRICTLY FORBIDDEN: DO NOT answer the previous topic mentioned in passing!
   - In the "question" output field: Return the CLEAN, PROFESSIONALLY FORMULATED, SPECIFIC TARGET QUESTION.
   - "quickAnswer", "startHook", and "hints" MUST ANSWER THIS TARGET QUESTION DIRECTLY.
   - For behavioral or self-introductory questions ("розкажи про себе", "досвід", "сильні сторони"): Formulate a strong, natural, authentic developer pitch matching the candidate's background, core role (${candidateRole}), stack (${techStackStr}), and competitive strengths.
   - For technical questions: Give direct technical definition, mechanism, or architectural decision in their stack.
   - STRICTLY FORBIDDEN CLICHÉS: NEVER start answers with "Під капотом...", "Якщо глянути під капот...", "Якщо заглянути під капот...", "Взагалі тут суть у тому...", "Тобто замість того щоб...", "Under the hood...", "Basically...", "In essence...".
   - ANSWER DIRECTLY ON POINT (ТІЛЬКИ ПО ТЕМІ): The very first sentence must give the direct technical definition or pitch.
   - High technical density: 2-3 tight, confident, concrete sentences (algorithms, data structures, complexity, concrete tools).
   - Natural spoken tone of a senior developer explaining a concept to a peer, without academic stiffness and zero empty water.
3. "startHook": Direct spoken opening sentence for the candidate to say aloud immediately.
4. "hints": 3 realistic, practical bullet points with **bold technical keywords**, edge cases, and real-life production nuances.
5. "codeSnippet":
   - ONLY provide code if the question is an algorithmic problem, coding question, or explicitly asks for code/syntax implementation (e.g. "як реалізувати...", "напиши функцію", "як виглядає запит").
   - For behavioral questions, self-introductions ("розкажи про себе"), architecture overviews, soft skills, or experience questions: STRICTLY SET "codeSnippet": null. DO NOT invent dummy code!
6. "deliveryTip": Friendly, practical tip for delivering this answer smoothly.
7. "tag": Domain tag matching the topic (e.g. "#Frontend", "#Backend", "#Go", "#DevOps", "#Architecture", "#Database").
8. "confidenceScore": Calculate a score from 0-100 indicating your confidence. Give <80 if the question is ambiguous or requires subjective architectural trade-offs.
9. "docReference": Optional short URL or documentation reference if citing specific API behavior.

Return ONLY valid JSON matching this schema:
{
  "question": "Cleaned up version of the question",
  "startHook": "Direct spoken response",
  "quickAnswer": "Direct, concise, high-value developer answer",
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
        const result = await callGeminiWithFallback({
          models: FLASH_MODELS,
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.35,
          },
        });

        if (result.ok && result.text) {
          const parsed = JSON.parse(result.text);
          // Never output code snippets for self-introduction / behavioral questions
          const effectiveCodeSnippet = isIntroQuestion ? undefined : (parsed.codeSnippet || undefined);

          if (user) {
            await incrementUserTrialQuestions(user.id);
          }

          return NextResponse.json({
            success: true,
            question: parsed.question || heuristic.isolatedQuestion || question,
            startHook: parsed.startHook || parsed.quickAnswer,
            quickAnswer: parsed.quickAnswer,
            hints: parsed.hints || [],
            codeSnippet: effectiveCodeSnippet,
            deliveryTip: parsed.deliveryTip || undefined,
            tag: parsed.tag || (isIntroQuestion ? '#Introduction' : '#TechnicalInterview'),
            confidenceScore: parsed.confidenceScore ?? 95,
            docReference: parsed.docReference || undefined,
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
