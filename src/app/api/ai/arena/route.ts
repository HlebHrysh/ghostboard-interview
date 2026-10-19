import { NextRequest, NextResponse } from 'next/server';
import { callGeminiWithFallback, FLASH_MODELS } from '@/lib/geminiApi';
import { checkRateLimit } from '@/lib/rateLimit';
import { makeSessionPublic } from '@/lib/serverDb';

const TRACK_PROFILES: Record<string, { title: string; skills: string }> = {
  frontend: {
    title: 'Frontend Core',
    skills: 'React 19, Next.js App Router, TypeScript, Performance & Web Vitals, CSS Grid / Tailwind, State Management',
  },
  backend: {
    title: 'Backend Engineering',
    skills: 'Node.js / Go, PostgreSQL transactions & locking, Redis caching & invalidation, API security (JWT, rate-limiting, CORS)',
  },
  system_design: {
    title: 'System Design & Architecture',
    skills: 'Microservices architecture, database sharding & replication, message queues (Kafka, RabbitMQ), high availability, horizontal scaling',
  },
  fullstack: {
    title: 'Fullstack Systems',
    skills: 'Next.js App Router, React 19, Node.js / Python, Prisma / Postgres, REST & GraphQL, Auth & Security, Cloud Deployment',
  },
  devops: {
    title: 'DevOps & Cloud Platform',
    skills: 'Kubernetes, Docker, Terraform, CI/CD pipelines, AWS/GCP, Prometheus/Grafana observability, zero-downtime deployments',
  },
  mobile: {
    title: 'Mobile Architecture',
    skills: 'React Native / Flutter / Swift, state synchronization, offline storage, memory management, bridge optimization, App Store releases',
  },
};

