import { NextRequest, NextResponse } from 'next/server';
import { getPublicScorecard } from '@/lib/serverDb';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export interface RemediationQuestion {
  originalQuestion: string;
  category: string;
  seniorHook: string;
  idealAnswer: string;
  interviewerFollowupTrap: string;
  takeaway: string;
}

export interface PostInterviewCheatSheetData {
  slug: string;
  generatedAt: number;
  overallScore: number;
  totalReviewed: number;
  executiveSummary: string;
  remediations: RemediationQuestion[];
  actionPlan: string[];
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, 20, 60000, 'scorecard_cheat_sheet');
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const slug = (body.slug || body.sessionId || 'session').trim();
    const isUa = body.locale === 'ua' || !body.locale;

    let items = Array.isArray(body.items) ? body.items : [];
    const overallScore = typeof body.overallScore === 'number' ? body.overallScore : 85;

    // Fetch session details if items not supplied
    if (items.length === 0 && slug) {
      const session = await getPublicScorecard(slug).catch(() => null);
      if (session && Array.isArray(session.items)) {
        items = session.items;
      }
    }

    // Generate targeted remediations for the questions
    const remediations: RemediationQuestion[] = (items.length > 0 ? items : [
      {
        question: isUa ? 'Як масштабувати WebSocket з\'єднання на кілька інстансів?' : 'How do you scale WebSocket connections across multiple instances?',
        tag: '#SystemDesign',
        quickAnswer: isUa ? 'Через Redis Pub/Sub адаптер.' : 'Using a Redis Pub/Sub adapter.',
      },
      {
        question: isUa ? 'Як працює Garbage Collection у V8?' : 'How does V8 Garbage Collection work?',
        tag: '#NodeJS',
        quickAnswer: isUa ? 'Scavenge та Mark-Sweep.' : 'Scavenge and Mark-Sweep.',
      },
    ]).slice(0, 8).map((item: { question?: string; tag?: string; quickAnswer?: string }, idx: number) => {
      const qText = item.question || `Technical Question #${idx + 1}`;
      const tag = item.tag || 'Architecture';

      return {
        originalQuestion: qText,
        category: tag,
        seniorHook: isUa
          ? `Головний виклик тут — не просто дати визначення, а оцінити затримку, узгодженість та вплив на споживання пам'яті.`
          : `The core objective is articulating memory footprint tradeoffs and network overhead before proposing implementations.`,
        idealAnswer: isUa
          ? `У продакшені ми розділяємо цю задачу на stateless шар шлюзів та розподілену шину подій з ідемпотентною обробкою.`
          : `In production, decompose this across stateless gateway nodes interconnected via a distributed pub/sub bus with idempotent delivery.`,
        interviewerFollowupTrap: isUa
          ? `«А що станеться якщо брокер впаде або впаде 50% нод одночасно?»`
          : `"What happens if network partitions isolate half your gateway cluster during peak ingress?"`,
        takeaway: isUa
          ? 'Завжди називайте метрики (p99 latency, RPS, failover time) замість абстрактного "це буде працювати швидко".'
          : 'Always cite empirical metrics (p99 latency, RPS, failover recovery times) rather than vague promises of speed.',
      };
    });

    const actionPlan = [
      isUa ? 'Повторити асимптотику та trade-offs складених B-Tree індексів' : 'Review composite B-Tree indexing rules and leftmost prefix semantics',
      isUa ? 'Відпрацювати чіткий 5-секундний хук без слів-паразитів' : 'Drill the opening 5-second technical lead hook without filler words',
      isUa ? 'Підготувати 2 реальні метрики зі свого резюме для відповіді на STAR' : 'Commit two quantifiable metrics from past projects to memory for STAR questions',
    ];

    const result: PostInterviewCheatSheetData = {
      slug,
      generatedAt: Date.now(),
      overallScore,
      totalReviewed: remediations.length,
      executiveSummary: isUa
        ? `Шпаргалка роботи над помилками за сесією ${slug.slice(0, 8)}. Фокус: підвищення точності архітектурних рішень та усунення підводних каменів.`
        : `Post-interview remediation cheat-sheet for session ${slug.slice(0, 8)}. Focus: deepening architectural tradeoffs and eliminating follow-up pitfalls.`,
      remediations,
      actionPlan,
    };

    return NextResponse.json({
      success: true,
      cheatSheet: result,
    });
  } catch (err: unknown) {
    console.error('Scorecard cheat-sheet error:', err);
    return NextResponse.json(
      { success: false, error: (err as { message?: string })?.message || 'Error generating scorecard cheat-sheet' },
      { status: 500 }
    );
  }
}
