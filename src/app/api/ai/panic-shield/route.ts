import { getSessionUser } from '@/lib/serverDb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callGeminiWithFallback, FLASH_MODELS } from '@/lib/geminiApi';
import { validateOrigin, checkRateLimit } from '@/lib/rateLimit';
import { detectQuestionLanguage } from '@/lib/techSpeechNormalizer';

const PanicPayloadSchema = z.object({
  question: z.string().trim().min(1, 'Question cannot be empty').max(3000),
  candidateProfile: z.any().optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) {
      return NextResponse.json({ error: 'Origin mismatch' }, { status: 403 });
    }

    const token = req.cookies.get("ghostboard_session")?.value;
    const user = token ? await getSessionUser(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Paywall for Anti-Panic Shield
    const isPro = user.plan === 'pro' || user.plan === 'lifetime';
    if (!isPro) {
      return NextResponse.json({ 
        error: 'Anti-Panic Shield is a PRO feature. Увійдіть у стан потоку самостійно або оновіть план.' 
      }, { status: 403 });
    }

    const rateLimit = await checkRateLimit(req, 15, 60000, 'panic_shield_ai');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Ліміт щита перевищено. Зачекайте ${rateLimit.retryAfterSec} сек.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = PanicPayloadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { question, candidateProfile } = parseResult.data;

    const targetLang = detectQuestionLanguage(question, 'auto');
    const isEn = targetLang === 'en';

    const candidateRole = candidateProfile?.role || 'розробник';
    
    let languageDirective = isEn
      ? `OUTPUT LANGUAGE: ENGLISH. Create a very natural, spoken filler sentence to buy time. For example: "That's an interesting aspect of the architecture, from my experience..."`
      : `OUTPUT LANGUAGE: UKRAINIAN. Згенеруй дуже природну вставну фразу-перехід, щоб потягнути час. Наприклад: "З мого досвіду, тут є кілька ключових моментів. По-перше..."`;

    const systemPrompt = `Ти — розумний телесуфлер для співбесід (Anti-Panic Shield).
Кандидат (${candidateRole}) мовчить уже 4 секунди після цього питання і починає панікувати.
Питання: "${question}"

ТВОЄ ЗАВДАННЯ:
Згенеруй ОДНУ рятівну фразу-перехід (максимум 10-15 слів).
Вона має виглядати як природне продовження роздумів, яка дасть кандидату ще 10 секунд на те, щоб зібратися з думками і прочитати основні підказки, які зараз генеруються.
Фраза не повинна містити прямої відповіді, лише професійний вступ до неї (filler transition).
НІЯКИХ кліше типу "Добре запитання". Почни одразу з діла.

${languageDirective}

Поверни тільки згенеровану фразу, без лапок, без форматування.`;

    const result = await callGeminiWithFallback({
      models: FLASH_MODELS,
      contents: [{ parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.8, // a bit higher for natural variance
        maxOutputTokens: 60,
      },
    });

    if (result.ok && result.text) {
      return NextResponse.json({
        success: true,
        phrase: result.text.trim().replace(/^["']|["']$/g, ''),
      });
    }

    throw new Error('Fallback failed');
  } catch (err: any) {
    console.error('Panic Shield Error:', err);
    return NextResponse.json({ success: false, error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