const LANG_DIRECTIVES: Record<string, string> = {
  ua: 'Ukrainian (Українською мовою). Всі запитання, складності, теми, контекстні підказки, вердикти та пояснення формулюй українською мовою. Загальноприйняті технічні терміни, назви бібліотек та коду залишай англійською.',
  uk: 'Ukrainian (Українською мовою). Всі запитання, складності, теми, контекстні підказки, вердикти та пояснення формулюй українською мовою. Загальноприйняті технічні терміни, назви бібліотек та коду залишай англійською.',
  en: 'English. All questions, difficulties, topics, context hints, verdicts, strengths, missing concepts, and ideal answers must be strictly in clear, natural Technical English at B2/C1 level.',
  pl: 'Polish (Język polski). Wszystkie pytania, poziom trudności, tematy, wskazówki kontekstowe, werdykty i idealne odpowiedzi muszą być w języku polskim.',
  de: 'German (Deutsch). Alle Fragen, Schwierigkeiten, Themen, Kontexthinweise, Urteile und Musterantworten müssen auf Deutsch sein.',
  fr: 'French (Français). Toutes les questions, difficultés, sujets, indices de contexte, verdicts et réponses modèles doivent être en français.',
  es: 'Spanish (Español). Todas las preguntas, niveles de dificultad, temas, pistas de contexto, veredictos y respuestas modelo deben ser en español.',
  pt: 'Portuguese (Português). Todas as perguntas, níveis de dificuldade, tópicos, dicas de contexto, veredictos e respostas ideais devem ser em português.',
  it: 'Italian (Italiano). Tutte le domande, i livelli di difficoltà, gli argomenti, i suggerimenti di contesto, i verdetti e le risposte modello devono essere in italiano.',
  cs: 'Czech (Čeština). Všechny otázky, obtížnosti, témata, nápovědy ke kontextu, verdikty a vzorové odpovědi musí být v češtině.',
  nl: 'Dutch (Nederlands). Alle vragen, moeilijkheidsgraden, onderwerpen, contexthints, oordelen en modelantwoorden moeten in het Nederlands zijn.',
};

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 20, 60000, 'arena_session');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Забагато запитів. Будь ласка, зачекайте хвилину.' }, { status: 429 });
    }

    const token =
      req.cookies.get('ghostboard_session')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const { getSessionUser } = await import('@/lib/serverDb');
    const user = token ? await getSessionUser(token) : null;

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to enter Ghostboard Arena.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, language = 'uk' } = body;
    const targetDirective = LANG_DIRECTIVES[language] || LANG_DIRECTIVES['en'];

    // ── 0. GENERATE ARENA FROM JOB VACANCY TEXT ──────────────────────────────
    if (action === 'GENERATE_FROM_VACANCY') {
      const { vacancyText = '', candidateName = 'Developer', level = 'Senior' } = body;
      if (!vacancyText.trim()) {
        return NextResponse.json({ error: 'Текст вакансії порожній.' }, { status: 400 });
      }

      const prompt = `You are an elite Principal Technical Recruiter & FAANG Staff Engineer designing a targeted technical interview arena for this job vacancy.

JOB VACANCY TEXT:
"""
${vacancyText.slice(0, 3500)}
"""

Candidate: ${candidateName}
Target Seniority Level: ${level}

LANGUAGE DIRECTIVE (CRITICAL - FOLLOW STRICTLY):
${targetDirective}

TASK:
1. Extract key vacancy profile:
   - roleTitle: concise standard job title (e.g. "Senior Go Highload Engineer", "Lead Frontend Architect", "Staff AI Platform Engineer")
   - seniority: detected or target level ("Junior" | "Middle" | "Senior" | "Staff / Lead")
   - techStack: 4-7 key technologies / tools extracted from the vacancy text
   - domain: company domain / industry (e.g. "Fintech & Payments", "B2B SaaS High-Load", "E-commerce & Streaming")
   - focusAreas: 3 key engineering challenges or focus areas for this role
   - interviewerTitle: persona title for the interviewer (e.g. "Principal Platform Architect", "VP of Engineering")
   - summary: 1-2 sentence compelling summary in the target language explaining why this arena is calibrated for this job.

2. Generate exactly 6 questions strictly tailored to this vacancy:
   - Questions 1-5: Sharp, practical blitz questions testing the exact technologies, pitfalls, performance bottlenecks, and edge cases mentioned in the vacancy.
   - Question 6: A realistic production-scale Architecture / System Design case study directly based on the business domain and scale of this vacancy.

Return ONLY a valid JSON object matching this schema:
{
  "vacancyProfile": {
    "roleTitle": "Senior Go Highload Engineer",
    "seniority": "Senior",
    "techStack": ["Go", "PostgreSQL", "Kafka", "Redis", "gRPC"],
    "domain": "Fintech & Highload Payments",
    "focusAreas": ["Idempotency & Race Conditions", "Sub-10ms Latency", "Database Partitioning"],
    "interviewerTitle": "Lead Core Architect",
    "summary": "Арена сфокусована на високопродуктивному бекенді..."
  },
  "questions": [
    {
      "id": "q1",
      "index": 1,
      "topic": "Concise topic in target language",
      "difficulty": "Medium or Hard in target language",
      "question": "Full question text in target language",
      "isArchitectureCase": false,
      "contextHint": "Engineering hint in target language"
    },
    ...
    {
      "id": "q6",
      "index": 6,
      "topic": "Architecture Case in target language",
      "difficulty": "Staff / Architecture in target language",
      "question": "Full complex architectural case in target language",
      "isArchitectureCase": true,
      "contextHint": "Design guidance in target language"
    }
  ]
}`;

      const res = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
      });

      if (res.ok && res.text) {
        let jsonStr = res.text.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '');
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/\s*```$/, '');
        return NextResponse.json(JSON.parse(jsonStr));
      }
      throw new Error('Не вдалося сгенерувати арену по вакансії через Gemini.');
    }

    // ── 1. START ARENA: Generate 5 blitz questions + 1 architectural case ────
    if (action === 'START_ARENA') {
      const { track = 'frontend', level = 'Senior', candidateName = 'Developer' } = body;
      const profile = TRACK_PROFILES[track] || TRACK_PROFILES.frontend;

      const prompt = `You are a demanding Staff Engineer at a top FAANG company conducting a technical assessment in "Ghostboard Arena".
Track: ${profile.title} (${profile.skills})
Candidate Seniority Level: ${level}
Candidate: ${candidateName}

LANGUAGE DIRECTIVE (CRITICAL - FOLLOW STRICTLY):
${targetDirective}

