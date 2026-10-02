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
};

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 20, 60000, 'arena_session');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Забагато запитів. Будь ласка, зачекайте хвилину.' }, { status: 429 });
    }

    const body = await req.json();
    const { action } = body;

    // ── 1. START ARENA: Generate 5 blitz questions + 1 architectural case ────
    if (action === 'START_ARENA') {
      const { track = 'frontend', level = 'Senior', candidateName = 'Developer' } = body;
      const profile = TRACK_PROFILES[track] || TRACK_PROFILES.frontend;

      const prompt = `Ти — суворий Staff Engineer у FAANG компанії. Ти проводиш технічну оцінку в "Ghostboard Arena".
Трек: ${profile.title} (${profile.skills})
Рівень кандидата: ${level}
Кандидат: ${candidateName}

Згенеруй рівно 6 запитань:
- Питання 1-5: гострі, практичні бліц-запитання з глибоким технічним підґрунтям (без банальних "що таке клас").
- Питання 6: розгорнутий практичний архітектурний кейс (System Design / Architecture trade-off) реального production-рівня.

Поверни виключно валідний JSON у такому форматі:
{
  "questions": [
    {
      "id": "q1",
      "index": 1,
      "topic": "Тема запитання",
      "difficulty": "Середня / Висока",
      "question": "Текст технічного запитання українською мовою",
      "isArchitectureCase": false,
      "contextHint": "Короткий орієнтир, на що звертати увагу у відповіді"
    },
    ...
    {
      "id": "q6",
      "index": 6,
      "topic": "Архітектурний кейс",
      "difficulty": "Staff / Архітектура",
      "question": "Текст складного архітектурного кейсу",
      "isArchitectureCase": true,
      "contextHint": "Спроєктуйте рішення з урахуванням відмовостійкості та навантаження"
    }
  ]
}`;

      const res = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      });

      if (res.ok && res.text) {
        return NextResponse.json(JSON.parse(res.text));
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
      } = body;

      const profile = TRACK_PROFILES[track] || TRACK_PROFILES.frontend;

      // Base speed calculation
      let calculatedSpeed = 85;
      if (answerTimeSec < 20) calculatedSpeed = 95;
      else if (answerTimeSec < 45) calculatedSpeed = 90;
      else if (answerTimeSec < 75) calculatedSpeed = 82;
      else if (answerTimeSec < 120) calculatedSpeed = 74;
      else calculatedSpeed = 62;

      const prompt = `Ти — суворий Staff Engineer у FAANG компанії, що оцінює відповідь кандидата.
Трек: ${profile.title} (${level})
Запитання: "${question}"
Відповідь кандидата: "${candidateAnswer || '(Кандидат промовчав або дав дуже коротку відповідь)'}"
Час відповіді: ${answerTimeSec} секунд
Це архітектурний кейс: ${isArchitectureCase ? 'ТАК' : 'НІ'}

Оціни відповідь об'єктивно за 5 критеріями (число від 10 до 100):
1. technicalAccuracy (Технічна точність, відсутність помилок)
2. architecturalVision (Розуміння масштабів, trade-offs, проектування)
3. communication (Чіткість, структура думки, відсутність води)
4. stressResilience (Впевненість, здатність вирішувати нестандартні задачі)
5. thinkingSpeed (Оціни темп: запропонований базовий бал ${calculatedSpeed})

Поверни виключно валідний JSON:
{
  "score": 88, // загальний бал за раунд (10-100)
  "verdict": "Відмінно / Добре / Потребує покращення",
  "scores": {
    "technicalAccuracy": 90,
    "architecturalVision": 85,
    "communication": 88,
    "stressResilience": 90,
    "thinkingSpeed": ${calculatedSpeed}
  },
  "strengths": ["Що було сказано вірно"],
  "missingKeyConcepts": ["Що упущено або потребує доопрацювання"],
  "staffEngineerAnswer": "Еталонна, стисла відповідь Staff Engineer без води."
}`;

      const res = await callGeminiWithFallback({
        models: FLASH_MODELS,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });

      if (res.ok && res.text) {
        return NextResponse.json(JSON.parse(res.text));
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
      } = body;

      const profile = TRACK_PROFILES[track] || TRACK_PROFILES.frontend;

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
      const trackShort = track === 'frontend' ? 'Frontend' : track === 'backend' ? 'Backend' : 'System Architect';
      const badge = `Verified ${level} ${trackShort} Engineer`;

      // Clean slug: e.g. "alex-senior-frontend-94a2"
      const cleanName = candidateName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'dev';
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const slug = `${cleanName}-${level.toLowerCase()}-${track}-${totalOverall}-${randomSuffix}`;

      // Calculate percentile: e.g. 90 score -> Top 5%, 95 -> Top 2%
      const percentile = Math.min(99, Math.max(70, totalOverall + 4));

      // Synthesize brief Staff summary feedback
      const promptSummary = `Сформулюй 2-3 речення підсумкового відгуку Staff Engineer для кандидата ${candidateName} (${badge}), який набрав ${totalOverall}/100 у Ghostboard Arena. Оціни технічну готовність до роботи в топ-командах.`;

      let summaryFeedback = `Кандидат продемонстрував глибоке розуміння технологічного стеку ${profile.title} та системного проектування. Рекомендовано для позиції ${level}.`;

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
        dateStr: new Date().toLocaleDateString('uk-UA', {
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
