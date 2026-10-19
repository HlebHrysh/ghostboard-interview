import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getUserSessions } from '@/lib/serverDb';
import { callGeminiWithFallback, FLASH_MODELS } from '@/lib/geminiApi';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("ghostboard_session")?.value;
    const user = token ? await getSessionUser(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(req, 10, 60000, 'analytics_radar');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Ліміт запитів перевищено. Зачекайте ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    // 1. Fetch the last 5 sessions to build the skill profile safely
    const allSessions = await getUserSessions(user.id);
    const recentHistory = allSessions.slice(0, 5);

    if (!recentHistory || recentHistory.length === 0) {
      return NextResponse.json({ 
        success: true, 
        radar: [], 
        message: 'Недостатньо даних. Пройдіть хоча б одне інтерв\'ю.' 
      });
    }

    // Aggregate questions and answers to send to Gemini
    // Assuming items is an array of QA pairs based on our Phase 1 Json structure
    let qaContext = '';
    let totalQuestions = 0;

    for (const session of recentHistory) {
      const items = Array.isArray(session.items) ? (session.items as any[]) : [];
      for (const item of items) {
        if (totalQuestions > 20) break; // limit to 20 questions to save context window
        if (item && item.question && (item.answer || item.quickAnswer)) {
          qaContext += `Q: ${item.question}\nTag: ${item.tag || 'N/A'}\nCandidate's understanding based on AI feedback: ${item.quickAnswer || item.answer}\n---\n`;
          totalQuestions++;
        }
      }
    }

    if (totalQuestions === 0) {
      return NextResponse.json({ 
        success: true, 
        radar: [], 
        message: 'В інтерв\'ю немає даних про питання/відповіді.' 
      });
    }

    // 2. Formulate Prompt for Gemini
    const systemPrompt = `Ти — Senior Technical Recruiter та Tech Lead. 
Проаналізуй історію відповідей кандидата на співбесідах.
Твоє завдання — згенерувати "Skill Gap Radar", визначивши сильні та слабкі сторони.
Згрупуй результати у 3-5 ключових навичок (наприклад: "Python Core", "System Design", "Databases", "Async Programming").
Для кожної навички дай бал від 0 до 100, коментар експерта та пораду щодо покращення.

Історія відповідей:
${qaContext}

Поверни виключно JSON об'єкт такого формату:
{
  "summary": "Загальний висновок про кандидата (2 речення)",
  "skills": [
    {
      "name": "Назва навички",
      "score": 85,
      "expertComment": "Кандидат добре розуміє...",
      "improvementTip": "Варто підтягнути..."
    }
  ]
}`;

    const result = await callGeminiWithFallback({
      models: FLASH_MODELS,
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    let radarData;
    if (result.ok && result.text) {
      radarData = JSON.parse(result.text);
    } else {
      throw new Error('Gemini failed to generate radar');
    }

    // 3. Paywall Logic
    const isPro = user.plan === 'pro' || user.plan === 'lifetime';
    
    if (!isPro) {
      // Free users get the summary, but scores and detailed tips are hidden
      radarData.skills = radarData.skills.map((skill: any) => ({
        name: skill.name,
        score: 'Приховано (PRO)',
        expertComment: 'Заблоковано в безкоштовній версії',
        improvementTip: 'Оформіть PRO для отримання персоналізованих порад та точних оцінок',
      }));
      radarData.requiresPro = true;
    } else {
      radarData.requiresPro = false;
    }

    return NextResponse.json({
      success: true,
      data: radarData
    });

  } catch (error: any) {
    console.error('Analytics Radar Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