Generate exactly 6 questions:
- Questions 1-5: sharp, practical blitz questions with deep engineering substance (no trivial questions like "what is a class").
- Question 6: comprehensive practical System Design / Architecture trade-off case study at production scale.

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "id": "q1",
      "index": 1,
      "topic": "Concise topic in the target language",
      "difficulty": "Medium / Hard in the target language",
      "question": "Full question text in the target language",
      "isArchitectureCase": false,
      "contextHint": "Short hint on what key engineering points to touch upon in target language"
    },
    ...
    {
      "id": "q6",
      "index": 6,
      "topic": "Architecture Case in target language",
      "difficulty": "Staff / Architecture in target language",
      "question": "Full complex architectural case in target language",
      "isArchitectureCase": true,
      "contextHint": "Design guidance regarding high availability and load in target language"
    }
  ]
}`;

      const res = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      });

      if (res.ok && res.text) {
        let jsonStr = res.text.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '');
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/\s*```$/, '');
        return NextResponse.json(JSON.parse(jsonStr));
      }
      throw new Error('Не вдалося згенерувати запитання арени через Gemini.');
    }

    // ── 2. EVALUATE ANSWER: Score across 5 dimensions ───────────────────────
    if (action === 'EVALUATE_ANSWER') {
      const {
        question,
        candidateAnswer,
        answerTimeSec = 30,
        track = 'frontend',
        level = 'Senior',
        isArchitectureCase = false,
        vacancyProfile = null,
      } = body;

      const profile = TRACK_PROFILES[track] || TRACK_PROFILES.frontend;
      const targetRoleTitle = vacancyProfile?.roleTitle || profile.title;
      const targetSkills = vacancyProfile?.techStack?.join(', ') || profile.skills;

      // Base speed calculation
      let calculatedSpeed = 85;
      if (answerTimeSec < 20) calculatedSpeed = 95;
      else if (answerTimeSec < 45) calculatedSpeed = 90;
      else if (answerTimeSec < 75) calculatedSpeed = 82;
      else if (answerTimeSec < 120) calculatedSpeed = 74;
      else calculatedSpeed = 62;

      const prompt = `You are a demanding Staff Engineer at a top tech company evaluating a candidate's answer for role: "${targetRoleTitle}" (${vacancyProfile?.seniority || level}).
Required Skills & Tech: ${targetSkills}
${vacancyProfile?.domain ? `Business Domain: ${vacancyProfile.domain}` : ''}

Question asked: "${question}"
Candidate Answer: "${candidateAnswer || '(Candidate was silent or provided an empty response)'}"
Answer duration: ${answerTimeSec} seconds
Is architectural case: ${isArchitectureCase ? 'YES' : 'NO'}

LANGUAGE DIRECTIVE (CRITICAL - YOU MUST FOLLOW THIS STRICTLY):
${targetDirective}
(Write verdict, strengths, missingKeyConcepts, and staffEngineerAnswer strictly in the target language).

Objectively evaluate the answer across 5 dimensions (score 10 to 100):
1. technicalAccuracy (Technical accuracy, absence of errors or falsehoods)
2. architecturalVision (Grasp of scale, trade-offs, design patterns)
3. communication (Clarity, structural thought, no fluff)
4. stressResilience (Confidence, problem solving demeanor)
5. thinkingSpeed (Evaluate pace: proposed base score ${calculatedSpeed})

Return ONLY valid JSON:
{
  "score": 88,
  "verdict": "Verdict in target language (e.g. Excellent / Good / Needs Improvement)",
  "scores": {
    "technicalAccuracy": 90,
    "architecturalVision": 85,
    "communication": 88,
    "stressResilience": 90,
    "thinkingSpeed": ${calculatedSpeed}
  },
  "strengths": ["Points stated correctly (in target language)"],
  "missingKeyConcepts": ["Omissions or misunderstandings (in target language)"],
  "staffEngineerAnswer": "Benchmark Staff Engineer concise answer with zero fluff (in target language)."
}`;

      const res = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });

      if (res.ok && res.text) {
        let jsonStr = res.text.trim();
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\s*/, '');
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/\s*```$/, '');
        return NextResponse.json(JSON.parse(jsonStr));
      }
      throw new Error('Не вдалося оцінити відповідь.');
    }

    // ── 3. FINALIZE ARENA: Build full 3D Hologram Scorecard & generate slug ──
    if (action === 'FINALIZE_ARENA') {
      const {
        track = 'frontend',
        level = 'Senior',
        candidateName = 'Developer',
        roundEvaluations = [],
        durationSec = 240,
        vacancyProfile = null,
      } = body;

      const profile = TRACK_PROFILES[track] || TRACK_PROFILES.frontend;
      const resolvedRole = vacancyProfile?.roleTitle || profile.title;
      const resolvedLevel = vacancyProfile?.seniority || level;

      // Compute averages across rounds
      let avgAcc = 0;
      let avgArch = 0;
      let avgComm = 0;
      let avgStress = 0;
      let avgSpeed = 0;
      let totalOverall = 0;

      if (roundEvaluations.length > 0) {
        roundEvaluations.forEach((r: any) => {
          avgAcc += r.scores?.technicalAccuracy || 75;
          avgArch += r.scores?.architecturalVision || 75;
          avgComm += r.scores?.communication || 75;
          avgStress += r.scores?.stressResilience || 75;
          avgSpeed += r.scores?.thinkingSpeed || 75;
          totalOverall += r.score || 75;
        });

        const n = roundEvaluations.length;
        avgAcc = Math.round(avgAcc / n);
        avgArch = Math.round(avgArch / n);
        avgComm = Math.round(avgComm / n);
        avgStress = Math.round(avgStress / n);
        avgSpeed = Math.round(avgSpeed / n);
        totalOverall = Math.round(totalOverall / n);
      } else {
        avgAcc = 88;
        avgArch = 85;
        avgComm = 90;
        avgStress = 86;
        avgSpeed = 89;
        totalOverall = 88;
      }

      // Generate verified badge
      const badge = resolvedRole.toLowerCase().startsWith(resolvedLevel.toLowerCase())
        ? `Verified ${resolvedRole}`
        : `Verified ${resolvedLevel} ${resolvedRole}`;

      // Clean slug: e.g. "alex-senior-frontend-94a2"
      const cleanName = candidateName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'dev';
      const cleanTrack = resolvedRole.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'track';
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const slug = `${cleanName}-${resolvedLevel.toLowerCase().slice(0, 4)}-${cleanTrack}-${totalOverall}-${randomSuffix}`;

      // Calculate percentile: e.g. 90 score -> Top 5%, 95 -> Top 2%
      const percentile = Math.min(99, Math.max(70, totalOverall + 4));

      // Synthesize brief Staff summary feedback
      const promptSummary = `Formulate 2-3 sentences of Staff Engineer feedback for candidate ${candidateName} (${badge}) who scored ${totalOverall}/100 in Ghostboard Arena. Focus on their readiness for this specific role and engineering challenges: ${vacancyProfile?.focusAreas?.join(', ') || profile.skills}.
LANGUAGE DIRECTIVE (CRITICAL):
${targetDirective}`;

      let summaryFeedback = language === 'en'
        ? `The candidate demonstrated a strong command of the ${resolvedRole} stack and system design principles. Recommended for ${resolvedLevel} level responsibilities.`
        : `Кандидат продемонстрував глибоке розуміння технологічного стеку ${resolvedRole} та системного проектування. Рекомендовано для позиції ${resolvedLevel}.`;

      try {
        const sumRes = await callGeminiWithFallback({
          models: FLASH_MODELS,
          contents: [{ parts: [{ text: promptSummary }] }],
          generationConfig: { temperature: 0.4 },
        });
        if (sumRes.ok && sumRes.text) {
          summaryFeedback = sumRes.text.trim();
        }
      } catch {}

      const dateLocaleMap: Record<string, string> = {
        ua: 'uk-UA',
        uk: 'uk-UA',
        en: 'en-US',
        pl: 'pl-PL',
        de: 'de-DE',
        fr: 'fr-FR',
        es: 'es-ES',
        pt: 'pt-BR',
        it: 'it-IT',
        cs: 'cs-CZ',
        nl: 'nl-NL',
      };
      const dateLocale = dateLocaleMap[language] || 'en-US';

      const scorecardData = {
        slug,
        candidateName,
        trackName: profile.title,
        level,
        verifiedBadge: badge,
        overallScore: totalOverall,
        percentile,
        scores: {
          technicalAccuracy: avgAcc,
          architecturalVision: avgArch,
          thinkingSpeed: avgSpeed,
          communication: avgComm,
          stressResilience: avgStress,
        },
        dateStr: new Date().toLocaleDateString(dateLocale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        durationSec,
        totalQuestions: roundEvaluations.length || 6,
        summaryFeedback,
      };

      // Persist to serverDb / memPublicScorecards for instant public retrieval
      const historyEntry = {
        id: 'arena_' + Date.now(),
        userId: 'anonymous_arena_user',
        title: `${badge} • ${totalOverall}/100`,
        timestamp: Date.now(),
        durationSec,
        questionsCount: roundEvaluations.length || 6,
        items: roundEvaluations,
        isPublic: true,
        publicSlug: slug,
        scorecardData,
      };

      try {
        await makeSessionPublic(historyEntry.id, slug);
      } catch {}

      // Cache directly in global memory map for immediate zero-lag public resolution
      if (typeof globalThis !== 'undefined') {
        const g = globalThis as any;
        if (!g.memPublicScorecards) g.memPublicScorecards = new Map();
        g.memPublicScorecards.set(slug, historyEntry);
      }

      return NextResponse.json({
        success: true,
        slug,
        scorecard: scorecardData,
      });
    }

    return NextResponse.json({ error: 'Невідома дія (action).' }, { status: 400 });
  } catch (err: any) {
    console.error('Arena API error:', err);
    return NextResponse.json({ error: err.message || 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
